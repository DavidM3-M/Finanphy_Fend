// src/pages/auth/Login.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { Building2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const acceptBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const qMsg = q.get("authError");
      if (qMsg) {
        setError(decodeURIComponent(qMsg));
        const cleanUrl = window.location.pathname + window.location.hash;
        try {
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {
          try { sessionStorage.removeItem("authError"); } catch {}
        }
        return;
      }
      const sMsg = sessionStorage.getItem("authError");
      if (sMsg) {
        setError(sMsg);
        try { sessionStorage.removeItem("authError"); } catch {}
      }
    } catch (e) {
      console.warn("Error leyendo authError:", e);
    }
  }, []); // solo al montar

  useEffect(() => {
    if (error && acceptBtnRef.current) {
      acceptBtnRef.current.focus();
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Credenciales inválidas";
      try { sessionStorage.setItem("authError", msg); } catch {}
      navigate("/auth/login", { replace: true, state: { authError: msg } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: "#FFF8E6" }}>
        <div className="flex items-center justify-center px-4 py-12">
          <div
            className={`relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                        border p-8 space-y-6 transition-all duration-700 ease-out`}
            style={{
              borderColor: "#FEE685",
              transform: animate ? "translateY(0)" : "translateY(1.5rem)",
              opacity: animate ? 1 : 0,
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-2 rounded-xl shadow-lg" style={{ backgroundColor: "#FFB900" }}>
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "#7B3306" }}>Finanphy</h1>
            </div>

            <h2 className="text-xl font-semibold text-center" style={{ color: "#7B3306" }}>Inicia sesión</h2>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium" style={{ color: "#7B3306" }}>Correo electrónico</label>
                <input
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tú@ejemplo.com"
                  className="mt-1 w-full px-4 py-2 rounded-lg transition"
                  style={{
                    backgroundColor: "#FFF8E6",
                    border: "1px solid #FEE685",
                    color: "#7B3306",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#7B3306" }}>Contraseña</label>
                <div className="relative">
                  <input
                    name="password"
                    autoComplete="current-password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="mt-0 w-full h-10 px-4 py-2 rounded-lg transition pr-14"
                    style={{
                      backgroundColor: "#FFF8E6",
                      border: "1px solid #FEE685",
                      color: "#7B3306",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7B3306] hover:opacity-90 focus:outline-none"
                  >
                    {!showPass ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#7B3306">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#7B3306">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.223-3.474M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.586 10.586a3 3 0 004.242 4.242" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md" style={{ backgroundColor: "#FFF1F2", border: "1px solid #FECACA", color: "#991B1B" }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm break-words">{error}</div>
                    <button
                      ref={acceptBtnRef}
                      onClick={() => setError(null)}
                      className="ml-3 px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: "#E11D48", color: "white" }}
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg font-semibold transition"
                style={{
                  backgroundColor: "#FFB900",
                  color: "#FFFFFF",
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Ingresando…</span>
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>

            <div className="w-full mt-3 text-center">
              <span className="text-sm" style={{ color: "#7B3306", marginRight: 8 }}>¿No tienes cuenta?</span>
              <button
                onClick={() => navigate("/auth/register")}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border font-medium transition"
                style={{ borderColor: "#FEE685", color: "#7B3306", backgroundColor: "transparent" }}
              >
                Regístrate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal grande opcional, dejado fuera para evitar solapamiento */}
    </>
  );
}