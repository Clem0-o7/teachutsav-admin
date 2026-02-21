import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToBlob } from "@/lib/blobStorage";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to upload files
    const allowedRoles = ['super-admin', 'events-admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const category = formData.get('category'); // 'tech' or 'nontech'
    const eventName = formData.get('eventName');
    const fileType = formData.get('fileType'); // 'poster' or 'rulebook'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!['tech', 'nontech'].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!['poster', 'rulebook'].includes(fileType)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (!eventName) {
      return NextResponse.json({ error: "Event name is required" }, { status: 400 });
    }

    // Validate file type based on fileType
    const allowedExtensions = {
      poster: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      rulebook: ['pdf']
    };

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions[fileType].includes(fileExtension)) {
      return NextResponse.json({ 
        error: `Invalid file type. ${fileType} must be ${allowedExtensions[fileType].join(', ')}` 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File size must be less than 10MB" 
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

    // Upload to blob storage
    const blobUrl = await uploadToBlob(
      buffer,
      uniqueFileName,
      category,
      eventName,
      fileType
    );

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      url: blobUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}