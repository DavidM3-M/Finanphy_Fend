import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import api from "../services/api";

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
  loadProducts: () => Promise<void>;
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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = publicMode
        ? `/public/products/company/${companyId}` // ✅ endpoint corregido
        : `/products`;

      const res = await api.get<Product[]>(endpoint);
      setProducts(res.data);
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
      loadProducts();
    }
  }, [companyId, loadProducts]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        companyId,
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