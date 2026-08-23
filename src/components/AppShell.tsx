import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell gradient-soft">
      <Sidebar />
      <div className="app-shell-main pb-safe-nav md:pb-0">
        <div className="app-shell-inner">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
