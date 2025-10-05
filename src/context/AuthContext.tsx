import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { loginUser, registerUser } from "../api/auth";
import { setAuthToken, clearAuthToken } from "../services/api";

// Tipo de usuario
export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

// Payload esperado en el JWT
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

// Decodificador de JWT sin librerías
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

// Firma del contexto
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(true);

  // Rehidrata sesión desde token
  useEffect(() => {
    const initAuth = () => {
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
          setAuthToken(token); // ✅ inyecta token en Axios
        } catch (err) {
          console.error("Token inválido:", err);
          logout(); // ✅ limpia token y headers
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  // Login
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
    } catch (err) {
      console.error("Error en login:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Registro
  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    setIsLoading(true);
    try {
      const { access_token } = await registerUser(data);
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
    } catch (err) {
      console.error("Error en registro:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout (sin navigate aquí)
  const logout = () => {
    localStorage.removeItem("token");
    clearAuthToken();
    setToken(null);
    setUser(null);
    // Redirección debe hacerse desde el componente que llama a logout()
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook para consumir el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};