// src/services/orders.ts
import api from "./api";
import { Order, OrderPayload, OrderItemPayload } from "../types";

function authHeader() {
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getAllOrders = async (): Promise<{ data: Order[] }> => {
  return await api.get("/client-orders", { headers: { ...authHeader() } });
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

export const createOrder = async (payload: OrderPayload): Promise<void> => {
  await api.post("/client-orders", payload, { headers: { ...authHeader() } });
};

export const deleteOrder = async (id: string): Promise<void> => {
  await api.delete(`/client-orders/${id}`, { headers: { ...authHeader() } });
};

export const uploadOrderInvoice = async (id: string, file: Blob, filename: string) => {
  const formData = new FormData();
  formData.append("invoice", file, filename);
  const res = await api.post(`/client-orders/${id}/invoice`, formData, {
    headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteOrderInvoice = async (id: string) => {
  const res = await api.delete(`/client-orders/${id}/invoice`, { headers: { ...authHeader() } });
  return res.data;
};

export type { Order, OrderPayload, OrderItemPayload };