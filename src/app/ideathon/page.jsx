'use client'

import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function IdeathonPage() {
  const { status } = useSession();

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" }}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold">Ideathon Management</h1>
              <p className="text-muted-foreground">
                Manage ideathon registrations, teams, submissions, and evaluations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">Team Registrations</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage all ideathon team registrations
                </p>
                <div className="text-2xl font-bold">0</div>
              </div>

              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">Submissions</h3>
                <p className="text-sm text-muted-foreground">
                  Track project submissions and presentations
                </p>
                <div className="text-2xl font-bold">0</div>
              </div>

              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">Evaluations</h3>
                <p className="text-sm text-muted-foreground">
                  Manage judges and evaluation criteria
                </p>
                <div className="text-2xl font-bold">0</div>
              </div>
            </div>

            <div className="text-center text-muted-foreground py-12">
              <p>Ideathon management features will be implemented here.</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}