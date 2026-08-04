import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useResolvedTheme } from "@/lib/theme";

/**
 * Diverges from the shadcn default, which reads the theme from `next-themes`.
 * This is a Vite app with its own small theme module (@/lib/theme), so pulling
 * in next-themes and its provider would add a dependency for nothing.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useResolvedTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      // Recording is a one-tap action, so its confirmation has to appear where
      // the thumb already is — and above the tab bar, not behind it.
      position="bottom-center"
      offset={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      duration={4000}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
