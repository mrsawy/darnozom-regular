import { DEFAULT_ABOUT, mergeAbout, type AboutContent } from "./about-content";
import { useQuery } from "@tanstack/react-query";
import type { ClientLogo, HomeResponse, ItemResponse, ListParams, ListResponse } from "./cms-types";

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
  }
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (r.status === 404) throw new NotFoundError();
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json() as Promise<T>;
}

export function buildListUrl(p: ListParams): string {
  const qs = new URLSearchParams();
  qs.set("type", p.types.join(","));
  for (const key of ["area", "kind", "region", "when", "q"] as const) {
    const v = p[key];
    if (v) qs.set(key, v);
  }
  if (p.page) qs.set("page", String(p.page));
  if (p.pageSize) qs.set("pageSize", String(p.pageSize));
  return `/api/cms/items?${qs.toString()}`;
}

export function useCmsList(p: ListParams, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["cms", "list", p],
    queryFn: () => getJson<ListResponse>(buildListUrl(p)),
    enabled: opts.enabled ?? true,
    placeholderData: (prev) => prev,
  });
}

export function useCmsItem(slug: string, preview: boolean) {
  return useQuery({
    queryKey: ["cms", "item", slug, preview],
    queryFn: () =>
      getJson<ItemResponse>(
        preview ? `/api/admin/cms/preview/${encodeURIComponent(slug)}` : `/api/cms/items/by-slug/${encodeURIComponent(slug)}`,
      ),
    retry: (count, err) => !(err instanceof NotFoundError) && count < 2,
  });
}

export function useCmsHome() {
  return useQuery({ queryKey: ["cms", "home"], queryFn: () => getJson<HomeResponse>("/api/cms/home") });
}

export function useClientLogos() {
  return useQuery({ queryKey: ["cms", "client-logos"], queryFn: () => getJson<ClientLogo[]>("/api/cms/client-logos") });
}

export function useAboutContent() {
  return useQuery({
    queryKey: ["cms", "about"],
    queryFn: async () => mergeAbout(await getJson<Partial<AboutContent>>("/api/cms/about")),
    placeholderData: DEFAULT_ABOUT,
  });
}

export function useClientLogo(id: string) {
  return useQuery({ queryKey: ["cms", "client-logos", id], queryFn: () => getJson<ClientLogo>(`/api/cms/client-logos/${encodeURIComponent(id)}`), retry: false });
}
