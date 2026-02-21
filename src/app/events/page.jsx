"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

// Tags Enum
const EVENT_TAGS = {
  // Participation Type
  TEAM: "team",
  INDIVIDUAL: "individual",
  
  // Technical Categories
  CODING: "coding",
  AI_ML: "ai-ml",
  DATA_SCIENCE: "data-science",
  CYBERSECURITY: "cybersecurity",
  AR_VR: "ar-vr",
  
  // Non-Technical Categories
  BUSINESS: "business",
  DESIGN: "design",
  UI_UX: "ui-ux",
  GRAPHICS: "graphics",
  MARKETING: "marketing",
  PRESENTATION: "presentation",
  DEBATE: "debate",
  QUIZ: "quiz",
  
  // Skill Type
  PUZZLE: "puzzle",
  REASONING: "reasoning",
  LOGIC: "logic",
  CREATIVE: "creative",
  ANALYTICAL: "analytical",
  PROBLEM_SOLVING: "problem-solving",
  
};

// Convert enum to array for easy iteration
const tagOptions = Object.values(EVENT_TAGS);
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Edit, Trash, Upload, FileText, Image, Eye } from "lucide-react";
import { toast } from "sonner";

export default function EventsPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    uniqueName: '',
    eventName: '',
    department: '',
    category: 'tech',
    eventMode: 'offline',
    tags: [],
    eventTiming: '',
    eventDate: '',
    venue: '',
    eventAbstract: '',
    eventDesp: '',
    registrationRequired: false,
    passRequired: [],
    maxTeamSize: 1,
    minTeamSize: 1,
    registrationFee: 0,
    incharge: '',
    inchargeNumber: '',
    coordinators: [],
    isActive: true,
    priority: 0
  });

  const [coordinatorData, setCoordinatorData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Coordinator'
  });

  // File upload state
  const [formFiles, setFormFiles] = useState({
    poster: null,
    rulebook: null
  });



  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingEvent ? '/api/events' : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';
      const payload = editingEvent ? { ...formData, id: editingEvent._id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // If we have files to upload and we're creating/updating an event
        if ((formFiles.poster || formFiles.rulebook) && (data.event || editingEvent)) {
          const eventId = editingEvent ? editingEvent._id : data.event._id;
          const eventName = formData.eventName;
          const category = formData.category;

          const uploadResults = await uploadFormFiles(eventId, eventName, category);

          // Update event with file URLs if any were uploaded
          if (uploadResults.poster || uploadResults.rulebook) {
            const updatePayload = { id: eventId };
            if (uploadResults.poster) updatePayload.poster = uploadResults.poster;
            if (uploadResults.rulebook) updatePayload.rulebook = uploadResults.rulebook;

            await fetch('/api/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            });
          }
        }

        toast.success(editingEvent ? 'Event updated successfully' : 'Event created successfully');
        setIsEventSheetOpen(false);
        resetForm();
        fetchEvents();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  // Handle file upload
  const handleFileUpload = async (eventId, eventName, category, fileType, file) => {
    const uploadKey = `${eventId}-${fileType}`;
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventName', eventName);
      formData.append('category', category);
      formData.append('fileType', fileType);

      const response = await fetch('/api/events/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Update the event with the new file URL
        const updateResponse = await fetch('/api/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: eventId,
            [fileType]: data.url
          })
        });

        if (updateResponse.ok) {
          toast.success(`${fileType} uploaded successfully`);
          fetchEvents();
        }
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Handle event deletion
  const handleDelete = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Event deleted successfully');
        fetchEvents();
      } else {
        toast.error(data.error || 'Deletion failed');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      uniqueName: '',
      eventName: '',
      department: '',
      category: 'tech',
      eventMode: 'offline',
      tags: [],
      eventTiming: 'TBA',
      eventDate: '',
      venue: 'TBA',
      eventAbstract: '',
      eventDesp: '',
      registrationRequired: false,
      passRequired: [],
      maxTeamSize: 1,
      minTeamSize: 1,
      registrationFee: 0,
      incharge: 'Event Incharge',
      inchargeNumber: '9966775544',
      coordinators: [],
      isActive: true,
      priority: 0
    });
    setEditingEvent(null);
    setCoordinatorData({ name: '', email: '', phone: '', role: 'Coordinator' });
    setFormFiles({ poster: null, rulebook: null });
  };

  // Handle edit
  const handleEdit = (event) => {
    setFormData(event);
    setEditingEvent(event);
    setIsEventSheetOpen(true);
  };

  // Add coordinator
  const addCoordinator = () => {
    if (coordinatorData.name.trim()) {
      setFormData(prev => ({
        ...prev,
        coordinators: [...prev.coordinators, { ...coordinatorData }]
      }));
      setCoordinatorData({ name: '', email: '', phone: '', role: 'Coordinator' });
    }
  };

  // Remove coordinator
  const removeCoordinator = (index) => {
    setFormData(prev => ({
      ...prev,
      coordinators: prev.coordinators.filter((_, i) => i !== index)
    }));
  };

  // Handle file selection in form
  const handleFormFileSelect = (fileType, file) => {
    setFormFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  // Upload files for form submission
  const uploadFormFiles = async (eventId, eventName, category) => {
    const uploadResults = { poster: null, rulebook: null };

    for (const [fileType, file] of Object.entries(formFiles)) {
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('eventName', eventName);
          formData.append('category', category);
          formData.append('fileType', fileType);

          const response = await fetch('/api/events/upload', {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          if (data.success) {
            uploadResults[fileType] = data.url;
          }
        } catch (error) {
          console.error(`Error uploading ${fileType}:`, error);
        }
      }
    }

    return uploadResults;
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)"
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Events Management</h1>
              <p className="text-muted-foreground">Manage Techutsav events, posters, and rulebooks</p>
            </div>
            <Sheet open={isEventSheetOpen} onOpenChange={setIsEventSheetOpen}>
              <SheetTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[800px] lg:w-[900px] xl:w-[1000px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</SheetTitle>
                </SheetHeader>
                
                <form onSubmit={handleSubmit} className="space-y-8 mt-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="coordinators">Coordinators</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="uniqueName">Unique Name</Label>
                          <Input
                            id="uniqueName"
                            value={formData.uniqueName}
                            onChange={(e) => setFormData({...formData, uniqueName: e.target.value})}
                            required
                            className="h-12"
                            placeholder="e.g., hackathon-2024"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventName">Event Name</Label>
                          <Input
                            id="eventName"
                            value={formData.eventName}
                            onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                            required
                            className="h-12"
                            placeholder="e.g., AI Hackathon"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                            required
                            className="h-12"
                            placeholder="e.g., Computer Science"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({...formData, category: value})}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tech">Tech</SelectItem>
                              <SelectItem value="non-tech">Non-Tech</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="venue">Venue</Label>
                          <Input
                            id="venue"
                            value={formData.venue}
                            onChange={(e) => setFormData({...formData, venue: e.target.value})}
                            className="h-12"
                            placeholder="e.g., Main Auditorium"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventMode">Event Mode</Label>
                          <Select
                            value={formData.eventMode}
                            onValueChange={(value) => setFormData({...formData, eventMode: value})}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="offline">Offline</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tags">Event Tags</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px] bg-background">
                          {tagOptions.map((tag) => {
                            const isSelected = formData.tags.includes(tag);
                            return (
                              <Badge
                                key={tag}
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer transition-colors ${
                                  isSelected 
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                    : "hover:bg-muted"
                                }`}
                                onClick={() => {
                                  const newTags = isSelected
                                    ? formData.tags.filter(t => t !== tag)
                                    : [...formData.tags, tag];
                                  setFormData({ ...formData, tags: newTags });
                                }}
                              >
                                {tag.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Click tags to select/deselect. Selected: {formData.tags.length}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventDate">Event Date & Time</Label>
                        <Input
                          id="eventDate"
                          type="datetime-local"
                          value={formData.eventDate ? new Date(formData.eventDate).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventTiming">Event Timing Description</Label>
                        <Input
                          id="eventTiming"
                          value={formData.eventTiming}
                          onChange={(e) => setFormData({...formData, eventTiming: e.target.value})}
                          className="h-12"
                          placeholder="e.g., 10:00 AM - 5:00 PM"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="eventAbstract">Abstract</Label>
                        <Textarea
                          id="eventAbstract"
                          value={formData.eventAbstract}
                          onChange={(e) => setFormData({...formData, eventAbstract: e.target.value})}
                          rows={4}
                          className="resize-none"
                          placeholder="Brief description of the event..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventDesp">Detailed Description</Label>
                        <Textarea
                          id="eventDesp"
                          value={formData.eventDesp}
                          onChange={(e) => setFormData({...formData, eventDesp: e.target.value})}
                          rows={12}
                          className="resize-none min-h-[300px]"
                          placeholder="Detailed event description, rules, requirements, judging criteria, timeline, and any other important information..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="minTeamSize">Min Team Size</Label>
                          <Input
                            id="minTeamSize"
                            type="number"
                            min="1"
                            value={formData.minTeamSize}
                            onChange={(e) => setFormData({...formData, minTeamSize: parseInt(e.target.value)})}
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxTeamSize">Max Team Size</Label>
                          <Input
                            id="maxTeamSize"
                            type="number"
                            min="1"
                            value={formData.maxTeamSize}
                            onChange={(e) => setFormData({...formData, maxTeamSize: parseInt(e.target.value)})}
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registrationFee">Registration Fee (₹)</Label>
                          <Input
                            id="registrationFee"
                            type="number"
                            min="0"
                            value={formData.registrationFee}
                            onChange={(e) => setFormData({...formData, registrationFee: parseInt(e.target.value)})}
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="incharge">Event Incharge</Label>
                          <Input
                            id="incharge"
                            value={formData.incharge}
                            onChange={(e) => setFormData({...formData, incharge: e.target.value})}
                            className="h-12"
                            placeholder="Event head name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inchargeNumber">Incharge Phone Number</Label>
                          <Input
                            id="inchargeNumber"
                            value={formData.inchargeNumber}
                            onChange={(e) => setFormData({...formData, inchargeNumber: e.target.value})}
                            className="h-12"
                            placeholder="+91 9876543210"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority (for sorting)</Label>
                          <Input
                            id="priority"
                            type="number"
                            min="0"
                            value={formData.priority}
                            onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                            className="h-12"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-center space-x-2 mt-8">
                          <input
                            type="checkbox"
                            id="registrationRequired"
                            checked={formData.registrationRequired}
                            onChange={(e) => setFormData({...formData, registrationRequired: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="registrationRequired">Registration Required</Label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="files" className="space-y-6">
                      <div className="space-y-6">
                        <div className="space-y-4 p-6 border rounded-lg bg-background border-border">
                          <h4 className="font-semibold text-lg flex items-center gap-2">
                            <Image className="w-5 h-5" />
                            Event Poster Upload
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFormFileSelect('poster', e.target.files[0])}
                                className="hidden"
                                id="form-poster-upload"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('form-poster-upload').click()}
                                className="w-full h-12"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {formFiles.poster ? `Selected: ${formFiles.poster.name}` : 'Choose Poster Image'}
                              </Button>
                            </div>
                            {formFiles.poster && (
                              <div className="p-4 bg-muted/50 rounded border border-border">
                                <div className="text-sm text-muted-foreground">
                                  <strong>File:</strong> {formFiles.poster.name}<br />
                                  <strong>Size:</strong> {(formFiles.poster.size / 1024 / 1024).toFixed(2)} MB<br />
                                  <strong>Type:</strong> {formFiles.poster.type}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Accepted formats: JPG, PNG, GIF, WebP. Maximum size: 10MB
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 p-6 border rounded-lg bg-background border-border">
                          <h4 className="font-semibold text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Rulebook Upload
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFormFileSelect('rulebook', e.target.files[0])}
                                className="hidden"
                                id="form-rulebook-upload"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('form-rulebook-upload').click()}
                                className="w-full h-12"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {formFiles.rulebook ? `Selected: ${formFiles.rulebook.name}` : 'Choose Rulebook PDF'}
                              </Button>
                            </div>
                            {formFiles.rulebook && (
                              <div className="p-4 bg-muted/50 rounded border border-border">
                                <div className="text-sm text-muted-foreground">
                                  <strong>File:</strong> {formFiles.rulebook.name}<br />
                                  <strong>Size:</strong> {(formFiles.rulebook.size / 1024 / 1024).toFixed(2)} MB<br />
                                  <strong>Type:</strong> {formFiles.rulebook.type}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Accepted format: PDF only. Maximum size: 10MB
                            </p>
                          </div>
                        </div>

                        {editingEvent && (
                          <div className="space-y-4 p-6 border rounded-lg bg-background border-border">
                            <h4 className="font-semibold text-lg">Current Files</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Current Poster:</Label>
                                {editingEvent?.poster ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.open(editingEvent.poster, '_blank')}
                                    className="w-full"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Current Poster
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No poster uploaded</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Current Rulebook:</Label>
                                {editingEvent?.rulebook ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.open(editingEvent.rulebook, '_blank')}
                                    className="w-full"
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Current Rulebook
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No rulebook uploaded</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="coordinators" className="space-y-6">
                      <div className="space-y-6 p-6 border rounded-lg bg-background border-border">
                        <h4 className="font-semibold text-lg">Add New Coordinator</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="coordName">Name *</Label>
                            <Input
                              id="coordName"
                              value={coordinatorData.name}
                              onChange={(e) => setCoordinatorData({...coordinatorData, name: e.target.value})}
                              className="h-12"
                              placeholder="Coordinator full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="coordEmail">Email</Label>
                            <Input
                              id="coordEmail"
                              type="email"
                              value={coordinatorData.email}
                              onChange={(e) => setCoordinatorData({...coordinatorData, email: e.target.value})}
                              className="h-12"
                              placeholder="coordinator@example.com"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="coordPhone">Phone Number</Label>
                            <Input
                              id="coordPhone"
                              value={coordinatorData.phone}
                              onChange={(e) => setCoordinatorData({...coordinatorData, phone: e.target.value})}
                              className="h-12"
                              placeholder="+91 9876543210"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="coordRole">Role</Label>
                            <Input
                              id="coordRole"
                              value={coordinatorData.role}
                              onChange={(e) => setCoordinatorData({...coordinatorData, role: e.target.value})}
                              className="h-12"
                              placeholder="e.g., Student Coordinator"
                            />
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          onClick={addCoordinator} 
                          className="w-full sm:w-auto h-12 px-8"
                          disabled={!coordinatorData.name.trim()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Coordinator
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Current Coordinators ({formData.coordinators.length})</h4>
                        {formData.coordinators.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                            No coordinators added yet. Add coordinators using the form above.
                          </div>
                        ) : (
                          formData.coordinators.map((coordinator, index) => (
                            <div key={index} className="flex items-start justify-between p-4 bg-background border rounded-lg shadow-sm border-border">
                              <div className="flex-1">
                                <div className="font-medium text-lg">{coordinator.name}</div>
                                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                  <div><strong>Role:</strong> {coordinator.role}</div>
                                  {coordinator.email && <div><strong>Email:</strong> {coordinator.email}</div>}
                                  {coordinator.phone && <div><strong>Phone:</strong> {coordinator.phone}</div>}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeCoordinator(index)}
                                className="ml-4 flex-shrink-0"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                    <Button type="submit" className="flex-1 h-12 text-lg font-medium">
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEventSheetOpen(false)}
                      className="flex-1 sm:flex-none h-12 px-8"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          {/* Events List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">
                No events found. Create your first event!
              </div>
            ) : (
              events.map((event) => (
                <Card key={event._id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{event.eventName}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={event.category === 'tech' ? 'default' : 'secondary'}>
                            {event.category}
                          </Badge>
                          <Badge variant="outline">{event.department}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(event._id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {event.eventAbstract || 'No description available'}
                      </p>
                      
                      {event.venue && (
                        <div className="text-sm">
                          <span className="font-medium">Venue:</span> {event.venue}
                        </div>
                      )}

                      {event.eventDate && (
                        <div className="text-sm">
                          <span className="font-medium">Date:</span> {new Date(event.eventDate).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex gap-2 text-sm">
                        <span className="font-medium">Team Size:</span>
                        {event.minTeamSize === event.maxTeamSize 
                          ? event.maxTeamSize 
                          : `${event.minTeamSize}-${event.maxTeamSize}`}
                      </div>

                      {/* File Upload Section */}
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Poster:</span>
                          <div className="flex gap-2">
                            {event.poster ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(event.poster, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            ) : null}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`poster-${event._id}`}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleFileUpload(event._id, event.eventName, event.category, 'poster', file);
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`poster-${event._id}`).click()}
                              disabled={uploadingFiles[`${event._id}-poster`]}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Rulebook:</span>
                          <div className="flex gap-2">
                            {event.rulebook ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(event.rulebook, '_blank')}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            ) : null}
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              id={`rulebook-${event._id}`}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleFileUpload(event._id, event.eventName, event.category, 'rulebook', file);
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`rulebook-${event._id}`).click()}
                              disabled={uploadingFiles[`${event._id}-rulebook`]}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}