import api from "./api"; // tu instancia de Axios
import type { Product, PaginatedResponse } from "../types";

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
}

export const getProducts = async (params?: ProductsQuery): Promise<PaginatedResponse<Product>> => {
  // Debug: log query params to help diagnose missing-results issues
  const res = await api.get<PaginatedResponse<Product>>("/products", { params });
  return res.data;
};

// Fetch all matching products by paging the /products endpoint (limit <= 100)
export const fetchAllProducts = async (search?: string, companyId?: string, maxPages = 10) => {
  const perPage = 100;
  const acc: Product[] = [];
  let page = 1;
  while (page <= maxPages) {
    const res = await getProducts({ page, limit: perPage, search, companyId });
    const data = Array.isArray(res?.data) ? res.data : [];
    acc.push(...data);
    const totalPages = res?.meta?.totalPages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return acc;
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