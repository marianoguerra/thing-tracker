import { ShareIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const DISMISSED_KEY = "tt.install.dismissed.v1";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates display-mode and only exposes this.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Nudges installation, which for a tracker is the difference between an app you
 * open and a tab you forget.
 *
 * Two paths, because iOS has no `beforeinstallprompt` and never will: Chromium
 * gets a real install button, iOS Safari gets the Share → Add to Home Screen
 * instruction it actually needs.
 */
export function InstallHint() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useLocalStorageState<boolean>(DISMISSED_KEY, false);

  useEffect(() => {
    setStandalone(isStandalone());
    const onPrompt = (event: Event) => {
      // Suppress the browser's own mini-infobar so this is the only ask.
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || standalone) return null;

  const iosHint = isIos() && !deferred;
  if (!deferred && !iosHint) return null;

  return (
    <div className="border-border/60 bg-muted/40 mx-4 mt-3 rounded-lg border p-3 text-xs">
      <p className="text-foreground font-medium">Add to your home screen</p>
      <p className="text-muted-foreground mt-0.5">
        {iosHint ? (
          <>
            Tap <ShareIcon className="inline size-3" aria-label="Share" /> then “Add to Home Screen”
            — it opens full-screen and works offline.
          </>
        ) : (
          "Opens full-screen and works offline."
        )}
      </p>
      <div className="mt-1.5 flex gap-3">
        {deferred && (
          <button
            type="button"
            className="text-foreground underline underline-offset-2"
            onClick={() => {
              void deferred.prompt();
              setDeferred(null);
            }}
          >
            Install
          </button>
        )}
        <button
          type="button"
          className="text-muted-foreground underline underline-offset-2"
          onClick={() => setDismissed(true)}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
