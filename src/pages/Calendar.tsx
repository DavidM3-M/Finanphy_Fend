import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import api from "../services/api";
import { getProducts } from "../services/products";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { getAllOrders } from "../services/clientOrders";
import { Order } from "../types";

const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

const weekStartsOn = 1; // Monday
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CalendarItemType = "evento" | "recordatorio" | "ingreso" | "gasto" | "producto";

interface CalendarItem {
  id: string;
  date: string; // yyyy-MM-dd
  type: CalendarItemType;
  title: string;
  meta?: string;
  attachmentUrl?: string;
  attachmentFilename?: string;
  source?: any;
  incomeId?: string;
  orderId?: string;
}

interface ReminderPayload {
  title: string;
  remindAt: string;
  note?: string;
  companyId?: string;
  allDay?: boolean;
  type?: string;
  incomeId?: string;
  orderId?: string;
}

function toDateKey(input?: string | Date | null): string | null {
  if (!input) return null;
  try {
    if (typeof input === "string") {
      const raw = input.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split("-").map(Number);
        const local = new Date(y, m - 1, d);
        if (Number.isNaN(local.getTime())) return null;
        return format(local, "yyyy-MM-dd");
      }
    }
    const dt = typeof input === "string" ? parseISO(input) : input;
    if (Number.isNaN(dt.getTime())) return null;
    return format(dt, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function pickDateField(record: any, keys: string[]): string | null {
  for (const key of keys) {
    const value = record?.[key];
    const normalized = toDateKey(value);
    if (normalized) return normalized;
  }
  return null;
}

function resolveUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE) return url;
  if (!url.startsWith("/")) {
    return `${API_BASE}/uploads/${url}`;
  }
  return `${API_BASE}${url}`;
}

function shiftDateKey(key: string, days: number) {
  try {
    const dt = parseISO(key);
    if (Number.isNaN(dt.getTime())) return key;
    return format(addDays(dt, days), "yyyy-MM-dd");
  } catch {
    return key;
  }
}

