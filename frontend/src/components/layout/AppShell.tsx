import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AccountWidget } from "@/components/layout/AccountWidget";
import { NowPlayingNav } from "@/components/layout/NowPlayingNav";
import { usePlayer } from "@/contexts/player-context";

const mainNav = [
  { to: "/", label: "Library" },
  { to: "/stats", label: "Stats" },
  { to: "/collection", label: "Collection" },
];

function navLinkClass(isActive: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
    isActive && "bg-accent text-accent-foreground",
  );
}

export function AppShell() {
  const location = useLocation();
  const { playing } = usePlayer();

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="shrink-0 text-lg font-bold tracking-tight">
            Dexaudio
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {mainNav.map((item) => (
              <Link key={item.to} to={item.to} className={navLinkClass(location.pathname === item.to)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <NowPlayingNav
            isActive={location.pathname === "/now-playing"}
            playing={playing}
            navLinkClass={navLinkClass}
          />
          <AccountWidget />
        </div>
      </header>
      <div aria-hidden className="h-14 shrink-0" />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-x-hidden px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
