import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();
  const { transactionId } = await req.json();
  if (!transactionId) return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });

  // Check if any user has a pass with this transactionNumber
  const exists = await User.exists({ "passes.transactionNumber": transactionId });
  return NextResponse.json({ exists: !!exists });
}