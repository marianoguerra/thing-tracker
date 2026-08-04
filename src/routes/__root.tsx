import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { SplashScreen } from "@/components/layout/SplashScreen";
import { StorageErrorBoundary } from "@/components/layout/StorageErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { DbProvider } from "@/db/provider";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <StorageErrorBoundary>
      <Suspense fallback={<SplashScreen />}>
        <DbProvider>
          <Outlet />
          <Toaster />
        </DbProvider>
      </Suspense>
    </StorageErrorBoundary>
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
