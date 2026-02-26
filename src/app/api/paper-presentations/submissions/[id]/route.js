import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { id } = await params;
  await dbConnect();
  
  const user = await User.findOne({ "submissions._id": id });
  if (!user) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  
  const sub = user.submissions.find(s => s._id.toString() === id);
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  
  return NextResponse.json({
    ...sub.toObject ? sub.toObject() : JSON.parse(JSON.stringify(sub)),
    userId: user._id,
    userName: user.name,
    userEmail: user.email
  });
}
