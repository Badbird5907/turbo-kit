"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@acme/ui/components/button";

import { authClient } from "@/auth/client";

export function LogoutForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
            router.refresh();
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign out");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-8 shadow-sm">
      <div className="space-y-4">
        {error && (
          <div className="text-destructive rounded-md bg-red-50 p-3 text-sm dark:bg-red-950/50">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
            disabled={isLoading}
          >
            {isLoading ? "Signing out..." : "Yes, sign me out"}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          You will be redirected to the login page after signing out.
        </p>
      </div>
    </div>
  );
}
