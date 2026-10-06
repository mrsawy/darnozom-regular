import { useEffect, useState } from "react";
import type { Lang } from "./cms-types";

export interface ContentAreaRow {
  id: number;
  slug: string;
  labelAr: string;
  labelEn: string;
  position: number;
  isActive: boolean;
}

// One shared in-flight/cached request so every card on a page doesn't refetch the list.
let cache: Promise<ContentAreaRow[]> | null = null;

function load(): Promise<ContentAreaRow[]> {
  cache ??= fetch("/api/cms/areas", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : []))
    .then((d) => (Array.isArray(d) ? (d as ContentAreaRow[]) : []))
    .catch(() => {
      cache = null; // allow a retry on the next mount
      return [];
    });
  return cache;
}

export function resetAreasCache() {
  cache = null;
}

export const areaLabel = (a: Pick<ContentAreaRow, "labelAr" | "labelEn">, lang: Lang) =>
  lang === "ar" ? a.labelAr : a.labelEn || a.labelAr;

/** All areas (incl. inactive, so old items keep their label). `active` is what pickers/filters should list. */
export function useAreas() {
  const [areas, setAreas] = useState<ContentAreaRow[]>([]);
  useEffect(() => {
    let live = true;
    void load().then((a) => live && setAreas(a));
    return () => { live = false; };
  }, []);
  return {
    areas,
    active: areas.filter((a) => a.isActive),
    labelFor: (slug: string | null | undefined, lang: Lang) => {
      if (!slug) return "";
      const a = areas.find((x) => x.slug === slug);
      return a ? areaLabel(a, lang) : "";
    },
  };
}
