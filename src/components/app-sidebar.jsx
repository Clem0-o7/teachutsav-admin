"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  IconDashboard,
  IconCalendarEvent,
  IconCreditCard,
  IconUsers,
  IconSettings,
  IconLogout,
  IconInnerShadowTop,
  IconPresentation,
  IconBulb,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({
  ...props
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  // Generate navigation items based on user role
  const getNavItems = (role) => {
    const baseItems = [];
    
    // Dashboard - accessible to all admin roles
    if (['super-admin', 'view-only', 'events-admin', 'payments-admin', 'paper-presentation-admin', 'ideathon-admin'].includes(role)) {
      baseItems.push({
        title: "Dashboard",
        url: "/dashboard",
        icon: IconDashboard,
      });
    }

    // Events - accessible to super-admin and events-admin
    if (['super-admin', 'events-admin'].includes(role)) {
      baseItems.push({
        title: "Events",
        url: "/events",
        icon: IconCalendarEvent,
      });
    }

    // Payments - accessible to super-admin and payments-admin
    if (['super-admin', 'payments-admin'].includes(role)) {
      baseItems.push({
        title: "Payments",
        url: "/payments",
        icon: IconCreditCard,
      });
    }

    // Paper Presentations - accessible to super-admin and paper-presentation-admin
    if (['super-admin', 'paper-presentation-admin'].includes(role)) {
      baseItems.push({
        title: "Paper Presentations",
        url: "/paper-presentations",
        icon: IconPresentation,
      });
    }

    // Ideathon - accessible to super-admin and ideathon-admin
    if (['super-admin', 'ideathon-admin'].includes(role)) {
      baseItems.push({
        title: "Ideathon",
        url: "/ideathon",
        icon: IconBulb,
      });
    }

    // Users - only accessible to super-admin
    if (role === 'super-admin') {
      baseItems.push({
        title: "Users",
        url: "/users",
        icon: IconUsers,
      });
    }

    return baseItems;
  };

  const navItems = session?.user?.role ? getNavItems(session.user.role) : [];

  const navSecondary = [
    {
      title: "Settings", 
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Logout",
      onClick: handleLogout,
      icon: IconLogout,
    },
  ];

  const userData = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  } : {
    name: "Guest",
    email: "guest@example.com",
    role: "guest"
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Techutsav Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <div className="mt-auto">
          <div className="px-3 py-2">
            <div className="space-y-1">
              {navSecondary.map((item) => (
                <SidebarMenuButton 
                  key={item.title}
                  onClick={item.onClick}
                  className={item.onClick ? "cursor-pointer" : ""}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              ))}
            </div>
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
