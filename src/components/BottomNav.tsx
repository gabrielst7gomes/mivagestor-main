import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tabs } from "./nav-items";

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full safe-bottom z-40 border-t border-white/60"
      style={{
        bottom: "env(safe-area-inset-bottom, 0px)",
        background: "linear-gradient(180deg, hsl(0 0% 100% / 0.7), hsl(339 70% 97% / 0.85))",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        boxShadow: "0 -4px 24px -8px hsl(339 40% 50% / 0.12)",
      }}
    >
      <ul className="grid grid-cols-6">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="text-[10px]">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
