import { Link } from "@tanstack/react-router";
import { CalendarRangeIcon, SettingsIcon, ZapIcon } from "lucide-react";
import type { ComponentType } from "react";

type Tab = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Only the Track tab sits at "/", so only it needs exact matching. */
  exact?: boolean;
};

const TABS: Tab[] = [
  { to: "/", label: "Track", icon: ZapIcon, exact: true },
  { to: "/insights", label: "Insights", icon: CalendarRangeIcon },
  { to: "/manage", label: "Manage", icon: SettingsIcon },
];

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="bg-background/85 border-border fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg"
    >
      <ul className="mx-auto flex h-16 max-w-2xl items-stretch">
        {TABS.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              // `data-active` rather than a class string so the styling lives in
              // one place and stays legible next to the rest of the classes.
              activeProps={{ "data-active": "true" }}
              className="text-muted-foreground data-[active=true]:text-foreground flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
