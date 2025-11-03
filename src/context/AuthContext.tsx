// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { loginUser, registerUser } from "../api/auth";
import { setAuthToken, clearAuthToken } from "../services/api";
import api from "../services/api";

export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface Company {
  id: string;
  tradeName: string;
  legalName?: string | null;
  companyType?: string | null;
  taxId: string | null;
  taxRegistry?: string | null;
  businessPurpose?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  fiscalAddress?: string | null;
  city?: string | null;
  state?: string | null;
  representativeName?: string | null;
  representativeDocument?: string | null;
  incorporationDate?: string | null;
}

/* Nuevo: tipos para payload de registro */
export interface CreateCompanyPayload {
  tradeName: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company?: CreateCompanyPayload;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  company: Company | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>; // ajustado
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const decoded = decodeJwt<JwtPayload>(token);
          setUser({
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            firstName: decoded.firstName ?? "",
            lastName: decoded.lastName ?? "",
          });
          setAuthToken(token);

          const res = await api.get("/companies/my");
          setCompany(res.data);
        } catch (err) {
          console.error("Error inicializando sesión:", err);
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  // dentro de AuthContext.tsx, reemplaza las funciones existentes

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { access_token } = await loginUser({ email, password });
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setAuthToken(access_token);

      const decoded = decodeJwt<JwtPayload>(access_token);
      setUser({
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName ?? "",
        lastName: decoded.lastName ?? "",
      });

      const res = await api.get("/companies/my");
      setCompany(res.data);
    } catch (err: any) {
      console.error("Error en login:", err);
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        err?.message ??
        `Credenciales inválidas (${err?.response?.status ?? "unknown"})`;
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterPayload) => {
    setIsLoading(true);
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        company: data.company ?? undefined,
      };
      const { access_token } = await registerUser(payload);
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setAuthToken(access_token);

      const decoded = decodeJwt<JwtPayload>(access_token);
      setUser({
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName ?? "",
        lastName: decoded.lastName ?? "",
      });

      const res = await api.get("/companies/my");
      setCompany(res.data);
    } catch (err: any) {
      console.error("Error en registro:", err);
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.response?.data?.detail ??
        err?.message ??
        `Error en registro (${err?.response?.status ?? "unknown"})`;
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    clearAuthToken();
    setToken(null);
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, company }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function decodeJwt<T>(token: string): T {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch (err) {
    throw new Error("Token inválido o malformado");
  }
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};