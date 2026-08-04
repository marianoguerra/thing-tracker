import { Outlet, createFileRoute } from "@tanstack/react-router";

import { TabBar } from "@/components/layout/TabBar";

export const Route = createFileRoute("/_tabs")({ component: TabsLayout });

function TabsLayout() {
  return (
    <div className="flex h-full flex-col">
      {/*
        Only this column scrolls; the tab bar is fixed. The bottom padding keeps
        the last row of content clear of the bar plus the home indicator.
      */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
