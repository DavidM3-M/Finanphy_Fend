// src/types.ts

export interface OrderItem {
  id: number;
  name: string;
  sku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export type OrderStatus = "pendiente" | "procesada" | "cancelada";

export interface Order {
  id: string;
  codigo: string;
  cliente: string;
  fecha: string; // ISO
  estado: OrderStatus;
  total: number;
  companyId?: string;
  productos: OrderItem[];
  notas?: string;
}
// Producto completo
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

// Solo lo que el backend necesita para crear una orden
export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface OrderPayload {
  companyId: string;
  items: OrderItemPayload[];
}
