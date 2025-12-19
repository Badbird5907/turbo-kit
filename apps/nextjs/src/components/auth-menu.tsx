import Link from "next/link";
import { Button } from "@acme/ui/components/button";

import { getSession } from "@/auth/server";

export async function AuthMenu() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="sm">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-sm">
        {session.user.email}
      </span>
      <Link href="/logout">
        <Button variant="outline" size="sm">
          Sign Out
        </Button>
      </Link>
    </div>
  );
}

