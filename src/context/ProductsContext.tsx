import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import api from "../services/api";
import type { PaginatedMeta, PaginatedResponse } from "../types";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
  category?: string;
  imageUrl?: string;
}

interface ProductsContextData {
  products: Product[];
  loading: boolean;
  error: string | null;
  companyId: string;
  meta: PaginatedMeta | null;
  loadProducts: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
  addProduct: (data: Omit<Product, "id">) => Promise<void>;
  editProduct: (id: Product["id"], data: Omit<Product, "id">) => Promise<void>;
  removeProduct: (id: Product["id"]) => Promise<void>;
}

interface ProductsProviderProps {
  children: ReactNode;
  companyId: string;
  publicMode?: boolean;
}

const ProductsContext = createContext<ProductsContextData | undefined>(undefined);

export const ProductsProvider: React.FC<ProductsProviderProps> = ({
  children,
  companyId,
  publicMode = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);

  const loadProducts = useCallback(async (params?: { page?: number; limit?: number; search?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const search = params?.search?.trim() || undefined;
      const endpoint = publicMode
        ? `/public/products/company/${companyId}` 
        : `/products`;
      const res = await api.get<PaginatedResponse<Product>>(endpoint, {
        params: { page, limit, ...(search ? { search } : {}) },
      });
      setProducts(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }, [companyId, publicMode]);

  const addProduct = useCallback(async (data: Omit<Product, "id">) => {
    setLoading(true);
    try {
      const res = await api.post<Product>("/products", { ...data, companyId });
      setProducts((prev) => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creando producto");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const editProduct = useCallback(async (id: Product["id"], data: Omit<Product, "id">) => {
    setLoading(true);
    try {
      const res = await api.put<Product>(`/products/${id}`, data);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data : p)));
    } catch (err: any) {
      setError(err.response?.data?.message || "Error editando producto");
    } finally {
      setLoading(false);
    }
  }, []);

  const removeProduct = useCallback(async (id: Product["id"]) => {
    setLoading(true);
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || "Error eliminando producto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      loadProducts().catch(() => undefined);
    }
  }, [companyId, loadProducts]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        companyId,
        meta,
        loadProducts,
        addProduct,
        editProduct,
        removeProduct,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

export function useProducts(): ProductsContextData {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts debe usarse dentro de ProductsProvider");
  }
  return context;
}