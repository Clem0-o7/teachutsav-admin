import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

const PASS_LABELS = {
  1: "Pass 1 – Offline",
  2: "Pass 2 – Paper", 
  3: "Pass 3 – Idea",
  4: "Pass 4 – Online",
};

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const passType = parseInt(searchParams.get('passType'));
    
    if (!passType || !PASS_LABELS[passType]) {
      return Response.json({ 
        success: false, 
        message: "Invalid pass type" 
      }, { status: 400 });
    }

    // Get all users with passes, following the same pattern as the main payments API
    const users = await User.find(
      { "passes.0": { $exists: true } },
      { name: 1, email: 1, college: 1, department: 1, year: 1, isStudent: 1, passes: 1 }
    ).lean();

    const verifiedPayments = [];
    
    // Build verified payments array for the specific pass type
    for (const user of users) {
      for (const pass of user.passes) {
        // Filter for verified payments of the specified pass type
        if (pass.passType === passType && pass.status === "verified") {
          verifiedPayments.push({
            userName: user.name,
            userEmail: user.email,
            college: user.college || "",
            department: user.department || "",
            year: user.year || "",
            isStudent: user.isStudent,
            transactionNumber: pass.transactionNumber,
            paymentIdType: pass.paymentIdType,
            submittedDate: pass.submittedDate,
            passType: passType
          });
        }
      }
    }

    // Generate CSV content
    const csvHeader = [
      'S.No',
      'Participant Name', 
      'Designation (Student - Year)',
      'Institute Name',
      'Department',
      'Transaction ID',
      'Remark - Type of Payment ID',
      'Date of Fee Payment'
    ];

    const csvRows = verifiedPayments.map((payment, index) => [
      index + 1,
      `"${payment.userName}"`,
      `"Student-Year ${payment.year || 'N/A'}"`,
      `"${payment.college || 'N/A'}"`,
      `"${payment.department || 'N/A'}"`,
      `"${payment.transactionNumber}"`,
      `"${payment.paymentIdType === 'upi' ? 'UPI Transaction ID' : 
           payment.paymentIdType === 'eazypay' ? 'EazyPay Transaction ID' : 
           'Not Specified'}"`,
      `"${new Date(payment.submittedDate).toLocaleDateString('en-IN')}"`
    ]);

    const csvContent = [csvHeader.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    const filename = `${PASS_LABELS[passType].replace(/[^a-zA-Z0-9]/g, '_')}_Verified_Payments_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error("Download error:", error);
    return Response.json({
      success: false,
      message: "Failed to generate download"
    }, { status: 500 });
  }
}