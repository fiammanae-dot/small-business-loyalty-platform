/**
 * WhatsApp send adapter.
 *
 * The interface is provider-abstract on purpose: every call site talks to
 * `WhatsAppSender`, so a BSP (360dialog) can be dropped in later by adding a
 * second implementation and selecting it from the channel's `provider` column -
 * no call site changes.
 *
 * The Cloud API implementation below is a pure function of its arguments (the
 * access token is passed in already decrypted, and `fetch` is injectable), which
 * keeps it free of runtime imports and directly testable against this source.
 */

export type WhatsAppTemplateMessage = {
  /** Digits only, no leading `+` - produced by formatUaePhoneForWhatsApp. */
  recipientPhone: string;
  templateName: string;
  /** Meta template language code, e.g. "en" or "en_US". Must match the approved template. */
  templateLanguage: string;
  /** Ordered {{1}}, {{2}}, ... body variables. Order must match the approved template. */
  bodyVariables: string[];
  /** Text substituted into the template's dynamic URL button, if it has one. */
  urlButtonParameter?: string;
};

export type WhatsAppSendResult = { providerMessageId: string } | { error: string };

export interface WhatsAppSender {
  sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<WhatsAppSendResult>;
}

export type MetaCloudApiCredentials = {
  phoneNumberId: string;
  /** Decrypted at the call site; never logged, never returned in an error. */
  accessToken: string;
};

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export const META_GRAPH_API_VERSION = "v21.0";
export const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export function buildMetaMessagesUrl(phoneNumberId: string) {
  return `${META_GRAPH_API_BASE}/${encodeURIComponent(phoneNumberId)}/messages`;
}

/**
 * The Cloud API request body for a template message.
 *
 * Body variables are passed through in the caller's order. The approved Meta
 * template `new_loyalty_card` is body {{1}} = customer name, {{2}} = business
 * name; URL button parameter = the card link's path suffix. If the template is
 * ever re-approved with a different order, change the caller's `bodyVariables`
 * array; this builder stays as is.
 *
 * Note on the button: Meta's dynamic URL button takes only the *suffix* appended
 * to the base URL registered on the template, not a whole URL.
 */
export function buildTemplateMessagePayload(message: WhatsAppTemplateMessage) {
  const components: Array<Record<string, unknown>> = [];

  if (message.bodyVariables.length > 0) {
    components.push({
      type: "body",
      parameters: message.bodyVariables.map((text) => ({ type: "text", text })),
    });
  }

  if (message.urlButtonParameter) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: message.urlButtonParameter }],
    });
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: message.recipientPhone,
    type: "template",
    template: {
      name: message.templateName,
      language: { code: message.templateLanguage },
      ...(components.length > 0 ? { components } : {}),
    },
  };
}

/**
 * Pulls a human-readable summary out of a Meta error body without ever echoing
 * the request (which carries the bearer token).
 */
export function summarizeMetaError(status: number, body: unknown): string {
  const error = isRecord(body) && isRecord(body.error) ? body.error : null;

  const message = typeof error?.message === "string" ? error.message : null;
  const details = isRecord(error?.error_data) && typeof error.error_data.details === "string" ? error.error_data.details : null;
  const code = typeof error?.code === "number" || typeof error?.code === "string" ? String(error.code) : null;

  const summary = [message, details].filter(Boolean).join(" - ");
  if (summary) return code ? `${summary} (code ${code})` : summary;

  return `WhatsApp API request failed with status ${status}.`;
}

export function createMetaCloudApiSender(
  credentials: MetaCloudApiCredentials,
  options: { fetchImpl?: FetchLike } = {},
): WhatsAppSender {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);

  return {
    async sendTemplateMessage(message) {
      const payload = buildTemplateMessagePayload(message);

      let response: Response;
      try {
        response = await fetchImpl(buildMetaMessagesUrl(credentials.phoneNumberId), {
          method: "POST",
          headers: {
            // The only place the token appears. Never logged, never surfaced in
            // the returned error.
            Authorization: `Bearer ${credentials.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        // Network-level failure: DNS, TLS, timeout, offline.
        return { error: error instanceof Error ? error.message : "WhatsApp API request failed." };
      }

      const body = await readJsonBody(response);

      if (!response.ok) return { error: summarizeMetaError(response.status, body) };

      const providerMessageId = extractProviderMessageId(body);
      if (!providerMessageId) return { error: "WhatsApp API accepted the request but returned no message id." };

      return { providerMessageId };
    },
  };
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function extractProviderMessageId(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.messages)) return null;
  const first = body.messages[0];
  return isRecord(first) && typeof first.id === "string" && first.id ? first.id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
