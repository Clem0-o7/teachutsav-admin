import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const users = await User.find({}, {
      name: 1,
      email: 1,
      passes: 1,
      createdAt: 1,
    }).lean();

    // --- Summary Stats ---
    const totalRegistrations = users.length;

    // Users who have submitted at least one pass
    const totalPayments = users.filter(u => u.passes && u.passes.length > 0).length;

    // Users who have at least one verified pass
    const verifiedRegistrations = users.filter(u =>
      u.passes && u.passes.some(p => p.status === "verified")
    ).length;

    // Users whose latest pass is pending
    const pendingVerifications = users.filter(u =>
      u.passes && u.passes.length > 0 &&
      u.passes.some(p => p.status === "pending")
    ).length;

    // --- Chart Data: registrations & payments per day ---
    const regByDate = {};
    const payByDate = {};

    for (const user of users) {
      const regDate = new Date(user.createdAt).toISOString().slice(0, 10);
      regByDate[regDate] = (regByDate[regDate] || 0) + 1;

      if (user.passes && user.passes.length > 0) {
        for (const pass of user.passes) {
          const payDate = new Date(pass.submittedDate).toISOString().slice(0, 10);
          payByDate[payDate] = (payByDate[payDate] || 0) + 1;
        }
      }
    }

    // Merge all dates into a sorted array
    const allDates = Array.from(
      new Set([...Object.keys(regByDate), ...Object.keys(payByDate)])
    ).sort();

    const chartData = allDates.map(date => ({
      date,
      registrations: regByDate[date] || 0,
      payments: payByDate[date] || 0,
    }));

    // --- Pass Breakdown: count of verified passes per pass type ---
    const passBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const user of users) {
      if (!user.passes) continue;
      for (const pass of user.passes) {
        if (pass.status === "verified" && passBreakdown[pass.passType] !== undefined) {
          passBreakdown[pass.passType]++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRegistrations,
        totalPayments,
        verifiedRegistrations,
        pendingVerifications,
      },
      chartData,
      passBreakdown,
    });

  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
