import { Outlet, createRootRoute } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-4xl">🤷</p>
      <p className="text-muted-foreground text-sm">That page doesn&apos;t exist.</p>
    </div>
  );
}
