// src/components/Sidebar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  ClipboardList,
  LucideIcon,
} from "lucide-react";
import { useProducts } from "../context/ProductsContext";
import type { Company } from "../types";

const API_BASE =
  (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || "").replace(/\/$/, "") ||
  "http://localhost:4000";

type MenuItem = { path: string; label: string; icon: LucideIcon; description?: string };
const menuItems: MenuItem[] = [
  { path: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Vista general" },
  { path: "/app/inventario", label: "Inventario", icon: Package, description: "Control de stock" },
  { path: "/app/clasificacion", label: "Clasificación", icon: TrendingUp, description: "Ingresos y gastos" },
  { path: "/app/reportes", label: "Reportes", icon: BarChart3, description: "Análisis" },
  { path: "/app/orders", label: "Órdenes", icon: ClipboardList, description: "Pedidos" },
];

export default function Sidebar(): React.ReactElement {
  const { pathname } = useLocation();
  const qrRef = useRef<HTMLDivElement | null>(null);
  const { companyId, company } = useProducts() as { companyId?: string; company?: Company | null };

  const [showQR, setShowQR] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  const [localCompany, setLocalCompany] = useState<Company | null>(company ?? null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const companyLoading = !company && !companyId;
  const url = `https://finanphy.vercel.app/catalogo/${companyId || ""}`;

  async function fetchText(input: RequestInfo, init?: RequestInit) {
    const res = await fetch(input, init);
    const text = await res.text().catch(() => "");
    return { res, text };
  }

  useEffect(() => { if (company) setLocalCompany(company); }, [company]);

  useEffect(() => {
    let mounted = true;
    if (!localCompany) {
      setLoadingCompany(true);
      setCompanyError(null);
      (async () => {
        try {
          const endpoint = `${API_BASE}/companies/my`;
          const token = localStorage.getItem("token") || "";
          const { res, text } = await fetchText(endpoint, {
            method: "GET",
            headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            credentials: "include",
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${(text || "").slice(0, 400)}`);

          let parsed: any;
          try { parsed = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`Invalid JSON: ${String(e)}`); }
          const p = (parsed.data ?? parsed) as any;

          const normalized: Company = {
            id: (p.id ?? p._id ?? p.companyId ?? "") as string,
            userId: (p.userId ?? p.user_id ?? p.ownerId ?? "") as string,
            tradeName: p.tradeName ?? p.name ?? p.trade_name ?? "",
            legalName: p.legalName ?? p.legal_name ?? p.razon_social ?? "",
            companyType: p.companyType ?? p.type ?? "",
            taxId: p.taxId ?? p.nit ?? p.tax_id ?? "",
            taxRegistry: p.taxRegistry ?? p.tax_registry ?? p.tax_registry_number ?? "",
            businessPurpose: p.businessPurpose ?? p.business_purpose ?? p.businessPurposeDescription ?? "",
            companyEmail: p.companyEmail ?? p.email ?? "",
            companyPhone: p.companyPhone ?? p.phone ?? p.telefono ?? "",
            fiscalAddress: p.fiscalAddress ?? p.address ?? p.direccion ?? "",
            city: p.city ?? p.city_name ?? "",
            state: p.state ?? p.state_name ?? "",
            representativeName: p.representativeName ?? p.representative_name ?? p.representante ?? "",
            representativeDocument: p.representativeDocument ?? p.representative_document ?? p.representante_document ?? "",
            incorporationDate: p.incorporationDate ?? p.incorporation_date ?? p.constitution_date ?? "",
          } as Company;

          if (!mounted) return;
          setLocalCompany(normalized);
        } catch (err: any) {
          if (!mounted) return;
          setCompanyError(String(err?.message ?? err));
        } finally {
          if (mounted) setLoadingCompany(false);
        }
      })();
    }
    return () => { mounted = false; };
  }, [localCompany]);

  function openCompanyModal() {
    if (!companyId && !localCompany) return;
    setShowCompanyModal(true);
  }
  function closeCompanyModal() { setShowCompanyModal(false); }

  function downloadQR() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    img.onload = () => { canvas.width = img.width; canvas.height = img.height; ctx?.drawImage(img, 0, 0); const png = canvas.toDataURL("image/png"); const a = document.createElement("a"); a.href = png; a.download = `catalogo_${companyId||"unknown"}.png`; a.click(); };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  return (
    <>
      <aside className="fixed top-6 left-6 z-50 w-72 h-[calc(100vh-3rem)] bg-white border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b bg-[#fffbeb] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ffb900] rounded-lg"><LayoutDashboard className="w-7 h-7 text-white" /></div>
            <div>
              <h2 className="text-[#973c00] text-2xl font-bold">Finanphy</h2>
              <p className="text-[#bb4d00] text-xs">Sistema</p>
            </div>
          </div>
          <button onClick={() => setShowQR(true)} disabled={companyLoading} className={`p-2 rounded-full ${companyLoading ? "bg-gray-300" : "bg-[#ffb900] text-white"}`}>QR</button>
        </div>

        <div className="px-6 py-4 border-b bg-[#fffbeb]">
          <button onClick={openCompanyModal} className="w-full text-sm text-[#973c00] font-semibold bg-[#fee685] px-4 py-2 rounded">Ver / Editar empresa</button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <h3 className="text-xs uppercase text-[#973c00] mb-3">Menú</h3>
          <ul className="space-y-2">
            {menuItems.map((m) => {
              const isActive = pathname === m.path || pathname.startsWith(m.path + "/");
              const Icon = m.icon;
              return (
                <li key={m.path}>
                  <Link to={m.path} className={`flex items-center gap-3 px-3 py-2 rounded ${isActive ? "bg-[#fee685]" : "hover:bg-[#fffbeb]"}`}>
                    <div className={`p-2 rounded ${isActive ? "bg-[#ffb900]" : "bg-[#fef3c6]"}`}><Icon className="w-5 h-5 text-white" /></div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{m.label}</div>
                      {m.description && <div className="text-xs text-[#bb4d00]">{m.description}</div>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-6 py-4 border-t bg-[#fffbeb]">
          <div className="text-xs text-[#973c00] text-center">© {new Date().getFullYear()} Finanphy</div>
        </div>
      </aside>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-[#973c00] mb-4">Catálogo</h3>
            {companyLoading ? <div className="py-8 text-gray-500">Cargando…</div> : (
              <>
                <div ref={qrRef} className="flex justify-center"><QRCode value={url} size={180} /></div>
                <p className="mt-2 text-xs break-words">{url}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={downloadQR} className="px-3 py-1 bg-[#ffb900] text-white rounded">Descargar</button>
                  <button onClick={() => setShowQR(false)} className="px-3 py-1 bg-gray-100 rounded">Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-[#973c00]">Editar empresa</h3>
              <button onClick={closeCompanyModal} className="text-gray-500">✕</button>
            </div>

            <div className="overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
              {loadingCompany ? (
                <div className="py-8 text-center text-gray-500">Cargando…</div>
              ) : companyError ? (
                <div className="text-sm text-red-600"><strong>Error:</strong> {companyError}</div>
              ) : !localCompany ? (
                <div className="text-sm text-gray-500">Empresa no disponible</div>
              ) : (
                <CompanyEditForm
                  initial={localCompany}
                  onCancel={closeCompanyModal}
                  onSaved={(c) => { setLocalCompany(c); closeCompanyModal(); }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= CompanyEditForm: selector de fecha y PATCH a /companies/:id ================= */

function CompanyEditForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Company;
  onCancel: () => void;
  onSaved: (c: Company) => void;
}): React.ReactElement {
  const [form, setForm] = useState<Partial<Company>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { setForm(initial); setError(null); setSuccess(null); }, [initial]);

  function setField<K extends keyof Company>(k: K, v: any) { setForm(s => ({ ...s, [k]: v })); }

  function validate(): string | null {
    if (!form.tradeName || String(form.tradeName).trim().length < 2) return "Nombre inválido";
    if (!form.legalName || String(form.legalName).trim().length < 2) return "Razón social inválida";
    if (form.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.companyEmail))) return "Email inválido";
    return null;
  }

  function normalizeDate(input?: string | null) {
    if (!input) return "";
    const d = new Date(input);
    if (isNaN(d.getTime())) return String(input);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function handleSave() {
    const v = validate(); if (v) { setError(v); return; }
    setError(null); setSaving(true); setSuccess(null);
    try {
      const token = localStorage.getItem("token") || "";
      // Campos a comparar / enviar
      const keys: (keyof Company)[] = [
        "tradeName","legalName","companyType","taxId","taxRegistry",
        "businessPurpose","companyEmail","companyPhone","fiscalAddress",
        "city","state","representativeName","representativeDocument","incorporationDate"
      ];

      const dto: Partial<Company> = {};
      for (const k of keys) {
        let newVal = (form as any)[k];
        const initVal = (initial as any)[k];
        if (k === "incorporationDate") newVal = normalizeDate(newVal as string | undefined);
        const a = newVal ?? "";
        const b = initVal ?? "";
        if (String(a) !== String(b)) dto[k] = newVal as any;
      }

      if (!Object.keys(dto).length) {
        setError("No hay cambios para guardar");
        setSaving(false);
        return;
      }

      const id = initial?.id ?? (form as any).id;
      if (!id) throw new Error("ID de compañía no disponible");

      const url = `${API_BASE.replace(/\/$/, "")}/companies/${encodeURIComponent(id)}`;
      console.debug("PATCH URL:", url, "DTO:", dto);

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(dto),
      });

      const text = await res.text().catch(() => "");
      console.debug("PATCH response status:", res.status, "body:", text);

      if (!res.ok) {
        if (res.status === 400) throw new Error(text || "Bad request");
        if (res.status === 403) throw new Error(text || "Forbidden");
        if (res.status === 404) throw new Error(text || "Not Found - verifica la URL y el id");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = text ? JSON.parse(text) : {};
      const p = (json.data ?? json) as any;

      const normalized: Company = {
        id: (p.id ?? p._id ?? id) as string,
        userId: (p.userId ?? p.user_id ?? form.userId ?? initial.userId ?? "") as string,
        tradeName: p.tradeName ?? p.name ?? form.tradeName ?? initial.tradeName ?? "",
        legalName: p.legalName ?? p.legal_name ?? form.legalName ?? initial.legalName ?? "",
        companyType: p.companyType ?? p.type ?? form.companyType ?? initial.companyType ?? "",
        taxId: p.taxId ?? p.nit ?? form.taxId ?? initial.taxId ?? "",
        taxRegistry: p.taxRegistry ?? p.tax_registry ?? form.taxRegistry ?? initial.taxRegistry ?? "",
        businessPurpose: p.businessPurpose ?? p.business_purpose ?? form.businessPurpose ?? initial.businessPurpose ?? "",
        companyEmail: p.companyEmail ?? p.email ?? form.companyEmail ?? initial.companyEmail ?? "",
        companyPhone: p.companyPhone ?? p.phone ?? form.companyPhone ?? initial.companyPhone ?? "",
        fiscalAddress: p.fiscalAddress ?? p.address ?? form.fiscalAddress ?? initial.fiscalAddress ?? "",
        city: p.city ?? form.city ?? initial.city ?? "",
        state: p.state ?? form.state ?? initial.state ?? "",
        representativeName: p.representativeName ?? p.representative_name ?? form.representativeName ?? initial.representativeName ?? "",
        representativeDocument: p.representativeDocument ?? p.representative_document ?? form.representativeDocument ?? initial.representativeDocument ?? "",
        incorporationDate: p.incorporationDate ?? p.incorporation_date ?? dto.incorporationDate ?? form.incorporationDate ?? initial.incorporationDate ?? "",
      } as Company;

      setSuccess("Guardado");
      onSaved(normalized);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 2000);
    }
  }

return (
  <div className="space-y-3">
    <div className="grid grid-cols-1 gap-2">
      <label className="text-xs text-gray-600">Nombre público</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.tradeName ?? ""}
        onChange={e => setField("tradeName", e.target.value)}
      />

      <label className="text-xs text-gray-600">Razón social</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.legalName ?? ""}
        onChange={e => setField("legalName", e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Tipo</label>
          <input
            className="w-full px-2 py-2 border rounded"
            value={form.companyType ?? ""}
            onChange={e => setField("companyType", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">NIT</label>
          <input
            className="w-full px-2 py-2 border rounded"
            value={form.taxId ?? ""}
            inputMode="numeric"
            pattern="\d*"
            onBeforeInput={(e) => {
              const ne = e.nativeEvent;
              const data = (ne && 'data' in ne) ? (ne).data ?? '' : '';
              if (data && /\D/.test(data)) {
                try { (ne as any).preventDefault(); } catch {}
                e.preventDefault();
              }
            }}
            onKeyDown={(e) => {
              const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter","Home","End"];
              if (allowed.includes(e.key)) return;
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text") || "";
              if (!/^\d+$/.test(text)) {
                e.preventDefault();
                const digits = text.replace(/\D/g, "");
                if (!digits) return;
                const el = e.currentTarget;
                const start = el.selectionStart ?? 0;
                const end = el.selectionEnd ?? 0;
                const newValue = el.value.slice(0, start) + digits + el.value.slice(end);
                setField("taxId", newValue.replace(/\D/g, ""));
                requestAnimationFrame(() => {
                  const pos = start + digits.length;
                  el.setSelectionRange(pos, pos);
                });
              }
            }}
            onChange={(e) => setField("taxId", e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <label className="text-xs text-gray-600">Tax Registry</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.taxRegistry ?? ""}
        inputMode="numeric"
        pattern="\d*"
        onBeforeInput={(e) => {
          const ne = e.nativeEvent;
          const data = (ne && 'data' in ne) ? (ne).data ?? '' : '';
          if (data && /\D/.test(data)) {
            try { (ne as any).preventDefault(); } catch {}
            e.preventDefault();
          }
        }}
        onKeyDown={(e) => {
          const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter","Home","End"];
          if (allowed.includes(e.key)) return;
          if (e.ctrlKey || e.metaKey) return;
          if (!/^[0-9]$/.test(e.key)) e.preventDefault();
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text") || "";
          if (!/^\d+$/.test(text)) {
            e.preventDefault();
            const digits = text.replace(/\D/g, "");
            if (!digits) return;
            const el = e.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const newValue = el.value.slice(0, start) + digits + el.value.slice(end);
            setField("taxRegistry", newValue.replace(/\D/g, ""));
            requestAnimationFrame(() => {
              const pos = start + digits.length;
              el.setSelectionRange(pos, pos);
            });
          }
        }}
        onChange={(e) => setField("taxRegistry", e.target.value.replace(/\D/g, ""))}
      />

      <label className="text-xs text-gray-600">Objeto social / Business purpose</label>
      <textarea
        className="w-full px-2 py-2 border rounded"
        value={form.businessPurpose ?? ""}
        onChange={e => setField("businessPurpose", e.target.value)}
        rows={3}
      />

      <label className="text-xs text-gray-600">Email</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.companyEmail ?? ""}
        onChange={e => setField("companyEmail", e.target.value)}
      />

      <label className="text-xs text-gray-600">Teléfono</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.companyPhone ?? ""}
        onChange={e => setField("companyPhone", e.target.value)}
      />

      <label className="text-xs text-gray-600">Dirección fiscal</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.fiscalAddress ?? ""}
        onChange={e => setField("fiscalAddress", e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Ciudad</label>
          <input
            className="w-full px-2 py-2 border rounded"
            value={form.city ?? ""}
            onChange={e => setField("city", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Departamento</label>
          <input
            className="w-full px-2 py-2 border rounded"
            value={form.state ?? ""}
            onChange={e => setField("state", e.target.value)}
          />
        </div>
      </div>

      <label className="text-xs text-gray-600">Representante legal</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.representativeName ?? ""}
        onChange={e => setField("representativeName", e.target.value)}
      />

      <label className="text-xs text-gray-600">Documento representante</label>
      <input
        className="w-full px-2 py-2 border rounded"
        value={form.representativeDocument ?? ""}
        inputMode="numeric"
        pattern="\d*"
        onBeforeInput={(e) => {
          const ne = e.nativeEvent;
          const data = (ne && 'data' in ne) ? (ne).data ?? '' : '';
          if (data && /\D/.test(data)) {
            try { (ne as any).preventDefault(); } catch {}
            e.preventDefault();
          }
        }}
        onKeyDown={(e) => {
          const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter","Home","End"];
          if (allowed.includes(e.key)) return;
          if (e.ctrlKey || e.metaKey) return;
          if (!/^[0-9]$/.test(e.key)) e.preventDefault();
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text") || "";
          if (!/^\d+$/.test(text)) {
            e.preventDefault();
            const digits = text.replace(/\D/g, "");
            if (!digits) return;
            const el = e.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const newValue = el.value.slice(0, start) + digits + el.value.slice(end);
            setField("representativeDocument", newValue.replace(/\D/g, ""));
            requestAnimationFrame(() => {
              const pos = start + digits.length;
              el.setSelectionRange(pos, pos);
            });
          }
        }}
        onChange={(e) => setField("representativeDocument", e.target.value.replace(/\D/g, ""))}
      />

      <label className="text-xs text-gray-600">Fecha de constitución</label>
      <input
        type="date"
        className="w-full px-2 py-2 border rounded"
        value={
          form.incorporationDate
            ? (String(form.incorporationDate).length > 10
                ? String(form.incorporationDate).slice(0, 10)
                : String(form.incorporationDate))
            : ""
        }
        onChange={e => setField("incorporationDate", e.target.value)}
      />
    </div>

    <div className="flex items-center justify-end gap-2 pt-2">
      {error && <div className="text-xs text-red-600 mr-auto">{error}</div>}
      {success && <div className="text-xs text-green-600 mr-auto">{success}</div>}
      <button onClick={onCancel} className="px-3 py-1 bg-gray-100 rounded">Cancelar</button>
      <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-green-600 text-white rounded">
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  </div>
);
}