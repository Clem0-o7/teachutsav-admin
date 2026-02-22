import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { sendProfileCompletionEmail, sendPaymentReminderEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * POST /api/users/send-email
 *
 * Body:
 *  { type: "profile-completion" | "payment-reminder", userIds: string[] }
 *
 * Returns per-user results so the UI can show partial-success toasts.
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["super-admin", "events-admin"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { type, userIds } = await request.json();

    if (!["profile-completion", "payment-reminder"].includes(type)) {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No user IDs provided" }, { status: 400 });
    }
    if (userIds.length > 100) {
      return NextResponse.json({ error: "Maximum 100 users per request" }, { status: 400 });
    }

    await dbConnect();

    const users = await User.find({ _id: { $in: userIds } }).lean();
    if (users.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 404 });
    }

    const APP_URL = process.env.APP_URL || "https://techutsavtce.tech";
    const REGISTER_URL = `${APP_URL}/signup`;

    const results = [];

    for (const user of users) {
      try {
        if (type === "profile-completion") {
          // Generate a secure one-time token
          const token = crypto.randomBytes(32).toString("hex");
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          // Persist token on the user
          await User.findByIdAndUpdate(user._id, {
            profileCompletionToken: token,
            profileCompletionExpires: expires,
          });

          const completionLink = `${APP_URL}/complete-profile?token=${token}`;

          await sendProfileCompletionEmail({
            userName: user.name,
            userEmail: user.email,
            completionLink,
          });

          results.push({ userId: user._id, email: user.email, status: "sent" });
        } else {
          // payment-reminder
          await sendPaymentReminderEmail({
            userName: user.name,
            userEmail: user.email,
            registerLink: REGISTER_URL,
          });

          results.push({ userId: user._id, email: user.email, status: "sent" });
        }
      } catch (err) {
        console.error(`Failed to send ${type} email to ${user.email}:`, err.message);
        results.push({ userId: user._id, email: user.email, status: "failed", error: err.message });
      }
    }

    const sentCount   = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({ results, sentCount, failedCount });
  } catch (err) {
    console.error("POST /api/users/send-email error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
