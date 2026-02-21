import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

// Escape a CSV cell value
function csvCell(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => csvCell(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "all-registered" | "paid" | "verified" | "pass-breakdown"

    const users = await User.find({}).lean();

    let rows = [];
    let headers = [];
    let filename = "export.csv";

    // ── All Registered Users ──────────────────────────────────────────────────
    if (type === "all-registered") {
      filename = "all_registered_participants.csv";
      headers = ["name", "email", "college", "department", "year", "phoneNo", "registeredOn"];
      rows = users.map(u => ({
        name: u.name,
        email: u.email,
        college: u.college || "",
        department: u.department || "",
        year: u.year || "",
        phoneNo: u.phoneNo || "",
        registeredOn: u.createdAt ? new Date(u.createdAt).toLocaleString() : "",
      }));
    }

    // ── Users Who Submitted a Payment ─────────────────────────────────────────
    else if (type === "paid") {
      filename = "paid_participants.csv";
      headers = ["name", "email", "college", "department", "year", "phoneNo", "passType", "transactionNumber", "paymentStatus", "submittedOn"];
      rows = users
        .filter(u => u.passes && u.passes.length > 0)
        .flatMap(u =>
          u.passes.map(p => ({
            name: u.name,
            email: u.email,
            college: u.college || "",
            department: u.department || "",
            year: u.year || "",
            phoneNo: u.phoneNo || "",
            passType: `Pass ${p.passType}`,
            transactionNumber: p.transactionNumber || "",
            paymentStatus: p.status,
            submittedOn: p.submittedDate ? new Date(p.submittedDate).toLocaleString() : "",
          }))
        );
    }

    // ── Verified Registrations ────────────────────────────────────────────────
    else if (type === "verified") {
      filename = "verified_participants.csv";
      headers = ["name", "email", "college", "department", "year", "phoneNo", "passType", "transactionNumber", "verifiedOn"];
      rows = users
        .filter(u => u.passes && u.passes.some(p => p.status === "verified"))
        .flatMap(u =>
          u.passes
            .filter(p => p.status === "verified")
            .map(p => ({
              name: u.name,
              email: u.email,
              college: u.college || "",
              department: u.department || "",
              year: u.year || "",
              phoneNo: u.phoneNo || "",
              passType: `Pass ${p.passType}`,
              transactionNumber: p.transactionNumber || "",
              verifiedOn: p.verifiedDate ? new Date(p.verifiedDate).toLocaleString() : "",
            }))
        );
    }

    // ── Pass Breakdown Summary ────────────────────────────────────────────────
    else if (type === "pass-breakdown") {
      filename = "pass_breakdown_summary.csv";
      headers = ["passType", "pending", "verified", "rejected", "total"];
      const breakdown = {};
      for (let i = 1; i <= 4; i++) {
        breakdown[i] = { pending: 0, verified: 0, rejected: 0, total: 0 };
      }
      for (const user of users) {
        if (!user.passes) continue;
        for (const pass of user.passes) {
          const pt = pass.passType;
          if (breakdown[pt]) {
            breakdown[pt][pass.status] = (breakdown[pt][pass.status] || 0) + 1;
            breakdown[pt].total++;
          }
        }
      }
      rows = Object.entries(breakdown).map(([pt, data]) => ({
        passType: `Pass ${pt}`,
        pending: data.pending,
        verified: data.verified,
        rejected: data.rejected,
        total: data.total,
      }));
    }

    else {
      return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
    }

    const csv = toCSV(rows, headers);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
