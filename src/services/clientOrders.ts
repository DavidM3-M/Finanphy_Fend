import { Order,OrderPayload, OrderItemPayload } from "../types";
import api from "./api"; // ✅ cliente Axios con token y baseURL

// Obtener todas las órdenes
export const getAllOrders = async (): Promise<{ data: Order[] }> => {
  return await api.get("/client-orders");
};

// Obtener una orden específica por ID
export const getOrderById = async (id: string): Promise<{ data: Order }> => {
  return await api.get(`/client-orders/${id}`);
};

// Actualizar el estado de una orden
export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  await api.patch(`/client-orders/${id}/status`, { status });
};

// Confirmar una orden
export const confirmOrder = async (id: string): Promise<void> => {
  await api.post(`/client-orders/${id}/confirm`);
};

// Crear una nueva orden
export const createOrder = async (payload: OrderPayload): Promise<void> => {
  await api.post("/client-orders", payload);
};

// Eliminar una orden por ID
export const deleteOrder = async (id: string): Promise<void> => {
  await api.delete(`/client-orders/${id}`);
};

export type {Order, OrderItemPayload}