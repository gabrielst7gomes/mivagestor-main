import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tabs } from "./nav-items";
import { useScrollingDown } from "@/hooks/useScrollDirection";

export function BottomNav() {
  const hidden = useScrollingDown();

  return (
    <nav
      className={cn(
        "glass-strong md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full safe-bottom z-40 transition-transform duration-300",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
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
