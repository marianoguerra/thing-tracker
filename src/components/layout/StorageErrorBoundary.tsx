import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * There is no server. If IndexedDB cannot be opened — Safari private browsing,
 * a denied quota, a corrupted store — the app has nothing to fall back to, so
 * the failure has to be explained rather than shown as a blank screen.
 */
export class StorageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[thing-tracker] storage failure", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl" aria-hidden>
          💾
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Can&apos;t open your data</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            Thing Tracker stores everything on this device using IndexedDB, and the browser
            wouldn&apos;t let it. Private browsing windows and full storage are the usual causes.
          </p>
        </div>
        <pre className="text-muted-foreground bg-muted max-w-full overflow-x-auto rounded-md p-3 text-left text-xs">
          {error.message}
        </pre>
        <button
          type="button"
          className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium"
          onClick={() => {
            window.location.reload();
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
