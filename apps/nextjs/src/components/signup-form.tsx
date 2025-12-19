"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@acme/ui/components/button";
import { Input } from "@acme/ui/components/input";
import { Label } from "@acme/ui/components/label";
import { Separator } from "@acme/ui/components/separator";

import { authClient } from "@/auth/client";

export function SignUpForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-8 shadow-sm">
      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={8}
          />
        </div>
        {error && (
          <div className="text-destructive rounded-md bg-red-50 p-3 text-sm dark:bg-red-950/50">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Sign up with Email"}
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="bg-card text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs">
          OR
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHubSignIn}
        disabled={isLoading}
      >
        <svg
          className="mr-2 size-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
        {isLoading ? "Signing in..." : "Sign up with GitHub"}
      </Button>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}



