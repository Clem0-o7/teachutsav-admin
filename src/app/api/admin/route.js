import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import { Admin } from "@/lib/models/Admin";

export async function POST(request) {
  try {
    const { email, name, password, role, createdBy } = await request.json();

    // Validate required fields
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, password, role" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['super-admin', 'view-only', 'events-admin', 'payments-admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: " + validRoles.join(', ') },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new admin
    const admin = new Admin({
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role,
      createdBy: createdBy || null,
      isActive: true
    });

    await admin.save();

    // Return admin data without password
    const { password: _, ...adminData } = admin.toObject();
    
    return NextResponse.json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: adminData._id,
        email: adminData.email,
        name: adminData.name,
        role: adminData.role,
        permissions: adminData.permissions,
        isActive: adminData.isActive,
        createdAt: adminData.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Admin creation error:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    
    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}