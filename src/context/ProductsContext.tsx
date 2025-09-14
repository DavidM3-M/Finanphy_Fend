// src/context/ProductsContext.tsx
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
  id: number | string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
}

// Define los tipos de las funciones que expondrá el contexto
interface ProductsContextData {
  products: Product[];
  loading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (data: Omit<Product, "id">) => Promise<void>;
  editProduct: (id: Product["id"], data: Omit<Product, "id">) => Promise<void>;
  removeProduct: (id: Product["id"]) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextData | undefined>(
  undefined
);

export const ProductsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]     = useState<boolean>(false);
  const [error, setError]         = useState<string | null>(null);

  // Carga inicial y recarga
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Product[]>("/products");
      setProducts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear producto
  const addProduct = useCallback(
    async (data: Omit<Product, "id">) => {
      setLoading(true);
      try {
        const res = await api.post<Product>("/products", data);
        setProducts((prev) => [...prev, res.data]);
      } catch (err: any) {
        setError(err.response?.data?.message || "Error creando producto");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Editar producto
  const editProduct = useCallback(
    async (id: Product["id"], data: Omit<Product, "id">) => {
      setLoading(true);
      try {
        const res = await api.put<Product>(`/products/${id}`, data);
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? res.data : p))
        );
      } catch (err: any) {
        setError(err.response?.data?.message || "Error editando producto");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Eliminar producto
  const removeProduct = useCallback(
    async (id: Product["id"]) => {
      setLoading(true);
      try {
        await api.delete(`/products/${id}`);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } catch (err: any) {
        setError(err.response?.data?.message || "Error eliminando producto");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Ejecutar carga inicial al montar
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
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

// Hook para consumir el contexto
export function useProducts(): ProductsContextData {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts debe usarse dentro de ProductsProvider");
  }
  return context;
}