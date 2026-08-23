import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MivaLogo } from "@/components/MivaLogo";
import { tabs } from "./nav-items";

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-[240px] lg:w-[264px] md:shrink-0 md:sticky md:top-0 md:h-screen md:py-8 md:px-4 md:border-r md:border-white/60 glass-strong">
      <div className="px-3 mb-8">
        <MivaLogo size="md" />
      </div>
      <nav className="flex-1">
        <ul className="space-y-1">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary bg-primary-soft/70"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
