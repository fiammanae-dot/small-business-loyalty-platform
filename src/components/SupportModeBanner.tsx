"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { SupportCountdown } from "@/components/SupportCountdown";

type SupportModeBannerProps = {
  sessionId: number;
  businessName: string;
  adminName: string;
  adminEmail: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  readOnly: boolean;
  status: string;
  activities: Array<{
    id: number;
    activityType: string;
    path: string | null;
    entityType: string | null;
    entityId: string | null;
    description: string;
    createdAt: string;
  }>;
  endSessionControl: ReactNode;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SupportModeBanner({
  sessionId,
  businessName,
  adminName,
  adminEmail,
  reason,
  startedAt,
  expiresAt,
  readOnly,
  status,
  activities,
  endSessionControl,
}: SupportModeBannerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const modeLabel = readOnly ? "Read Only" : "Edit Mode";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `🔴 SUPPORT • ${businessName} • Loyalty Card UAE`;

    return () => {
      document.title = previousTitle;
    };
  }, [businessName]);

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-red-200 bg-red-50/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              SUPPORT MODE
            </div>
            <div className="grid min-w-0 gap-1 text-sm text-red-950 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4">
              <span className="min-w-0 break-words">
                <span className="font-bold">Viewing:</span> {businessName}
              </span>
              <span className="min-w-0 break-words">
                <span className="font-bold">Reason:</span> {reason}
              </span>
              <span>
                <span className="font-bold">Remaining:</span>{" "}
                <SupportCountdown expiresAt={expiresAt} supportSessionId={sessionId} redirectOnExpire />
              </span>
              <span className="w-fit rounded-full border border-red-200 bg-white px-2 py-1 text-xs font-bold uppercase text-red-700">
                {modeLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="min-h-11 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              View Session Details
            </button>
            {endSessionControl}
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="support-session-details-title">
          <button
            type="button"
            aria-label="Close support session details"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
            onClick={() => setDetailsOpen(false)}
          />
          <div className="absolute inset-x-4 bottom-4 mx-auto max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-red-100 bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-6 sm:w-[28rem]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-600">Support Session</p>
                <h2 id="support-session-details-title" className="mt-1 text-xl font-black text-slate-950">
                  Session Details
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setDetailsOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <DetailRow label="Business" value={businessName} />
              <DetailRow label="Administrator" value={`${adminName} · ${adminEmail}`} />
              <DetailRow label="Started" value={formatDateTime(startedAt)} />
              <DetailRow label="Expires" value={formatDateTime(expiresAt)} />
              <DetailRow label="Mode" value={modeLabel} />
              <DetailRow label="Reason" value={reason} />
              <DetailRow label="Status" value={status} />
              <DetailRow label="Session ID" value={`#${sessionId}`} />
            </div>

            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-black text-red-900">{modeLabel}</p>
                  <p className="mt-1 text-sm text-red-800">
                    Read-only enforcement will be expanded in a later milestone. This session is visibly marked across the workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">Audit Timeline</p>
              <div className="mt-3 grid gap-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-700">{formatActivityType(activity.activityType)}</p>
                      <time className="shrink-0 text-xs font-semibold text-slate-500">{formatTime(activity.createdAt)}</time>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{activity.description}</p>
                    {activity.path || activity.entityType ? (
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {[activity.path, activity.entityType, activity.entityId].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ))}
                {activities.length === 0 ? <p className="text-sm text-slate-600">No support activity recorded yet.</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatActivityType(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
