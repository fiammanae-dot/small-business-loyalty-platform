import type { BusinessBranding, BusinessCommunicationSettings, BusinessType, RecordStatus, SubscriptionPlan } from "@prisma/client";
import { CsrfInput } from "@/components/CsrfInput";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { businessTypeOptions, statusOptions } from "@/lib/platform-options";

type BusinessFormProps = {
  action: (formData: FormData) => Promise<void>;
  plans: Array<Pick<SubscriptionPlan, "id" | "name">>;
  error?: string;
  mode: "create" | "edit";
  business?: {
    id: number;
    uuid: string;
    name: string;
    businessType: BusinessType;
    status: RecordStatus;
    branding: BusinessBranding | null;
    communicationSettings?: BusinessCommunicationSettings | null;
    subscriptionPlanId?: number;
  };
};

export function BusinessForm({ action, plans, error, mode, business }: BusinessFormProps) {
  const branding = business?.branding;
  const communicationSettings = business?.communicationSettings;
  const brandingValues = {
    logoUrl: branding?.logoUrl ?? "",
    primaryColor: branding?.primaryColor ?? "#F97316",
    secondaryColor: branding?.secondaryColor ?? "#FDBA74",
    backgroundColor: branding?.backgroundColor ?? "#FFFFFF",
    textColor: branding?.textColor ?? "#111827",
    buttonColor: branding?.buttonColor ?? "#F97316",
  };

  return (
    <form action={action} className="space-y-6">
      <CsrfInput scope="platform:businesses" />
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

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
          <Field label="Business name" name="name" defaultValue={business?.name} required />
          <SelectField
            label="Business type"
            name="businessType"
            defaultValue={business?.businessType}
            options={businessTypeOptions}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={business?.status ?? "ACTIVE"}
            options={statusOptions}
          />
        </div>
      </section>

      {mode === "create" ? (
        <>
          <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
            <StepHeading step={2} title="Owner Account" />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Owner full name" name="ownerName" required />
              <Field label="Owner email" name="ownerEmail" type="email" required />
              <Field label="Temporary password" name="temporaryPassword" type="password" required />
            </div>
          </section>

          <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
            <StepHeading step={3} title="First Branch" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Branch name" name="branchName" required />
              <Field label="Country" name="country" required />
              <Field label="City" name="city" required />
              <Field label="Address" name="address" required />
            </div>
          </section>
        </>
      ) : null}

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <StepHeading step={mode === "create" ? 4 : undefined} title="Subscription Plan" />
        <div className="mt-5 max-w-sm">
          <SearchableCombobox
            label="Plan"
            name="subscriptionPlanId"
            defaultValue={business?.subscriptionPlanId?.toString()}
            placeholder="Search plans"
            required
            options={plans.map((plan) => ({ value: plan.id.toString(), label: plan.name, description: "Subscription plan" }))}
          />
        </div>
      </section>

      <section className="rounded-md border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-1">
          <StepHeading step={mode === "create" ? 5 : undefined} title="Branding" />
          <p className="text-sm text-[#6B7280]">System Administrator controls the public card and business brand appearance.</p>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Logo URL" name="logoUrl" type="url" defaultValue={brandingValues.logoUrl} />
            <Field label="Primary color" name="primaryColor" defaultValue={brandingValues.primaryColor} required />
            <Field label="Secondary color" name="secondaryColor" defaultValue={brandingValues.secondaryColor} required />
            <Field label="Background color" name="backgroundColor" defaultValue={brandingValues.backgroundColor} required />
            <Field label="Text color" name="textColor" defaultValue={brandingValues.textColor} required />
            <Field label="Button color" name="buttonColor" defaultValue={brandingValues.buttonColor} required />
          </div>
          <BrandingPreview
            businessName={business?.name ?? "Business preview"}
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
          <Checkbox label="WhatsApp enabled" name="whatsappEnabled" defaultChecked={communicationSettings?.whatsappEnabled ?? false} />
          <Checkbox label="SMS enabled" name="smsEnabled" defaultChecked={communicationSettings?.smsEnabled ?? false} />
          <Checkbox label="Email enabled" name="emailEnabled" defaultChecked={communicationSettings?.emailEnabled ?? false} />
          <SelectField
            label="Default channel"
            name="preferredDefaultChannel"
            defaultValue={communicationSettings?.preferredDefaultChannel ?? "NONE"}
            options={[
              { value: "NONE", label: "None" },
              { value: "WHATSAPP", label: "WhatsApp" },
              { value: "SMS", label: "SMS" },
              { value: "EMAIL", label: "Email" },
            ]}
          />
          <Field label="WhatsApp business number" name="whatsappBusinessNumber" defaultValue={communicationSettings?.whatsappBusinessNumber ?? ""} />
          <Field label="Sender email" name="senderEmail" type="email" defaultValue={communicationSettings?.senderEmail ?? ""} />
          <Field label="Sender name" name="senderName" defaultValue={communicationSettings?.senderName ?? ""} />
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
        className="inline-flex h-11 items-center justify-center rounded-md bg-[#F97316] px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        {mode === "create" ? "Create business" : "Save changes"}
      </button>
    </form>
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
      <p className="text-sm font-semibold" style={{ color: values.primaryColor }}>Brand preview</p>
      <div className="mt-4 flex items-center gap-3">
        {values.logoUrl ? (
          <div className="h-12 w-12 rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${values.logoUrl})` }} />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md text-sm font-bold text-white" style={{ backgroundColor: values.primaryColor }}>
            {businessName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold">{businessName}</h3>
          <p className="text-sm opacity-70">Member card style</p>
        </div>
      </div>
      <div className="mt-5 rounded-md border border-[#E5E7EB] bg-white/80 p-4">
        <p className="text-sm font-semibold">Sample loyalty progress</p>
        <div className="mt-4 h-3 rounded-full" style={{ backgroundColor: values.secondaryColor }}>
          <div className="h-3 w-2/5 rounded-full" style={{ backgroundColor: values.primaryColor }} />
        </div>
        <button type="button" className="mt-5 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: values.buttonColor }}>
          Sample button
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
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
      />
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
}: {
  label: string;
  name: string;
  defaultValue?: T;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        required
        className="h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#F97316] focus:ring-4 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
