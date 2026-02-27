import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import College from "@/lib/models/College";
import VerificationSession from "@/lib/models/VerificationSession";
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
  physicalSignatureCollected: z.boolean(),
  detailsCorrectedOnPaper: z.boolean(),
  panelId: z.string().optional(),
});

// POST /api/onspot/pass/:passId/complete-verification
export async function POST(req, { params }) {
  const { session, error } = await requireOnspotAdmin();
  if (error) return error;

  const { passId } = await params;  // ← await
  if (!passId) {
    return NextResponse.json({ error: "passId is required" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
    const validated = bodySchema.parse(body);

    await dbConnect();

    // Load user + target pass first
    const user = await User.findOne({ "passes._id": passId });
    if (!user) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    const pass = user.passes.id(passId);
    if (!pass) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    if (pass.status !== "verified") {
      return NextResponse.json(
        { error: "Payment must be verified before completing on-spot verification" },
        { status: 400 }
      );
    }

    if (!user.onboardingCompleted) {
      return NextResponse.json(
        { error: "User profile is incomplete – update details before verification" },
        { status: 400 }
      );
    }

    if (pass.gateStatus && pass.gateStatus !== "not-checked") {
      return NextResponse.json(
        { error: "Verification already completed for this pass" },
        { status: 409 }
      );
    }

    const now = new Date();

    // Resolve college name snapshot
    let collegeName = user.college || "";
    if (!collegeName && user.collegeId) {
      const college = await College.findById(user.collegeId).select("name").lean();
      if (college) collegeName = college.name;
    }

    // Update user + pass atomically
    pass.gateStatus = "allowed";
    pass.gateCheckedAt = now;
    pass.gateCheckedByAdminId = session.user.id ? session.user.id : undefined;
    pass.gateCheckedByPanelId = validated.panelId || undefined;
    pass.verificationSource = "onspot";

    user.hasVerifiedPass = true;

    await user.save();

    await VerificationSession.create({
      userId: user._id,
      passId: pass._id,
      passType: pass.passType,
      snapshotUser: {
        name: user.name,
        email: user.email,
        phoneNo: user.phoneNo,
        year: user.year,
        department: user.department,
      },
      snapshotCollegeName: collegeName,
      adminId: session.user.id,
      adminEmail: session.user.email,
      panelId: validated.panelId || null,
      physicalSignatureCollected: validated.physicalSignatureCollected,
      detailsCorrectedOnPaper: validated.detailsCorrectedOnPaper,
    });

    return NextResponse.json({
      success: true,
      gateStatus: pass.gateStatus,
      hasVerifiedPass: user.hasVerifiedPass,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || "Invalid payload" }, { status: 400 });
    }
    console.error("POST /api/onspot/pass/:passId/complete-verification error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

