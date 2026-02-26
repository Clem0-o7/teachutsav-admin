import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import Team from "@/lib/models/Team";
import { NextResponse } from "next/server";

export async function GET(req, context) {
  await dbConnect();
  // Unwrap params as async (Next.js 16+)
  const params = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "No id provided" }, { status: 400 });
  // Find the user and submission
  const user = await User.findOne({ "submissions._id": id }).lean();
  if (!user || !user.submissions) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const sub = (user.submissions || []).find(s => s._id?.toString() === id);
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  let team = null;
  let members = [];
  if (sub.teamId) {
    team = await Team.findById(sub.teamId).lean();
    members = team?.members || [];
  } else {
    members = [{ name: user.name, email: user.email, phoneNo: user.phoneNo, year: user.year, college: user.college }];
  }
  const submission = {
    ...sub,
    leader: { name: user.name, email: user.email, phoneNo: user.phoneNo, year: user.year, college: user.college },
    team: team ? { teamName: team.teamName, members } : null,
    members,
    userId: user._id
  };
  return NextResponse.json({ submission });
}