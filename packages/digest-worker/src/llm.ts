import { createModels } from "@earendil-works/pi-ai";
import { cloudflareAIGatewayProvider } from "@earendil-works/pi-ai/providers/cloudflare-ai-gateway";
import type { Bindings } from "./types";

// pi-ai reaches the model over REST via the Cloudflare AI Gateway provider. It
// does NOT use the Workers `ai` binding — creds are passed per-request through
// the `env` stream option (there is no process.env on Workers).

const DEFAULT_MODEL = "workers-ai/@cf/moonshotai/kimi-k2.6";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContext = any;

export interface Llm {
  model: AnyModel;
  /** streamFn wired for pi's Agent (injects gateway creds). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  streamFn: (model: AnyModel, context: AnyContext, options?: any) => any;
  /** One-shot completion, returns the assistant's text. */
  complete: (context: AnyContext) => Promise<string>;
}

/** Extract concatenated text content from a pi-ai assistant message. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function messageText(msg: any): string {
  const content = msg?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
  }
  return "";
}

export function createLlm(env: Bindings): Llm {
  const models = createModels();
  models.setProvider(cloudflareAIGatewayProvider());

  const modelId = env.DIGEST_MODEL ?? DEFAULT_MODEL;
  const model = models.getModel("cloudflare-ai-gateway", modelId);
  if (!model) {
    throw new Error(`digest: model not found in cloudflare-ai-gateway catalog: ${modelId}`);
  }

  const creds: Record<string, string> = {};
  if (env.CLOUDFLARE_API_KEY) creds.CLOUDFLARE_API_KEY = env.CLOUDFLARE_API_KEY;
  if (env.CLOUDFLARE_ACCOUNT_ID) creds.CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
  if (env.CLOUDFLARE_GATEWAY_ID) creds.CLOUDFLARE_GATEWAY_ID = env.CLOUDFLARE_GATEWAY_ID;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamFn = (m: AnyModel, context: AnyContext, options: any = {}) =>
    models.streamSimple(m, context, { ...options, env: creds });

  const complete = async (context: AnyContext): Promise<string> => {
    const msg = await models.completeSimple(model, context, { env: creds });
    return messageText(msg);
  };

  return { model, streamFn, complete };
}
