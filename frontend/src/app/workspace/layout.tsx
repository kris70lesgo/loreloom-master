import React, { Suspense } from "react";
import { SidebarSectionDividersDemo } from "../../components/SidebarSectionDividers";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#070709] dark:text-zinc-100 transition-colors duration-200">
      {/* Sidebar */}
      <Suspense fallback={<div className="w-[70px] shrink-0 bg-slate-50 dark:bg-[#070709]" />}>
        <SidebarSectionDividersDemo />
      </Suspense>

      {/* Main View — enforced padding isolates content from sidebar on all sides */}
      <main
        className="flex-1 min-w-0 h-full overflow-y-auto"
        style={{ padding: "32px 40px 48px 40px" }}
      >
        {/* Inner centered max-width container */}
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-8 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
