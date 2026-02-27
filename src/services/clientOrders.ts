// src/services/orders.ts
import api, { createIncome } from "./api";
import type { Order, OrderPayload, OrderItemPayload, PaginatedResponse } from "../types";

function authHeader() {
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
  customerId?: string;
}

export const getAllOrders = async (params?: OrdersQuery) => {
  return await api.get<PaginatedResponse<Order>>("/client-orders", {
    params,
    headers: { ...authHeader() },
  });
};

export const getOrderById = async (id: string): Promise<{ data: Order }> => {
  return await api.get(`/client-orders/${id}`, { headers: { ...authHeader() } });
};

export const updateOrderStatus = async (id: string, status: string): Promise<any> => {
  const res = await api.patch(`/client-orders/${id}/status`, { status }, { headers: { ...authHeader() } });
  try {
    if (status === "enviado") {
      const ordRes = await getOrderById(id);
      // `getOrderById` may return { data: Order } or the Order directly depending on the service response shape.
      // Use a safe any-cast to handle both shapes without TypeScript complaining about `.data` on `Order`.
      const fullOrder: any = (ordRes as any)?.data ?? (ordRes as any);
      const total = (fullOrder.items || []).reduce((s: number, it: any) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0);
      if (total > 0) {
        await createIncome({ amount: total, category: "venta", entryDate: new Date().toISOString(), description: `Ingreso por orden ${fullOrder.orderCode}`, companyId: fullOrder.company?.id });
      }
    }
  } catch (e) {
    console.warn("updateOrderStatus: failed to create Income (best-effort)", e);
  }
  return res.data;
};

export interface ConfirmOrderOptions {
  paid?: boolean;
  amount?: number;
  paymentMethod?: string;
  note?: string;
}

export const confirmOrder = async (id: string, opts?: ConfirmOrderOptions): Promise<any> => {
  const res = await api.post(`/client-orders/${id}/confirm`, opts ?? null, { headers: { ...authHeader() } });
  return res.data;
};

export const updateOrder = async (id: string, payload: any): Promise<any> => {
  const res = await api.patch(`/client-orders/${id}`, payload, { headers: { ...authHeader() } });
  return res.data;
};

export const createOrder = async (payload: OrderPayload): Promise<Order> => {
  const res = await api.post("/client-orders", payload, { headers: { ...authHeader() } });
  return res.data;
};

export const deleteOrder = async (id: string): Promise<void> => {
  await api.delete(`/client-orders/${id}`, { headers: { ...authHeader() } });
};

export const uploadOrderInvoice = async (id: string, file: Blob, filename: string) => {
  // Validate id looks like a UUID to avoid backend 400s
  const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  if (!isUuid(id)) {
    const err = { message: 'Invalid order id for upload (uuid expected)', id };
    console.error('[clientOrders] uploadOrderInvoice skipped - invalid id', err);
    throw err;
  }

  const formData = new FormData();
  formData.append("invoice", file, filename);
  // Inspect FormData contents for debugging
  try {
    for (const entry of formData.entries()) {
      const [key, value] = entry as [string, any];
      if (value instanceof Blob) {
        console.log(`[clientOrders] formData entry: ${key}`, { size: value.size, type: value.type, name: (value as any).name });
      } else {
        console.log(`[clientOrders] formData entry: ${key}`, value);
      }
    }
  } catch (e) {
    console.warn("Could not inspect FormData entries", e);
  }

  // Do not set Content-Type header manually; let the browser set the correct multipart boundary.
  try {
    const res = await api.post(`/client-orders/${id}/invoice`, formData, {
      headers: { ...authHeader() },
    });
    return res.data;
  } catch (err: any) {
    console.error("[clientOrders] uploadOrderInvoice error:", err?.response?.data ?? err);
    throw err;
  }
};

export const deleteOrderInvoice = async (id: string) => {
  const res = await api.delete(`/client-orders/${id}/invoice`, { headers: { ...authHeader() } });
  return res.data;
};

export const getByCompanyAndCustomer = async (
  companyId: string,
  customerId: string,
  userId?: string,
  page?: number,
  limit?: number
) => {
  const res = await api.get(`/client-orders/company/${companyId}/customer/${customerId}/debts`, {
    params: { userId, page, limit },
    headers: { ...authHeader() },
  });
  return res.data;
};

export type { Order, OrderPayload, OrderItemPayload };