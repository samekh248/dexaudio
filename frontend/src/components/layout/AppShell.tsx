import { Link, Outlet, useLocation } from "react-router-dom";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountWidget } from "@/components/layout/AccountWidget";
import { AudioVisualizerIcon } from "@/components/layout/AudioVisualizerIcon";
import { usePlayer } from "@/contexts/player-context";

const nav = [
  { to: "/", label: "Library" },
  { to: "/now-playing", label: "Now Playing" },
  { to: "/stats", label: "Stats" },
  { to: "/collection", label: "Collection" },
  { to: "/settings", label: "Settings" },
];

export function AppShell() {
  const location = useLocation();
  const { playing } = usePlayer();

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Dexaudio
          </Link>
          <div className="flex flex-wrap items-center gap-3">
          <AccountWidget />
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  location.pathname === item.to && "bg-accent text-accent-foreground",
                )}
              >
                {item.to === "/now-playing" ? (
                  playing ? (
                    <AudioVisualizerIcon />
                  ) : (
                    <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )
                ) : null}
                {item.label}
              </Link>
            ))}
          </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