export default function Calendar(): React.ReactElement {
  const { company } = useAuth();
  const companyId = company?.id;

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<CalendarItem | null>(null);

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderFile, setReminderFile] = useState<File | null>(null);
  const [linkedIncomeId, setLinkedIncomeId] = useState<string | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const gridStart = useMemo(
    () => startOfWeek(monthStart, { weekStartsOn }),
    [monthStart]
  );
  const gridEnd = useMemo(
    () => endOfWeek(monthEnd, { weekStartsOn }),
    [monthEnd]
  );

  const monthLabel = useMemo(
    () => format(currentMonth, "MMMM yyyy"),
    [currentMonth]
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return map;
  }, [items]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedItems = itemsByDate.get(selectedKey) ?? [];

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const from = format(gridStart, "yyyy-MM-dd");
      const to = format(gridEnd, "yyyy-MM-dd");

      const [eventsRes, remindersRes, incomesRes, expensesRes, productsRes, ordersRes] = await Promise.all([
        api.get("/calendar/events", { params: { from, to, companyId } }).catch(() => ({ data: [] })),
        api.get("/reminders", { params: { from, to, companyId } }).catch(() => ({ data: [] })),
        api.get("/incomes", { params: { page: 1, limit: 100 } }).catch(() => ({ data: [] })),
        api.get("/expenses", { params: { page: 1, limit: 100 } }).catch(() => ({ data: [] })),
        getProducts({ page: 1, limit: 100 }).catch(() => ({ data: [] })),
        getAllOrders({ page: 1, limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);

      const eventsData = Array.isArray(eventsRes.data)
        ? eventsRes.data
        : eventsRes.data?.data ?? [];
      const remindersData = Array.isArray(remindersRes.data)
        ? remindersRes.data
        : remindersRes.data?.data ?? [];

      const ordersList = Array.isArray((ordersRes as any).data?.data)
        ? (ordersRes as any).data.data
        : Array.isArray((ordersRes as any).data)
        ? (ordersRes as any).data
        : [];

      const products = Array.isArray((productsRes as any)?.data)
        ? (productsRes as any).data
        : [];
      const ordersById = new Map<string, Order>();
      ordersList.forEach((order: Order) => {
        if (order?.id) ordersById.set(order.id, order);
      });

      const incomesList = Array.isArray((incomesRes as any)?.data?.data)
        ? (incomesRes as any).data.data
        : Array.isArray((incomesRes as any)?.data)
        ? (incomesRes as any).data
        : [];
      const incomesById = new Map<string, any>();
      incomesList.forEach((income: any) => {
        if (income?.id) incomesById.set(String(income.id), income);
      });

      const itemsCollected: CalendarItem[] = [];

      const reminderIds = new Set<string>();

      for (const reminder of remindersData) {
        const dateKey = pickDateField(reminder, ["remindAt", "date", "reminderDate", "scheduledFor", "createdAt"]);
        if (!dateKey) continue;
        const reminderId = String(reminder.id ?? reminder._id ?? "");
        if (reminderId) reminderIds.add(reminderId);
        const reminderIncomeId = reminder.incomeId ? String(reminder.incomeId) : undefined;
        const reminderOrderId = reminder.orderId ? String(reminder.orderId) : undefined;
        const incomeFromReminder = reminderIncomeId ? incomesById.get(reminderIncomeId) : null;
        const orderIdFromIncome = incomeFromReminder?.orderId ? String(incomeFromReminder.orderId) : undefined;
        const finalOrderId = reminderOrderId ?? orderIdFromIncome;
        const linkedOrder = finalOrderId ? ordersById.get(finalOrderId) : undefined;
        itemsCollected.push({
          id: reminderId || `${dateKey}-reminder-${Math.random()}`,
          date: dateKey,
          type: "recordatorio",
          title: reminder.title ?? reminder.name ?? "Recordatorio",
          meta: reminder.note ?? reminder.description ?? "",
          attachmentUrl: resolveUrl(
            reminder.attachmentUrl
              ?? reminder.attachment_url
              ?? linkedOrder?.invoiceUrl
              ?? undefined
          ),
          attachmentFilename:
            reminder.attachmentFilename
              ?? reminder.attachment_filename
              ?? linkedOrder?.invoiceFilename
              ?? undefined,
          incomeId: reminderIncomeId,
          orderId: finalOrderId,
          source: reminder,
        });
      }

      for (const event of eventsData) {
        const eventType = String(event?.type ?? event?.category ?? "").toLowerCase();
        const isReminder = eventType.includes("reminder") || eventType.includes("recordatorio");
        const eventId = String(event.id ?? event._id ?? "");
        if (isReminder) continue;
        if (eventId && reminderIds.has(eventId)) continue;

        const dateKey = pickDateField(event, ["date", "start", "startDate", "eventDate", "createdAt"]);
        if (!dateKey) continue;
        itemsCollected.push({
          id: eventId || `${dateKey}-event-${Math.random()}`,
          date: dateKey,
          type: "evento",
          title: event.title ?? event.name ?? "Evento",
          meta: event.description ?? event.detail ?? "",
        });
      }

      const interval = { start: gridStart, end: gridEnd };

      for (const income of incomesList) {
        const dateKey = pickDateField(income, ["entryDate", "dueDate", "date", "createdAt"]);
        if (!dateKey) continue;
        const dateObj = parseISO(dateKey);
        if (!isWithinInterval(dateObj, interval)) continue;
        const incomeOrderId = (income as any)?.orderId ? String((income as any).orderId) : undefined;
        const linkedOrder = incomeOrderId ? ordersById.get(incomeOrderId) : undefined;
        itemsCollected.push({
          id: String(income.id ?? `${dateKey}-income-${Math.random()}`),
          date: dateKey,
          type: "ingreso",
          title: "Ingreso",
          meta: income.amount ? `+${income.amount}` : undefined,
          attachmentUrl: resolveUrl(linkedOrder?.invoiceUrl ?? undefined),
          attachmentFilename: linkedOrder?.invoiceFilename ?? undefined,
          source: income,
          incomeId: income?.id ? String(income.id) : undefined,
          orderId: incomeOrderId,
        });
      }

      const expensesList = Array.isArray((expensesRes as any)?.data?.data)
        ? (expensesRes as any).data.data
        : Array.isArray((expensesRes as any)?.data)
        ? (expensesRes as any).data
        : [];

      for (const expense of expensesList) {
        const dateKeyRaw = pickDateField(expense, ["entryDate", "dueDate", "date", "createdAt"]);
        if (!dateKeyRaw) continue;
        const dateKey = shiftDateKey(dateKeyRaw, 1);
        const dateObj = parseISO(dateKey);
        if (!isWithinInterval(dateObj, interval)) continue;
        itemsCollected.push({
          id: String(expense.id ?? `${dateKey}-expense-${Math.random()}`),
          date: dateKey,
          type: "gasto",
          title: "Gasto",
          meta: expense.amount ? `-${expense.amount}` : undefined,
        });
      }

      for (const product of products ?? []) {
        const dateKey = pickDateField(product, ["createdAt", "created_at"]);
        if (!dateKey) continue;
        const dateObj = parseISO(dateKey);
        if (!isWithinInterval(dateObj, interval)) continue;
        itemsCollected.push({
          id: String(product.id ?? `${dateKey}-product-${Math.random()}`),
          date: dateKey,
          type: "producto",
          title: product.name ?? "Producto",
          meta: product.sku ?? "",
        });
      }

      setItems(itemsCollected);
    } catch (err: any) {
      setError(err?.message ?? "No se pudieron cargar los datos del calendario");
    } finally {
      setLoading(false);
    }
  }, [companyId, gridStart, gridEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReminderSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reminderTitle.trim() || !reminderDate) return;

    try {
      const payload: ReminderPayload = {
        title: reminderTitle.trim(),
        // usar hora local sin Z para evitar el desfase de día
        remindAt: `${reminderDate}T00:00:00`,
        note: reminderNote.trim() || undefined,
        companyId,
        allDay: true,
        incomeId: linkedIncomeId || undefined,
        orderId: linkedOrderId || undefined,
      };

      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("remindAt", payload.remindAt);
      if (payload.note) formData.append("note", payload.note);
      if (payload.companyId) formData.append("companyId", payload.companyId);
      if (payload.allDay !== undefined) formData.append("allDay", String(payload.allDay));
      if (payload.type) formData.append("type", payload.type);
      if (payload.incomeId) formData.append("incomeId", payload.incomeId);
      if (payload.orderId) formData.append("orderId", payload.orderId);
      if (reminderFile) formData.append("attachment", reminderFile);

      await api.post("/reminders", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Recordatorio creado");
      setReminderTitle("");
      setReminderDate("");
      setReminderNote("");
      setReminderFile(null);
      setLinkedIncomeId(null);
      setLinkedOrderId(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo crear el recordatorio");
    }
  };

  const renderBadges = (dateKey: string) => {
    const dayItems = itemsByDate.get(dateKey) ?? [];
    if (dayItems.length === 0) return null;

    const counts = dayItems.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<CalendarItemType, number>
    );

    const badge = (label: string, color: string) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
    );

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {counts.ingreso ? badge(`+${counts.ingreso}`, "bg-emerald-100 text-emerald-700") : null}
        {counts.gasto ? badge(`-${counts.gasto}`, "bg-rose-100 text-rose-700") : null}
        {counts.producto ? badge(`P${counts.producto}`, "bg-blue-100 text-blue-700") : null}
        {counts.recordatorio ? badge(`R${counts.recordatorio}`, "bg-amber-100 text-amber-700") : null}
        {counts.evento ? badge(`E${counts.evento}`, "bg-purple-100 text-purple-700") : null}
      </div>
    );
  };

  const formatCurrency = (value: any) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "N/D";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return null;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getTimeHint = (item: CalendarItem) => {
    const source = item.source ?? {};
    return (
      formatDateTime(source.remindAt)
      ?? formatDateTime(source.entryDate)
      ?? formatDateTime(source.createdAt)
      ?? null
    );
  };

  const detailStyles: Record<CalendarItemType, { badge: string; card: string }> = {
    ingreso: {
      badge: "bg-emerald-100 text-emerald-700",
      card: "border-emerald-200 bg-emerald-50",
    },
    gasto: {
      badge: "bg-rose-100 text-rose-700",
      card: "border-rose-200 bg-rose-50",
    },
    producto: {
      badge: "bg-blue-100 text-blue-700",
      card: "border-blue-200 bg-blue-50",
    },
    recordatorio: {
      badge: "bg-amber-100 text-amber-700",
      card: "border-amber-200 bg-amber-50",
    },
    evento: {
      badge: "bg-purple-100 text-purple-700",
      card: "border-purple-200 bg-purple-50",
    },
  };

  const days: Date[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#973c00]">Calendario financiero</h2>
          <p className="text-sm text-[#bb4d00]">
            Movimientos, productos y recordatorios en un solo lugar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="px-3 py-2 rounded-lg bg-white border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6]"
          >
            ← Mes anterior
          </button>
          <div className="min-w-[160px] text-center font-semibold text-[#973c00] capitalize">
            {monthLabel}
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-3 py-2 rounded-lg bg-white border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6]"
          >
            Mes siguiente →
          </button>
        </div>
      </div>

      {!companyId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          No se encontró una empresa asociada para cargar el calendario.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-4 relative">
          <div className="grid grid-cols-7 text-sm font-semibold text-[#7b3306] mb-3">
            {weekDays.map((label) => (
              <div key={label} className="text-center">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((dayItem) => {
              const key = format(dayItem, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(dayItem, currentMonth);
              const isSelected = isSameDay(dayItem, selectedDate);

              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedDate(dayItem);
                    setReminderDate(key);
                  }}
                  className={`rounded-xl border p-2 text-left transition hover:shadow-sm ${
                    isSelected
                      ? "border-[#fe9a00] bg-[#fff7e6]"
                      : "border-[#fef3c6] bg-[#fffbeb]"
                  } ${isCurrentMonth ? "opacity-100" : "opacity-40"}`}
                >
                  <div className="text-sm font-semibold text-[#973c00]">
                    {format(dayItem, "d")}
                  </div>
                  {renderBadges(key)}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-[#fef3c6] border-t-[#fe9a00] animate-spin" />
              <div className="text-sm font-medium text-[#bb4d00]">Cargando calendario...</div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-4">
          <h3 className="text-lg font-semibold text-[#973c00]">Detalle del día</h3>
          <p className="text-sm text-[#bb4d00] mb-3">{format(selectedDate, "PPP")}</p>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-[#7b3306]">Sin movimientos o eventos.</p>
            ) : (
            <div className="max-h-64 overflow-y-auto pr-1">
              <ul className="space-y-2">
                  {selectedItems.map((item) => {
                  const style = detailStyles[item.type];
                  const isInvoice = item.type === "ingreso" || (item.type === "recordatorio" && !!item.attachmentUrl);
                  const timeHint = getTimeHint(item);
                  return (
                    <li
                      key={item.id}
                      className={`group relative rounded-lg border p-2 ${style.card} ${isInvoice ? "cursor-pointer hover:shadow-sm" : ""}`}
                      onClick={() => {
                        if (isInvoice) setSelectedInvoice(item);
                      }}
                      role={isInvoice ? "button" : undefined}
                      tabIndex={isInvoice ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (!isInvoice) return;
                        if (e.key === "Enter" || e.key === " ") setSelectedInvoice(item);
                      }}
                    >
                      {timeHint && (
                        <span className="absolute top-2 right-2 rounded-full bg-white/90 border border-[#fef3c6] px-2 py-0.5 text-[10px] font-medium text-[#7b3306] shadow-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {timeHint}
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[#973c00]">{item.title}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${style.badge}`}>
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                      {item.meta && (
                        <div className="text-xs text-[#7b3306] mt-1">{item.meta}</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isInvoice && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6]"
                          >
                            📄 Ver factura
                          </button>
                        )}
                        {item.attachmentUrl && (
                          <a
                            href={item.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6]"
                          >
                            📎 {item.attachmentFilename ? "Ver adjunto" : "Adjunto"}
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-4">
          <h3 className="text-lg font-semibold text-[#973c00]">Agregar recordatorio</h3>
          <form onSubmit={handleReminderSubmit} className="space-y-3 mt-3">
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
              placeholder="Título del recordatorio"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              required
            />
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              required
            />
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
              placeholder="Notas adicionales (opcional)"
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              rows={3}
            />
            <div>
              <label className="block text-sm text-[#7b3306] mb-1">Adjunto (imagen o PDF)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setReminderFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              {reminderFile && (
                <div className="text-xs text-[#7b3306] mt-1">{reminderFile.name}</div>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-lg bg-[#fe9a00] text-white font-semibold hover:bg-[#e27100]"
            >
              Crear recordatorio
            </button>
            {(linkedIncomeId || linkedOrderId) && (
              <div className="text-xs text-[#7b3306]">
                Vinculado a {linkedIncomeId ? `ingreso ${linkedIncomeId}` : ""}
                {linkedIncomeId && linkedOrderId ? " y " : ""}
                {linkedOrderId ? `orden ${linkedOrderId}` : ""}
                <button
                  type="button"
                  onClick={() => {
                    setLinkedIncomeId(null);
                    setLinkedOrderId(null);
                  }}
                  className="ml-2 underline"
                >
                  Quitar vínculo
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-[#973c00]">Factura del día</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="text-sm text-[#7b3306]">
                <strong>Fecha:</strong> {selectedInvoice.date}
              </div>

              <div className="rounded-lg border border-[#fef3c6] bg-[#fffbeb] p-3 space-y-2">
                <div className="text-sm">
                  <strong>Descripción:</strong>{" "}
                  {selectedInvoice.source?.descripcion
                    ?? selectedInvoice.source?.description
                    ?? selectedInvoice.source?.supplier
                    ?? selectedInvoice.title}
                </div>
                <div className="text-sm">
                  <strong>Monto:</strong>{" "}
                  {formatCurrency(
                    selectedInvoice.source?.monto
                      ?? selectedInvoice.source?.amount
                      ?? selectedInvoice.source?.value
                  )}
                </div>
                <div className="text-sm">
                  <strong>ID:</strong> {selectedInvoice.source?.id ?? selectedInvoice.id}
                </div>
              </div>

              {selectedInvoice.attachmentUrl && (
                <div className="rounded-lg border border-[#fef3c6] bg-white overflow-hidden">
                  <div className="px-3 py-2 text-sm font-semibold text-[#973c00] bg-[#fff7e6]">
                    Previsualización de factura
                  </div>
                  <iframe
                    title="Factura"
                    src={selectedInvoice.attachmentUrl}
                    className="w-full h-[45vh] sm:h-[55vh]"
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setLinkedIncomeId(selectedInvoice.incomeId ?? null);
                    setLinkedOrderId(selectedInvoice.orderId ?? null);
                    setReminderTitle("Factura");
                    setReminderDate(selectedInvoice.date);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#fe9a00] text-white"
                >
                  Crear recordatorio con factura
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
