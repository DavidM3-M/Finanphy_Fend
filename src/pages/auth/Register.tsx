import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [submitError, setSubmitError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "email") {
      setErrors({ ...errors, email: validateEmail(value) ? "" : "Correo inválido" });
    }

    if (name === "password") {
      setErrors({
        ...errors,
        password: validatePassword(value)
          ? ""
          : "Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (errors.email || errors.password) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(data.message || "Error al registrar");

      await login(data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center">Registro</h2>

      <input
        type="text"
        name="firstName"
        placeholder="Nombre"
        value={form.firstName}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded"
      />

      <input
        type="text"
        name="lastName"
        placeholder="Apellido"
        value={form.lastName}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 border rounded"
      />

      <input
        type="email"
        name="email"
        placeholder="Correo electrónico"
        value={form.email}
        onChange={handleChange}
        required
        className={`w-full px-4 py-2 border rounded ${errors.email ? "border-red-500" : ""}`}
      />
      {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={handleChange}
        required
        className={`w-full px-4 py-2 border rounded ${errors.password ? "border-red-500" : ""}`}
      />
      {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

      {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Registrarse
      </button>
    </form>
  );
}

export default Register;