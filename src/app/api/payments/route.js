import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { sendPaymentVerifiedEmail, sendPaymentRejectedEmail } from "@/lib/email";

// Utility functions for transaction ID processing
function normalizeTransactionId(transactionId) {
  if (!transactionId) return "";
  // Remove all special characters and convert to lowercase
  return transactionId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function hasSpecialCharacters(transactionId) {
  if (!transactionId) return false;
  // Check if string contains any non-alphanumeric characters
  return /[^a-zA-Z0-9]/.test(transactionId);
}

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
    const normalizedTransactionCounts = {}; // Track normalized transaction number occurrences
    
    // First pass: collect all normalized transaction numbers
    for (const user of users) {
      for (const pass of user.passes) {
        const normalizedTxn = normalizeTransactionId(pass.transactionNumber);
        if (normalizedTxn) {
          normalizedTransactionCounts[normalizedTxn] = (normalizedTransactionCounts[normalizedTxn] || 0) + 1;
        }
      }
    }
    
    // Second pass: build payments array with duplicate detection
    for (const user of users) {
      for (const pass of user.passes) {
        const normalizedTxn = normalizeTransactionId(pass.transactionNumber);
        const isDuplicate = normalizedTxn && normalizedTransactionCounts[normalizedTxn] > 1;
        const hasSpecialChars = hasSpecialCharacters(pass.transactionNumber);
        
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
          paymentIdType: pass.paymentIdType || null,
          transactionNumber: pass.transactionNumber,
          screenshotUrl: pass.transactionScreenshot,
          status: pass.status,
          isDuplicate: isDuplicate,
          hasSpecialCharacters: hasSpecialChars,
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

    const { userId, passId, action, rejectionReason, paymentIdType, editedTransactionId } = await request.json();

    if (!userId || !passId || !action) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }
    if (!["verify", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }
    if (action === "reject" && !rejectionReason?.trim()) {
      return NextResponse.json({ success: false, message: "Rejection reason is required" }, { status: 400 });
    }
    if (action === "verify" && (!paymentIdType || !["upi", "eazypay"].includes(paymentIdType))) {
      return NextResponse.json({ success: false, message: "Valid payment ID type is required for verification" }, { status: 400 });
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
      pass.paymentIdType = paymentIdType; // Set by admin during verification
      // Update transaction ID if edited by admin
      if (editedTransactionId && editedTransactionId.trim() !== pass.transactionNumber) {
        pass.transactionNumber = editedTransactionId.trim();
      }
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

    // Send email — awaited so errors are caught and surfaced as a warning
    let emailWarning = null;
    const emailPayload = {
      userName: user.name,
      userEmail: user.email,
      passType: pass.passType,
    };

    try {
      if (action === "verify") {
        const nextActions = {
          1: "We look forward to your participation in the events at TechUtsav!",
          2: "We look forward to your participation and presentations at TechUtsav!",
          3: "We look forward to your participation, presentations and submissions at TechUtsav!",
          4: "We look forward to your full participation and all submissions at TechUtsav!",
        };
        await sendPaymentVerifiedEmail({ ...emailPayload, nextAction: nextActions[pass.passType] });
      } else {
        await sendPaymentRejectedEmail({ ...emailPayload, rejectionReason: rejectionReason.trim() });
      }
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      emailWarning = `Status updated but email failed to send: ${emailErr.message}`;
    }

    return NextResponse.json({
      success: true,
      message: action === "verify" ? "Payment verified" : "Payment rejected",
      ...(emailWarning && { emailWarning }),
    });
  } catch (error) {
    console.error("Payments PATCH error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
