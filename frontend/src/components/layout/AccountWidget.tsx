import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Settings } from "lucide-react";
import { api, ApiError } from "@/services/api-client";
import { cn } from "@/lib/utils";

export function AccountWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { data: account, isLoading } = useQuery({
    queryKey: ["plex-account"],
    queryFn: async () => {
      try {
        return await api.getPlexAccount();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });

  const menuItems = (
    <Link
      to="/settings"
      onClick={() => setOpen(false)}
      className={cn(
        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        location.pathname === "/settings" && "bg-accent text-accent-foreground",
      )}
    >
      <Settings className="h-4 w-4" aria-hidden />
      Settings
    </Link>
  );

  if (isLoading) {
    return (
      <div
        className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted"
        aria-hidden
      />
    );
  }

  if (!account) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Account menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
              <Settings className="h-4 w-4" aria-hidden />
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-[10rem] rounded-md border border-border bg-card p-1 shadow-md"
          >
            {menuItems}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Account menu"
        >
          {account.avatarUrl ? (
            <img src={account.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
              {account.username.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-[8rem] truncate sm:inline">{account.username}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[10rem] rounded-md border border-border bg-card p-1 shadow-md"
        >
          {menuItems}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
