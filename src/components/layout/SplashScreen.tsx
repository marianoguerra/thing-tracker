export function SplashScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="text-4xl" aria-hidden>
        ⚡
      </div>
      <p className="text-muted-foreground text-sm" role="status">
        Opening your data…
      </p>
    </div>
  );
}
