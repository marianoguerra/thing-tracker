import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element is missing from index.html");

createRoot(rootEl).render(
  <StrictMode>
    <main className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Thing Tracker</h1>
      <p className="text-muted-foreground text-sm">Toolchain smoke test.</p>
    </main>
  </StrictMode>,
);
