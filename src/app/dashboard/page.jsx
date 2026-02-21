"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, CreditCard, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const PASS_NAMES = {
  1: "Pass 1 – Offline",
  2: "Pass 2 – Paper",
  3: "Pass 3 – Idea",
  4: "Pass 4 – Online",
};

function downloadCSV(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function handleDownload(type, label) {
  try {
    const res = await fetch(`/api/dashboard/download?type=${type}`);
    if (!res.ok) throw new Error("Failed to download");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    downloadCSV(url, `${type}.csv`);
    URL.revokeObjectURL(url);
    toast.success(`${label} downloaded`);
  } catch {
    toast.error("Download failed");
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(data => {
        if (data.success) setDashData(data);
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

              {/* Stat Cards */}
              <SectionCards stats={dashData?.stats ?? {}} />

              {/* Chart */}
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive chartData={dashData?.chartData ?? []} />
              </div>

              {/* Pass Breakdown + Downloads side by side */}
              <div className="px-4 lg:px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Pass Breakdown Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Verified Passes Breakdown
                    </CardTitle>
                    <CardDescription>Count of verified passes per pass type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashData?.passBreakdown
                      ? Object.entries(dashData.passBreakdown).map(([pt, count]) => (
                        <div key={pt} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="font-medium text-sm">{PASS_NAMES[pt] ?? `Pass ${pt}`}</span>
                          <Badge variant={count > 0 ? "default" : "outline"} className="text-base px-3 py-1">
                            {count}
                          </Badge>
                        </div>
                      ))
                      : <p className="text-muted-foreground text-sm">No data available</p>
                    }
                  </CardContent>
                </Card>

                {/* Downloads Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Download Reports
                    </CardTitle>
                    <CardDescription>Export participant data as CSV (opens in Excel)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        className="justify-start gap-3 h-12"
                        onClick={() => handleDownload("all-registered", "All Registered Participants")}
                      >
                        <Users className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium text-sm">All Registered Participants</div>
                          <div className="text-xs text-muted-foreground">Name, Email, College, Dept, Year, Phone</div>
                        </div>
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>

                      <Button
                        variant="outline"
                        className="justify-start gap-3 h-12"
                        onClick={() => handleDownload("paid", "Paid Participants")}
                      >
                        <CreditCard className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium text-sm">Paid Participants</div>
                          <div className="text-xs text-muted-foreground">Name, Email, Pass Type, Transaction No., Status</div>
                        </div>
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>

                      <Button
                        variant="outline"
                        className="justify-start gap-3 h-12"
                        onClick={() => handleDownload("verified", "Verified Participants")}
                      >
                        <Users className="w-4 h-4 text-green-500" />
                        <div className="text-left">
                          <div className="font-medium text-sm">Verified Participants</div>
                          <div className="text-xs text-muted-foreground">Name, Email, Pass Type, Transaction No., Verified Date</div>
                        </div>
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>

                      <Button
                        variant="outline"
                        className="justify-start gap-3 h-12"
                        onClick={() => handleDownload("pass-breakdown", "Pass Breakdown Summary")}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium text-sm">Pass Breakdown Summary</div>
                          <div className="text-xs text-muted-foreground">Per pass: pending / verified / rejected totals</div>
                        </div>
                        <Download className="w-4 h-4 ml-auto" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
