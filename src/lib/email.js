import nodemailer from "nodemailer";

/**
 * Get configured email transporter
 */
function getEmailTransporter() {
  const port = Number(process.env.EMAIL_SERVER_PORT);
  const isSecure = port === 465;

  const config = {
    host: process.env.EMAIL_SERVER_HOST,
    port,
    secure: isSecure,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  };

  if (!isSecure) {
    config.requireTLS = true;
    config.tls = { ciphers: "SSLv3", rejectUnauthorized: false };
  }

  return nodemailer.createTransport(config);
}

function getFromAddress() {
  const emailFrom = process.env.EMAIL_FROM?.replace(/['"]/g, "").trim();
  const emailUser = process.env.EMAIL_SERVER_USER;
  if (emailFrom?.includes("@")) return emailFrom;
  if (emailFrom) return `"${emailFrom}" <${emailUser}>`;
  return emailUser;
}

// ─── Shared layout wrapper ─────────────────────────────────────────────────

function emailWrapper(headerBg, headerIcon, headerTitle, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:${headerBg};padding:40px 36px 32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">${headerIcon}</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">${headerTitle}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TechUtsav Admin Notification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:20px 36px;border-top:1px solid #e9ecef;text-align:center;">
              <p style="margin:0;color:#868e96;font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} TechUtsav. All rights reserved.<br />
                This is an automated message — please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Payment Verified Email ────────────────────────────────────────────────

export async function sendPaymentVerifiedEmail({ userName, userEmail, passType, nextAction }) {
  const PASS_LABELS = { 1: "Pass 1 – Offline Workshop And Events", 2: "Pass 2 – Paper Presentation", 3: "Pass 3 – Ideathon", 4: "Pass 4 – Online Workshops" };
  const passLabel = PASS_LABELS[passType] ?? `Pass ${passType}`;

  const body = `
    <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;font-weight:700;">🎉 Payment Verified!</h2>
    <p style="margin:0 0 24px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${userName}</strong>,
    </p>

    <!-- Verification Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#d4edda,#c3e6cb);border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#155724;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">✅ Verified Payment</p>
          <p style="margin:0;color:#155724;font-size:20px;font-weight:700;">${passLabel}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.7;">
      Great news! Your payment has been successfully verified by our team. You are now officially registered for <strong>TechUtsav "PARADIGM" '26</strong>.
    </p>

    ${nextAction ? `
    <!-- Next Steps -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59f00;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;color:#856404;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">📌 What's Next</p>
          <p style="margin:0;color:#664d03;font-size:14px;line-height:1.6;">${nextAction}</p>
        </td>
      </tr>
    </table>` : ""}

    <p style="margin:0 0 8px;color:#495057;font-size:14px;line-height:1.7;">
      We look forward to your participation. If you have any questions, feel free to reach out to the TechUtsav team.
    </p>
    <p style="margin:0;color:#868e96;font-size:14px;">Warm regards,<br /><strong style="color:#1a1a1a;">TechUtsav Team</strong></p>
  `;

  const html = emailWrapper(
    "linear-gradient(135deg, #20c997 0%, #0ca678 100%)",
    "✅",
    "Payment Verified",
    body
  );

  const transporter = getEmailTransporter();
  return transporter.sendMail({
    from: getFromAddress(),
    to: userEmail,
    subject: `✅ Payment Verified – ${passLabel} | TechUtsav`,
    html,
    text: `Hi ${userName}, your ${passLabel} payment has been verified. You are now registered for TechUtsav!`,
  });
}

// ─── Payment Rejected Email ────────────────────────────────────────────────

export async function sendPaymentRejectedEmail({ userName, userEmail, passType, rejectionReason }) {
  const PASS_LABELS = { 1: "Pass 1 – Offline Workshop And Events", 2: "Pass 2 – Paper Presentation", 3: "Pass 3 – Ideathon", 4: "Pass 4 – Online Workshops" };
  const passLabel = PASS_LABELS[passType] ?? `Pass ${passType}`;

  const body = `
    <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;font-weight:700;">Payment Update</h2>
    <p style="margin:0 0 24px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${userName}</strong>,
    </p>

    <!-- Rejected Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8d7da,#f5c6cb);border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#721c24;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">❌ Payment Not Verified</p>
          <p style="margin:0;color:#721c24;font-size:20px;font-weight:700;">${passLabel}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.7;">
      Unfortunately, we were unable to verify your payment for <strong>${passLabel}</strong>.
    </p>

    <!-- Reason -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;color:#856404;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">⚠️ Reason for Rejection</p>
          <p style="margin:0;color:#664d03;font-size:14px;line-height:1.6;">${rejectionReason}</p>
        </td>
      </tr>
    </table>

    <!-- Action Needed -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#e7f3ff;border-left:4px solid #339af0;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;color:#1864ab;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🔁 Action Required</p>
          <p style="margin:0;color:#1c4f82;font-size:14px;line-height:1.6;">
            Please re-submit your payment with a valid transaction screenshot. Log in to your TechUtsav account and resubmit from your profile page.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:#495057;font-size:14px;line-height:1.7;">
      If you believe this is an error, please contact the TechUtsav team with your transaction details.
    </p>
    <p style="margin:0;color:#868e96;font-size:14px;">Regards,<br /><strong style="color:#1a1a1a;">TechUtsav Team</strong></p>
  `;

  const html = emailWrapper(
    "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
    "❌",
    "Payment Not Verified",
    body
  );

  const transporter = getEmailTransporter();
  return transporter.sendMail({
    from: getFromAddress(),
    to: userEmail,
    subject: `❌ Payment Not Verified – ${passLabel} | TechUtsav`,
    html,
    text: `Hi ${userName}, your ${passLabel} payment was rejected. Reason: ${rejectionReason}. Please resubmit your payment.`,
  });
}

// ─── Profile Completion Email (magic link) ─────────────────────────────────

export async function sendProfileCompletionEmail({ userName, userEmail, completionLink }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;font-weight:700;">Complete Your Profile</h2>
    <p style="margin:0 0 24px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${userName}</strong>,
    </p>

    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      We noticed that your TechUtsav profile is still <strong>incomplete</strong>. To make the most of your registration and get priority access, please take a moment to fill in your remaining details.
    </p>

    <!-- Info box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59f00;border-radius:0 8px 8px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#856404;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">⚠️ What's Missing</p>
          <p style="margin:0;color:#664d03;font-size:14px;line-height:1.7;">
            Fields like your college, phone number, year, and department are needed to complete your profile and confirm your spot.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${completionLink}"
            style="display:inline-block;background:linear-gradient(135deg,#4c6ef5,#3b5bdb);color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
            Complete My Profile →
          </a>
        </td>
      </tr>
    </table>

    <!-- Link expiry note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f5;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0;color:#495057;font-size:13px;line-height:1.6;">
            🔒 This link is <strong>one-time use only</strong> and expires in <strong>24 hours</strong>. If it expires, contact us for a new link.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#868e96;font-size:14px;">Warm regards,<br /><strong style="color:#1a1a1a;">TechUtsav Team</strong></p>
  `;

  const html = emailWrapper(
    "linear-gradient(135deg, #4c6ef5 0%, #3b5bdb 100%)",
    "📋",
    "Complete Your Profile",
    body
  );

  const transporter = getEmailTransporter();
  return transporter.sendMail({
    from: getFromAddress(),
    to: userEmail,
    subject: `📋 Action Required: Complete Your TechUtsav Profile`,
    html,
    text: `Hi ${userName}, your TechUtsav profile is incomplete. Please complete it here: ${completionLink} (link expires in 24 hours).`,
  });
}

// ─── Payment Reminder Email ────────────────────────────────────────────────

export async function sendPaymentReminderEmail({ userName, userEmail, registerLink }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;font-weight:700;">Don't Miss Out — Register Now!</h2>
    <p style="margin:0 0 24px;color:#495057;font-size:15px;line-height:1.7;">
      Hi <strong>${userName}</strong>,
    </p>

    <p style="margin:0 0 20px;color:#495057;font-size:15px;line-height:1.7;">
      You've created your TechUtsav account but haven't completed your event registration yet. Secure your spot before it's too late — seats are filling up fast!
    </p>

    <!-- Benefits box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#e7f5ff,#d0ebff);border-radius:10px;margin-bottom:28px;">
      <tr>
        <td style="padding:22px 24px;">
          <p style="margin:0 0 14px;color:#1864ab;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🎯 Benefits of Registering Now</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;">
                <p style="margin:0;color:#1c4f82;font-size:14px;line-height:1.6;">⚡ <strong>Priority access</strong> to rulebooks &amp; event details</p>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;">
                <p style="margin:0;color:#1c4f82;font-size:14px;line-height:1.6;">🏃 <strong>Priority queue</strong> during check-in</p>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;">
                <p style="margin:0;color:#1c4f82;font-size:14px;line-height:1.6;">💺 <strong>Priority seating</strong> for offline workshop</p>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;">
                <p style="margin:0;color:#1c4f82;font-size:14px;line-height:1.6;">🕐 <strong>Register soon</strong> — limited spots available!</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${registerLink}"
            style="display:inline-block;background:linear-gradient(135deg,#f59f00,#e67700);color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
            Register Now →
          </a>
        </td>
      </tr>
    </table>

    <!-- Urgency note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff3cd;border-left:4px solid #f59f00;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0;color:#664d03;font-size:13px;line-height:1.6;">
            🚨 Registration spots are <strong>limited</strong>. Complete your payment at the earliest to guarantee your place at TechUtsav <em>"PARADIGM"</em> '26.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#868e96;font-size:14px;">See you there,<br /><strong style="color:#1a1a1a;">TechUtsav Team</strong></p>
  `;

  const html = emailWrapper(
    "linear-gradient(135deg, #f59f00 0%, #e67700 100%)",
    "🚀",
    "Complete Your Registration",
    body
  );

  const transporter = getEmailTransporter();
  return transporter.sendMail({
    from: getFromAddress(),
    to: userEmail,
    subject: `🚀 You're Almost There — Complete Your TechUtsav Registration!`,
    html,
    text: `Hi ${userName}, you haven't completed your TechUtsav registration yet. Register now for priority access, priority queue during check-in, and priority seating. Register here: ${registerLink}`,
  });
}
