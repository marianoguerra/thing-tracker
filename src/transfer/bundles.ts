import type { BundleIndexEntry } from "@/bundles/build";
import { parseEnvelope, type PackEnvelope } from "./envelope";

// `BASE_URL` is Vite's build-time base ("/" or e.g. "/thing-tracker/"), always
// with a trailing slash — so these resolve correctly wherever the app is served.
const BASE = `${import.meta.env.BASE_URL}bundles`;

/**
 * Bundles are fetched from precached static files rather than bundled into the
 * JS. They are data, they are only read on the rare occasion someone opens the
 * browser, and the service worker precaches them — so onboarding still works on
 * a first, offline launch without weighing down every other launch.
 */
export async function fetchBundleIndex(): Promise<BundleIndexEntry[]> {
  const response = await fetch(`${BASE}/index.json`);
  if (!response.ok) throw new Error(`Couldn't load bundles (${String(response.status)})`);
  return (await response.json()) as BundleIndexEntry[];
}

export async function fetchBundlePack(file: string): Promise<PackEnvelope> {
  const response = await fetch(`${BASE}/${file}`);
  if (!response.ok) throw new Error(`Couldn't load that bundle (${String(response.status)})`);

  // Validated through the same parser as a user-supplied file: a shipped bundle
  // is not more trustworthy than any other pack, and a broken one should
  // produce the same clear message rather than a mystery crash later.
  const result = parseEnvelope(await response.text());
  if (!result.ok) throw new Error(result.reason);
  if (result.envelope.format !== "thing-tracker/group-pack") {
    throw new Error("That bundle file isn't a tag pack.");
  }
  return result.envelope;
}
