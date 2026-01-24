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