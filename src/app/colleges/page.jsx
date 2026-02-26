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
          <div className="grid gap-6 lg:grid-cols-2">

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
                <CardDescription>Select multiple groups</CardDescription>
              </CardHeader>

              <CardContent className="max-h-96 overflow-y-auto space-y-3">
                {unmapped.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted transition"
                  >
                    <Checkbox
                      checked={selectedCollegeGroups.has(g.college)}
                      onCheckedChange={() => {
                        const next = new Set(selectedCollegeGroups);
                        next.has(g.college)
                          ? next.delete(g.college)
                          : next.add(g.college);
                        setSelectedCollegeGroups(next);
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{g.college}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {g.count} users
                      </p>
                    </div>
                    <Badge variant="outline">{g.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}