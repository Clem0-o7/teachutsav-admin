import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import Team from "@/lib/models/Team";
import { sendIdeathonAcceptedEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();
  const { submissionId } = await req.json();
  // Find user and submission
  const user = await User.findOne({ "submissions._id": submissionId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const sub = user.submissions.find(s => s._id.toString() === submissionId);
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  // Mark as accepted
  sub.status = "accepted";
  await user.save();
  // Send mail to leader and team members
  let team = null;
  if (sub.teamId) {
    team = await Team.findById(sub.teamId).lean();
    // Find leader
    const leader = team.members.find(m => m.role === "leader");
    if (leader) {
      await sendIdeathonAcceptedEmail({
        teamName: team.teamName,
        leaderName: leader.name,
        leaderEmail: leader.email,
        eventName: sub.title
      });
    }
  } else {
    await sendIdeathonAcceptedEmail({
      teamName: sub.title,
      leaderName: user.name,
      leaderEmail: user.email,
      eventName: sub.title
    });
  }
  return NextResponse.json({ success: true });
}
