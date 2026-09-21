import { describe, it, expect } from "vitest";
import {
  computeFeaturedSyncPatch,
  hasFeaturedTag,
  isFeaturedProduct,
  FEATURED_MIRROR_KEY,
} from "./featured-sync";

const FEATURED_ID = "ptag_featured";

describe("featured-sync", () => {
  it("detects featured via tag or metadata", () => {
    expect(hasFeaturedTag([{ id: "1", value: "Featured" }])).toBe(true);
    expect(isFeaturedProduct([], { isFeatured: true })).toBe(true);
    expect(isFeaturedProduct([{ id: "1", value: "featured" }], {})).toBe(true);
    expect(isFeaturedProduct([], {})).toBe(false);
  });

  it("returns null when already synced on", () => {
    const patch = computeFeaturedSyncPatch({
      tags: [{ id: FEATURED_ID, value: "featured" }],
      metadata: { isFeatured: true, [FEATURED_MIRROR_KEY]: true },
      featuredTagId: FEATURED_ID,
    });
    expect(patch).toBeNull();
  });

  it("adds metadata when tag is present but meta is off", () => {
    const patch = computeFeaturedSyncPatch({
      tags: [{ id: FEATURED_ID, value: "featured" }],
      metadata: { isFeatured: false, [FEATURED_MIRROR_KEY]: false },
      featuredTagId: FEATURED_ID,
    });
    expect(patch?.metadata.isFeatured).toBe(true);
    expect(patch?.tag_ids).toContain(FEATURED_ID);
  });

  it("adds tag when metadata is on but tag missing", () => {
    const patch = computeFeaturedSyncPatch({
      tags: [{ id: "ptag_other", value: "bestseller" }],
      metadata: { isFeatured: true, [FEATURED_MIRROR_KEY]: false },
      featuredTagId: FEATURED_ID,
    });
    expect(patch?.tag_ids).toEqual(expect.arrayContaining([FEATURED_ID, "ptag_other"]));
    expect(patch?.metadata.isFeatured).toBe(true);
  });

  it("clears both when tag removed after previously featured", () => {
    const patch = computeFeaturedSyncPatch({
      tags: [],
      metadata: { isFeatured: true, [FEATURED_MIRROR_KEY]: true },
      featuredTagId: FEATURED_ID,
    });
    expect(patch?.metadata.isFeatured).toBe(false);
    expect(patch?.tag_ids).toEqual([]);
  });

  it("clears tag when metadata turned off after previously featured", () => {
    const patch = computeFeaturedSyncPatch({
      tags: [{ id: FEATURED_ID, value: "featured" }],
      metadata: { isFeatured: false, [FEATURED_MIRROR_KEY]: true },
      featuredTagId: FEATURED_ID,
    });
    expect(patch?.metadata.isFeatured).toBe(false);
    expect(patch?.tag_ids).toEqual([]);
  });
});
