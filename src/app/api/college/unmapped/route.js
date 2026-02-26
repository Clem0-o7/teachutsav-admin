import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { authOptions } from "@/lib/auth";

// Helper: Check if user is super-admin
async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "super-admin";
}

// GET /api/college/unmapped — Group users with null collegeId by college string (super-admin only)
export async function GET() {
  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized: Super-admin only" }, { status: 403 });
  }

  await dbConnect();

  // Group users where collegeId is null/missing, by normalized college string (trim + lowercase).
  // Also returns per-variant counts for UI display.
  const pipeline = [
    {
      $match: {
        $or: [{ collegeId: { $exists: false } }, { collegeId: null }],
        college: { $exists: true, $ne: "" },
      },
    },
    {
      $project: {
        rawCollege: "$college",
        cleaned: { $trim: { input: "$college" } },
        normalized: { $toLower: { $trim: { input: "$college" } } },
      },
    },
    {
      $match: {
        cleaned: { $ne: "" },
      },
    },
    // (normalized, cleaned) -> count (variant counts)
    {
      $group: {
        _id: { normalized: "$normalized", display: "$cleaned" },
        count: { $sum: 1 },
      },
    },
    // normalized -> variants + total
    {
      $group: {
        _id: "$_id.normalized",
        variants: {
          $push: {
            name: "$_id.display",
            count: "$count",
          },
        },
        totalUsers: { $sum: "$count" },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const groups = await User.aggregate(pipeline);

  const colleges = groups.map((g) => {
    const variants = [...(g.variants || [])].sort((a, b) => b.count - a.count);
    const displayName = variants[0]?.name || g._id;

    return {
      normalizedKey: g._id,
      displayName,
      totalUsers: g.totalUsers,
      variants,
    };
  });

  return NextResponse.json({ success: true, colleges });
}