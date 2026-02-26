import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import Team from "@/lib/models/Team";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();
  // Get all users with paper-presentation submissions
  const users = await User.find({ "submissions.type": "paper-presentation" }).lean();
  let submissions = [];
  for (const user of users) {
    for (const sub of user.submissions.filter(s => s.type === "paper-presentation")) {
      let team = null;
      let members = [];
      if (sub.teamId) {
        team = await Team.findById(sub.teamId).lean();
        members = team?.members || [];
      } else {
        members = [{ name: user.name, email: user.email, phoneNo: user.phoneNo, year: user.year, college: user.college }];
      }
      submissions.push({
        ...sub,
        leader: { name: user.name, email: user.email, phoneNo: user.phoneNo, year: user.year, college: user.college },
        team: team ? { teamName: team.teamName, members } : null,
        members,
        userId: user._id
      });
    }
  }
  // Sort: teams first, then individuals, then by teamName/name
  submissions.sort((a, b) => {
    if (a.team && !b.team) return -1;
    if (!a.team && b.team) return 1;
    if (a.team && b.team) return a.team.teamName.localeCompare(b.team.teamName);
    return a.leader.name.localeCompare(b.leader.name);
  });
  return NextResponse.json({ submissions });
}
