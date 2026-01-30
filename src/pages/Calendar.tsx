import React, { useCallback, useEffect, useMemo, useState } from "react";
// PDF rendering removed from calendar view to keep file focused on calendar UI
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
import OrderDetailModal from "../components/Orders/OrderDetailModal";
// Invoice PDF generation removed from calendar file to keep calendar focused on dates


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
  order?: Order;
}

interface ReminderPayload {
  title: string;
  remindAt: string;
  note?: string;
  companyId?: string;
  allDay?: boolean;
  type?: string;
  incomeId?: number;
  orderId?: string;
}

function toDateKey(input?: string | Date | null): string | null {
  if (!input) return null;
  try {
    if (typeof input === "string") {
      const raw = input.trim();
      // If the string is already a plain date (YYYY-MM-DD), use it as local date
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
      }
      // If the string is an ISO datetime (contains 'T'), try to parse it as local
      // by removing the timezone designator (Z or ±HH:MM) so it's interpreted as local time.
      const tIndex = raw.indexOf("T");
      if (tIndex > 0) {
        const localLike = raw.replace(/(Z|[+-]\d{2}:\d{2})$/, "");
        try {
          const parsed = parseISO(localLike);
          if (!Number.isNaN(parsed.getTime())) return format(parsed, "yyyy-MM-dd");
        } catch {
          // fallback to extracting date part below
        }
        const datePart = raw.substring(0, tIndex);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
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

// Helper removed: not used after normalizing expense dates to their original value

export default function Calendar(): React.ReactElement {
  const { company } = useAuth();
  const companyId = company?.id;

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  const [ordersState, setOrdersState] = useState<Order[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  // selectedInvoice removed — calendar no longer shows day-detail modal

  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderFile, setReminderFile] = useState<File | null>(null);
  const [reminderUploading, setReminderUploading] = useState(false);
  const [reminderAllDay, setReminderAllDay] = useState<boolean>(true);
  const [reminderType, setReminderType] = useState<string>("");
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

  

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  // selectedItems no longer used (day-detail removed)
  const ordersForDay = ordersState.filter((o) => toDateKey(o.createdAt) === selectedKey);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const from = format(gridStart, "yyyy-MM-dd");
      const to = format(gridEnd, "yyyy-MM-dd");

      const [remindersRes, incomesRes, expensesRes, productsRes, ordersRes] = await Promise.all([
        api.get("/reminders", { params: { from, to, companyId } }).catch(() => ({ data: [] })),
        api.get("/incomes", { params: { page: 1, limit: 100 } }).catch(() => ({ data: [] })),
        api.get("/expenses", { params: { page: 1, limit: 100 } }).catch(() => ({ data: [] })),
        getProducts({ page: 1, limit: 100 }).catch(() => ({ data: [] })),
        getAllOrders({ page: 1, limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);
      // events disabled — no events data fetched
      const remindersData = Array.isArray(remindersRes.data)
        ? remindersRes.data
        : remindersRes.data?.data ?? [];

      const ordersList = Array.isArray((ordersRes as any).data?.data)
        ? (ordersRes as any).data.data
        : Array.isArray((ordersRes as any).data)
        ? (ordersRes as any).data
        : [];
      setOrdersState(ordersList);
      console.debug("[Calendar] loaded orders:", ordersList.length, ordersList.slice(0, 3).map((o: any) => ({ id: o.id, createdAt: o.createdAt })));

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
      const reminderIncomeIds = new Set<string>();
      const reminderOrderIds = new Set<string>();

      for (const reminder of remindersData) {
        const dateKey = pickDateField(reminder, ["remindAt", "date", "reminderDate", "scheduledFor", "createdAt"]);
        if (!dateKey) continue;
        const reminderId = String(reminder.id ?? reminder._id ?? "");
        if (reminderId) reminderIds.add(reminderId);
        const reminderIncomeId = reminder.incomeId ? String(reminder.incomeId) : undefined;
        const reminderOrderId = reminder.orderId ? String(reminder.orderId) : undefined;
        if (reminderIncomeId) reminderIncomeIds.add(reminderIncomeId);
        if (reminderOrderId) reminderOrderIds.add(reminderOrderId);
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

      // Events have been disabled and are not included in the calendar items.

      const interval = { start: gridStart, end: gridEnd };

      for (const income of incomesList) {
        const dateKey = pickDateField(income, ["entryDate", "dueDate", "date", "createdAt"]);
        if (!dateKey) continue;
        const dateObj = parseISO(dateKey);
        if (!isWithinInterval(dateObj, interval)) continue;
        const incomeOrderId = (income as any)?.orderId ? String((income as any).orderId) : undefined;
        // skip income if it's already represented by a reminder (avoid duplicate)
        if (income?.id && reminderIncomeIds.has(String(income.id))) continue;
        if (incomeOrderId && reminderOrderIds.has(incomeOrderId)) continue;

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
          order: linkedOrder,
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
        const dateKey = pickDateField(expense, ["entryDate", "dueDate", "date", "createdAt"]);
        if (!dateKey) continue;
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

      // Map orders into calendar items so they appear on the calendar grid
      for (const order of ordersList) {
        const dateKey = toDateKey(order.createdAt) ?? toDateKey((order as any).created_at);
        if (!dateKey) continue;
        const dateObj = parseISO(dateKey);
        if (!isWithinInterval(dateObj, interval)) continue;
        // avoid duplicates if a reminder already references this order
        if (reminderOrderIds.has(String(order.id))) continue;
        const total = (order.items || []).reduce((sum: number, it: any) => {
          const unit = Number(it.unitPrice) || 0;
          const qty = Number(it.quantity) || 0;
          return sum + unit * qty;
        }, 0);
        itemsCollected.push({
          id: `order-${order.id}`,
          date: dateKey,
          type: "ingreso",
          title: "Orden",
          meta: total ? `+${total}` : undefined,
          attachmentUrl: resolveUrl(order.invoiceUrl ?? undefined),
          attachmentFilename: order.invoiceFilename ?? undefined,
          source: order,
          orderId: order.id,
          order,
        });
      }

      // set calendar items for rendering icons on days and other views
      setCalendarItems(itemsCollected);
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
      setReminderUploading(true);
      const payload: ReminderPayload = {
        title: reminderTitle.trim(),
        // usar hora local sin Z para evitar el desfase de día
        remindAt: `${reminderDate}T00:00:00`,
        note: reminderNote.trim() || undefined,
        companyId,
        allDay: reminderAllDay ?? undefined,
        type: reminderType || undefined,
        incomeId: linkedIncomeId ? Number(linkedIncomeId) : undefined,
        orderId: linkedOrderId || undefined,
      };

      // normalize remindAt to an ISO 8601 string (UTC)
      const remindAtIso = new Date(`${reminderDate}T00:00:00Z`).toISOString();

      if (!reminderFile) {
        // Send JSON when there's no file so boolean fields remain typed
        await api.post("/reminders", { ...payload, remindAt: remindAtIso });
      } else {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(reminderFile.type)) {
          toast.error("Adjunto inválido: solo se permiten PDF o imágenes (jpeg/png/webp)");
          setReminderUploading(false);
          return;
        }
        const max = 10 * 1024 * 1024; // 10 MB
        if (reminderFile.size > max) {
          toast.error("Adjunto demasiado grande: máximo 10 MB");
          setReminderUploading(false);
          return;
        }
        const formData = new FormData();
        // Append individual fields (backend schema rejects a 'payload' wrapper)
        formData.append("title", reminderTitle.trim());
        if (reminderNote.trim()) formData.append("note", reminderNote.trim());
        formData.append("remindAt", remindAtIso);
        if (companyId) formData.append("companyId", companyId);
        // send allDay as string so multer treats it as a text field
        formData.append("allDay", reminderAllDay ? "true" : "false");
        if (reminderType) formData.append("type", reminderType);
        if (linkedIncomeId) formData.append("incomeId", String(Number(linkedIncomeId)));
        if (linkedOrderId) formData.append("orderId", linkedOrderId);
        formData.append("attachment", reminderFile);
        await api.post("/reminders", formData);
      }
      toast.success("Recordatorio creado");
      setReminderTitle("");
      setReminderDate("");
      setReminderNote("");
      setReminderFile(null);
      setLinkedIncomeId(null);
      setLinkedOrderId(null);
      setReminderUploading(false);
      loadData();
    } catch (err: any) {
      console.error("Reminder submit error:", err?.response?.data ?? err);
      const msg = err?.response?.data?.message || err?.message || "No se pudo crear el recordatorio";
      toast.error(msg);
      setReminderUploading(false);
    }
  };

  // Badges removed — calendar cells no longer show daily notification dots

  const detailStyles: Record<CalendarItemType, { badge: string; card: string }> = {
    ingreso: { badge: "bg-emerald-100 text-emerald-700", card: "border-emerald-200 bg-emerald-50" },
    gasto: { badge: "bg-rose-100 text-rose-700", card: "border-rose-200 bg-rose-50" },
    producto: { badge: "bg-blue-100 text-blue-700", card: "border-blue-200 bg-blue-50" },
    recordatorio: { badge: "bg-amber-100 text-amber-700", card: "border-amber-200 bg-amber-50" },
    evento: { badge: "bg-purple-100 text-purple-700", card: "border-purple-200 bg-purple-50" },
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
      {previewInvoiceUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-[#973c00]">Factura (backend)</h3>
              <button
                onClick={() => {
                  setPreviewInvoiceUrl(null);
                  setPreviewOrder(null);
                }}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="p-3 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-1 space-y-2">
                {previewOrder ? (
                  <div>
                    <div className="text-sm text-[#7b3306]"><strong>Código:</strong> {previewOrder.orderCode}</div>
                    <div className="text-sm text-[#7b3306]"><strong>Estado:</strong> {previewOrder.status}</div>
                    <div className="text-sm text-[#7b3306]"><strong>Fecha:</strong> {format(previewOrder.createdAt ? new Date(previewOrder.createdAt) : new Date(), "PPP")}</div>
                    <div className="text-sm text-[#7b3306]"><strong>Cliente:</strong> {previewOrder.customer?.name ?? previewOrder.user?.firstName ?? 'N/D'}</div>
                    <div className="mt-2 text-sm">
                      <strong>Items:</strong>
                      <ul className="mt-1 space-y-1 text-xs text-[#7b3306]">
                        {(previewOrder.items || []).map((it) => (
                          <li key={it.id} className="flex justify-between">
                            <span>{it.product?.name ?? 'Producto' } x{it.quantity}</span>
                            <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(it.unitPrice || 0) * Number(it.quantity || 0))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-[#7b3306]">
                      Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format((previewOrder.items || []).reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.quantity || 0)), 0))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[#7b3306]">Detalles de la orden no disponibles.</div>
                )}
              </div>

              <div className="col-span-1 md:col-span-2 h-[70vh]">
                <iframe title="Factura backend" src={previewInvoiceUrl} className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="grid grid-cols-7 text-sm font-semibold text-[#7b3306] mb-3">
                {weekDays.map((label) => (
                  <div key={label} className="text-center">{label}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const dayItems = calendarItems.filter((i) => i.date === key);
                  const dayOrders = dayItems.filter((i) => i.type === "ingreso" && i.order).map((i) => i.order as Order);
                  const inMonth = isSameMonth(d, monthStart);
                  const isSelected = isSameDay(d, selectedDate);
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedDate(d)}
                      className={`p-2 rounded-lg border cursor-pointer ${isSelected ? "ring-2 ring-amber-300" : ""} ${inMonth ? "bg-white" : "bg-gray-50 text-gray-400"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium">{format(d, "d")}</div>
                        {dayItems.length > 0 && (
                          <div className="flex items-center gap-1 overflow-hidden">
                            {Array.from(new Set(dayItems.map((it) => it.type))).map((t) => (
                              <span
                                key={t}
                                title={t}
                                className={`${detailStyles[t as CalendarItemType].badge} w-3 h-3 rounded-full inline-block`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        {dayOrders.slice(0, 2).map((o) => (
                          <div key={o.id} className="truncate text-[#973c00]">{o.orderCode}</div>
                        ))}
                        {dayOrders.length > 2 && <div className="text-xs text-gray-500">+{dayOrders.length - 2} más</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="p-3 border rounded-lg h-[60vh] overflow-auto">
                <h3 className="text-lg font-semibold text-[#973c00]">Detalles del día</h3>
                <div className="text-sm text-gray-600 mb-3">{format(selectedDate, "PPP")}</div>
                {ordersForDay.length === 0 ? (
                  <div className="text-sm text-gray-600">No hay órdenes para esta fecha.</div>
                ) : (
                  <div className="space-y-3">
                    {ordersForDay.map((order) => {
                      const total = (order.items || []).reduce((s: number, it: any) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0);
                      return (
                        <div
                          key={order.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedOrderDetail(order)}
                          className={`p-3 rounded-lg border cursor-pointer ${detailStyles.ingreso.card} hover:shadow-sm`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="text-sm font-medium text-[#973c00]">{order.orderCode}</div>
                            <div className="text-sm font-semibold text-[#7b3306]">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(total)}</div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {order.invoiceUrl ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">📎 Factura</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Sin factura</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Gastos del día (debajo de órdenes) */}
                {(() => {
                  const expensesForDay = calendarItems.filter((i) => i.type === "gasto" && i.date === selectedKey);
                  if (expensesForDay.length === 0) return null;
                  return (
                    <div className="mt-4 md:mt-6">
                      <h4 className="text-md font-semibold text-[#973c00]">Gastos del día</h4>
                      <div className="mt-3 space-y-3">
                        {expensesForDay.map((it) => {
                          const src: any = it.source ?? {};
                          const amount = src.amount ?? (it.meta ? String(it.meta) : "N/D");
                          return (
                            <div key={it.id} className={`p-3 rounded-lg border ${detailStyles.gasto.card}`}>
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-[#7b3306]">{it.title ?? src.description ?? src.notes ?? 'Gasto'}</div>
                                <div className="text-sm font-semibold text-rose-700">{amount}</div>
                              </div>
                              {it.attachmentUrl && (
                                <div className="mt-2">
                                  <a href={it.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Ver adjunto</a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Recordatorios del día (debajo de gastos) */}
                {(() => {
                  const remindersForDay = calendarItems.filter((i) => i.type === "recordatorio" && i.date === selectedKey);
                  if (remindersForDay.length === 0) return null;
                  return (
                    <div className="mt-4 md:mt-6">
                      <h4 className="text-md font-semibold text-[#973c00]">Recordatorios del día</h4>
                      <div className="mt-3 space-y-3">
                        {remindersForDay.map((it) => {
                          const src: any = it.source ?? {};
                          const remindAt = src.remindAt ?? src.date ?? undefined;
                          let timeLabel = "";
                          try {
                            if (remindAt) timeLabel = format(parseISO(remindAt), "p");
                          } catch {}
                          return (
                            <div
                              key={it.id}
                              role={it.attachmentUrl ? "button" : undefined}
                              tabIndex={it.attachmentUrl ? 0 : undefined}
                              onClick={() => it.attachmentUrl && window.open(it.attachmentUrl, "_blank")}
                              onKeyPress={(e) => {
                                if ((e.key === "Enter" || e.key === " ") && it.attachmentUrl) {
                                  window.open(it.attachmentUrl, "_blank");
                                }
                              }}
                              className={`p-3 rounded-lg border ${detailStyles.recordatorio.card} ${it.attachmentUrl ? "cursor-pointer hover:shadow-sm" : ""}`}
                              aria-label={it.attachmentUrl ? `Abrir adjunto: ${it.attachmentFilename ?? it.title}` : undefined}
                            >
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-[#7b3306]">{it.title ?? src.title ?? 'Recordatorio'}</div>
                                {timeLabel && <div className="text-sm text-gray-600">{timeLabel}</div>}
                              </div>
                              {it.meta && <div className="mt-2 text-sm text-gray-700">{it.meta}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
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
              disabled={reminderUploading}
              className="w-full px-3 py-2 rounded-lg bg-[#fe9a00] text-white font-semibold hover:bg-[#e27100] disabled:opacity-60"
            >
              {reminderUploading ? "Subiendo..." : "Crear recordatorio"}
            </button>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reminderAllDay} onChange={(e) => setReminderAllDay(e.target.checked)} />
                Todo el día
              </label>
              <input
                placeholder="Tipo (opcional)"
                className="text-sm px-2 py-1 rounded border border-[#fef3c6] bg-[#fffbeb]"
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value)}
              />
            </div>
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

        {/* Modal 'selectedInvoice' removed as part of day-detail cleanup */}
        {selectedOrderDetail && (
          <OrderDetailModal
            order={selectedOrderDetail}
            onClose={() => setSelectedOrderDetail(null)}
            onUpdated={(updated) => {
              setOrdersState((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              setCalendarItems((prev) => prev.map((it) => (it.orderId === updated.id ? { ...it, source: updated, order: updated } : it)));
              setSelectedOrderDetail(updated);
            }}
          />
        )}
    </div>
  );
}
