import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import Team from "@/lib/models/Team";
import { sendIdeathonRejectedEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();
  const { submissionId } = await req.json();
  // Find user and submission
  const user = await User.findOne({ "submissions._id": submissionId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const sub = user.submissions.find(s => s._id.toString() === submissionId);
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  // Mark as rejected
  sub.status = "rejected";
  await user.save();
  // Send mail to leader and team members
  let team = null;
  if (sub.teamId) {
    team = await Team.findById(sub.teamId).lean();
    // Find leader
    const leader = team.members.find(m => m.role === "leader");
    if (leader) {
      await sendIdeathonRejectedEmail({
        teamName: team.teamName,
        leaderName: leader.name,
        leaderEmail: leader.email,
        eventName: sub.title,
        rejectionReason: sub.rejectionReason || "Not selected by judges."
      });
    }
  } else {
    await sendIdeathonRejectedEmail({
      teamName: sub.title,
      leaderName: user.name,
      leaderEmail: user.email,
      eventName: sub.title,
      rejectionReason: sub.rejectionReason || "Not selected by judges."
    });
  }
  return NextResponse.json({ success: true });
}
