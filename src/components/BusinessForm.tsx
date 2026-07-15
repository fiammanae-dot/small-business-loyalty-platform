"use client";

import type { BillingCycle, BusinessBranding, BusinessCommunicationSettings, BusinessType, RecordStatus, SubscriptionPlan } from "@prisma/client";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { BranchLocationFields } from "@/components/BranchLocationFields";
import { BusinessLogoAvatar } from "@/components/BusinessLogoAvatar";
import { BusinessLogoUploadField } from "@/components/BusinessLogoUploadField";
import { PlanBillingCycleFields } from "@/components/PlanBillingCycleFields";
import { RequiredMark } from "@/components/ui/RequiredMark";
import type { PreservedFormState } from "@/lib/form-state";
import { businessTypeOptions, statusOptions } from "@/lib/platform-options";

type StatefulBusinessAction = (prevState: PreservedFormState, formData: FormData) => Promise<PreservedFormState>;
type DirectBusinessAction = (formData: FormData) => Promise<void>;

type BusinessFormProps = {
  action: StatefulBusinessAction | DirectBusinessAction;
  plans: Array<Pick<SubscriptionPlan, "id" | "code" | "name" | "monthlyPrice" | "annualPrice" | "billingCycleSupport">>;
  error?: string;
  mode: "create" | "edit";
  csrfInput: ReactNode;
  business?: {
    id: number;
    uuid: string;
    name: string;
    businessType: BusinessType;
    status: RecordStatus;
    branding: BusinessBranding | null;
    communicationSettings?: BusinessCommunicationSettings | null;
    subscriptionPlanId?: number;
    billingCycle?: BillingCycle;
  };
};

