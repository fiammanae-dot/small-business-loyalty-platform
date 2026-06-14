import { createCsrfToken, csrfFieldName } from "@/lib/csrf";

export function CsrfInput({ scope }: { scope: string }) {
  return <input type="hidden" name={csrfFieldName()} value={createCsrfToken(scope)} />;
}
