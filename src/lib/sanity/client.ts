import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, isSanityConfigured } from "./env";

export const client = createClient({
  projectId: projectId || "placeholder",
  dataset: dataset || "production",
  apiVersion,
  useCdn: true,
  perspective: "published",
});

export const writeClient = createClient({
  projectId: projectId || "placeholder",
  dataset: dataset || "production",
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

/**
 * Fetch wrapper that returns `fallback` instead of throwing when Sanity
 * isn't configured yet (e.g. local dev before `.env.local` is filled in) or
 * the request fails. Lets pages render seed content out of the box.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
  tags: string[] = []
): Promise<T> {
  if (!isSanityConfigured) return fallback;
  try {
    return await client.fetch<T>(query, params, {
      next: { revalidate: 60, tags },
    });
  } catch (err) {
    console.error("Sanity fetch failed, using fallback content:", err);
    return fallback;
  }
}

export { isSanityConfigured };
