// src/pages/auth/Login.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { Building2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err: any) {
      alert(err?.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center px-4">
      <div
        className={`relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                    border border-[#fef3c6] p-8 space-y-6 transition-all
                    duration-700 ease-out ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-[#ffb900] rounded-xl shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#973c00] tracking-tight">Finanphy</h1>
        </div>

        <h2 className="text-xl font-semibold text-center text-[#7b3306]">Inicia sesión</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="tú@ejemplo.com"
            />
          </div>

          {/* Contraseña: input con altura forzada y toggle centrado verticalmente */}
          <div>
            <label className="block text-sm font-medium text-[#bb4d00] mb-1">Contraseña</label>

            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="mt-0 w-full h-10 px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                           focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition pr-14 leading-normal"
              />

              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 z-[9999] p-0 leading-none text-[#7b3306] hover:opacity-90 focus:outline-none"
              >
                {!showPass ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 block" fill="none" viewBox="0 0 24 24" stroke="#7b3306" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 block" fill="none" viewBox="0 0 24 24" stroke="#7b3306" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.223-3.474M3 3l18 18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.586 10.586a3 3 0 004.242 4.242" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2
                       bg-[#fe9a00] hover:bg-[#e17100] text-white font-semibold py-2
                       rounded-lg transition disabled:opacity-60"
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
          <span className="text-sm text-[#973c00] mr-2">¿No tienes cuenta?</span>
          <button
            onClick={() => navigate("/auth/register")}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-transparent border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6] font-medium transition"
          >
            Regístrate
          </button>
        </div>
      </div>
    </div>
  );
}