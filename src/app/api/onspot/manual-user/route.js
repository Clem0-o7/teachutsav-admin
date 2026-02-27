import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import College from "@/lib/models/College";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendOnspotPassEmail } from "@/lib/email";

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
  name: z.string().min(1),
  email: z.string().email(),
  phoneNo: z.string().min(1),
  year: z.number().int().min(1).max(10),
  department: z.string().min(1),
  passType: z.number().int().min(1).max(4),
  paymentSource: z.enum(["onspot-UPI", "onspot-Cash"]),
  collegeId: z.string().optional(),
  newCollege: z
    .object({
      name: z.string().min(1),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
});

export async function POST(req) {
  const { session, error } = await requireOnspotAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const validated = bodySchema.parse(body);

    await dbConnect();

    let collegeId = validated.collegeId || null;
    let collegeName = null;

    if (validated.newCollege) {
      const created = await College.create({
        name: validated.newCollege.name.trim(),
        city: (validated.newCollege.city || "").trim(),
        state: (validated.newCollege.state || "").trim(),
        addedByUser: session.user.email,
        approved: true,
      });
      collegeId = created._id.toString();
      collegeName = created.name;
    } else if (collegeId) {
      const existing = await College.findById(collegeId).lean();
      if (!existing) {
        return NextResponse.json({ error: "College not found" }, { status: 404 });
      }
      collegeName = existing.name;
    }

    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const transactionNumber = `ONSPOT-${Date.now()}-${Math.floor(Math.random() * 1e4)
      .toString()
      .padStart(4, "0")}`;

    const pass = {
      passType: validated.passType,
      paymentIdType: "onspot",
      transactionNumber,
      transactionScreenshot: "onspot-no-screenshot",
      isDuplicate: false,
      status: "verified",
      submittedDate: new Date(),
      verifiedDate: new Date(),
      verifiedBy: session.user.name,
      verifiedByEmail: session.user.email,
      paymentSource: validated.paymentSource,
      onspotCreated: true,
      gateStatus: "not-checked",
      verificationSource: "onspot",
    };

    const user = await User.create({
      name: validated.name.trim(),
      email: validated.email.toLowerCase(),
      password: hashedPassword,
      phoneNo: validated.phoneNo.trim(),
      year: validated.year,
      department: validated.department.trim(),
      collegeId: collegeId || undefined,
      college: collegeName || undefined,
      onboardingCompleted: true,
      passes: [pass],
      hasVerifiedPass: false,
    });

    // Send email with QR code containing the user's MongoDB ObjectId
    try {
      await sendOnspotPassEmail({
        userName: user.name,
        userEmail: user.email,
        passType: validated.passType,
        userId: user._id.toString(),
      });
    } catch (emailErr) {
      console.error("Failed to send on-spot pass email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      userId: user._id,
      pass,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || "Invalid payload" }, { status: 400 });
    }
    console.error("POST /api/onspot/manual-user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}