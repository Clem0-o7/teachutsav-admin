import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

// GET /api/users — fetch all users with sort/filter
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["super-admin", "view-only"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const sortBy    = searchParams.get("sortBy")    || "newest";
    const passType  = searchParams.get("passType")  || "all";
    const onboarding= searchParams.get("onboarding")|| "all"; // all | complete | incomplete
    const search    = searchParams.get("search")    || "";

    // Build sort
    const sortMap = {
      newest:     { createdAt: -1 },
      oldest:     { createdAt: 1 },
      nameAsc:    { name: 1 },
      nameDesc:   { name: -1 },
      collegeAsc: { college: 1 },
      collegeDesc:{ college: -1 },
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: "i" } },
        { email:   { $regex: search, $options: "i" } },
        { college: { $regex: search, $options: "i" } },
      ];
    }
    if (onboarding === "complete")   query.onboardingCompleted = true;
    if (onboarding === "incomplete") query.onboardingCompleted = false;
    if (passType !== "all") {
      const pt = parseInt(passType);
      if (!isNaN(pt)) query["passes.passType"] = pt;
    }

    const users = await User.find(query)
      .select("-password -emailVerificationToken -emailVerificationExpires")
      .sort(sort)
      .lean();

    // Annotate each user with an incompleteFields list
    const annotated = users.map((u) => {
      const missing = [];
      if (!u.college)     missing.push("college");
      if (!u.phoneNo)     missing.push("phoneNo");
      if (!u.year)        missing.push("year");
      if (!u.department)  missing.push("department");
      if (!u.isEmailVerified) missing.push("emailVerified");
      return { ...u, missingFields: missing };
    });

    return NextResponse.json({ users: annotated, total: annotated.length });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/users — bulk delete by array of IDs
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "super-admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await dbConnect();
    const result = await User.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error("DELETE /api/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
