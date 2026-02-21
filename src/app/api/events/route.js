import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Event from "@/lib/models/Event";
import { deleteFromBlob } from "@/lib/blobStorage";

// GET - Fetch all events
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view events
    const allowedRoles = ['super-admin', 'events-admin', 'view-only'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await dbConnect();
    
    const events = await Event.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST - Create new event  
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create events
    const allowedRoles = ['super-admin', 'events-admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const eventData = await request.json();

    // Validate required fields
    const requiredFields = ['uniqueName', 'eventName', 'department', 'category'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    // Check if unique name already exists
    const existingEvent = await Event.findOne({ uniqueName: eventData.uniqueName });
    if (existingEvent) {
      return NextResponse.json(
        { error: "Event with this unique name already exists" },
        { status: 409 }
      );
    }

    // Create new event
    const event = new Event({
      ...eventData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await event.save();
    
    return NextResponse.json({
      success: true,
      message: "Event created successfully",
      event
    }, { status: 201 });

  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// PUT - Update event
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to update events
    const allowedRoles = ['super-admin', 'events-admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const event = await Event.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE - Delete event
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to delete events
    const allowedRoles = ['super-admin', 'events-admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const event = await Event.findById(id);
    
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Delete associated files from blob storage
    if (event.poster) {
      await deleteFromBlob(event.poster);
    }
    if (event.rulebook) {
      await deleteFromBlob(event.rulebook);
    }

    await Event.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error("Event deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}