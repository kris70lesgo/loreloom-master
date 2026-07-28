import React, { Suspense } from "react";
import { SidebarSectionDividersDemo } from "../../components/SidebarSectionDividers";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen text-foreground" style={{ background: "hsl(var(--background))" }}>
      <Suspense fallback={<div className="w-[80px]" style={{ background: "hsl(var(--background))" }} />}>
        <SidebarSectionDividersDemo />
      </Suspense>
      <main className="flex-1 min-w-0 overflow-y-auto h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
        {children}
      </main>
    </div>
  );
}
