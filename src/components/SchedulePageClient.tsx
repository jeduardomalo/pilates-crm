"use client";

import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cancelScheduledClass,
  createScheduledClass,
  createScheduledClasses,
  exportScheduleWeekToGoogle,
  getScheduleWeek,
  updateScheduledClass,
} from "@/app/actions";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";

type ClientOption = { id: string; name: string };

type ScheduleItem = {
  id: string;
  start: string;
  end: string;
  type: string;
  location: string;
  notes?: string | null;
  status: "SCHEDULED" | "CANCELLED" | "NO_SHOW" | "POSTED" | string;
  googleEventId?: string | null;
  participants: Array<{
    id: string;
    clientId: string;
    clientName: string;
    price: string;
    isPaid: boolean;
    usePackage: boolean;
    postedSessionId?: string | null;
  }>;
};

type GoogleStatus =
  | { connected: false }
  | { connected: true; connectedAt?: string; calendarId?: string };

type ScheduledClassPayload = {
  start: string;
  end: string;
  type: string;
  location: string;
  notes?: string | null;
  participants: Array<{
    clientId: string;
    price: number;
    isPaid: boolean;
    usePackage: boolean;
  }>;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function statusLabel(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "POSTED":
      return "Posted";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800";
    case "POSTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800";
    case "CANCELLED":
    case "NO_SHOW":
      return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800";
    default:
      return "bg-sand-50 text-gray-700 border-sand-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
  }
}

