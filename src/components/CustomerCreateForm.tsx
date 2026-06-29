"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { SearchableCombobox, type ComboboxOption } from "@/components/SearchableCombobox";
import type { PreservedFormState } from "@/lib/form-state";

type CustomerCreateAction = (prevState: PreservedFormState, formData: FormData) => Promise<PreservedFormState>;

type CustomerCreateFormProps = {
  action: CustomerCreateAction;
  csrfInput: ReactNode;
  cancelHref: string;
  lookupPath: string;
  activePrograms: Array<{ uuid: string; name: string; rewardName: string; requiredStamps: number }>;
  branchOptions?: ComboboxOption[];
  referralPreview?: ReactNode;
  initialValues?: Record<string, string>;
  submitLabel?: string;
  submittingLabel?: string;
  inputFocusClass?: string;
  primaryButtonClass?: string;
};

export function CustomerCreateForm({
  action,
  csrfInput,
  cancelHref,
  lookupPath,
  activePrograms,
  branchOptions,
  referralPreview,
  initialValues = {},
  submitLabel = "Enroll customer",
  submittingLabel = "Enrolling...",
  inputFocusClass = "focus:border-[#F97316] focus:ring-4 focus:ring-orange-100",
  primaryButtonClass = "bg-[#F97316] text-white",
}: CustomerCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action, { values: initialValues });
  const values = state.values ?? initialValues;
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.error) return;
    const firstInvalidName = Object.keys(fieldErrors)[0];
    const target = firstInvalidName
      ? formRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(firstInvalidName)}"]`)
      : formRef.current?.querySelector<HTMLElement>("[data-form-error-summary]");
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [fieldErrors, state.error]);

  function value(name: string, fallback = "") {
    const submittedValue = values[name];
    return typeof submittedValue === "string" ? submittedValue : fallback;
  }

  function checked(name: string) {
    return values[name] === true;
  }

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      {csrfInput}
      <FormErrorSummary error={state.error} fieldErrors={fieldErrors} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="firstName" label="First name" defaultValue={value("firstName")} error={fieldErrors.firstName} required focusClass={inputFocusClass} />
        <Input name="lastName" label="Last name" defaultValue={value("lastName")} error={fieldErrors.lastName} focusClass={inputFocusClass} />
        <Input name="phone" label="Phone" defaultValue={value("phone")} error={fieldErrors.phone} required focusClass={inputFocusClass} />
        <Input name="email" label="Email" type="email" defaultValue={value("email")} error={fieldErrors.email} focusClass={inputFocusClass} />
        <Input name="birthday" label="Birthday" type="date" defaultValue={value("birthday")} error={fieldErrors.birthday} focusClass={inputFocusClass} />
        {branchOptions ? (
          <div>
            <SearchableCombobox
              key={`branch-${value("createdBranchId")}`}
              label="Card issued branch"
              name="createdBranchId"
              placeholder="No branch selected"
              emptyLabel="No branches found."
              defaultValue={value("createdBranchId")}
              options={branchOptions}
            />
            {fieldErrors.createdBranchId ? <p className="mt-2 text-sm text-red-700">{fieldErrors.createdBranchId}</p> : null}
          </div>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-sm text-[#111827]">
        <input type="checkbox" name="marketingConsent" defaultChecked={checked("marketingConsent")} className="h-4 w-4 rounded border-[#E5E7EB]" />
        Marketing consent
      </label>
      <ProgramEnrollmentField activePrograms={activePrograms} selectedProgramUuid={value("selectedProgramUuid")} error={fieldErrors.selectedProgramUuid} />
      <div className="grid gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-4">
        <Input
          name="referredByPhoneNumber"
          label="Referred by phone number"
          defaultValue={value("referredByPhoneNumber")}
          placeholder="0501234567"
          error={fieldErrors.referredByPhoneNumber}
          focusClass={inputFocusClass}
        />
        {referralPreview}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" formAction={lookupPath} formMethod="get" className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#111827]">
            Check referrer
          </button>
          <p className="text-sm text-[#6B7280]">Optional. Rewards qualify only after the new customer receives their first valid stamp.</p>
        </div>
      </div>
      <Input
        name="referralCode"
        label="Referral code or link"
        defaultValue={value("referralCode")}
        error={fieldErrors.referralCode}
        focusClass={inputFocusClass}
      />
      <label className="space-y-2">
        <span className="text-sm font-medium text-[#111827]">Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={value("notes")}
          aria-invalid={Boolean(fieldErrors.notes)}
          aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
          className={`w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none ${inputFocusClass}`}
        />
        {fieldErrors.notes ? <span id="notes-error" className="block text-sm text-red-700">{fieldErrors.notes}</span> : null}
      </label>
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${primaryButtonClass}`}>
          {isPending ? submittingLabel : submitLabel}
        </button>
        <Link href={cancelHref} className="rounded-md border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FormErrorSummary({ error, fieldErrors }: { error?: string; fieldErrors: Record<string, string> }) {
  if (!error) return null;
  const fieldMessages = Object.entries(fieldErrors);
  return (
    <section
      data-form-error-summary
      tabIndex={-1}
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-4 focus:ring-red-100"
      aria-live="polite"
    >
      <p className="font-semibold">Please review the form before continuing.</p>
      <p className="mt-1">{error}</p>
      {fieldMessages.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {fieldMessages.map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ProgramEnrollmentField({
  activePrograms,
  selectedProgramUuid,
  error,
}: {
  activePrograms: Array<{ uuid: string; name: string; rewardName: string; requiredStamps: number }>;
  selectedProgramUuid: string;
  error?: string;
}) {
  if (activePrograms.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Customer card will be created now. No active loyalty program is available for enrollment.
      </div>
    );
  }

  if (activePrograms.length === 1) {
    const program = activePrograms[0];
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Customer will be enrolled into <span className="font-semibold">{program.name}</span> after creation.
      </div>
    );
  }

  return (
    <div>
      <SearchableCombobox
        key={`program-${selectedProgramUuid}`}
        label="Loyalty program"
        name="selectedProgramUuid"
        placeholder="Select a loyalty program"
        emptyLabel="No active programs found."
        defaultValue={selectedProgramUuid}
        required
        options={activePrograms.map((program) => ({
          value: program.uuid,
          label: program.name,
          description: `${program.rewardName} - ${program.requiredStamps} visits`,
        }))}
      />
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  error,
  focusClass,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  focusClass: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`h-11 w-full rounded-md border border-[#E5E7EB] px-3 text-sm outline-none ${focusClass}`}
      />
      {error ? <span id={errorId} className="block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
