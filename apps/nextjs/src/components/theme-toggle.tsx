"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@acme/ui/components/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="icon" disabled>
          <Sun className="size-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={cycleTheme}
      >
        {theme === "dark" ? (
          <Moon className="size-5" />
        ) : theme === "system" ? (
          <Monitor className="size-5" />
        ) : (
          <Sun className="size-5" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}

