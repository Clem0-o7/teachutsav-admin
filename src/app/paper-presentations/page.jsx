'use client'
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";

export default function PaperPresentationsPage() {
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
  
  const [viewSheet, setViewSheet] = React.useState(null);
  const [viewLeader, setViewLeader] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [confirmAction, setConfirmAction] = React.useState(null); // { type: 'accept'|'reject', sub }
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const [copiedAbstractId, setCopiedAbstractId] = React.useState(null);

  React.useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      const res = await fetch("/api/paper-presentations/submissions");
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
      arr = arr.filter(sub => (sub.status || "submitted") === filterStatus);
    }
    // Sort
    if (sortBy === "teamName") {
      arr.sort((a, b) => (a.team?.teamName || "")?.localeCompare(b.team?.teamName || ""));
    } else if (sortBy === "leader") {
      arr.sort((a, b) => a.leader.name.localeCompare(b.leader.name));
    } else if (sortBy === "status") {
      arr.sort((a, b) => (a.status || "submitted").localeCompare(b.status || "submitted"));
    }
    return arr;
  }, [submissions, sortBy, debouncedSearch, filterStatus]);

  const handleDownload = (sub) => {
    if (sub.fileUrl) {
      window.open(sub.fileUrl, "_blank");
    }
  };

  const handleCopyAbstract = (abstractText, submissionId) => {
    if (!abstractText) return;
    navigator.clipboard.writeText(abstractText).then(() => {
      setCopiedAbstractId(submissionId);
      setTimeout(() => setCopiedAbstractId(null), 2000);
    });
  };

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
              <h1 className="text-3xl font-bold">Paper Presentations Management</h1>
              <p className="text-muted-foreground">Manage paper submissions, reviews, and presentations</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              const csv = [
                ["Title", "Author", "Email", "Phone", "Status", "File", "Submitted Date"].join(","),
                ...sortedSubs.map(s =>
                  [
                    `"${s.title || ""}"`,
                    `"${s.leader.name}"`,
                    `"${s.leader.email}"`,
                    `"${s.leader.phoneNo || ""}"`,
                    s.status || "submitted",
                    s.fileUrl || "",
                    new Date(s.submittedDate).toLocaleDateString() || ""
                  ].join(",")
                )
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "paper-presentations.csv";
              a.click();
            }}>Download All</Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <Input
              type="text"
              placeholder="Search paper, author, email, title…"
              className="min-w-52"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="teamName">Sort by Team</option>
              <option value="leader">Sort by Author</option>
              <option value="status">Sort by Status</option>
            </select>
            <select className="border rounded px-2 py-1 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="submitted">Submitted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Submissions ({sortedSubs.length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({sortedSubs.filter(s => s.status === "accepted").length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({sortedSubs.filter(s => s.status === "submitted").length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => setSortBy("leader")}>Author</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Abstract</TableHead>
                      <TableHead onClick={() => setSortBy("status")}>Status</TableHead>
                      <TableHead>File</TableHead>
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
                        <TableCell>{sub.leader.name}</TableCell>
                        <TableCell>{sub.leader.email}</TableCell>
                        <TableCell className="max-w-xs truncate">{sub.title}</TableCell>
                        <TableCell className="max-w-sm">
                          <div className="flex items-center justify-between gap-2 group">
                            <span className="truncate text-sm">{sub.abstract}</span>
                            {sub.abstract && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopyAbstract(sub.abstract, sub._id)}
                                title="Copy abstract"
                              >
                                {copiedAbstractId === sub._id ? "✓" : "📋"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.status === "accepted" ? (
                            <Badge className="bg-green-600">Accepted</Badge>
                          ) : sub.status === "rejected" ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : (
                            <Badge variant="outline">Submitted</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.fileUrl ? (
                            <Button size="sm" variant="outline" onClick={() => handleDownload(sub)}>
                              Download
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No file</span>
                          )}
                        </TableCell>
                        <TableCell className="space-x-1">
                          <Button size="sm" variant="outline" onClick={() => setViewLeader(sub.leader)}>View Author</Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={processing || sub.status === "accepted"}
                            onClick={() => setConfirmAction({ type: 'accept', sub })}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={processing || sub.status === "rejected"}
                            onClick={() => setConfirmAction({ type: 'reject', sub })}
                          >
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          {/* Accept/Reject Confirmation Dialog */}
          <Dialog open={!!confirmAction} onOpenChange={() => {
            setConfirmAction(null);
            setRejectionReason("");
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{confirmAction?.type === 'accept' ? 'Accept Paper Presentation' : 'Reject Paper Presentation'}</DialogTitle>
              </DialogHeader>
              {confirmAction && (
                <div className="space-y-4 mt-4">
                  <div>
                    <p>Are you sure you want to <b>{confirmAction.type}</b> the paper <b>"{confirmAction.sub.title}"</b> by <b>{confirmAction.sub.leader.name}</b>?</p>
                    <p className="text-xs text-muted-foreground mt-2">This will send an email to the author.</p>
                  </div>
                  {confirmAction.type === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Rejection Reason (optional)</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows="3"
                        placeholder="Enter reason for rejection (e.g., paper did not meet conference standards)…"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setConfirmAction(null);
                  setRejectionReason("");
                }} disabled={processing}>Cancel</Button>
                <Button
                  variant={confirmAction?.type === 'accept' ? 'default' : 'destructive'}
                  disabled={processing}
                  onClick={async () => {
                    setProcessing(true);
                    setMessage("");
                    const endpoint = `/api/paper-presentations/submissions/${confirmAction.type}`;
                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        submissionId: confirmAction.sub._id,
                        ...(confirmAction.type === 'reject' && { rejectionReason })
                      })
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
                    setRejectionReason("");
                  }}
                >
                  {processing ? (confirmAction?.type === 'accept' ? 'Accepting...' : 'Rejecting...') : (confirmAction?.type === 'accept' ? 'Accept & Send Email' : 'Reject & Send Email')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Leader Dialog */}
          <Dialog open={!!viewLeader} onOpenChange={() => setViewLeader(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Author Details</DialogTitle>
              </DialogHeader>
              {viewLeader && (
                <div className="space-y-2 mt-4">
                  <div><strong>Name:</strong> {viewLeader.name}</div>
                  <div><strong>Email:</strong> {viewLeader.email}</div>
                  <div><strong>Phone:</strong> {viewLeader.phoneNo || "N/A"}</div>
                  <div><strong>College:</strong> {viewLeader.college || "N/A"}</div>
                  <div><strong>Year:</strong> {viewLeader.year || "N/A"}</div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewLeader(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Message */}
          {message && (
            <div className={cn(
              "p-3 rounded-md text-sm",
              message.includes("error") || message.includes("Failed")
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            )}>
              {message}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}