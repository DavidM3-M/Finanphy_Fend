// src/pages/auth/Register.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { Building2 } from "lucide-react";

export default function Register() {
  // Estado del formulario y validaciones
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: ""
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirm: ""
  });
  const [strength, setStrength] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [animate, setAnimate] = useState(false);
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  // Animación de entrada
  useEffect(() => {
    const timeout = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  // Validaciones
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (pw: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(pw);

  const evaluateStrength = (pw: string): string => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 0:
      case 1:
        return "Débil";
      case 2:
        return "Media";
      case 3:
      case 4:
        return "Fuerte";
      case 5:
        return "Muy fuerte";
      default:
        return "";
    }
  };

  // Manejo de cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (name === "email") {
      setErrors(prev => ({
        ...prev,
        email: validateEmail(value) ? "" : "Correo inválido"
      }));
    }

    if (name === "password") {
      setStrength(evaluateStrength(value));
      setErrors(prev => ({
        ...prev,
        password: validatePassword(value)
          ? ""
          : "8+ caracteres, mayúscula, minúscula y número",
        confirm:
          form.confirm === value ? "" : "Las contraseñas no coinciden"
      }));
    }

    if (name === "confirm") {
      setErrors(prev => ({
        ...prev,
        confirm:
          value === form.password ? "" : "Las contraseñas no coinciden"
      }));
    }
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.email || errors.password || errors.confirm) return;
    try {
      await register(form);
      navigate("/auth/login");
    } catch (err: any) {
      alert(err.message || "Error al registrar");
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center px-4">
      <div
        className={`relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl
                    border border-[#fef3c6] p-8 space-y-6 transition-all
                    duration-700 ease-out ${
                      animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                    }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-[#ffb900] rounded-xl shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#973c00] tracking-tight">
            Finanphy
          </h1>
        </div>

        <h2 className="text-xl font-semibold text-center text-[#7b3306]">
          Crea tu cuenta
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="Nombre"
              value={form.firstName}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]"
            />
            <input
              name="lastName"
              placeholder="Apellido"
              value={form.lastName}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]"
            />
          </div>

          {/* Email */}
          <div>
            <input
              name="email"
              type="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]
                         ${errors.email ? "border-red-500" : "border-[#fef3c6]"}`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className="relative">
            <input
              name="password"
              type={showPass ? "text" : "password"}
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] pr-10
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]
                         ${errors.password ? "border-red-500" : "border-[#fef3c6]"}`}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-[#bb4d00]
                         hover:text-[#973c00]"
            >
              {showPass ? "🙈" : "👁️"}
            </button>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            {form.password && (
              <div className="mt-2">
                <p className="text-sm font-medium text-[#7b3306] mb-1">
                  Robustez: {strength}
                </p>
                <div className="w-full h-2 rounded-full bg-[#fef3c6] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      strength === "Débil"
                        ? "w-1/4 bg-red-500"
                        : strength === "Media"
                        ? "w-2/4 bg-yellow-500"
                        : strength === "Fuerte"
                        ? "w-3/4 bg-green-500"
                        : "w-full bg-emerald-600"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <input
              name="confirm"
              type="password"
              placeholder="Confirmar contraseña"
              value={form.confirm}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb]
                         focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]
                         ${errors.confirm ? "border-red-500" : "border-[#fef3c6]"}`}
            />
            {errors.confirm && (
              <p className="text-red-500 text-sm mt-1">{errors.confirm}</p>
            )}
          </div>

          {/* Botón de registro */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2
                       bg-[#fe9a00] hover:bg-[#e17100] text-white font-semibold py-2
                       rounded-lg transition disabled:opacity-60"
          >
            {isLoading && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            <span>{isLoading ? "Registrando…" : "Registrarse"}</span>
          </button>
        </form>

        {/* Enlace a login */}
        <div className="text-center pt-2">
          <span className="text-sm text-[#973c00]">¿Ya tienes cuenta?</span>
          <button
            onClick={() => navigate("/auth/login")}
            className="ml-2 text-sm font-medium text-[#fe9a00] hover:underline"
          >
            Inicia sesión
          </button>
        </div>
      </div>
    </div>
  );
}