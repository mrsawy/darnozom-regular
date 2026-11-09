import type { ContentType } from "../cms/schemas";

/** Content types the admin may email subscribers about. */
export const NOTIFY_TYPES: readonly ContentType[] = ["article", "study", "publication", "news"];

export function canNotifyType(type: ContentType): boolean {
  return NOTIFY_TYPES.includes(type);
}

export const BATCH_SIZE = 50;
