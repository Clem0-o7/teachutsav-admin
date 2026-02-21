import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { sendPaymentVerifiedEmail, sendPaymentRejectedEmail } from "@/lib/email";

// GET /api/payments — list all users who have passes, with flat pass records
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();

    const users = await User.find(
      { "passes.0": { $exists: true } },
      { name: 1, email: 1, college: 1, department: 1, year: 1, phoneNo: 1, passes: 1 }
    ).lean();

    // Flatten: one record per pass submission
    const payments = [];
    for (const user of users) {
      for (const pass of user.passes) {
        payments.push({
          userId: user._id.toString(),
          passId: pass._id.toString(),
          userName: user.name,
          userEmail: user.email,
          college: user.college || "",
          department: user.department || "",
          year: user.year || "",
          phoneNo: user.phoneNo || "",
          passType: pass.passType,
          transactionNumber: pass.transactionNumber,
          screenshotUrl: pass.transactionScreenshot,
          status: pass.status,
          rejectionReason: pass.rejectionReason || "",
          submittedDate: pass.submittedDate,
          verifiedDate: pass.verifiedDate || null,
          verifiedBy: pass.verifiedBy || "",
          verifiedByEmail: pass.verifiedByEmail || "",
        });
      }
    }

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/payments — verify or reject a pass
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { userId, passId, action, rejectionReason } = await request.json();

    if (!userId || !passId || !action) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }
    if (!["verify", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }
    if (action === "reject" && !rejectionReason?.trim()) {
      return NextResponse.json({ success: false, message: "Rejection reason is required" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const pass = user.passes.id(passId);
    if (!pass) return NextResponse.json({ success: false, message: "Pass not found" }, { status: 404 });

    const adminName = session.user?.name || "Admin";
    const adminEmail = session.user?.email || "";

    if (action === "verify") {
      pass.status = "verified";
      pass.verifiedDate = new Date();
      pass.verifiedBy = adminName;
      pass.verifiedByEmail = adminEmail;
      pass.rejectionReason = undefined;
    } else {
      pass.status = "rejected";
      pass.verifiedDate = new Date();
      pass.verifiedBy = adminName;
      pass.verifiedByEmail = adminEmail;
      pass.rejectionReason = rejectionReason.trim();
    }

    await user.save();

    // Send email (non-blocking — don't fail the response if email fails)
    const emailPayload = {
      userName: user.name,
      userEmail: user.email,
      passType: pass.passType,
    };

    if (action === "verify") {
      const nextActions = {
        1: "We look forward to your participation in the events at TechUtsav!",
        2: "We look forward to your participation and presentations at TechUtsav!",
        3: "We look forward to your participation, presentations and submissions at TechUtsav!",
        4: "We look forward to your full participation and all submissions at TechUtsav!",
      };
      sendPaymentVerifiedEmail({ ...emailPayload, nextAction: nextActions[pass.passType] }).catch(console.error);
    } else {
      sendPaymentRejectedEmail({ ...emailPayload, rejectionReason: rejectionReason.trim() }).catch(console.error);
    }

    return NextResponse.json({ success: true, message: action === "verify" ? "Payment verified" : "Payment rejected" });
  } catch (error) {
    console.error("Payments PATCH error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
