import api from "./api";
import { Order, OrderPayload, OrderItemPayload } from "../types";

export const getAllOrders = async (): Promise<{ data: Order[] }> => {
  return await api.get("/client-orders");
};

export const getOrderById = async (id: string): Promise<{ data: Order }> => {
  return await api.get(`/client-orders/${id}`);
};

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  await api.patch(`/client-orders/${id}/status`, { status });
};

export const confirmOrder = async (id: string): Promise<void> => {
  await api.post(`/client-orders/${id}/confirm`);
};

export const createOrder = async (payload: OrderPayload): Promise<void> => {
  await api.post("/client-orders", payload);
};

export const deleteOrder = async (id: string): Promise<void> => {
  await api.delete(`/client-orders/${id}`);
};

export type { Order, OrderPayload, OrderItemPayload };