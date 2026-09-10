import OpenAI from "openai";

/**
 * The API server must boot even when no OpenAI integration is provisioned.
 *
 * The SDK throws from its constructor when the key is missing or empty, so the
 * client is built lazily behind a proxy: importing this module never touches
 * the constructor, and an unconfigured deployment fails only on the specific
 * route that actually calls OpenAI, not on every unrelated route.
 */
export const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";
export const OPENAI_BASE_URL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";

/** True when an OpenAI key is configured; routes can use this to fail politely. */
export const isOpenAIConfigured: boolean = OPENAI_API_KEY !== "";

let instance: OpenAI | undefined;

function getClient(): OpenAI {
  if (!instance) {
    if (!isOpenAIConfigured) {
      throw new Error(
        "OpenAI is not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY " +
          "(and optionally AI_INTEGRATIONS_OPENAI_BASE_URL) to enable AI features.",
      );
    }
    instance = new OpenAI({ apiKey: OPENAI_API_KEY, baseURL: OPENAI_BASE_URL });
  }
  return instance;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, prop) {
    return prop in getClient();
  },
  set(_target, prop, value) {
    return Reflect.set(getClient(), prop, value);
  },
});
