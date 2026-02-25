import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

// GET /api/users/[id]
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["super-admin", "view-only"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await dbConnect();
    const user = await User.findById(params.id)
      .select("-password -emailVerificationToken -emailVerificationExpires")
      .lean();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/users/[id] — update user details
export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "super-admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const params = await context.params;

    // Whitelist of editable fields
    const allowed = ["name", "email", "college", "phoneNo", "year", "department", "onboardingCompleted", "isEmailVerified"];
    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      { $set: update },
      { returnDocument: "after", runValidators: true }
    ).select("-password -emailVerificationToken -emailVerificationExpires").lean();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("PATCH /api/users/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "super-admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await dbConnect();
    const user = await User.findByIdAndDelete(params.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
