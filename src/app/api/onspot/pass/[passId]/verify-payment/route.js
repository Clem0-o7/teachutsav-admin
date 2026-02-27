import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import { z } from "zod";

const ALLOWED_ROLES = ["super-admin", "payments-admin"];

async function requireOnspotAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return {
      session,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

const bodySchema = z.object({
  paymentIdType: z.enum(["upi", "eazypay", "onspot"]).optional(),
  editedTransactionId: z.string().optional(),
});

// POST /api/onspot/pass/:passId/verify-payment — mark a pending pass as verified (Type 2 flow)
export async function POST(req, { params }) {
  const { session, error } = await requireOnspotAdmin();
  if (error) return error;

  const { passId } = await params;  // ← await
  if (!passId) {
    return NextResponse.json({ error: "passId is required" }, { status: 400 });
  }

  let body = {};
  try {
    const raw = await req.json().catch(() => ({}));
    body = bodySchema.parse(raw || {});
  } catch {
    // allow empty body
  }

  await dbConnect();

  const user = await User.findOne({ "passes._id": passId });
  if (!user) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const pass = user.passes.id(passId);
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  if (pass.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending payments can be verified here" },
      { status: 400 }
    );
  }

  pass.status = "verified";
  pass.paymentIdType = body.paymentIdType || pass.paymentIdType || "upi";
  if (body.editedTransactionId?.trim()) {
    pass.transactionNumber = body.editedTransactionId.trim();
  }
  pass.verifiedDate = new Date();
  pass.verifiedBy = session.user.name || "Admin";
  pass.verifiedByEmail = session.user.email || "";

  await user.save();

  return NextResponse.json({
    success: true,
    status: pass.status,
  });
}
