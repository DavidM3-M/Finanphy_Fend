import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; 

// Configuración Axios
const api = axios.create({
  baseURL: "http://127.0.0.1:8000", 
  headers: { "Content-Type": "application/json" },
});

/* ===============================
   COMPONENTE: MODAL GENÉRICO
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
    { id: "agregar", label: "Agregar" },
    { id: "eliminar", label: "Eliminar" },
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
   AGREGAR PRODUCTO
   =============================== */
function Products({ setModal }) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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
        message: "Producto agregado con éxito",
      });
      setFormData({ name: "", sku: "", price: "", cost: "", stock: "" });
    } catch (error) {
      console.error(error);
      setModal({
        open: true,
        title: "Error",
        message: "No se pudo agregar el producto",
      });
    }
  };

  return (
    <div id="page-agregar" className="page active">
      <h1 className="page-title">Agregar producto</h1>
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                name="sku"
                className="form-input"
                value={formData.sku}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Precio</label>
              <input
                type="number"
                name="price"
                className="form-input"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Costo</label>
              <input
                type="number"
                name="cost"
                className="form-input"
                value={formData.cost}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stock</label>
              <input
                type="number"
                name="stock"
                className="form-input"
                value={formData.stock}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn btn-primary">
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===============================
   ELIMINAR PRODUCTO
   =============================== */
function DeleteProduct({ setModal }) {
  const [products, setProducts] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setModal({
      open: true,
      title: "Confirmar",
      message: "¿Seguro que quieres eliminar este producto?",
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
      console.error(error);
      setModal({
        open: true,
        title: "Error",
        message: "No se pudo eliminar el producto",
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div id="page-eliminar" className="page">
      <h1 className="page-title">Eliminar</h1>
      <div className="table-card">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.sku}</td>
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
   CLIENTES
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

  const handleChange = (e) =>
    setNewClient({ ...newClient, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", newClient);
      setModal({
        open: true,
        title: "Éxito",
        message: "Cliente registrado con éxito",
      });
      fetchClients();
      setNewClient({ firstName: "", lastName: "", email: "", password: "" });
    } catch (error) {
      console.error(error);
      setModal({
        open: true,
        title: "Error",
        message: "No se pudo registrar el cliente",
      });
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div id="page-clientes" className="page">
      <div className="clients-header">
        <h1 className="page-title">Clientes</h1>
      </div>

      <div className="form-card">
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                name="firstName"
                className="form-input"
                value={newClient.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido</label>
              <input
                type="text"
                name="lastName"
                className="form-input"
                value={newClient.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={newClient.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={newClient.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn btn-primary">
              Registrar
            </button>
          </div>
        </form>
      </div>

      <div className="clients-grid">
        {clients.map((c) => (
          <div key={c.id} className="client-card">
            <div className="client-header">
              <div>
                <div className="client-name">
                  {c.firstName} {c.lastName}
                </div>
                <div className="client-id">{c.email}</div>
              </div>
            </div>
            <div className="client-info">
              <div>📧 {c.email}</div>
            </div>
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
  const [activePage, setActivePage] = useState("agregar");

  // Estado global de modales
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
        {activePage === "agregar" && <Products setModal={setModal} />}
        {activePage === "eliminar" && <DeleteProduct setModal={setModal} />}
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
