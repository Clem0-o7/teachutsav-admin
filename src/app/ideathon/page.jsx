
'use client'
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";

export default function IdeathonPage() {
  const { status } = useSession();
  const [submissions, setSubmissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState("teamName");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [accepting, setAccepting] = React.useState(null);
  const [viewSheet, setViewSheet] = React.useState(null);
  // Remove viewDialog state, use navigation instead
  const [viewLeader, setViewLeader] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [confirmAction, setConfirmAction] = React.useState(null); // { type: 'accept'|'reject', sub }
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      const res = await fetch("/api/ideathon/submissions");
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setLoading(false);
    }
    fetchSubmissions();
  }, []);

  // Sorting and filtering logic
  const sortedSubs = React.useMemo(() => {
    if (!submissions) return [];
    let arr = [...submissions];
    // Filter by search
    if (debouncedSearch) {
      arr = arr.filter(sub =>
        (sub.team?.teamName || "Individual").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        sub.leader.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        sub.leader.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        sub.title?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    // Filter by status
    if (filterStatus !== "all") {
      arr = arr.filter(sub => (sub.status || "pending") === filterStatus);
    }
    // Sort
    if (sortBy === "teamName") {
      arr.sort((a, b) => (a.team?.teamName || "")?.localeCompare(b.team?.teamName || ""));
    } else if (sortBy === "leader") {
      arr.sort((a, b) => a.leader.name.localeCompare(b.leader.name));
    } else if (sortBy === "status") {
      arr.sort((a, b) => (a.status || "pending").localeCompare(b.status || "pending"));
    }
    return arr;
  }, [submissions, sortBy, debouncedSearch, filterStatus]);

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground"><Skeleton className="h-12 w-48" /></div>;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" }}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 lg:p-6 space-y-6">
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Ideathon Management</h1>
              <p className="text-muted-foreground">Manage ideathon registrations, teams, submissions, and evaluations</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              const csv = [
                ["Team Name", "Leader", "Email", "Phone", "Members", "Title", "Status", "File", "Submitted Date"].join(","),
                ...sortedSubs.map(s =>
                  [
                    `"${s.team?.teamName || "Individual"}"`,
                    `"${s.leader.name}"`,
                    `"${s.leader.email}"`,
                    `"${s.leader.phoneNo || ""}"`,
                    `"${s.members.map(m => m.name).join("; ") || ""}"`,
                    `"${s.title || ""}"`,
                    s.status || "pending",
                    s.fileUrl || "",
                    new Date(s.submittedDate).toLocaleDateString() || ""
                  ].join(",")
                )
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "ideathon-submissions.csv";
              a.click();
            }}>Download All</Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <input
              type="text"
              placeholder="Search team, leader, email, title…"
              className="border rounded px-3 py-1 text-sm min-w-52"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="teamName">Sort by Team</option>
              <option value="leader">Sort by Leader</option>
              <option value="status">Sort by Status</option>
            </select>
            <select className="border rounded px-2 py-1 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Submissions ({sortedSubs.length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => setSortBy("teamName")}>Team Name</TableHead>
                      <TableHead onClick={() => setSortBy("leader")}>Leader</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead onClick={() => setSortBy("status")}>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSubs.map(sub => (
                      <TableRow
                        key={sub._id}
                        className={cn(
                          "transition-colors",
                          sub.status === "accepted" && "bg-muted/40 dark:bg-muted/60"
                        )}
                      >
                        <TableCell>{sub.team?.teamName || <Badge variant="secondary">Individual</Badge>}</TableCell>
                        <TableCell>{sub.leader.name}</TableCell>
                        <TableCell>{sub.leader.email}</TableCell>
                        <TableCell>{sub.leader.phoneNo}</TableCell>
                        <TableCell>{sub.members.map(m => m.name).join(", ")}</TableCell>
                        <TableCell>{sub.title}</TableCell>
                        <TableCell>{sub.status || <Badge variant="outline">Pending</Badge>}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setViewSheet(sub)}>View Team</Button>
                          <Button size="sm" variant="outline" onClick={() => setViewLeader(sub.leader)}>View Leader</Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(`/ideathon/submission/${sub._id}`, "_blank")}>View Submission</Button>
                          <Button size="sm" variant="success" disabled={processing} onClick={() => setConfirmAction({ type: 'accept', sub })}>Accept</Button>
                          <Button size="sm" variant="destructive" disabled={processing} onClick={() => setConfirmAction({ type: 'reject', sub })}>Reject</Button>
                        </TableCell>
                        {/* Accept/Reject Confirmation Dialog */}
                        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{confirmAction?.type === 'accept' ? 'Accept Submission' : 'Reject Submission'}</DialogTitle>
                            </DialogHeader>
                            {confirmAction && (
                              <div className="space-y-2 mt-2">
                                <div>Are you sure you want to <b>{confirmAction.type}</b> the submission <b>{confirmAction.sub.title}</b> by <b>{confirmAction.sub.leader.name}</b>?</div>
                                <div className="text-xs text-muted-foreground">This will send an email to all team members and update the status.</div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={processing}>Cancel</Button>
                              <Button variant={confirmAction?.type === 'accept' ? 'success' : 'destructive'} disabled={processing} onClick={async () => {
                                setProcessing(true);
                                setMessage("");
                                const res = await fetch(`/api/ideathon/submissions/${confirmAction.type}`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ submissionId: confirmAction.sub._id })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setMessage(`${confirmAction.type === 'accept' ? 'Accepted' : 'Rejected'} and email sent.`);
                                  setSubmissions(submissions.map(s => s._id === confirmAction.sub._id ? { ...s, status: confirmAction.type === 'accept' ? 'accepted' : 'rejected' } : s));
                                } else {
                                  setMessage(data.error || `Failed to ${confirmAction.type}.`);
                                }
                                setProcessing(false);
                                setConfirmAction(null);
                              }}>{processing ? (confirmAction?.type === 'accept' ? 'Accepting...' : 'Rejecting...') : (confirmAction?.type === 'accept' ? 'Accept & Send Mail' : 'Reject & Send Mail')}</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            {/* Accepted and Pending tabs can be implemented similarly */}
          </Tabs>

          {/* View Team Sheet */}
          <Sheet open={!!viewSheet} onOpenChange={() => setViewSheet(null)}>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Team Details</SheetTitle>
                <SheetDescription>{viewSheet?.team?.teamName || "Individual Submission"}</SheetDescription>
              </SheetHeader>
              {viewSheet && (
                <div className="space-y-2 mt-4">
                  <div><strong>Leader:</strong> {viewSheet.leader.name} ({viewSheet.leader.email}, {viewSheet.leader.phoneNo})</div>
                  <div><strong>Members:</strong> {viewSheet.members.map(m => `${m.name} (${m.email})`).join(", ")}</div>
                  <div><strong>College:</strong> {viewSheet.leader.college}</div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* View Leader Dialog */}
          <Dialog open={!!viewLeader} onOpenChange={() => setViewLeader(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leader Details</DialogTitle>
              </DialogHeader>
              {viewLeader && (
                <div className="space-y-2 mt-2">
                  <div><strong>Name:</strong> {viewLeader.name}</div>
                  <div><strong>Email:</strong> {viewLeader.email}</div>
                  <div><strong>Phone:</strong> {viewLeader.phoneNo}</div>
                  <div><strong>College:</strong> {viewLeader.college}</div>
                  <div><strong>Year:</strong> {viewLeader.year}</div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewLeader(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {/* View Submission Dialog removed; handled by dedicated page */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}