export {
  isLocalObjectStorage,
  getPrivateRoot,
  savePrivateObject,
  privateObjectExists,
  readPrivateObjectMeta,
  openPrivateObjectStream,
  entityKeyFromObjectPath,
  PUBLIC_OBJECT_PREFIXES,
  isPublicObjectKey,
} from "./objectStore.js";

// Additional exports needed by apps/api's existing import sites (not listed
// in the task-11 brief's export list, which only covers objectStore.ts, but
// required so the extraction doesn't break routes that import these directly
// from the old objectStorage module).
export {
  ObjectStorageService,
  ObjectNotFoundError,
  objectStorageClient,
} from "./objectStorage.js";