export function BusinessForm({ action, plans, error, mode, business, csrfInput }: BusinessFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action as StatefulBusinessAction, {});
  const branding = business?.branding;
  const communicationSettings = business?.communicationSettings;
  const values = state.values ?? {};
  const fieldErrors = state.fieldErrors ?? {};
  const formError = state.error ?? error;
  const shouldUseStatefulAction = mode === "create";
  const submitAction = shouldUseStatefulAction ? formAction : (action as DirectBusinessAction);

  useEffect(() => {
    if (!formError) return;
    const firstInvalidName = Object.keys(fieldErrors)[0];
    const target = firstInvalidName
      ? formRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(firstInvalidName)}"]`)
      : formRef.current?.querySelector<HTMLElement>("[data-form-error-summary]");
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [fieldErrors, formError]);

  function value(name: string, fallback = "") {
    const submittedValue = values[name];
    return typeof submittedValue === "string" ? submittedValue : fallback;
  }

  function checked(name: string, fallback: boolean) {
    const submittedValue = values[name];
    return typeof submittedValue === "boolean" ? submittedValue : fallback;
  }

  const createBrandingDefaults = {
    logoUrl: "",
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    textColor: "#111827",
    buttonColor: "#000000",
  };
  const editBrandingDefaults = {
    logoUrl: "",
    primaryColor: "#F97316",
    secondaryColor: "#FDBA74",
    backgroundColor: "#FFFFFF",
    textColor: "#111827",
    buttonColor: "#F97316",
  };
  const defaultBrandingValues = mode === "create" ? createBrandingDefaults : editBrandingDefaults;
  const [logoUrl, setLogoUrl] = useState(() => value("logoUrl", branding?.logoUrl ?? defaultBrandingValues.logoUrl));
  const brandingValues = {
    logoUrl,
    primaryColor: value("primaryColor", branding?.primaryColor ?? defaultBrandingValues.primaryColor),
    secondaryColor: value("secondaryColor", branding?.secondaryColor ?? defaultBrandingValues.secondaryColor),
    backgroundColor: value("backgroundColor", branding?.backgroundColor ?? defaultBrandingValues.backgroundColor),
    textColor: value("textColor", branding?.textColor ?? defaultBrandingValues.textColor),
    buttonColor: value("buttonColor", branding?.buttonColor ?? defaultBrandingValues.buttonColor),
  };

  return (
    <form ref={formRef} action={submitAction} className="space-y-6">
      {csrfInput}
      <FormErrorSummary error={formError} fieldErrors={fieldErrors} />

      {mode === "edit" && business ? (
        <>
          <input type="hidden" name="businessId" value={business.id} />
          <input type="hidden" name="businessUuid" value={business.uuid} />
        </>
      ) : null}

      {mode === "create" ? <WizardSteps /> : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <StepHeading step={mode === "create" ? 1 : undefined} title="Business Details" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="Business name" name="name" defaultValue={value("name", business?.name)} error={fieldErrors.name} required />
          <SelectField
            label="Business type"
            name="businessType"
            defaultValue={value("businessType", business?.businessType) as BusinessType}
            options={businessTypeOptions}
            error={fieldErrors.businessType}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={value("status", business?.status ?? "ACTIVE") as RecordStatus}
            options={statusOptions}
            error={fieldErrors.status}
          />
        </div>
      </section>

      {mode === "create" ? (
        <>
          <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
            <StepHeading step={2} title="Owner Account" />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Owner full name" name="ownerName" defaultValue={value("ownerName")} error={fieldErrors.ownerName} required />
              <Field label="Owner email" name="ownerEmail" type="email" defaultValue={value("ownerEmail")} error={fieldErrors.ownerEmail} required />
              <Field label="Temporary password" name="temporaryPassword" type="password" defaultValue="" error={fieldErrors.temporaryPassword} required />
            </div>
          </section>

          <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
            <StepHeading step={3} title="First Branch" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <BranchLocationFields defaultCountry={value("country")} defaultCity={value("city")} />
              <Field label="Branch name" name="branchName" defaultValue={value("branchName")} error={fieldErrors.branchName} required />
              <Field label="Address" name="address" defaultValue={value("address")} error={fieldErrors.address} required />
            </div>
          </section>
        </>
      ) : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <StepHeading step={mode === "create" ? 4 : undefined} title="Subscription Plan" />
        <div className="mt-5 max-w-3xl">
          <PlanBillingCycleFields
            plans={plans.map((plan) => ({
              id: plan.id,
              code: plan.code,
              name: plan.name,
              monthlyPrice: plan.monthlyPrice.toString(),
              annualPrice: plan.annualPrice.toString(),
              billingCycleSupport: plan.billingCycleSupport,
            }))}
            defaultPlanId={value("subscriptionPlanId", business?.subscriptionPlanId?.toString())}
            defaultBillingCycle={value("billingCycle", business?.billingCycle)}
          />
          {fieldErrors.subscriptionPlanId || fieldErrors.billingCycle ? (
            <p className="mt-2 text-sm text-red-700">{fieldErrors.subscriptionPlanId ?? fieldErrors.billingCycle}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-1">
          <StepHeading step={mode === "create" ? 5 : undefined} title="Branding" />
          <p className="text-sm text-[#6B7280]">System Administrator controls the public card and business brand appearance.</p>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <BusinessLogoUploadField
              value={logoUrl}
              onChange={setLogoUrl}
              businessName={value("name", business?.name ?? "")}
              error={fieldErrors.logoUrl}
            />
            <Field label="Primary color" name="primaryColor" defaultValue={brandingValues.primaryColor} error={fieldErrors.primaryColor} required />
            <Field label="Secondary color" name="secondaryColor" defaultValue={brandingValues.secondaryColor} error={fieldErrors.secondaryColor} required />
            <Field label="Background color" name="backgroundColor" defaultValue={brandingValues.backgroundColor} error={fieldErrors.backgroundColor} required />
            <Field label="Text color" name="textColor" defaultValue={brandingValues.textColor} error={fieldErrors.textColor} required />
            <Field label="Button color" name="buttonColor" defaultValue={brandingValues.buttonColor} error={fieldErrors.buttonColor} required />
          </div>
          <BrandingPreview
            businessName={value("name", business?.name ?? "Business")}
            values={brandingValues}
          />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-[#111827]">Communication settings</h2>
          <p className="text-sm text-[#6B7280]">Provider-level readiness settings. Messages are still prepared manually only.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Checkbox label="WhatsApp enabled" name="whatsappEnabled" defaultChecked={checked("whatsappEnabled", communicationSettings?.whatsappEnabled ?? false)} />
          <Checkbox label="SMS enabled" name="smsEnabled" defaultChecked={checked("smsEnabled", communicationSettings?.smsEnabled ?? false)} />
          <Checkbox label="Email enabled" name="emailEnabled" defaultChecked={checked("emailEnabled", communicationSettings?.emailEnabled ?? false)} />
          <SelectField
            label="Default channel"
            name="preferredDefaultChannel"
            defaultValue={value("preferredDefaultChannel", communicationSettings?.preferredDefaultChannel ?? "NONE") as "NONE" | "WHATSAPP" | "SMS" | "EMAIL"}
            options={[
              { value: "NONE", label: "None" },
              { value: "WHATSAPP", label: "WhatsApp" },
              { value: "SMS", label: "SMS" },
              { value: "EMAIL", label: "Email" },
            ]}
            error={fieldErrors.preferredDefaultChannel}
          />
          <Field label="WhatsApp business number" name="whatsappBusinessNumber" defaultValue={value("whatsappBusinessNumber", communicationSettings?.whatsappBusinessNumber ?? "")} error={fieldErrors.whatsappBusinessNumber} />
          <Field label="Sender email" name="senderEmail" type="email" defaultValue={value("senderEmail", communicationSettings?.senderEmail ?? "")} error={fieldErrors.senderEmail} />
          <Field label="Sender name" name="senderName" defaultValue={value("senderName", communicationSettings?.senderName ?? "")} error={fieldErrors.senderName} />
        </div>
      </section>

      {mode === "create" ? (
        <section className="rounded-md border border-orange-200 bg-orange-50 p-5">
          <StepHeading step={6} title="Review & Create" />
          <p className="mt-2 text-sm leading-6 text-[#9A3412]">
            Review the business details, owner account, first branch, subscription plan, branding, and communication settings before creating the organization.
          </p>
        </section>
      ) : null}

      <button
        type="submit"
        disabled={isPending && shouldUseStatefulAction}
        className="inline-flex h-11 items-center justify-center rounded-md bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        {isPending && shouldUseStatefulAction ? "Creating..." : mode === "create" ? "Create business" : "Save changes"}
      </button>
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

function WizardSteps() {
  const steps = ["Business Details", "Owner Account", "First Branch", "Subscription Plan", "Branding", "Review & Create"];
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
      <p className="text-sm font-semibold text-[#F97316]">Create organization</p>
      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border border-[#E5E7EB] p-3">
            <p className="text-xs font-semibold uppercase text-[#F97316]">Step {index + 1}</p>
            <p className="mt-1 text-sm font-semibold text-[#111827]">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StepHeading({ step, title }: { step?: number; title: string }) {
  return (
    <div>
      {step ? <p className="text-sm font-semibold text-[#F97316]">Step {step}</p> : null}
      <h2 className="mt-1 text-lg font-semibold text-[#111827]">{title}</h2>
    </div>
  );
}

function BrandingPreview({
  businessName,
  values,
}: {
  businessName: string;
  values: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
  };
}) {
  return (
    <div className="rounded-md border border-[#E5E7EB] p-5" style={{ backgroundColor: values.backgroundColor, color: values.textColor }}>
      <p className="text-sm font-semibold" style={{ color: values.primaryColor }}>Brand appearance</p>
      <div className="mt-4 flex items-center gap-3">
        <BusinessLogoAvatar
          logoUrl={values.logoUrl || null}
          businessName={businessName}
          fallback={businessName.slice(0, 2).toUpperCase()}
          className="h-12 w-12 rounded-md text-sm font-bold text-white"
          style={{ backgroundColor: values.primaryColor }}
        />
        <div>
          <h3 className="text-base font-semibold">{businessName}</h3>
          <p className="text-sm opacity-70">Member card style</p>
        </div>
      </div>
      <div className="mt-5 rounded-md border border-[#E5E7EB] bg-white/80 p-4">
        <p className="text-sm font-semibold">Loyalty progress</p>
        <div className="mt-4 h-3 rounded-full" style={{ backgroundColor: values.secondaryColor }}>
          <div className="h-3 w-2/5 rounded-full" style={{ backgroundColor: values.primaryColor }} />
        </div>
        <button type="button" className="mt-5 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: values.buttonColor }}>
          Primary action
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
      />
      {error ? <span id={errorId} className="block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex h-11 items-center gap-3 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#111827]">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-[#F97316]" />
      {label}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  name,
  defaultValue,
  options,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: T;
  options: Array<{ value: T; label: string }>;
  error?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">
        {label}
        <RequiredMark />
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span id={errorId} className="block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
