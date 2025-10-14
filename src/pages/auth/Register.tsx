// src/pages/auth/Register.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { Building2 } from "lucide-react";

/**
 * Multi-step register: 0 Perfil, 1 Contraseña, 2 Empresa, 3 Revisar
 * - Toggle de contraseña posicionado un poco más arriba y sin caja
 * - Botones coherentes y redondeados
 * - Barra de robustez con espacio reservado
 */

export default function Register() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const steps = ["Perfil", "Contraseña", "Empresa", "Revisar"];
  const [step, setStep] = useState(0);

  // Personal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Company
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [taxId, setTaxId] = useState("");

  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [strength, setStrength] = useState("");

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePassword = (pw: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(pw);
  const evaluateStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return "Débil";
    if (score === 2) return "Media";
    if (score <= 4) return "Fuerte";
    return "Muy fuerte";
  };

  const canNext = (): boolean => {
    if (step === 0) {
      return firstName.trim() !== "" && lastName.trim() !== "" && validateEmail(email);
    }
    if (step === 1) {
      return validatePassword(password) && password === confirm;
    }
    if (step === 2) {
      return tradeName.trim() !== "" && legalName.trim() !== "" && companyType.trim() !== "" && taxId.trim() !== "";
    }
    return true;
  };

  const goNext = () => {
    setErrors({});
    if (!canNext()) {
      if (step === 0) {
        if (!firstName.trim()) setErrors((s) => ({ ...s, firstName: "Nombre requerido" }));
        if (!lastName.trim()) setErrors((s) => ({ ...s, lastName: "Apellido requerido" }));
        if (!validateEmail(email)) setErrors((s) => ({ ...s, email: "Email inválido" }));
      }
      if (step === 1) {
        if (!validatePassword(password)) setErrors((s) => ({ ...s, password: "8+ chars, mayúscula, minúscula y número" }));
        if (password !== confirm) setErrors((s) => ({ ...s, confirm: "No coinciden" }));
      }
      if (step === 2) {
        if (!tradeName.trim()) setErrors((s) => ({ ...s, tradeName: "Requerido" }));
        if (!legalName.trim()) setErrors((s) => ({ ...s, legalName: "Requerido" }));
        if (!companyType.trim()) setErrors((s) => ({ ...s, companyType: "Requerido" }));
        if (!taxId.trim()) setErrors((s) => ({ ...s, taxId: "Requerido" }));
      }
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onPasswordChange = (v: string) => {
    setPassword(v);
    setStrength(evaluateStrength(v));
    setErrors((e) => ({ ...e, password: "" }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canNext()) {
      goNext();
      return;
    }
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      company: { tradeName: tradeName.trim(), legalName: legalName.trim(), companyType: companyType.trim(), taxId: taxId.trim() },
    };
    try {
      await register(payload);
      navigate("/auth/login");
    } catch (err: any) {
      const message = (err && (err.message || err?.response?.data?.message)) || "Error al registrar";
      setErrors({ form: message });
    }
  };

  const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...p }) => (
    <button {...p} className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#fe9a00] hover:bg-[#e27100] text-white font-semibold transition disabled:opacity-60">
      {children}
    </button>
  );
  const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...p }) => (
    <button {...p} className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-transparent border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6] font-medium transition">
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center px-4">
      <div className={`relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#fef3c6] p-8 space-y-6 transition-all duration-500 ease-out ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-[#ffb900] rounded-xl shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#973c00] tracking-tight">Finanphy</h1>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-[#7b3306] font-medium">Registro</div>
          <div className="text-xs text-[#973c00]">{steps[step]}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <input name="firstName" placeholder="Nombre" value={firstName} onChange={(e) => { setFirstName(e.target.value); setErrors((s) => ({ ...s, firstName: "" })); }} required className="px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]" />
                <input name="lastName" placeholder="Apellido" value={lastName} onChange={(e) => { setLastName(e.target.value); setErrors((s) => ({ ...s, lastName: "" })); }} required className="px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]" />
              </div>

              <div>
                <input name="email" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((s) => ({ ...s, email: "" })); }} required className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] ${errors.email ? "border-red-500" : "border-[#fef3c6]"}`} />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {/* bloque autocontenido: input + toggle */}
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                  className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] pr-14 focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] ${errors.password ? "border-red-500" : "border-[#fef3c6]"}`}
                />

                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-2 z-50 p-0 leading-none text-[#7b3306] hover:opacity-90 focus:outline-none"
                >
                  {!showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 block" fill="none" viewBox="0 0 24 24" stroke="#7b3306">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 block" fill="none" viewBox="0 0 24 24" stroke="#7b3306">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.223-3.474M3 3l18 18" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.586 10.586a3 3 0 004.242 4.242" />
                    </svg>
                  )}
                </button>



                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}

                {/* Barra de robustez reservando espacio */}
                <div className="mt-2 min-h-[44px]">
                  {password ? (
                    <>
                      <p className="text-sm font-medium text-[#7b3306] mb-1">Robustez: {strength}</p>
                      <div className="w-full h-2 rounded-full bg-[#fef3c6] overflow-hidden">
                        <div className={`h-full transition-all duration-500 rounded-full ${strength === "Débil" ? "w-1/4 bg-red-500" : strength === "Media" ? "w-2/4 bg-yellow-500" : strength === "Fuerte" ? "w-3/4 bg-green-500" : "w-full bg-emerald-600"}`} />
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-[#b86a00]">La robustez se mostrará aquí</div>
                  )}
                </div>
              </div>

              <div>
                <input name="confirm" type="password" placeholder="Confirmar contraseña" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((s) => ({ ...s, confirm: "" })); }} required className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] ${errors.confirm ? "border-red-500" : "border-[#fef3c6]"}`} />
                {errors.confirm && <p className="text-red-500 text-sm mt-1">{errors.confirm}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pt-2 space-y-3 border-t border-[#fef3c6]">
              <h3 className="text-sm font-semibold text-[#7b3306]">Datos de la empresa</h3>

              <input name="tradeName" placeholder="Nombre comercial (tradeName)" value={tradeName} onChange={(e) => { setTradeName(e.target.value); setErrors((s) => ({ ...s, tradeName: "" })); }} required className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] border ${errors.tradeName ? "border-red-500" : "border-[#fef3c6]"} focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]`} />
              {errors.tradeName && <p className="text-red-500 text-sm mt-1">{errors.tradeName}</p>}

              <input name="legalName" placeholder="Razón social (legalName)" value={legalName} onChange={(e) => { setLegalName(e.target.value); setErrors((s) => ({ ...s, legalName: "" })); }} required className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] border ${errors.legalName ? "border-red-500" : "border-[#fef3c6]"} focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]`} />
              {errors.legalName && <p className="text-red-500 text-sm mt-1">{errors.legalName}</p>}

              <input name="companyType" placeholder="Tipo de empresa (companyType)" value={companyType} onChange={(e) => { setCompanyType(e.target.value); setErrors((s) => ({ ...s, companyType: "" })); }} required className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] border ${errors.companyType ? "border-red-500" : "border-[#fef3c6]"} focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]`} />
              {errors.companyType && <p className="text-red-500 text-sm mt-1">{errors.companyType}</p>}

              <input name="taxId" placeholder="NIT / taxId" value={taxId} onChange={(e) => { setTaxId(e.target.value); setErrors((s) => ({ ...s, taxId: "" })); }} required className={`w-full px-4 py-2 rounded-lg bg-[#fffbeb] border ${errors.taxId ? "border-red-500" : "border-[#fef3c6]"} focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]`} />
              {errors.taxId && <p className="text-red-500 text-sm mt-1">{errors.taxId}</p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#7b3306]">Revisa tus datos</h3>
                <div className="text-xs text-[#6b4a12]">Los datos se pueden editar después desde el panel</div>
              </div>

              <div className="bg-[#fffbeb] p-3 rounded-lg border border-[#fef3c6] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm"><strong>Nombre:</strong> {firstName} {lastName}</p>
                    <p className="text-sm"><strong>Email:</strong> {email}</p>
                  </div>
                  <SecondaryButton type="button" onClick={() => setStep(0)}>Editar</SecondaryButton>
                </div>

                <hr className="my-2 border-dashed border-[#fef3c6]" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm"><strong>Empresa:</strong> {tradeName}</p>
                    <p className="text-sm"><strong>Razón social:</strong> {legalName}</p>
                    <p className="text-sm"><strong>Tipo:</strong> {companyType}</p>
                    <p className="text-sm"><strong>NIT:</strong> {taxId}</p>
                  </div>
                  <SecondaryButton type="button" onClick={() => setStep(2)}>Editar</SecondaryButton>
                </div>
              </div>

              {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {step > 0 && (
                <SecondaryButton type="button" onClick={goBack}>Atrás</SecondaryButton>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < steps.length - 1 ? (
                <PrimaryButton type="button" onClick={goNext}>Siguiente</PrimaryButton>
              ) : (
                <PrimaryButton type="submit" disabled={isLoading}>
                  {isLoading ? "Registrando…" : "Enviar registro"}
                </PrimaryButton>
              )}
            </div>
            
          </div>
          {/* Enlace para iniciar sesión */}
<div className="w-full mt-3 text-center">
  <span className="text-sm text-[#973c00] mr-2">¿Ya tienes cuenta?</span>
  <button
    type="button"
    onClick={() => navigate("/auth/login")}
    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-transparent border border-[#fef3c6] text-[#7b3306] hover:bg-[#fff7e6] font-medium transition"
  >
    Inicia sesión
  </button>
</div>
        </form>
      </div>
    </div>
  );
}