export function SchedulePageClient(props: {
  clients: ClientOption[];
  initialWeekStartIso: string;
  initialItems: ScheduleItem[];
  googleStatus: GoogleStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [weekStartIso, setWeekStartIso] = useState(props.initialWeekStartIso);
  const [items, setItems] = useState<ScheduleItem[]>(props.initialItems);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const searchParams = useSearchParams();
  const googleError = searchParams.get("google") === "error" ? searchParams.get("reason") ?? "error" : null;
  const [googleErrorDismissed, setGoogleErrorDismissed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const weekStart = useMemo(() => new Date(weekStartIso), [weekStartIso]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const days = useMemo(() => {
    const start = startOfDay(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const d of days) map.set(d.toISOString().slice(0, 10), []);
    for (const it of items) {
      const key = new Date(it.start).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      map.set(k, list);
    }
    return map;
  }, [items, days]);

  const refreshWeek = (newWeekStartIso?: string) => {
    const target = newWeekStartIso ?? weekStartIso;
    setIsRefreshing(true);
    getScheduleWeek(target)
      .then((next) => {
        const list = Array.isArray(next) ? next : [];
        setItems(list as ScheduleItem[]);
        setWeekStartIso(target);
      })
      .catch((err) => {
        console.error("Refresh schedule failed:", err);
        alert("Could not refresh schedule. Please try again.");
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  const handlePrevWeek = () => {
    const prev = addDays(weekStart, -7);
    refreshWeek(prev.toISOString());
  };

  const handleNextWeek = () => {
    const next = addDays(weekStart, 7);
    refreshWeek(next.toISOString());
  };

  const handleThisWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const start = startOfDay(today);
    start.setDate(start.getDate() - day);
    refreshWeek(start.toISOString());
  };

  const openCreate = () => {
    setEditingId(null);
    setIsEditOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setIsEditOpen(true);
  };

  const onSaved = async () => {
    setIsEditOpen(false);
    setEditingId(null);
    refreshWeek();
    router.refresh();
  };

  const currentEditing = useMemo(() => {
    if (!editingId) return null;
    return items.find((i) => i.id === editingId) ?? null;
  }, [editingId, items]);

  const handleDisconnectGoogle = async () => {
    startTransition(async () => {
      await fetch("/api/google/disconnect", { method: "POST" });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            disabled={isPending || isRefreshing}
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            disabled={isPending || isRefreshing}
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={handleThisWeek}
            className="px-3 py-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
            disabled={isPending || isRefreshing}
          >
            This week
          </button>
          <div className="ml-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar size={16} />
            <span className="font-medium text-charcoal dark:text-white">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshWeek()}
            className="px-3 py-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            disabled={isPending || isRefreshing}
            aria-busy={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={openCreate}
            className="px-3 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            disabled={isPending || isRefreshing}
          >
            <Plus size={16} />
            Add class
          </button>
          <button
            onClick={() => setIsBulkOpen(true)}
            className="px-3 py-2 rounded-lg border border-sage text-sage bg-white dark:bg-gray-800 hover:bg-sage/10 dark:hover:bg-sage/20 transition-colors text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            disabled={isPending || isRefreshing}
          >
            <CalendarDays size={16} />
            Add multiple
          </button>
        </div>
      </div>

      {/* Google Calendar error banner */}
      {googleError && !googleErrorDismissed && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Google Calendar sync failed</p>
            <p className="text-sm mt-1 opacity-90">
              {googleError === "config"
                ? "Google Calendar is not configured for this environment. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI (see docs/SETUP-GOOGLE-CALENDAR.md in the repo for step-by-step setup)."
                : "Something went wrong. Check that your Google Cloud OAuth credentials and redirect URI are correct (see docs/SETUP-GOOGLE-CALENDAR.md), then try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGoogleErrorDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Google connection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-sand-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-charcoal dark:text-white">Google Calendar</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Export this week to your primary Google Calendar. Re-export updates existing events (no duplicates).
            </p>
          </div>
          {"connected" in props.googleStatus && props.googleStatus.connected ? (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setExportMessage(null);
                  setIsExporting(true);
                  const result = await exportScheduleWeekToGoogle(weekStartIso);
                  setIsExporting(false);
                  if (result.success) {
                    const count = result.exportedCount ?? 0;
                    const text =
                      count === 0
                        ? "No scheduled classes this week to export. Add classes and try again."
                        : count === 1
                          ? "1 event exported to Google Calendar."
                          : `${count} events exported to Google Calendar.`;
                    setExportMessage({ type: count === 0 ? "error" : "success", text });
                    refreshWeek();
                  } else {
                    setExportMessage({ type: "error", text: result.error ?? "Export failed" });
                  }
                }}
                disabled={isExporting}
                className="px-3 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? "Exporting…" : "Export this week to Google Calendar"}
              </button>
              <button
                onClick={handleDisconnectGoogle}
                disabled={isPending}
                className="px-3 py-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/google/auth/start"
              className="px-3 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors text-sm font-medium"
            >
              Sync
            </a>
          )}
        </div>
        {"connected" in props.googleStatus && props.googleStatus.connected && (
          <div className="mt-3 flex flex-col gap-1">
            <div className="text-sm text-emerald-700 dark:text-emerald-300">
              Synced to <span className="font-medium">{props.googleStatus.calendarId ?? "primary"}</span>
            </div>
            {exportMessage && (
              <div
                className={`text-sm ${exportMessage.type === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}
              >
                {exportMessage.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week agenda */}
      <div className="space-y-4">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const list = itemsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-xl border border-sand-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-sand-200 dark:border-gray-700 bg-sand-50 dark:bg-gray-900/40 flex items-center justify-between">
                <div className="text-sm font-medium text-charcoal dark:text-white">
                  {format(d, "EEEE, MMM d")}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{list.length} items</div>
              </div>
              <div className="p-5 space-y-3">
                {list.length === 0 ? (
                  <div className="text-sm text-gray-400 italic">No classes scheduled.</div>
                ) : (
                  list.map((it) => (
                    <div
                      key={it.id}
                      className="border border-sand-200 dark:border-gray-700 rounded-lg p-4 hover:bg-sand-50/50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-charcoal dark:text-white">
                              {format(new Date(it.start), "h:mm a")} – {format(new Date(it.end), "h:mm a")}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClasses(
                                it.status
                              )}`}
                            >
                              {statusLabel(it.status)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-200 truncate">
                            {it.participants.map((p) => p.clientName).join(", ")} • {it.type} • {it.location}
                          </div>
                          {it.notes?.trim() ? (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {it.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (it.status === "SCHEDULED" && !isPending) openEdit(it.id);
                            }}
                            disabled={isPending || it.status !== "SCHEDULED"}
                            title={it.status !== "SCHEDULED" ? "Only scheduled classes can be edited" : "Edit class"}
                            className="px-3 py-1.5 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              startTransition(async () => {
                                await cancelScheduledClass(it.id, "CANCELLED");
                                refreshWeek();
                                router.refresh();
                              });
                            }}
                            disabled={isPending || it.status !== "SCHEDULED"}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isEditOpen && (
        <ScheduleEditModal
          clients={props.clients}
          existing={currentEditing}
          onClose={() => {
            setIsEditOpen(false);
            setEditingId(null);
          }}
          onSaved={onSaved}
        />
      )}

      {isBulkOpen && (
        <BulkAddModal
          clients={props.clients}
          onClose={() => setIsBulkOpen(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function ScheduleEditModal(props: {
  clients: ClientOption[];
  existing: ScheduleItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!props.existing;
  const existing = props.existing;

  const [sessionType, setSessionType] = useState<"Single" | "Group">(
    (existing?.participants?.length ?? 1) > 1 ? "Group" : "Single"
  );
  const DEFAULT_DURATION_MINUTES = 55;
  const [startValue, setStartValue] = useState(() => {
    const d = existing ? new Date(existing.start) : new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
    return toDateTimeLocalValue(d.toISOString());
  });
  const [location, setLocation] = useState(existing?.location ?? "In-Studio");
  const [classType, setClassType] = useState(existing?.type ?? sessionType);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [clientId1, setClientId1] = useState(existing?.participants?.[0]?.clientId ?? "");
  const [price1, setPrice1] = useState<number>(() => Number(existing?.participants?.[0]?.price ?? 0));
  const [usePackage1, setUsePackage1] = useState<boolean>(existing?.participants?.[0]?.usePackage ?? false);

  const [clientId2, setClientId2] = useState(existing?.participants?.[1]?.clientId ?? "");
  const [price2, setPrice2] = useState<number>(() => Number(existing?.participants?.[1]?.price ?? 0));
  const [usePackage2, setUsePackage2] = useState<boolean>(existing?.participants?.[1]?.usePackage ?? false);

  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const start = new Date(startValue);
      const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60000);

      const participants =
        sessionType === "Single"
          ? [
              {
                clientId: clientId1,
                price: price1 || 0,
                isPaid: false,
                usePackage: usePackage1,
              },
            ]
          : [
              {
                clientId: clientId1,
                price: price1 || 0,
                isPaid: false,
                usePackage: usePackage1,
              },
              {
                clientId: clientId2,
                price: price2 || 0,
                isPaid: false,
                usePackage: usePackage2,
              },
            ];

      const payload = {
        start: start.toISOString(),
        end: end.toISOString(),
        type: classType || sessionType,
        location,
        notes,
        participants,
      } satisfies ScheduledClassPayload;

      const result = isEdit
        ? await updateScheduledClass(existing!.id, payload)
        : await createScheduledClass(payload);

      if (!result?.success) {
        alert(result?.error || "Failed to save.");
        return;
      }
      props.onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-serif text-xl text-charcoal dark:text-white">
              {isEdit ? "Edit scheduled class" : "Add scheduled class"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Export this week to Google Calendar after saving. It won’t count until posted.
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer"
            aria-label="Close"
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Session Type – same as Log Session */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Session Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSessionType("Single");
                  setClassType("Single");
                  setClientId2("");
                }}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sessionType === "Single"
                    ? "bg-charcoal text-white"
                    : "bg-sand-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-sand-100 dark:hover:bg-gray-600"
                } disabled:opacity-50`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionType("Group");
                  setClassType("Group");
                }}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sessionType === "Group"
                    ? "bg-charcoal text-white"
                    : "bg-sand-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-sand-100 dark:hover:bg-gray-600"
                } disabled:opacity-50`}
              >
                Group
              </button>
            </div>
          </div>

          {/* Single Client */}
          {sessionType === "Single" && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Client
              </label>
              <SearchableClientSelect
                clients={props.clients}
                value={clientId1}
                onChange={setClientId1}
                disabled={saving}
                placeholder="Select Client"
              />
            </div>
          )}

          {/* Group: Client 1 & Client 2 */}
          {sessionType === "Group" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Client 1
                </label>
                <SearchableClientSelect
                  clients={props.clients}
                  value={clientId1}
                  onChange={setClientId1}
                  excludeId={clientId2}
                  disabled={saving}
                  placeholder="Select Client"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Client 2
                </label>
                <SearchableClientSelect
                  clients={props.clients}
                  value={clientId2}
                  onChange={setClientId2}
                  excludeId={clientId1}
                  disabled={saving}
                  placeholder="Select Client"
                />
              </div>
            </div>
          )}

          {/* Start + Location */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Start
            </label>
            <input
              type="datetime-local"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              disabled={saving}
              className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={saving}
              className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
            >
              <option value="In-Studio">In-Studio</option>
              <option value="Home Visit">Home Visit</option>
              <option value="Online">Online</option>
            </select>
          </div>

          {/* Price – Single: one row; Group: Price for Client 1, Price for Client 2 */}
          {sessionType === "Single" && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={Number.isFinite(price1) ? price1 : 0}
                  onChange={(e) => setPrice1(parseFloat(e.target.value || "0"))}
                  disabled={saving}
                  className="w-full min-w-[6rem] border border-sand-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {sessionType === "Group" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Price for Client 1
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={Number.isFinite(price1) ? price1 : 0}
                    onChange={(e) => setPrice1(parseFloat(e.target.value || "0"))}
                    disabled={saving}
                    className="w-full min-w-[6rem] border border-sand-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Price for Client 2
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={Number.isFinite(price2) ? price2 : 0}
                    onChange={(e) => setPrice2(parseFloat(e.target.value || "0"))}
                    disabled={saving}
                    className="w-full min-w-[6rem] border border-sand-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Use package only – paid is set in Collectibles after verification */}
          {sessionType === "Single" && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sc-usePackage"
                  checked={usePackage1}
                  onChange={(e) => setUsePackage1(e.target.checked)}
                  disabled={saving}
                  className="accent-sage w-4 h-4 disabled:opacity-50"
                />
                <label htmlFor="sc-usePackage" className="text-sm text-gray-600 dark:text-gray-300">
                  Use Package Class
                </label>
              </div>
            </div>
          )}

          {sessionType === "Group" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sc-usePackage1"
                  checked={usePackage1}
                  onChange={(e) => setUsePackage1(e.target.checked)}
                  disabled={saving}
                  className="accent-sage w-4 h-4 disabled:opacity-50"
                />
                <label htmlFor="sc-usePackage1" className="text-sm text-gray-600 dark:text-gray-300">
                  Client 1: Use Package Class
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sc-usePackage2"
                  checked={usePackage2}
                  onChange={(e) => setUsePackage2(e.target.checked)}
                  disabled={saving}
                  className="accent-sage w-4 h-4 disabled:opacity-50"
                />
                <label htmlFor="sc-usePackage2" className="text-sm text-gray-600 dark:text-gray-300">
                  Client 2: Use Package Class
                </label>
              </div>
            </div>
          )}

          {/* Notes optional */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={saving}
              className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={props.onClose}
              className="px-4 py-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium cursor-pointer"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="px-4 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
              disabled={saving || !clientId1 || (sessionType === "Group" && !clientId2)}
            >
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add to schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_DURATION_MINUTES = 55;

type BulkAddRow = {
  time: string;
  sessionType: "Single" | "Group";
  clientId1: string;
  clientId2: string;
  location: string;
  price1: number;
  price2: number;
  usePackage1: boolean;
  usePackage2: boolean;
};

const defaultBulkRow = (): BulkAddRow => ({
  time: "09:00",
  sessionType: "Single",
  clientId1: "",
  clientId2: "",
  location: "In-Studio",
  price1: 0,
  price2: 0,
  usePackage1: false,
  usePackage2: false,
});

const inputClass =
  "border border-sand-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-sand-500 dark:focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white disabled:opacity-50";

function SearchableClientSelect(props: {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
  excludeId?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { clients, value, onChange, excludeId, disabled, placeholder = "Select" } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = clients.find((c) => c.id === value);
  const filtered = useMemo(() => {
    const exclude = excludeId ? new Set([excludeId]) : new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    return clients.filter(
      (c) => !exclude.has(c.id) && (q === "" || c.name.toLowerCase().includes(q))
    );
  }, [clients, excludeId, searchQuery]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 200) });
      setSearchQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setPosition(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const panel = document.getElementById("searchable-client-select-panel");
      if (panel?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        className={inputClass + " w-full text-left flex items-center justify-between gap-1"}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <span className="text-gray-400 shrink-0">▾</span>
      </button>
      {isOpen &&
        position &&
        createPortal(
          <div
            id="searchable-client-select-panel"
            className="fixed z-[100] bg-white dark:bg-gray-800 border border-sand-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
            style={{ top: position.top, left: position.left, width: position.width, minWidth: 200 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
              placeholder="Type to search..."
              className="w-full px-3 py-2 border-b border-sand-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-0 bg-sand-50 dark:bg-gray-900 text-charcoal dark:text-white placeholder-gray-400"
            />
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-sand-100 dark:hover:bg-gray-700 text-charcoal dark:text-white"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No matches</li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

function BulkAddModal(props: {
  clients: ClientOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date();
  const dateDefault = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [date, setDate] = useState(dateDefault);
  const [rows, setRows] = useState<BulkAddRow[]>([defaultBulkRow(), defaultBulkRow()]);
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, patch: Partial<BulkAddRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, defaultBulkRow()]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const submit = async () => {
    const inputs: Array<{
      start: string;
      end: string;
      type: string;
      location: string;
      participants: Array<{ clientId: string; price: number; isPaid: boolean; usePackage: boolean }>;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.clientId1 || (r.sessionType === "Group" && !r.clientId2)) continue;
      const start = new Date(`${date}T${r.time}`);
      if (isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
      const participants =
        r.sessionType === "Single"
          ? [
              {
                clientId: r.clientId1,
                price: r.price1 || 0,
                isPaid: false,
                usePackage: r.usePackage1,
              },
            ]
          : [
              {
                clientId: r.clientId1,
                price: r.price1 || 0,
                isPaid: false,
                usePackage: r.usePackage1,
              },
              {
                clientId: r.clientId2,
                price: r.price2 || 0,
                isPaid: false,
                usePackage: r.usePackage2,
              },
            ];
      inputs.push({
        start: start.toISOString(),
        end: end.toISOString(),
        type: r.sessionType,
        location: r.location,
        participants,
      });
    }

    if (!inputs.length) {
      alert("Fill in at least one class with client(s) and a valid time.");
      return;
    }

    setSaving(true);
    try {
      const result = await createScheduledClasses(inputs);
      if (!result.success) {
        alert(result.error || "Failed to add classes.");
        return;
      }
      props.onSaved();
      props.onClose();
    } catch (e) {
      alert("Failed to add classes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>
            <h3 className="font-serif text-xl text-charcoal dark:text-white">Add multiple classes</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Set time, client(s), location, and price for each class on one day.
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer"
            aria-label="Close"
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex-shrink-0">
          <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Date (all rows)
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
            className={inputClass + " w-40"}
          />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 border border-sand-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-sand-50 dark:bg-gray-900 border-b border-sand-200 dark:border-gray-700 z-10">
              <tr>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white w-20">Time</th>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white w-20">Type</th>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white min-w-[100px]">Client 1</th>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white min-w-[100px]">Client 2</th>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white w-28">Location</th>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white min-w-[100px]">Price</th>
                <th className="text-left p-2 font-medium text-charcoal dark:text-white w-24">Use Pkg</th>
                <th className="w-10 p-2" aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-sand-100 dark:border-gray-700 hover:bg-sand-50/50 dark:hover:bg-gray-700/30"
                >
                  <td className="p-2">
                    <input
                      type="time"
                      value={row.time}
                      onChange={(e) => updateRow(i, { time: e.target.value })}
                      disabled={saving}
                      className={inputClass + " w-full"}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={row.sessionType}
                      onChange={(e) =>
                        updateRow(i, {
                          sessionType: e.target.value as "Single" | "Group",
                          clientId2: e.target.value === "Single" ? "" : row.clientId2,
                        })
                      }
                      disabled={saving}
                      className={inputClass + " w-full"}
                    >
                      <option value="Single">Single</option>
                      <option value="Group">Group</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <SearchableClientSelect
                      clients={props.clients}
                      value={row.clientId1}
                      onChange={(clientId) => updateRow(i, { clientId1: clientId })}
                      excludeId={row.sessionType === "Group" ? row.clientId2 : undefined}
                      disabled={saving}
                      placeholder="Select"
                    />
                  </td>
                  <td className="p-2">
                    {row.sessionType === "Group" ? (
                      <SearchableClientSelect
                        clients={props.clients}
                        value={row.clientId2}
                        onChange={(clientId) => updateRow(i, { clientId2: clientId })}
                        excludeId={row.clientId1}
                        disabled={saving}
                        placeholder="Select"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    <select
                      value={row.location}
                      onChange={(e) => updateRow(i, { location: e.target.value })}
                      disabled={saving}
                      className={inputClass + " w-full"}
                    >
                      <option value="In-Studio">In-Studio</option>
                      <option value="Home Visit">Home Visit</option>
                      <option value="Online">Online</option>
                    </select>
                  </td>
                  <td className="p-2 min-w-[100px]">
                    {row.sessionType === "Single" ? (
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={Number.isFinite(row.price1) ? row.price1 : 0}
                          onChange={(e) => updateRow(i, { price1: parseFloat(e.target.value || "0") })}
                          disabled={saving}
                          className={inputClass + " w-full min-w-[4.5rem] pl-6 py-2 text-base sm:text-sm"}
                        />
                      </div>
                    ) : (
                      <div className="flex gap-1 min-w-0">
                        <div className="relative flex-1 min-w-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={Number.isFinite(row.price1) ? row.price1 : ""}
                            onChange={(e) => updateRow(i, { price1: parseFloat(e.target.value || "0") })}
                            disabled={saving}
                            className={inputClass + " w-full min-w-[3.5rem] pl-5 py-2 text-base sm:text-xs"}
                          />
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={Number.isFinite(row.price2) ? row.price2 : ""}
                            onChange={(e) => updateRow(i, { price2: parseFloat(e.target.value || "0") })}
                            disabled={saving}
                            className={inputClass + " w-full min-w-[3.5rem] pl-5 py-2 text-base sm:text-xs"}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="inline-flex items-center gap-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.usePackage1}
                          onChange={(e) => updateRow(i, { usePackage1: e.target.checked })}
                          disabled={saving}
                          className="accent-sage w-3.5 h-3.5"
                        />
                        <span className="text-xs">Pkg 1</span>
                      </label>
                      {row.sessionType === "Group" && (
                        <label className="inline-flex items-center gap-0.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.usePackage2}
                            onChange={(e) => updateRow(i, { usePackage2: e.target.checked })}
                            disabled={saving}
                            className="accent-sage w-3.5 h-3.5"
                          />
                          <span className="text-xs">Pkg 2</span>
                        </label>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={saving || rows.length <= 1}
                      className="p-1.5 rounded text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 pt-4 border-t border-sand-200 dark:border-gray-700">
          <button
            type="button"
            onClick={addRow}
            disabled={saving}
            className="px-3 py-2 rounded-lg border border-dashed border-sand-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-sage hover:text-sage transition-colors text-sm font-medium"
          >
            + Add another class
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="px-4 py-2 rounded-lg border border-sand-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium cursor-pointer"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="px-4 py-2 rounded-lg bg-sage text-white hover:bg-sage/90 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
              disabled={saving}
            >
              {saving ? "Saving..." : `Add ${rows.length} class${rows.length !== 1 ? "es" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
