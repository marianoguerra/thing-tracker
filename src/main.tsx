import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { routeTree } from "@/routeTree.gen";
import "@/styles/index.css";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Everything is local; there is no network round trip to stagger a pending
  // state around, so showing one would only add a flicker.
  defaultPendingMs: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element is missing from index.html");

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
