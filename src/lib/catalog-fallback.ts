import { unstable_rethrow } from "next/navigation";

// Availability fallbacks stay outside catalogCache. A failed read must not be
// stored for the cache lifetime — same rule as getStacksForList and the homepage.
export async function catalogOr<T>(read: () => Promise<T>, fallback: T): Promise<{ value: T; degraded: boolean }> {
  try {
    return { value: await read(), degraded: false };
  } catch (error) {
    unstable_rethrow(error);
    return { value: fallback, degraded: true };
  }
}
