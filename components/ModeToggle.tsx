"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [time, setTime] = React.useState<string>("")
  const [glowClass, setGlowClass] = React.useState<string>("")

  React.useEffect(() => {
    const updateState = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      const hour = now.getHours();
      // Logic from time-theme-setter: 7am (7) to 5pm (17) -> Light
      // Otherwise -> Dark
      const isDayTime = hour >= 7 && hour < 17;
      const expectedTheme = isDayTime ? "light" : "dark";

      // If we have a resolved theme and it differs from expected based on time
      if (resolvedTheme && resolvedTheme !== expectedTheme) {
         // Mismatch detected
         // Day time (expected light) + Dark Mode active -> Sun/Yellow Glow
         if (isDayTime) {
             setGlowClass("ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.6)]");
         } 
         // Night time (expected dark) + Light Mode active -> Moon/Blue Glow
         else {
             setGlowClass("ring-2 ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]");
         }
      } else {
         setGlowClass("");
      }
    };

    // Initial run
    updateState();

    const timer = setInterval(updateState, 1000);

    return () => clearInterval(timer);
  }, [resolvedTheme]);

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
        className={cn("rounded-full transition-all duration-500", glowClass)}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
      <span className="mt-1 text-[10px] font-medium text-muted-foreground tabular-nums leading-none">
        {time}
      </span>
    </div>
  )
}
