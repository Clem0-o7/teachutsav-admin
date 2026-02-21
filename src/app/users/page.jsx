"use client";

import { useSession } from "next-auth/react";

export default function UsersPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Welcome, {session?.user?.name}! You have access to user administration.
        </p>
        <div className="mt-8">
          <div className="text-sm text-gray-600">
            Role: {session?.user?.role}
          </div>
        </div>
      </div>
    </div>
  );
}