import api from "./api"; // tu instancia de Axios
import type { Product, PaginatedResponse } from "../types";

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
}

export const getProducts = async (params?: ProductsQuery): Promise<PaginatedResponse<Product>> => {
  const res = await api.get<PaginatedResponse<Product>>("/products", { params });
  return res.data;
};

// DTO for checkStock request/response
export type CheckStockItem = { productId: string; quantity: number };
export type CheckStockResult = { productId: string; requested: number; available: number | null; sufficient: boolean };

export const checkStock = async (items: CheckStockItem[]): Promise<CheckStockResult[]> => {
  const res = await api.post<CheckStockResult[]>("/products/check-stock", { items });
  return res.data;
};

// Request total inventory value from server. Optionally pass companyId as query param.
export const getTotalInventoryValue = async (companyId?: string): Promise<number> => {
  const params: Record<string, string | number> = {};
  if (companyId) params.companyId = companyId;
  const res = await api.get<{ total: number }>("/products/inventory/total", { params });
  const total = Number(res.data?.total ?? 0);
  return isNaN(total) ? 0 : total;
};