"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapPin, Users } from "lucide-react";

/* ---------------- Utilities ---------------- */

function groupByFirstLetter(items, keyFn) {
  const grouped = {};
  items.forEach(item => {
    const letter = keyFn(item).charAt(0).toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(item);
  });
  return Object.keys(grouped)
    .sort()
    .reduce((acc, k) => {
      acc[k] = grouped[k];
      return acc;
    }, {});
}

/* ---------------- Page ---------------- */

export default function CollegesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [colleges, setColleges] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedCollege, setSelectedCollege] = useState(null);
  const [selectedCollegeGroups, setSelectedCollegeGroups] = useState(new Set());
  const [expandedLetters, setExpandedLetters] = useState(new Set());

  const [createName, setCreateName] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createState, setCreateState] = useState("");
  const [savingCollege, setSavingCollege] = useState(false);
  const [assigning, setAssigning] = useState(false);

  /* ---------------- Auth Guard ---------------- */

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "super-admin") {
      router.push("/dashboard");
      toast.error("Access denied");
    }
  }, [status, session, router]);

  /* ---------------- Data Fetch ---------------- */

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchData = async () => {
      try {
        const [c, u] = await Promise.all([
          fetch("/api/college"),
          fetch("/api/college/unmapped"),
        ]);

        const collegesData = await c.json();
        const unmappedData = await u.json();

        setColleges(collegesData.colleges || []);
        setUnmapped(unmappedData.colleges || []);
      } catch {
        toast.error("Failed to load college data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status]);

  /* ---------------- Search ---------------- */

  const fuse = useMemo(
    () => new Fuse(colleges, { keys: ["name"], threshold: 0.3 }),
    [colleges]
  );

  const filteredColleges = useMemo(() => {
    if (!searchQuery) return colleges;
    return fuse.search(searchQuery).map(r => r.item);
  }, [searchQuery, fuse, colleges]);

  const groupedColleges = useMemo(
    () => groupByFirstLetter(filteredColleges, c => c.name),
    [filteredColleges]
  );

  const groupedUnmapped = useMemo(
    () => groupByFirstLetter(unmapped, g => g.displayName || ""),
    [unmapped]
  );

  const selectedGroupsMeta = useMemo(() => {
    const keys = new Set(selectedCollegeGroups);
    const groups = unmapped.filter(g => keys.has(g.normalizedKey));
    const totalUsers = groups.reduce((sum, g) => sum + (g.totalUsers || 0), 0);
    return { groups, totalUsers };
  }, [selectedCollegeGroups, unmapped]);

  const createMatches = useMemo(() => {
    const q = createName.trim().toLowerCase();
    if (!q) return [];
    return colleges
      .filter(c => (c.name || "").toLowerCase().includes(q))
      .slice(0, 5);
  }, [createName, colleges]);

  const toggleGroupSelected = (normalizedKey) => {
    const next = new Set(selectedCollegeGroups);
    next.has(normalizedKey) ? next.delete(normalizedKey) : next.add(normalizedKey);
    setSelectedCollegeGroups(next);
  };

  const openAssignForSingleGroup = (normalizedKey) => {
    setSelectedCollegeGroups(new Set([normalizedKey]));
    setDialogOpen(true);
  };

  const createCollege = async () => {
    const name = createName.trim();
    if (!name) {
      toast.error("College name is required");
      return;
    }

    // If there is an existing canonical college with the exact same name
    // (case-insensitive), prefer selecting that instead of creating a variant.
    const existingExact = colleges.find(
      c => (c.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (existingExact) {
      setSelectedCollege(existingExact);
      setCreateName("");
      setCreateCity("");
      setCreateState("");
      toast.success("Using existing canonical college");
      return;
    }

    setSavingCollege(true);
    try {
      const res = await fetch("/api/college", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city: createCity.trim(),
          state: createState.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to create college");
      }

      setColleges(prev => {
        const next = [...prev, data.college];
        next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        return next;
      });
      setSelectedCollege(data.college);
      setCreateName("");
      setCreateCity("");
      setCreateState("");
      toast.success("College created");
    } catch (e) {
      toast.error(e?.message || "Failed to create college");
    } finally {
      setSavingCollege(false);
    }
  };

  const assignSelectedGroups = async () => {
    if (!selectedCollege?._id) {
      toast.error("Select a canonical college first");
      return;
    }
    if (!selectedCollegeGroups.size) {
      toast.error("Select at least one group to merge");
      return;
    }

    const ok = window.confirm(
      `This will update ${selectedGroupsMeta.totalUsers} users and set their college to "${selectedCollege.name}". Continue?`
    );
    if (!ok) return;

    setAssigning(true);
    try {
      const res = await fetch("/api/college", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeId: selectedCollege._id,
          normalizedKeys: Array.from(selectedCollegeGroups),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to assign college");
      }

      toast.success(`Updated ${data.modifiedCount} users`);

      // Remove merged groups from the list without refetching
      setUnmapped(prev => prev.filter(g => !selectedCollegeGroups.has(g.normalizedKey)));
      setSelectedCollegeGroups(new Set());
      setDialogOpen(false);
    } catch (e) {
      toast.error(e?.message || "Failed to assign college");
    } finally {
      setAssigning(false);
    }
  };

  /* ---------------- Loading ---------------- */

  if (status === "loading" || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-72 w-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-col gap-6 p-4 md:p-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Colleges</h1>
              <p className="text-muted-foreground">
                Normalize user-entered colleges into canonical records
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <MapPin className="w-4 h-4 mr-2" />
              Map Users
            </Button>
          </div>

          {/* Panels */}
          <div className="grid gap-6">

            {/* Canonical Colleges */}
            <Card>
              <CardHeader>
                <CardTitle>Canonical Colleges</CardTitle>
                <CardDescription>Search & select</CardDescription>
                <Input
                  className="mt-3"
                  placeholder="Search colleges…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </CardHeader>

              <CardContent className="max-h-96 overflow-y-auto space-y-4">
                {Object.entries(groupedColleges).map(([letter, items]) => (
                  <div key={letter}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {letter}
                    </p>

                    {items.map(college => {
                      const isSelected = selectedCollege?._id === college._id;

                      return (
                        <div
                          key={college._id}
                          onClick={() => setSelectedCollege(college)}
                          className={cn(
                            "flex items-center justify-between rounded-md border p-2 cursor-pointer transition",
                            "border-border",
                            !isSelected && "hover:bg-muted",
                            isSelected &&
                              "bg-muted/50 dark:bg-muted/70 ring-1 ring-border"
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {college.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {college.city}, {college.state}
                            </p>
                          </div>

                          <Badge
                            variant={college.approved ? "default" : "secondary"}
                          >
                            {college.approved ? "Approved" : "Pending"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Unmapped */}
            <Card>
              <CardHeader>
                <CardTitle>Unmapped Colleges</CardTitle>
                <CardDescription>
                  Grouped by normalized string (trim + lowercase). Select groups to merge.
                </CardDescription>
              </CardHeader>

              <CardContent className="max-h-96 overflow-y-auto">
                {Object.keys(groupedUnmapped).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No unmapped colleges found.</p>
                ) : (
                  <div className="flex gap-3">
                    {/* A–Z sidebar */}
                    <div className="sticky top-0 self-start">
                      <div className="flex flex-col gap-1">
                        {Object.keys(groupedUnmapped).map(letter => (
                          <Button
                            key={letter}
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-9 px-0"
                            onClick={() => {
                              const next = new Set(expandedLetters);
                              next.add(letter);
                              setExpandedLetters(next);
                              const el = document.getElementById(`unmapped-${letter}`);
                              el?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                          >
                            {letter}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Groups */}
                    <div className="flex-1 space-y-4">
                      {Object.entries(groupedUnmapped).map(([letter, items]) => {
                        const expanded = expandedLetters.has(letter);
                        return (
                          <div key={letter} id={`unmapped-${letter}`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {letter}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const next = new Set(expandedLetters);
                                  expanded ? next.delete(letter) : next.add(letter);
                                  setExpandedLetters(next);
                                }}
                              >
                                {expanded ? "Collapse" : "Expand"}
                              </Button>
                            </div>

                            {expanded && (
                              <div className="space-y-3">
                                {items.map((g) => {
                                  const variantCount = (g.variants?.length || 0) - 1;
                                  const isChecked = selectedCollegeGroups.has(g.normalizedKey);
                                  return (
                                    <div
                                      key={g.normalizedKey}
                                      className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted transition"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleGroupSelected(g.normalizedKey)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {g.displayName}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {g.totalUsers} users
                                          </span>
                                          {variantCount > 0 && (
                                            <span className="truncate">
                                              +{variantCount} variant{variantCount === 1 ? "" : "s"}
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{g.totalUsers}</Badge>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => openAssignForSingleGroup(g.normalizedKey)}
                                        >
                                          Assign / Merge
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Assign / Merge dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign / Merge Colleges</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">Selected groups</p>
                <p className="text-xs text-muted-foreground">
                  {selectedGroupsMeta.groups.length} group(s), {selectedGroupsMeta.totalUsers} user(s)
                </p>
                {selectedGroupsMeta.groups.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedGroupsMeta.groups.slice(0, 8).map(g => (
                      <Badge key={g.normalizedKey} variant="secondary">
                        {g.displayName}
                      </Badge>
                    ))}
                    {selectedGroupsMeta.groups.length > 8 && (
                      <Badge variant="outline">
                        +{selectedGroupsMeta.groups.length - 8} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border p-3 space-y-2">
                  <p className="text-sm font-medium">Canonical college</p>
                  {selectedCollege ? (
                    <div className="rounded-md border border-border p-2">
                      <p className="text-sm font-medium">{selectedCollege.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCollege.city}, {selectedCollege.state}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select a college from the left panel, or create a new one below.
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-border p-3 space-y-2">
                  <p className="text-sm font-medium">Create new college</p>
                  <p className="text-xs text-muted-foreground">
                    Start typing to see matching existing colleges and avoid creating duplicates.
                  </p>
                  <Input
                    placeholder="Name *"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                  />
                  <div className="grid gap-2 grid-cols-2">
                    <Input
                      placeholder="City"
                      value={createCity}
                      onChange={e => setCreateCity(e.target.value)}
                    />
                    <Input
                      placeholder="State"
                      value={createState}
                      onChange={e => setCreateState(e.target.value)}
                    />
                  </div>
                  {createMatches.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Matching existing colleges
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {createMatches.map(c => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setSelectedCollege(c);
                              setCreateName("");
                              setCreateCity("");
                              setCreateState("");
                              toast.success("Selected existing canonical college");
                            }}
                            className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted border border-transparent hover:border-border transition"
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.city || c.state ? (
                              <span className="text-muted-foreground">
                                {" "}
                                — {c.city}{c.city && c.state ? ", " : ""}{c.state}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingCollege}
                    onClick={createCollege}
                    className="w-full"
                  >
                    {savingCollege ? "Creating…" : "Create & Select"}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">Confirmation</p>
                <p className="text-xs text-muted-foreground">
                  This performs a bulk update and will set <span className="font-medium">collegeId</span> and overwrite
                  the user’s <span className="font-medium">college</span> string with the canonical name.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={assignSelectedGroups}
                  disabled={assigning || !selectedCollegeGroups.size}
                >
                  {assigning ? "Assigning…" : "Confirm bulk assign"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}