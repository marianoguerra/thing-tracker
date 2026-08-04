import { useEffect } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registers the service worker and offers a reload when a new build is waiting.
 *
 * `registerType: 'prompt'` in vite.config is what makes this possible at all —
 * with `autoUpdate` the new worker activates immediately and `needRefresh`
 * never fires. Asking is the right default here: a reload mid-entry would throw
 * away whatever is half-typed in a drawer.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("[thing-tracker] service worker registration failed", error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast("A new version is ready", {
      description: "Reload to pick it up.",
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
