import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-shell gradient-soft pb-safe-nav">
      {children}
      <BottomNav />
    </div>
  );
}
