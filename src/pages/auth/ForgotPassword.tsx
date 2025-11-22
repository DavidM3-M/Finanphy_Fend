// src/pages/auth/ForgotPassword.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("https://finanphy-dev-auth.onrender.com/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("No se pudo enviar el correo de recuperación");
      }

      setMessage("Revisa tu bandeja de entrada para continuar con la recuperación.");
    } catch (err: any) {
      setError(err.message || "Error al enviar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#FFF8E6" }}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border p-8 space-y-6"
        style={{ borderColor: "#FEE685" }}
      >
        <h2 className="text-xl font-semibold text-center" style={{ color: "#7B3306" }}>
          Recuperar contraseña
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium" style={{ color: "#7B3306" }}>
              Correo electrónico
            </label>
            <input
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

          {error && (
            <div className="p-3 rounded-md" style={{ backgroundColor: "#FFF1F2", border: "1px solid #FECACA", color: "#991B1B" }}>
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-md" style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46" }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2 rounded-lg font-semibold transition"
            style={{ backgroundColor: "#FFB900", color: "#FFFFFF" }}
          >
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>

        <div className="w-full mt-3 text-center">
          <button
            onClick={() => navigate("/auth/login")}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border font-medium transition"
            style={{ borderColor: "#FEE685", color: "#7B3306", backgroundColor: "transparent" }}
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}