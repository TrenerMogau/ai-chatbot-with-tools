"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { CheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn("size-8 rounded-lg text-muted-foreground", className)}
        aria-label="Toggle theme"
      >
        <SunIcon className="size-4 opacity-50" />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:ring-1 focus:ring-ring focus:outline-none",
          className
        )}
        aria-label="Select theme"
      >
        {isDark ? (
          <MoonIcon className="size-4 text-primary transition-transform duration-200" />
        ) : (
          <SunIcon className="size-4 text-primary transition-transform duration-200" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex cursor-pointer items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <SunIcon className="size-4 text-muted-foreground" />
            Light
          </span>
          {theme === "light" && <CheckIcon className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex cursor-pointer items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <MoonIcon className="size-4 text-muted-foreground" />
            Dark
          </span>
          {theme === "dark" && <CheckIcon className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex cursor-pointer items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <LaptopIcon className="size-4 text-muted-foreground" />
            System
          </span>
          {theme === "system" && (
            <CheckIcon className="size-3.5 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
