import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import College from "@/lib/models/College";
import { z } from "zod";

// Allowed roles for on-spot operations
const ALLOWED_ROLES = ["super-admin", "payments-admin"];

async function requireOnspotAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return {
      session,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

// GET /api/onspot/user/:id — fetch user, passes, college, and computed flags
export async function GET(_req, { params }) {
  const { session, error } = await requireOnspotAdmin();
  if (error) return error;

  const { id } = await params;  // ← await
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let collegeResolved = null;
  if (user.collegeId) {
    collegeResolved = await College.findById(user.collegeId)
      .select("name city state")
      .lean();
  }

  const passes = Array.isArray(user.passes) ? user.passes : [];

  const profileFieldsComplete =
    !!user.name &&
    !!user.email &&
    !!user.college &&
    !!user.year &&
    !!user.department &&
    !!user.phoneNo;

  const profileComplete = !!user.onboardingCompleted || profileFieldsComplete;

  const hasAnyPass = passes.length > 0;
  const hasEligiblePass = passes.some((p) => ["pending", "verified"].includes(p.status));
  const hasGateAllowance = passes.some((p) => p.gateStatus === "allowed");

  return NextResponse.json({
    user,
    collegeResolved,
    passes,
    flags: {
      profileComplete,
      hasAnyPass,
      hasEligiblePass,
      hasGateAllowance,
      hasVerifiedPass: !!user.hasVerifiedPass,
    },
    viewer: {
      adminEmail: session.user.email,
      adminRole: session.user.role,
    },
  });
}

// PATCH /api/onspot/user/:id — update profile (including canonical college)
export async function PATCH(req, { params }) {
  const { session, error } = await requireOnspotAdmin();
  if (error) return error;

  const { id } = await params;  // ← await
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phoneNo: z.string().min(1),
    year: z.number().int().min(1).max(10),
    department: z.string().min(1),
    // Either existing collegeId or newCollege details
    collegeId: z.string().optional(),
    newCollege: z
      .object({
        name: z.string().min(1),
        city: z.string().optional(),
        state: z.string().optional(),
      })
      .optional(),
  });

  let body;
  try {
    body = await req.json();
    const validated = schema.parse(body);

    await dbConnect();

    let collegeId = validated.collegeId || null;
    let collegeName = null;

    if (validated.newCollege) {
      const created = await College.create({
        name: validated.newCollege.name.trim(),
        city: (validated.newCollege.city || "").trim(),
        state: (validated.newCollege.state || "").trim(),
        addedByUser: session.user.email,
        approved: true,
      });
      collegeId = created._id.toString();
      collegeName = created.name;
    } else if (collegeId) {
      const existing = await College.findById(collegeId).lean();
      if (!existing) {
        return NextResponse.json({ error: "College not found" }, { status: 404 });
      }
      collegeName = existing.name;
    }

    const update = {
      name: validated.name.trim(),
      email: validated.email.toLowerCase(),
      phoneNo: validated.phoneNo.trim(),
      year: validated.year,
      department: validated.department.trim(),
    };

    if (collegeId && collegeName) {
      update.collegeId = collegeId;
      update.college = collegeName;
    }

    // Mark profile as completed when required fields are present
    update.onboardingCompleted = true;

    const user = await User.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || "Invalid payload" }, { status: 400 });
    }
    console.error("PATCH /api/onspot/user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

