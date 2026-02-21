"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const tagOptions = ["team", "individual", "coding", "puzzle", "experience", "reasoning", "ai", "business", "design", "other"];

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
    setEditingEvent(null);
    setCoordinatorData({ name: '', email: '', phone: '', role: 'Coordinator' });
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
        coordinators: [...prev.coordinators, coordinatorData]
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
              <SheetContent side="right" className="w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</SheetTitle>
                </SheetHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="coordinators">Coordinators</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="uniqueName">Unique Name</Label>
                          <Input
                            id="uniqueName"
                            value={formData.uniqueName}
                            onChange={(e) => setFormData({...formData, uniqueName: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="eventName">Event Name</Label>
                          <Input
                            id="eventName"
                            value={formData.eventName}
                            onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({...formData, category: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tech">Tech</SelectItem>
                              <SelectItem value="non-tech">Non-Tech</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="venue">Venue</Label>
                        <Input
                          id="venue"
                          value={formData.venue}
                          onChange={(e) => setFormData({...formData, venue: e.target.value})}
                        />
                      </div>

                      <div>
                        <Label htmlFor="eventDate">Event Date</Label>
                        <Input
                          id="eventDate"
                          type="datetime-local"
                          value={formData.eventDate ? new Date(formData.eventDate).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4">
                      <div>
                        <Label htmlFor="eventAbstract">Abstract</Label>
                        <Textarea
                          id="eventAbstract"
                          value={formData.eventAbstract}
                          onChange={(e) => setFormData({...formData, eventAbstract: e.target.value})}
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="eventDesp">Description</Label>
                        <Textarea
                          id="eventDesp"
                          value={formData.eventDesp}
                          onChange={(e) => setFormData({...formData, eventDesp: e.target.value})}
                          rows={6}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="minTeamSize">Min Team Size</Label>
                          <Input
                            id="minTeamSize"
                            type="number"
                            min="1"
                            value={formData.minTeamSize}
                            onChange={(e) => setFormData({...formData, minTeamSize: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxTeamSize">Max Team Size</Label>
                          <Input
                            id="maxTeamSize"
                            type="number"
                            min="1"
                            value={formData.maxTeamSize}
                            onChange={(e) => setFormData({...formData, maxTeamSize: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="registrationFee">Registration Fee</Label>
                          <Input
                            id="registrationFee"
                            type="number"
                            min="0"
                            value={formData.registrationFee}
                            onChange={(e) => setFormData({...formData, registrationFee: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="coordinators" className="space-y-4">
                      <div className="space-y-4 p-4 border rounded">
                        <h4 className="font-medium">Add Coordinator</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="coordName">Name</Label>
                            <Input
                              id="coordName"
                              value={coordinatorData.name}
                              onChange={(e) => setCoordinatorData({...coordinatorData, name: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="coordEmail">Email</Label>
                            <Input
                              id="coordEmail"
                              type="email"
                              value={coordinatorData.email}
                              onChange={(e) => setCoordinatorData({...coordinatorData, email: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="coordPhone">Phone</Label>
                            <Input
                              id="coordPhone"
                              value={coordinatorData.phone}
                              onChange={(e) => setCoordinatorData({...coordinatorData, phone: e.target.value})}
                            />
                          </div>
                          <div>
                            <Button type="button" onClick={addCoordinator} className="mt-6">
                              Add Coordinator
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Current Coordinators</h4>
                        {formData.coordinators.map((coordinator, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{coordinator.name}</div>
                              <div className="text-sm text-gray-600">{coordinator.email} | {coordinator.phone}</div>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeCoordinator(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1">
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEventSheetOpen(false)}
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