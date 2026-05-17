import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Library" },
  { to: "/now-playing", label: "Now Playing" },
  { to: "/stats", label: "Stats" },
  { to: "/collection", label: "Collection" },
  { to: "/settings", label: "Settings" },
];

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Dexaudio
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  location.pathname === item.to && "bg-accent text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
