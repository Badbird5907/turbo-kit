import { redirect } from "next/navigation";

import { getSession } from "@/auth/server";
import { LogoutForm } from "@/components/logout-form";

export default async function LogoutPage() {
  const session = await getSession();

  // If user is not logged in, redirect to login
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="container flex min-h-screen items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Sign Out
          </h1>
          <p className="text-muted-foreground mt-2">
            Are you sure you want to sign out?
          </p>
        </div>
        <LogoutForm />
      </div>
    </main>
  );
}

