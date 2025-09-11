import React, { useEffect, useState, useMemo } from "react";
import {
  createIncome,
  createExpense,
  getIncomes,
  getExpenses,
} from "../services/api";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingDown,
  TrendingUp,
  X,
  Info,
  Plus,
  Minus,
  DollarSign,
  Calendar,
  Building,
  Tag,
  FileText,
  BarChart3,
  RefreshCw
} from "lucide-react";

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
});

const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Clasificacion = () => {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(null); // income | expense | null
  const [selectedTx, setSelectedTx] = useState(null); // para modal de detalles

  const [incomeForm, setIncomeForm] = useState({
    amount: "",
    category: "",
    supplier: "",
    exitDate: "",
    dueDate: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "",
    supplier: "",
    dueDate: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [incRes, expRes] = await Promise.all([getIncomes(), getExpenses()]);
      const incomes = (Array.isArray(incRes.data)
        ? incRes.data
        : incRes.data?.data || []
      ).map((i, idx) => ({
        id: i.id ?? `inc-${idx}`,
        ...i,
        fecha: i.exitDate || i.dueDate,
        descripcion: i.supplier || i.category,
        monto: Number(i.amount) || 0,
        tipo: "ingreso",
      }));
      const expenses = (Array.isArray(expRes.data)
        ? expRes.data
        : expRes.data?.data || []
      ).map((e, idx) => ({
        id: e.id ?? `exp-${idx}`,
        ...e,
        fecha: e.dueDate,
        descripcion: e.supplier || e.category,
        monto: Number(e.amount) || 0,
        tipo: "gasto",
      }));
      setDatos([...incomes, ...expenses]);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error al consultar ingresos/gastos"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Ordenar datos por fecha para línea de tiempo
  const datosOrdenados = useMemo(() => {
  return [...datos]
    .filter((d) => d.fecha)
    .map((d) => ({
      ...d,
      fechaObj: new Date(d.fecha),
    }))
    .sort((a, b) => b.fechaObj - a.fechaObj); // descnedente
}, [datos]);



  const ingresos = datos.filter((d) => d.tipo === "ingreso");
  const gastos = datos.filter((d) => d.tipo === "gasto");

  const totalIngresos = ingresos.reduce((acc, d) => acc + d.monto, 0);
  const totalGastos = gastos.reduce((acc, d) => acc + d.monto, 0);
  const balance = totalIngresos - totalGastos;

  // Crear ingreso/gasto
  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    try {
      await createIncome(incomeForm);
      setIncomeForm({ amount: "", category: "", supplier: "", exitDate: "", dueDate: "" });
      setShowForm(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error creando ingreso");
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await createExpense(expenseForm);
      setExpenseForm({ amount: "", category: "", supplier: "", dueDate: "" });
      setShowForm(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error creando gasto");
    }
  };

  // Abrir/cerrar modal de detalles
  const openDetails = (tx) => setSelectedTx(tx);
  const closeDetails = () => setSelectedTx(null);

  // Datos JSON estilo solicitado
  const buildJsonPreview = (tx) => ({
    amount: Number(tx.amount ?? tx.monto ?? 0),
    category: tx.category ?? tx.descripcion ?? "",
    supplier: tx.supplier ?? "",
    exitDate: tx.exitDate ?? "",
    dueDate: tx.dueDate ?? "",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Header Profesional */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Clasificación Financiera</h1>
              <p className="text-slate-300 text-lg mt-1">
                Análisis detallado de ingresos y gastos empresariales
              </p>
            </div>
          </div>

          {/* Métricas del Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Total Ingresos</p>
                  <p className="text-2xl font-bold mt-1 text-green-300">
                    {formatoCOP.format(totalIngresos)}
                  </p>
                </div>
                <ArrowUpCircle className="w-8 h-8 text-green-300" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Total Gastos</p>
                  <p className="text-2xl font-bold mt-1 text-red-300">
                    {formatoCOP.format(totalGastos)}
                  </p>
                </div>
                <ArrowDownCircle className="w-8 h-8 text-red-300" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Balance</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    balance >= 0 ? "text-blue-300" : "text-orange-300"
                  }`}>
                    {formatoCOP.format(balance)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-300" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Transacciones</p>
                  <p className="text-2xl font-bold mt-1">{datos.length}</p>
                </div>
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Controles y Botones */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Gestión de Transacciones</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white 
                       rounded-xl hover:bg-slate-700 transition-all duration-200 
                       shadow-lg hover:shadow-xl disabled:opacity-50 font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowForm(showForm === "income" ? null : "income")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r 
                       from-green-600 to-green-700 text-white rounded-xl 
                       hover:from-green-700 hover:to-green-800 transition-all 
                       duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              {showForm === "income" ? "Cancelar Ingreso" : "Registrar Ingreso"}
            </button>
            
            <button
              onClick={() => setShowForm(showForm === "expense" ? null : "expense")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r 
                       from-red-600 to-red-700 text-white rounded-xl 
                       hover:from-red-700 hover:to-red-800 transition-all 
                       duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <Minus className="w-5 h-5" />
              {showForm === "expense" ? "Cancelar Gasto" : "Registrar Gasto"}
            </button>
          </div>
        </div>

        {/* Formularios */}
        {showForm === "income" && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUpCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-green-700">Nuevo Ingreso</h3>
            </div>
            
            <form onSubmit={handleIncomeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Monto (COP)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-green-500 focus:border-transparent 
                             transition-all duration-200"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Categoría
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ventas, Servicios, etc."
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-green-500 focus:border-transparent 
                             transition-all duration-200"
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Proveedor/Cliente
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-green-500 focus:border-transparent 
                             transition-all duration-200"
                    value={incomeForm.supplier}
                    onChange={(e) => setIncomeForm({ ...incomeForm, supplier: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fecha de Salida
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-green-500 focus:border-transparent 
                             transition-all duration-200"
                    value={incomeForm.exitDate}
                    onChange={(e) => setIncomeForm({ ...incomeForm, exitDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fecha de Vencimiento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-green-500 focus:border-transparent 
                             transition-all duration-200"
                    value={incomeForm.dueDate}
                    onChange={(e) => setIncomeForm({ ...incomeForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(null)}
                  className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 
                           transition-colors font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 
                           to-green-700 text-white hover:from-green-700 hover:to-green-800 
                           transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  Guardar Ingreso
                </button>
              </div>
            </form>
          </div>
        )}

        {showForm === "expense" && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowDownCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-red-700">Nuevo Gasto</h3>
            </div>
            
            <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Monto (COP)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-red-500 focus:border-transparent 
                             transition-all duration-200"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Categoría
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Suministros, Servicios, etc."
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-red-500 focus:border-transparent 
                             transition-all duration-200"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Proveedor
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nombre del proveedor"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-red-500 focus:border-transparent 
                             transition-all duration-200"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fecha de Vencimiento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-red-500 focus:border-transparent 
                             transition-all duration-200"
                    value={expenseForm.dueDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(null)}
                  className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 
                           transition-colors font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 
                           to-red-700 text-white hover:from-red-700 hover:to-red-800 
                           transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline de Transacciones */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Cronología de Transacciones</h2>

          {datosOrdenados.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">No hay transacciones</h3>
              <p>Comienza registrando tu primer ingreso o gasto.</p>
            </div>
          ) : (
            <div className="relative flex flex-col">
              {/* Línea central */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 transform -translate-x-1/2" />

              {datosOrdenados.map((d, index) => {
                const rightSide = d.tipo === "ingreso";
                return (
                  <div
                    key={d.id}
                    className={`relative mb-12 flex w-full ${rightSide ? "justify-end" : "justify-start"}`}
                  >
                    {/* Conector */}
                    <div
                      className={`absolute top-8 h-0.5 w-16 ${rightSide ? "left-1/2" : "right-1/2"}
                        ${rightSide ? "bg-green-200" : "bg-red-200"}`}
                    />

                    {/* Círculo central */}
                    <div
                      className={`absolute top-7 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-4 border-white shadow-lg z-10
                        ${rightSide ? "bg-green-500" : "bg-red-500"}`}
                    >
                      {rightSide ? (
                        <ArrowUpCircle className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {/* Tarjeta */}
                    <div className={`w-96 ${rightSide ? "ml-16" : "mr-16"}`}>
                      <button
                        onClick={() => openDetails(d)}
                        className={`w-full text-left p-6 rounded-2xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-opacity-50
                          ${rightSide 
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300 focus:ring-green-200" 
                            : "bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:border-red-300 focus:ring-red-200"}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-xs font-bold uppercase px-3 py-1 rounded-full
                              ${rightSide 
                                ? "bg-green-100 text-green-700" 
                                : "bg-red-100 text-red-700"}`}
                          >
                            {d.tipo}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {formatearFecha(d.fecha)}
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 text-lg mb-2">{d.descripcion}</h3>
                        
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-2xl font-bold
                              ${rightSide ? "text-green-600" : "text-red-600"}`}
                          >
                            {rightSide ? "+" : "-"} {formatoCOP.format(d.monto)}
                          </p>
                          
                          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <Info className="w-4 h-4" />
                            Ver detalles
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            {/* Header del Modal */}
            <div className={`px-8 py-6 bg-gradient-to-r ${
              selectedTx.tipo === "ingreso" 
                ? "from-green-50 to-emerald-50 border-b border-green-200" 
                : "from-red-50 to-rose-50 border-b border-red-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedTx.tipo === "ingreso" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {selectedTx.tipo === "ingreso" ? (
                      <ArrowUpCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Detalles de {selectedTx.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                  </h3>
                </div>
                <button
                  onClick={closeDetails}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="px-8 py-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Fecha
                    </label>
                    <p className="text-lg font-medium text-slate-900">
                      {formatearFecha(selectedTx.fecha)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Tipo
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTx.tipo === "ingreso" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {selectedTx.tipo.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Monto
                    </label>
                    <p className={`text-2xl font-bold ${
                      selectedTx.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                    }`}>
                      {formatoCOP.format(Number(selectedTx.amount ?? selectedTx.monto) || 0)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Descripción
                    </label>
                    <p className="text-lg font-medium text-slate-900">
                      {selectedTx.descripcion || "Sin descripción"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <p className="text-base text-slate-700">
                    {selectedTx.category || "Sin categoría"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Proveedor/Cliente
                  </label>
                  <p className="text-base text-slate-700">
                    {selectedTx.supplier || "No especificado"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Fecha de Salida
                  </label>
                  <p className="text-base text-slate-700">
                    {selectedTx.exitDate ? formatearFecha(selectedTx.exitDate) : "No especificada"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Fecha de Vencimiento
                  </label>
                  <p className="text-base text-slate-700">
                    {selectedTx.dueDate ? formatearFecha(selectedTx.dueDate) : "No especificada"}
                  </p>
                </div>
              </div>

              {/* JSON Preview */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Datos en Formato JSON
                </label>
                <pre className="text-sm text-slate-700 overflow-x-auto bg-white rounded-lg p-4 border">
{JSON.stringify(buildJsonPreview(selectedTx), null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={closeDetails}
                className="px-6 py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-800 
                         transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clasificacion;