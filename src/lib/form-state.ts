import type { ZodError } from "zod";

export type PreservedFormValue = string | boolean;
export type PreservedFormValues = Record<string, PreservedFormValue>;
export type FormFieldErrors = Record<string, string>;

export type PreservedFormState = {
  error?: string;
  fieldErrors?: FormFieldErrors;
  values?: PreservedFormValues;
};

export class FormActionError extends Error {
  fieldErrors?: FormFieldErrors;

  constructor(message: string, fieldErrors?: FormFieldErrors) {
    super(message);
    this.name = "FormActionError";
    this.fieldErrors = fieldErrors;
  }
}

export function throwFormActionError(message: string, fieldErrors?: FormFieldErrors): never {
  throw new FormActionError(message, fieldErrors);
}

export function isFormActionError(error: unknown): error is FormActionError {
  return error instanceof FormActionError;
}

export function getZodFieldErrors(error: ZodError): FormFieldErrors {
  const fieldErrors: FormFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

export function getFirstZodMessage(error: ZodError, fallback = "Validation failed.") {
  return error.issues[0]?.message ?? fallback;
}

export function collectFormValues(
  formData: FormData,
  fields: string[],
  checkboxFields: string[] = [],
  passwordFields: string[] = [],
): PreservedFormValues {
  const values: PreservedFormValues = {};
  for (const field of fields) {
    if (passwordFields.includes(field)) {
      values[field] = "";
    } else if (checkboxFields.includes(field)) {
      values[field] = formData.has(field);
    } else {
      const value = formData.get(field);
      values[field] = typeof value === "string" ? value : "";
    }
  }
  return values;
}

export function createFormFailure({
  formData,
  fields,
  message,
  checkboxFields = [],
  passwordFields = [],
  fieldErrors,
}: {
  formData: FormData;
  fields: string[];
  message: string;
  checkboxFields?: string[];
  passwordFields?: string[];
  fieldErrors?: FormFieldErrors;
}): PreservedFormState {
  return {
    error: message,
    fieldErrors,
    values: collectFormValues(formData, fields, checkboxFields, passwordFields),
  };
}
