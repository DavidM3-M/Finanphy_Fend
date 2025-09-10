import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "https://finanphy.onrender.com";

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  // withCredentials: false, // activa si necesitas enviar cookies si tu backend lo requiere
});

/* --- Manejo de Token --- */
export function setAuthToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

/* --- Interceptor de Errores --- */
api.interceptors.response.use(
  (response) => response,
  (err) => {
    console.error(
      "[API ERROR]",
      err.response?.status,
      err.response?.data || err.message
    );
    return Promise.reject(err);
  }
);

/* ================================
   PRODUCTOS
================================ */
export const getProducts = (params) => api.get("/products", { params });
export const createProduct = (payload) => api.post("/products", payload);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

/* ================================
   CLIENTES (basados en Users)
================================ */
export const getClientes = () => api.get("/api/users");
export const createCliente = (payload) => api.post("/auth/register", payload);
// Aún falta confirmar si hay endpoints oficiales de update/delete para clientes (Users)

/* ================================
   INGRESOS (Incomes)
================================ */
export const getIncomes = () => api.get("/incomes");
export const createIncome = (payload) => api.post("/incomes", payload);
// Si el backend soporta update/delete de incomes, se podrían añadir aquí

/* ================================
   GASTOS (Expenses)
================================ */
export const getExpenses = () => api.get("/expenses");
export const createExpense = (payload) => api.post("/expenses", payload);
// Igual, se pueden añadir update/delete si el backend lo expone

export default api;
