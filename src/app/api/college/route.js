import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/dbConnect";
import College from "@/lib/models/College";
import User from "@/lib/models/User";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import CollegeMergeLog from "@/lib/models/CollegeMergeLog";

// Helper: Check if user is super-admin
async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "super-admin";
}

// GET /api/college — List all colleges, sorted alphabetically
export async function GET() {
  await dbConnect();
  const colleges = await College.find({}, { name: 1, city: 1, state: 1, approved: 1 })
    .sort({ name: 1 })
    .lean();
  return NextResponse.json({ success: true, colleges });
}

// POST /api/college — Create a new College (super-admin only)
export async function POST(req) {
  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized: Super-admin only" }, { status: 403 });
  }

  const schema = z.object({
    name: z.string().min(1, "College name is required").trim(),
    city: z.string().optional(),
    state: z.string().optional(),
  });

  let body;
  try {
    body = await req.json();
    const validated = schema.parse(body);

    const session = await getServerSession(authOptions);

    await dbConnect();

    // Check if college name already exists (case-insensitive)
    const existing = await College.findOne({ name: new RegExp(`^${validated.name}$`, "i") });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "College name already exists" },
        { status: 400 }
      );
    }

    const college = new College({
      name: validated.name,
      city: validated.city || "",
      state: validated.state || "",
      addedByUser: session?.user?.email ?? null,
      approved: false,
    });

    await college.save();
    return NextResponse.json(
      { success: true, college: college.toObject() },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/college — Bulk assign collegeId to users (super-admin only)
export async function PATCH(req) {
  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized: Super-admin only" }, { status: 403 });
  }

  // Backward compatible:
  // - New: { collegeId, normalizedKeys[] } (preferred)
  // - Old: { collegeId, userIds[] }
  const schema = z.object({
    collegeId: z.string().min(1, "collegeId is required"),
    normalizedKeys: z.array(z.string().min(1)).optional(),
    userIds: z.array(z.string().min(1)).optional(),
  }).refine(
    (v) => (Array.isArray(v.normalizedKeys) && v.normalizedKeys.length > 0) || (Array.isArray(v.userIds) && v.userIds.length > 0),
    { message: "Provide either normalizedKeys or userIds" }
  );

  let body;
  try {
    body = await req.json();
    const validated = schema.parse(body);

    await dbConnect();

    // Verify collegeId exists
    const college = await College.findById(validated.collegeId).lean();
    if (!college) {
      return NextResponse.json(
        { success: false, error: "College not found" },
        { status: 404 }
      );
    }

    const { collegeId } = validated;

    let result;
    let logNormalizedKeys = [];

    if (validated.normalizedKeys?.length) {
      const keys = validated.normalizedKeys
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      if (!keys.length) {
        return NextResponse.json(
          { success: false, error: "No valid normalizedKeys provided" },
          { status: 400 }
        );
      }

      logNormalizedKeys = keys;

      // Single bulk update:
      // - Only users with collegeId null/missing
      // - Only users whose normalized college string matches keys
      result = await User.updateMany(
        {
          $or: [{ collegeId: { $exists: false } }, { collegeId: null }],
          college: { $exists: true, $ne: "" },
          $expr: {
            $in: [
              {
                $toLower: {
                  $trim: { input: "$college" },
                },
              },
              keys,
            ],
          },
        },
        {
          $set: {
            collegeId,
            college: college.name,
          },
        }
      );
    } else {
      // Legacy path: bulk update by explicit userIds
      const userIds = (validated.userIds || []).filter(Boolean);
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { collegeId, college: college.name } }
      );
    }

    const session = await getServerSession(authOptions);
    await CollegeMergeLog.create({
      collegeId,
      collegeName: college.name,
      normalizedKeys: logNormalizedKeys,
      modifiedCount: result.modifiedCount,
      performedByEmail: session?.user?.email ?? null,
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}