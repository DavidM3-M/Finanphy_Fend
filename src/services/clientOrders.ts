// src/services/orders.ts
import api from "./api";
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

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  await api.patch(`/client-orders/${id}/status`, { status }, { headers: { ...authHeader() } });
};

export const confirmOrder = async (id: string): Promise<void> => {
  await api.post(`/client-orders/${id}/confirm`, null, { headers: { ...authHeader() } });
};

export const createOrder = async (payload: OrderPayload): Promise<Order> => {
  const res = await api.post("/client-orders", payload, { headers: { ...authHeader() } });
  return res.data;
};

export const deleteOrder = async (id: string): Promise<void> => {
  await api.delete(`/client-orders/${id}`, { headers: { ...authHeader() } });
};

export const uploadOrderInvoice = async (id: string, file: Blob, filename: string) => {
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

export type { Order, OrderPayload, OrderItemPayload };