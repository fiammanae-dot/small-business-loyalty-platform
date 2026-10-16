"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateCsrfForm } from "@/lib/csrf";
import { logAuditEvent } from "@/lib/audit";
import { getOutreachActor } from "@/lib/outreach-access";
import { recordCampaignOutreach, recordEventOutreach, saveOutreachSettings } from "@/lib/outreach";
import { parseCampaignInput, parseOutreachSettingsInput } from "@/lib/outreach-rules";

const SCOPE = "outreach";

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function back(path: string, query: { error?: string; success?: string }): never {
  const params = new URLSearchParams();
  if (query.error) params.set("error", query.error);
  if (query.success) params.set("success", query.success);
  const qs = params.toString();
  redirect(qs ? `${path}?${qs}` : path);
}

async function actor(formData: FormData) {
  const who = await getOutreachActor();
  if (!who) redirect("/login");
  try {
    validateCsrfForm(formData, SCOPE);
  } catch {
    back(who.homePath, { error: "Security check failed. Please refresh and try again." });
  }
  return who;
}

/** "Send on WhatsApp" (status SENT) or "Skip" (SKIPPED) for one customer on the contact list. */
export async function markEventOutreachAction(formData: FormData) {
  const who = await actor(formData);
  const status = field(formData, "status") === "SKIPPED" ? "SKIPPED" : "SENT";
  const result = await recordEventOutreach({ scope: who.scope, eventUuid: field(formData, "eventUuid"), status, userId: who.userId });
  if (!result.ok) back(who.homePath, { error: result.error });
  await logAuditEvent({
    businessId: who.scope.businessId,
    branchId: who.scope.branchId ?? null,
    actorUserId: who.userId,
    action: status === "SENT" ? "OUTREACH_SENT" : "OUTREACH_SKIPPED",
    entityType: "engagement_event",
    entityId: null,
    metadata: { eventUuid: field(formData, "eventUuid") },
  });
  revalidatePath(who.homePath);
  revalidatePath(who.role === "BUSINESS_OWNER" ? "/dashboard" : "/branch");
  back(who.homePath, {});
}

/** Which events to act on and the quiet period (owner only). */
export async function saveOutreachSettingsAction(formData: FormData) {
  const who = await actor(formData);
  if (who.role !== "BUSINESS_OWNER") back(who.homePath, { error: "Only the business owner can change these rules." });
  const parsed = parseOutreachSettingsInput({ events: formData.getAll("events").map(String), quietDays: field(formData, "quietDays") });
  if (!parsed.ok) back(who.homePath, { error: parsed.error });
  await saveOutreachSettings(who.scope.businessId, parsed.data);
  revalidatePath(who.homePath);
  back(who.homePath, { success: "Outreach rules saved." });
}

/** A new promotion: name, message, segment (owner only). */
export async function createCampaignAction(formData: FormData) {
  const who = await actor(formData);
  if (who.role !== "BUSINESS_OWNER") back(who.homePath, { error: "Only the business owner can create a promotion." });
  const parsed = parseCampaignInput({ name: field(formData, "name"), message: field(formData, "message"), segment: field(formData, "segment") });
  if (!parsed.ok) back(who.homePath, { error: parsed.error });
  const campaign = await prisma.outreachCampaign.create({
    data: { businessId: who.scope.businessId, createdByUserId: who.userId, ...parsed.data },
    select: { uuid: true },
  });
  await logAuditEvent({ businessId: who.scope.businessId, actorUserId: who.userId, action: "OUTREACH_CAMPAIGN_CREATED", entityType: "outreach_campaign", entityId: null, metadata: { uuid: campaign.uuid, segment: parsed.data.segment } });
  revalidatePath(who.homePath);
  redirect(`${who.homePath}/campaigns/${campaign.uuid}`);
}

export async function markCampaignOutreachAction(formData: FormData) {
  const who = await actor(formData);
  const campaignUuid = field(formData, "campaignUuid");
  const path = `${who.homePath}/campaigns/${campaignUuid}`;
  const status = field(formData, "status") === "SKIPPED" ? "SKIPPED" : "SENT";
  const result = await recordCampaignOutreach({ scope: who.scope, campaignUuid, customerUuid: field(formData, "customerUuid"), status, userId: who.userId });
  if (!result.ok) back(path, { error: result.error });
  revalidatePath(path);
  back(path, {});
}

export async function archiveCampaignAction(formData: FormData) {
  const who = await actor(formData);
  if (who.role !== "BUSINESS_OWNER") back(who.homePath, { error: "Only the business owner can close a promotion." });
  await prisma.outreachCampaign.updateMany({ where: { uuid: field(formData, "campaignUuid"), businessId: who.scope.businessId }, data: { status: "ARCHIVED" } });
  revalidatePath(who.homePath);
  back(who.homePath, { success: "Promotion closed." });
}
