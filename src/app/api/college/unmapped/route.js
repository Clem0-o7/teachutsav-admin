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
  // Group users where collegeId is null/missing, by college string
  const pipeline = [
    {
      $match: {
        $or: [
          { collegeId: { $exists: false } },
          { collegeId: null },
        ],
        college: { $exists: true, $ne: "" },
      },
    },
    {
      $group: {
        _id: "$college",
        userIds: { $addToSet: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const groups = await User.aggregate(pipeline);
  // Format response
  const colleges = groups.map(g => ({
    college: g._id,
    userIds: g.userIds,
    count: g.count,
  }));
  return NextResponse.json({ success: true, colleges });
}