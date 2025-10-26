// src/services/api.ts

import axios from "axios";

// 1) Base URL dinámica
const BASE =
  process.env.REACT_APP_API_URL ||
  "https://finanphy-dev-auth.onrender.com"; 
console.log("📡 API baseURL =", BASE);

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// 2) Helpers de Auth
export interface LoginCreds {
  email: string;
  password: string;
}

export const loginUser = (creds: LoginCreds) =>
  api.post<{ token: string }>("/login", creds);

export const fetchCurrentUser = () =>
  api.get<{ id: string; email: string; name?: string }>("/auth/me");

// 3) Gestión de token en headers
export function setAuthToken(token: string) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

// 4) Interceptor para 401
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("🔐 Token inválido o expirado");

      // Extraer mensaje del backend si existe
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        "Sesión expirada. Por favor inicia sesión nuevamente";

      // Persistir mensaje para que Login lo lea tras la redirección
      try {
        sessionStorage.setItem("authError", msg);  
      } catch (e) {
        console.warn("No se pudo guardar authError en sessionStorage", e);
      }

      // Limpieza de credenciales locales
      clearAuthToken();
      localStorage.removeItem("token");

      // Redirigir a la página de login incluyendo el mensaje en la query string
      const encoded = encodeURIComponent(msg);
      window.location.href = `/auth/login?authError=${encoded}`;
    }
    return Promise.reject(err);
  }
);

// 5) Endpoints de aplicación

// Payload para crear/editar movimientos
export interface MovimientoPayload {
  amount: number;
  category: string;
  dueDate: string;
}

// Tipo de respuesta de un movimiento
export interface Movimiento {
  id: number;
  amount: number;
  supplier: string;
  entryDate: string;
  createdAt: string;
  companyId?: string;
  tipo?: "ingreso" | "gasto";
}

// Lectura
export const getIncomes = () => api.get<Movimiento[]>("/incomes");
export const getExpenses = () => api.get<Movimiento[]>("/expenses");

// Creación
export const createIncome = (data: MovimientoPayload) =>
  api.post<Movimiento>("/incomes", data);
export const createExpense = (data: MovimientoPayload) =>
  api.post<Movimiento>("/expenses", data);

// Actualización
export const updateIncome = (id: number, data: MovimientoPayload) =>
  api.put<Movimiento>(`/incomes/${id}`, data);
export const updateExpense = (id: number, data: MovimientoPayload) =>
  api.put<Movimiento>(`/expenses/${id}`, data);

// Eliminación
export const deleteIncome = (id: number) =>
  api.delete<void>(`/incomes/${id}`);
export const deleteExpense = (id: number) =>
  api.delete<void>(`/expenses/${id}`);

export default api;