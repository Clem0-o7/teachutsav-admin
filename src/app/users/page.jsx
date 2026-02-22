"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IconSearch,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconUsers,
  IconUserCheck,
  IconAlertTriangle,
  IconCreditCard,
  IconX,
  IconMail,
  IconSend,
} from "@tabler/icons-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const PASS_LABELS = { 1: "Pass 1", 2: "Pass 2", 3: "Pass 3", 4: "Pass 4" };
const MISSING_LABELS = {
  college:       "College",
  phoneNo:       "Phone",
  year:          "Year",
  department:    "Department",
  emailVerified: "Email not verified",
};

function PassBadge({ passType, status }) {
  const variant =
    status === "verified" ? "default" :
    status === "rejected" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className="text-xs">
      P{passType}
    </Badge>
  );
}

function OnboardingBadge({ completed }) {
  return completed ? (
    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">Complete</Badge>
  ) : (
    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Incomplete</Badge>
  );
}

function MissingFieldPill({ field }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600 border border-red-200">
      {MISSING_LABELS[field] ?? field}
    </span>
  );
}

// ─── stat cards ───────────────────────────────────────────────────────────────

function StatCards({ users }) {
  const total      = users.length;
  const onboarded  = users.filter((u) => u.onboardingCompleted).length;
  const incomplete = users.filter((u) => u.missingFields?.length > 0).length;
  const withPasses = users.filter((u) => u.passes?.length > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <IconUsers className="size-4" /> Total Users
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <IconUserCheck className="size-4" /> Onboarded
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold">{onboarded}</div>
          <p className="text-xs text-muted-foreground">
            {total ? Math.round((onboarded / total) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <IconAlertTriangle className="size-4" /> Incomplete
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-amber-600">{incomplete}</div>
          <p className="text-xs text-muted-foreground">missing fields</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <IconCreditCard className="size-4" /> With Passes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold">{withPasses}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── edit sheet ───────────────────────────────────────────────────────────────

function EditUserSheet({ user, open, onOpenChange, onSaved, isSuperAdmin }) {
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name:                user.name ?? "",
        email:               user.email ?? "",
        college:             user.college ?? "",
        phoneNo:             user.phoneNo ?? "",
        year:                user.year ?? "",
        department:          user.department ?? "",
        onboardingCompleted: user.onboardingCompleted ?? false,
        isEmailVerified:     user.isEmailVerified ?? false,
      });
    }
  }, [user]);

  const handle = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("User updated successfully");
      onSaved(data.user);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(e) => handle("name", e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => handle("email", e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div className="space-y-1.5">
            <Label>College</Label>
            <Input value={form.college} onChange={(e) => handle("college", e.target.value)} disabled={!isSuperAdmin} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phoneNo} onChange={(e) => handle("phoneNo", e.target.value)} disabled={!isSuperAdmin} />
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input type="number" min={1} max={5} value={form.year} onChange={(e) => handle("year", e.target.value)} disabled={!isSuperAdmin} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => handle("department", e.target.value)} disabled={!isSuperAdmin} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="emailVerified"
                checked={!!form.isEmailVerified}
                onCheckedChange={(v) => handle("isEmailVerified", !!v)}
                disabled={!isSuperAdmin}
              />
              <Label htmlFor="emailVerified">Email Verified</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="onboarding"
                checked={!!form.onboardingCompleted}
                onCheckedChange={(v) => handle("onboardingCompleted", !!v)}
                disabled={!isSuperAdmin}
              />
              <Label htmlFor="onboarding">Onboarding Completed</Label>
            </div>
          </div>

          <Separator />

          {user.passes?.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Passes (read-only)</Label>
              <div className="space-y-2">
                {user.passes.map((p) => (
                  <div key={p._id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                    <span className="font-medium">{PASS_LABELS[p.passType]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.transactionNumber}</span>
                      <PassBadge passType={p.passType} status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSuperAdmin && (
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── delete dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ open, onOpenChange, users, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    try {
      const ids = users.map((u) => u._id);
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted} user${data.deleted !== 1 ? "s" : ""}`);
      onDeleted(ids);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {users.length > 1 ? `${users.length} Users` : "User"}</DialogTitle>
          <DialogDescription>
            {users.length === 1
              ? `Are you sure you want to permanently delete ${users[0]?.name}? This cannot be undone.`
              : `Are you sure you want to permanently delete ${users.length} users? This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {users.length > 1 && (
          <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-1">
            {users.map((u) => (
              <div key={u._id} className="text-sm flex items-center gap-2">
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground text-xs">{u.email}</span>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={doDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── send email dialog ───────────────────────────────────────────────────────

function SendEmailDialog({ open, onOpenChange, users, emailType, onDone }) {
  const [sending, setSending] = useState(false);

  const isProfile = emailType === "profile-completion";
  const title     = isProfile ? "Send Profile Completion Email" : "Send Payment Reminder Email";
  const desc      = isProfile
    ? "A one-time magic link (valid 24 hours) will be emailed to each selected user so they can complete their profile."
    : "A reminder email with registration benefits will be sent to each selected user.";

  const doSend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/users/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: emailType, userIds: users.map((u) => u._id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.failedCount === 0) {
        toast.success(`Sent ${data.sentCount} email${data.sentCount !== 1 ? "s" : ""} successfully`);
      } else {
        toast.warning(`${data.sentCount} sent, ${data.failedCount} failed`);
      }
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-1">
          {users.map((u) => (
            <div key={u._id} className="text-sm flex items-center gap-2 py-0.5">
              <IconMail className="size-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{u.name}</span>
              <span className="text-muted-foreground text-xs truncate">{u.email}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={doSend} disabled={sending} className="gap-2">
            <IconSend className="size-4" />
            {sending ? "Sending…" : `Send to ${users.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── user table ───────────────────────────────────────────────────────────────

function UserTable({ users, selectedIds, onToggle, onToggleAll, onEdit, onDelete, onEmail, emailType, isSuperAdmin, highlightMissing }) {
  const allSelected  = users.length > 0 && users.every((u) => selectedIds.has(u._id));
  const someSelected = !allSelected && users.some((u) => selectedIds.has(u._id));

  if (users.length === 0) {
    return (
      <div className="border rounded-lg flex items-center justify-center py-16 text-muted-foreground text-sm">
        No users found.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onCheckedChange={() => onToggleAll(users)}
                />
              </TableHead>
            )}
            <TableHead>User</TableHead>
            <TableHead className="hidden md:table-cell">College</TableHead>
            <TableHead className="hidden lg:table-cell">Year / Dept</TableHead>
            <TableHead className="hidden lg:table-cell">Phone</TableHead>
            <TableHead>Passes</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            {highlightMissing && <TableHead>Missing Fields</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id} className={selectedIds.has(user._id) ? "bg-muted/50" : ""}>
              {isSuperAdmin && (
                <TableCell>
                  <Checkbox checked={selectedIds.has(user._id)} onCheckedChange={() => onToggle(user._id)} />
                </TableCell>
              )}
              <TableCell>
                <div className="font-medium leading-tight">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                {!user.isEmailVerified && (
                  <span className="text-xs text-amber-500">⚠ Email unverified</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {user.college || <span className="text-muted-foreground italic text-xs">—</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {user.year || user.department
                  ? `${user.year ? `Y${user.year}` : "—"} / ${user.department ?? "—"}`
                  : <span className="text-muted-foreground italic text-xs">—</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {user.phoneNo || <span className="text-muted-foreground italic text-xs">—</span>}
              </TableCell>
              <TableCell>
                {user.passes?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.passes.map((p) => (
                      <PassBadge key={p._id} passType={p.passType} status={p.status} />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">none</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <OnboardingBadge completed={user.onboardingCompleted} />
              </TableCell>
              {highlightMissing && (
                <TableCell>
                  {user.missingFields?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.missingFields.map((f) => <MissingFieldPill key={f} field={f} />)}
                    </div>
                  ) : (
                    <span className="text-xs text-green-600">✓ All filled</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {onEmail && emailType && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-600" onClick={() => onEmail([user], emailType)} title="Send email">
                      <IconMail className="size-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(user)}>
                    <IconEdit className="size-4" />
                  </Button>
                  {isSuperAdmin && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete([user])}>
                      <IconTrash className="size-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

function computeMissing(u) {
  const missing = [];
  if (!u.college)         missing.push("college");
  if (!u.phoneNo)         missing.push("phoneNo");
  if (!u.year)            missing.push("year");
  if (!u.department)      missing.push("department");
  if (!u.isEmailVerified) missing.push("emailVerified");
  return missing;
}

export default function UsersPage() {
  const { data: session, status: authStatus } = useSession();

  const [users, setUsers]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy]                   = useState("newest");
  const [filterPass, setFilterPass]           = useState("all");
  const [filterOnboarding, setFilterOnboarding] = useState("all");
  const [selectedIds, setSelectedIds]         = useState(new Set());
  const [editUser, setEditUser]               = useState(null);
  const [editOpen, setEditOpen]               = useState(false);
  const [deleteTargets, setDeleteTargets]     = useState([]);
  const [deleteOpen, setDeleteOpen]           = useState(false);
  const [emailTargets, setEmailTargets]       = useState([]);
  const [emailType, setEmailType]             = useState(null);
  const [emailOpen, setEmailOpen]             = useState(false);

  const isSuperAdmin = session?.user?.role === "super-admin";

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      sortBy,
      passType:   filterPass,
      onboarding: filterOnboarding,
      search:     debouncedSearch,
    });
    try {
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [sortBy, filterPass, filterOnboarding, debouncedSearch]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchUsers();
  }, [fetchUsers, authStatus]);

  const incompleteUsers = useMemo(() => users.filter((u) => u.missingFields?.length > 0), [users]);

  // Unpaid: onboarded + no verified pass
  const unpaidUsers = useMemo(() =>
    users.filter((u) =>
      u.onboardingCompleted &&
      !u.passes?.some((p) => p.status === "verified")
    ),
  [users]);

  const toggleOne = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = (list) => {
    const listIds = list.map((u) => u._id);
    const allIn = listIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allIn ? listIds.forEach((id) => next.delete(id)) : listIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const openEdit   = (user)    => { setEditUser(user);    setEditOpen(true); };
  const openDelete = (targets) => { setDeleteTargets(targets); setDeleteOpen(true); };
  const openEmail  = (targets, type) => { setEmailTargets(targets); setEmailType(type); setEmailOpen(true); };

  const handleSaved = (updatedUser) => {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === updatedUser._id
          ? { ...updatedUser, missingFields: computeMissing(updatedUser) }
          : u
      )
    );
  };

  const handleDeleted = (ids) => {
    setUsers((prev) => prev.filter((u) => !ids.includes(u._id)));
    setSelectedIds(new Set());
  };

  const selectedUsers = users.filter((u) => selectedIds.has(u._id));

  if (authStatus === "loading") {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" }}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 lg:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground text-sm mt-1">View, edit and manage all registered users</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} className="w-fit gap-2">
              <IconRefresh className="size-4" /> Refresh
            </Button>
          </div>

          {/* Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <StatCards users={users} />
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-52">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, college…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <IconX className="size-4" />
                </button>
              )}
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="nameAsc">Name A → Z</SelectItem>
                <SelectItem value="nameDesc">Name Z → A</SelectItem>
                <SelectItem value="collegeAsc">College A → Z</SelectItem>
                <SelectItem value="collegeDesc">College Z → A</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPass} onValueChange={setFilterPass}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Pass" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All passes</SelectItem>
                <SelectItem value="1">Pass 1</SelectItem>
                <SelectItem value="2">Pass 2</SelectItem>
                <SelectItem value="3">Pass 3</SelectItem>
                <SelectItem value="4">Pass 4</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOnboarding} onValueChange={setFilterOnboarding}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Onboarding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="complete">Onboarded</SelectItem>
                <SelectItem value="incomplete">Not onboarded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && isSuperAdmin && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted rounded-lg border">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 ml-auto"
                onClick={() => openDelete(selectedUsers)}
              >
                <IconTrash className="size-4" /> Delete Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
              <TabsTrigger value="unpaid">
                Unpaid
                {unpaidUsers.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                    {unpaidUsers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="incomplete">
                Incomplete Profiles
                {incompleteUsers.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0">
                    {incompleteUsers.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
                </div>
              ) : (
                <UserTable
                  users={users}
                  selectedIds={selectedIds}
                  onToggle={toggleOne}
                  onToggleAll={toggleAll}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  isSuperAdmin={isSuperAdmin}
                  highlightMissing={false}
                />
              )}
            </TabsContent>

            <TabsContent value="unpaid" className="mt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Users who completed onboarding but have no verified pass — remind them to register.
                </p>
                {unpaidUsers.length > 0 && (
                  <Button
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => openEmail(unpaidUsers, "payment-reminder")}
                  >
                    <IconSend className="size-4" /> Send Reminder to All ({unpaidUsers.length})
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
                </div>
              ) : (
                <UserTable
                  users={unpaidUsers}
                  selectedIds={selectedIds}
                  onToggle={toggleOne}
                  onToggleAll={toggleAll}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onEmail={openEmail}
                  emailType="payment-reminder"
                  isSuperAdmin={isSuperAdmin}
                  highlightMissing={false}
                />
              )}
            </TabsContent>

            <TabsContent value="incomplete" className="mt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Users with one or more missing profile fields.
                </p>
                <div className="flex flex-wrap gap-2">
                  {incompleteUsers.filter((u) => u.isEmailVerified).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 shrink-0"
                      onClick={() => openEmail(incompleteUsers.filter((u) => u.isEmailVerified), "profile-completion")}
                    >
                      <IconMail className="size-4" /> Send Profile Link ({incompleteUsers.filter((u) => u.isEmailVerified).length})
                    </Button>
                  )}
                  {isSuperAdmin && incompleteUsers.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={() => openDelete(incompleteUsers)}
                    >
                      <IconTrash className="size-4" /> Delete All Incomplete ({incompleteUsers.length})
                    </Button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
                </div>
              ) : (
                <UserTable
                  users={incompleteUsers}
                  selectedIds={selectedIds}
                  onToggle={toggleOne}
                  onToggleAll={toggleAll}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onEmail={openEmail}
                  emailType="profile-completion"
                  isSuperAdmin={isSuperAdmin}
                  highlightMissing={true}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>

      <EditUserSheet
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
        isSuperAdmin={isSuperAdmin}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        users={deleteTargets}
        onDeleted={handleDeleted}
      />

      <SendEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        users={emailTargets}
        emailType={emailType}
        onDone={fetchUsers}
      />
    </SidebarProvider>
  );
}