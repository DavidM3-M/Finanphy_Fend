import { useState, useEffect } from "react";
import axios from "axios"; 
import "./App.css";

//  Configuración global de Axios
const api = axios.create({
  baseURL: "http://127.0.0.1:8000", 
  headers: { "Content-Type": "application/json" },
});

/* ===============================
    MODAL REUTILIZABLE
   =============================== */
function Modal({ isOpen, title, message, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-buttons">
          {onConfirm ? (
            <>
              <button className="btn btn-danger" onClick={onConfirm}>
                Confirmar
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===============================
    SIDEBAR
   =============================== */
function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    { id: "productos", label: "Productos" },
    { id: "clientes", label: "Clientes" },
  ];

  return (
    <div className="sidebar">
      <div className="logo-section">
        <div className="logo-icon"></div>
        <button className="toggle-btn">⚪</button>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => setActivePage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="user-section">
        <div className="user-avatar">U</div>
        <button className="logout-btn" onClick={() => alert("Logout")}>
          ⚪
        </button>
      </div>
    </div>
  );
}

/* ===============================
    PRODUCTOS (Agregar + Listar + Eliminar)
   =============================== */
function Products({ setModal }) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
  });
  const [products, setProducts] = useState([]);

  // Cargar lista de productos
  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Agregar producto
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/products", {
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock),
      });
      setModal({
        open: true,
        title: "Éxito",
        message: "✅ Producto agregado",
      });
      setFormData({ name: "", sku: "", price: "", cost: "", stock: "" });
      fetchProducts();
    } catch (error) {
      setModal({
        open: true,
        title: "Error",
        message: " No se pudo agregar",
      });
    }
  };

  // Eliminar producto
  const confirmDelete = (id) => {
    setModal({
      open: true,
      title: "Confirmar",
      message: " ¿Seguro que deseas eliminar este producto?",
      confirm: () => handleDelete(id),
    });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter((p) => p.id !== id));
      setModal({
        open: true,
        title: "Éxito",
        message: "Producto eliminado",
      });
    } catch (error) {
      setModal({
        open: true,
        title: "Error",
        message: " No se pudo eliminar",
      });
    }
  };

  return (
    <div className="page active">
      <h1 className="page-title">Productos</h1>

      {/* Formulario para agregar */}
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              type="text"
              name="name"
              placeholder="Nombre"
              className="form-input"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <input
              type="text"
              name="sku"
              placeholder="SKU"
              className="form-input"
              value={formData.sku}
              onChange={(e) =>
                setFormData({ ...formData, sku: e.target.value })
              }
              required
            />
          </div>
          <div className="form-row">
            <input
              type="number"
              name="price"
              placeholder="Precio"
              className="form-input"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              required
            />
            <input
              type="number"
              name="cost"
              placeholder="Costo"
              className="form-input"
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: e.target.value })
              }
              required
            />
            <input
              type="number"
              name="stock"
              placeholder="Stock"
              className="form-input"
              value={formData.stock}
              onChange={(e) =>
                setFormData({ ...formData, stock: e.target.value })
              }
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Agregar
          </button>
        </form>
      </div>

      {/* Tabla de productos */}
      <div className="table-card">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.price}</td>
                <td>{p.stock}</td>
                <td>
                  <button
                    className="eliminate-btn"
                    onClick={() => confirmDelete(p.id)}
                  >
                    Eliminar ✖
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===============================
    CLIENTES (Listar + Registrar)
   =============================== */
function Clients({ setModal }) {
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const fetchClients = async () => {
    try {
      const res = await api.get("/api/users");
      setClients(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleChange = (e) =>
    setNewClient({ ...newClient, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", newClient);
      setModal({
        open: true,
        title: "Éxito",
        message: " Cliente registrado",
      });
      fetchClients();
      setNewClient({ firstName: "", lastName: "", email: "", password: "" });
    } catch (error) {
      setModal({
        open: true,
        title: "Error",
        message: " No se pudo registrar",
      });
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Clientes</h1>

      {/* Formulario registrar cliente */}
      <div className="form-card">
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <input
              type="text"
              name="firstName"
              placeholder="Nombre"
              className="form-input"
              value={newClient.firstName}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Apellido"
              className="form-input"
              value={newClient.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="form-input"
              value={newClient.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              className="form-input"
              value={newClient.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Registrar
          </button>
        </form>
      </div>

      {/* Lista de clientes */}
      <div className="clients-grid">
        {clients.map((c) => (
          <div key={c.id} className="client-card">
            <div className="client-header">
              <div className="client-name">
                {c.firstName} {c.lastName}
              </div>
              <div className="client-id">{c.email}</div>
            </div>
            <div className="client-info">📧 {c.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===============================
    APP PRINCIPAL
   =============================== */
export default function App() {
  const [activePage, setActivePage] = useState("productos");

  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    confirm: null,
  });

  const closeModal = () => setModal({ open: false, title: "", message: "" });

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content">
        {activePage === "productos" && <Products setModal={setModal} />}
        {activePage === "clientes" && <Clients setModal={setModal} />}
      </main>
      <Modal
        isOpen={modal.open}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
        onConfirm={modal.confirm}
      />
    </div>
  );
}
