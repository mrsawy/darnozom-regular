export * from "./generated/api";
export type * from "./generated/types";

// Names exported by both ./generated/api (zod schemas) and ./generated/types
// (interfaces) are explicitly re-exported from the zod file so the runtime
// schema values win and the star-export ambiguity (TS2308) is resolved.
export {
  CreateClientBody,
  CreateConversationBody,
  CreateDocumentBody,
  GeneratePresentationBody,
  GenerateReportBody,
  GenerateTrainingBody,
  SaveContentBody,
  SendMessageBody,
  UpdateClientBody,
  UpdateDocumentBody,
} from "./generated/api";
