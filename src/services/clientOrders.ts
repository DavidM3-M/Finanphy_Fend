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

export type { Order, OrderPayload, OrderItemPayload };