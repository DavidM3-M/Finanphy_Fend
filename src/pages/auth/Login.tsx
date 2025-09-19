// src/pages/auth/Login.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { Building2 } from "lucide-react";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [animate, setAnimate]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  // Animación de entrada
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
      alert(err.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center px-4">
      <div
        className={`relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                    border border-[#fef3c6] p-8 space-y-6 transition-all
                    duration-700 ease-out ${
                      animate
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-6"
                    }`}
      >
        {/* Logo Finanphy */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-[#ffb900] rounded-xl shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#973c00] tracking-tight">
            Finanphy
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-center text-[#7b3306]">
          Inicia sesión
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]
                         transition"
              placeholder="tú@ejemplo.com"
            />
          </div>

          {/* Contraseña */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#bb4d00]">
              Contraseña
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]
                         transition pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-[#bb4d00]
                         hover:text-[#973c00]"
            >
              {showPass ? "x" : "o"}
            </button>
          </div>

          {/* Botón de envío con spinner SVG */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2
                       bg-[#fe9a00] hover:bg-[#e17100] text-white font-semibold py-2
                       rounded-lg transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                  viewBox="0 0 24 24"
                />
                <span>Ingresando…</span>
              </>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        {/* Enlace a registro */}
        <div className="text-center pt-2">
          <span className="text-sm text-[#973c00]">¿No tienes cuenta?</span>
          <button
            onClick={() => navigate("/auth/register")}
            className="ml-2 text-sm font-medium text-[#fe9a00] hover:underline"
          >
            Regístrate
          </button>
        </div>
      </div>
    </div>
  );
}