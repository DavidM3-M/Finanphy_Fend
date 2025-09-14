// src/api/auth.ts
import api from "../services/api";

// Define la forma de la respuesta de login
interface LoginResponse {
  access_token: string;
}

// Define la forma del usuario
export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Inicia sesión: envía email y password,
 * y devuelve el access_token.
 */
export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", credentials);
  return response.data;
}

/**
 * Registra un nuevo usuario y devuelve access_token.
 * (ajusta si el backend también devuelve el usuario)
 */
export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/register", data);
  return response.data;
}

/**
 * Recupera los datos del usuario autenticado
 * usando el token ya seteado en headers.
 */
export async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<User>("/auth/me");
  return response.data;
}