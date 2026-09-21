/**
 * Keeps Medusa product tag `featured` and metadata.isFeatured in sync.
 *
 * `_featuredMirror` records the last agreed on/off state so we can tell which
 * side the admin changed when they diverge.
 */

export const FEATURED_TAG_VALUE = "featured";
export const FEATURED_MIRROR_KEY = "_featuredMirror";

export type FeaturedTagLike = { id: string; value?: string | null };

export type FeaturedSyncInput = {
  tags: FeaturedTagLike[];
  metadata: Record<string, unknown> | null | undefined;
  /** Id of the global "featured" product tag (created if missing by the subscriber). */
  featuredTagId: string;
};

export type FeaturedSyncPatch = {
  metadata: Record<string, unknown>;
  tag_ids: string[];
} | null;

function isTruthyFeatured(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function hasFeaturedTag(
  tags: FeaturedTagLike[],
  featuredValue: string = FEATURED_TAG_VALUE,
): boolean {
  const needle = featuredValue.toLowerCase();
  return tags.some((t) => (t.value || "").toLowerCase() === needle);
}

export function isFeaturedProduct(
  tags: FeaturedTagLike[] | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (isTruthyFeatured(metadata?.isFeatured)) return true;
  if (tags && hasFeaturedTag(tags)) return true;
  return false;
}

/**
 * Returns a product update patch when tag and metadata disagree, or null when
 * already in sync. Never returns a no-op patch (avoids product.updated loops).
 */
export function computeFeaturedSyncPatch(input: FeaturedSyncInput): FeaturedSyncPatch {
  const metadata = { ...(input.metadata ?? {}) };
  const otherTagIds = input.tags
    .filter((t) => (t.value || "").toLowerCase() !== FEATURED_TAG_VALUE)
    .map((t) => t.id);

  const tagOn = hasFeaturedTag(input.tags);
  const metaOn = isTruthyFeatured(metadata.isFeatured);
  const last =
    metadata[FEATURED_MIRROR_KEY] === true ||
    metadata[FEATURED_MIRROR_KEY] === "true"
      ? true
      : metadata[FEATURED_MIRROR_KEY] === false ||
          metadata[FEATURED_MIRROR_KEY] === "false"
        ? false
        : null;

  let want: boolean;
  if (tagOn === metaOn) {
    want = tagOn;
    if (last === want) return null;
  } else if (last === null) {
    // First sync or unknown history: prefer "on" if either side is on.
    want = tagOn || metaOn;
  } else if (tagOn !== last) {
    want = tagOn;
  } else if (metaOn !== last) {
    want = metaOn;
  } else {
    want = tagOn || metaOn;
  }

  const nextTagIds = want
    ? [...otherTagIds, input.featuredTagId]
    : otherTagIds;

  const nextMeta: Record<string, unknown> = {
    ...metadata,
    isFeatured: want,
    [FEATURED_MIRROR_KEY]: want,
  };

  const tagsChanged =
    nextTagIds.length !== input.tags.length ||
    nextTagIds.some((id) => !input.tags.some((t) => t.id === id));
  const metaChanged =
    isTruthyFeatured(metadata.isFeatured) !== want ||
    metadata[FEATURED_MIRROR_KEY] !== want;

  if (!tagsChanged && !metaChanged) return null;

  return { metadata: nextMeta, tag_ids: nextTagIds };
}
