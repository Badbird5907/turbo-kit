import { redirect } from "next/navigation";

import { getSession } from "@/auth/server";
import { SignUpForm } from "@/components/signup-form";

export default async function SignUpPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="container flex min-h-screen items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Sign Up
          </h1>
          <p className="text-muted-foreground mt-2">
            Create an account to get started
          </p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}


