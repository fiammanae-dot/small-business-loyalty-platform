import type { ZodIssue } from "zod";
import type { Translate } from "./translate";

/**
 * The join form's validation messages in the customer's language. Zod's
 * messages are English (shared with staff forms), so the field that failed
 * picks the translated text; anything unexpected keeps Zod's wording.
 */
export function joinIssueMessage(t: Translate, issue: ZodIssue | undefined, fallbackKey: string): string {
  const field = issue?.path?.[0];
  const known: Record<string, string> = {
    firstName: "join.error.firstName",
    phone: "join.error.phone",
    email: "join.error.email",
    birthday: "join.error.birthday",
  };
  if (typeof field === "string" && known[field]) return t(known[field]);
  return issue?.message ?? t(fallbackKey);
}
