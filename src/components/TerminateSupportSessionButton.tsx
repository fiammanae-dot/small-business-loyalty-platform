"use client";

type TerminateSupportSessionButtonProps = {
  businessName: string;
  adminName: string;
  reason: string;
};

function setHiddenFormValue(form: HTMLFormElement, name: string, value: string) {
  let input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);

  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }

  input.value = value;
}

export function TerminateSupportSessionButton({ businessName, adminName, reason }: TerminateSupportSessionButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(
          `Terminate Support Session?\n\nBusiness: ${businessName}\nAdministrator: ${adminName}\nReason: ${reason}\n\nThis will end access immediately.`,
        );

        if (!confirmed) {
          event.preventDefault();
          return;
        }

        const supportSummary = window.prompt("Support Summary is required before ending this session.", "Resolved support request.");
        if (!supportSummary?.trim()) {
          event.preventDefault();
          window.alert("Support Summary is required.");
          return;
        }

        setHiddenFormValue(event.currentTarget.form as HTMLFormElement, "supportSummary", supportSummary.trim());
      }}
      className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
    >
      Terminate Session
    </button>
  );
}
