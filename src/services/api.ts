// src/services/api.ts

import axios from "axios";

// 1) Base URL dinámica
const BASE =
  process.env.REACT_APP_API_URL ||
  "https://finanphy-api.onrender.com"; // Asegúrate que aquí apunte a la API que sirve /incomes y /expenses

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
      console.warn("Token inválido o expirado");
      // Aquí podrías redirigir a /login o disparar tu logout
    }
    return Promise.reject(err);
  }
);

// 5) Endpoints de aplicación

// Payload para crear movimientos
export interface MovimientoPayload {
  amount: number;
  category: number;      // <— ahora obligatorio
  supplier: string;
  exitDate: string;
  dueDate: string;
}

// Lectura
export const getIncomes = () => api.get("/incomes");
export const getExpenses = () => api.get("/expenses");

// Payload para crear movimientos (ya no usamos `category`)
export interface MovimientoPayload {
  amount: number;
  supplier: string;
  exitDate: string;
  dueDate: string;
}

// Escritura
export const createIncome = (data: MovimientoPayload) =>
  api.post("/incomes", data);

export const createExpense = (data: MovimientoPayload) =>
  api.post("/expenses", data);

export default api;