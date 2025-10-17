import { Dialog } from '@headlessui/react';
import { Company } from 'types';
import React, { useState, useEffect } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSave: (updated: Company) => void;
};

const numericFields = new Set([
  'taxId',
  'taxRegistry',
  'representativeDocument',
]);

const allFields = [
  'tradeName','legalName','companyType','taxId','taxRegistry',
  'businessPurpose','companyEmail','companyPhone','fiscalAddress',
  'city','state','representativeName','representativeDocument'
];

export default function CompanyEditModal({ isOpen, onClose, company, onSave }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    allFields.forEach((f) => {
      const v = (company as any)[f];
      initial[f] = v == null ? '' : String(v);
    });
    // incorporationDate kept separately if present
    initial.incorporationDate = company.incorporationDate ? String(company.incorporationDate) : '';
    setForm(initial);
    setErrors({});
  }, [company, isOpen]);

  const setField = (name: string, value: string) => {
    if (numericFields.has(name)) value = value.replace(/\D/g, '');
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setField(e.target.name, e.target.value);
  };

  // Block non-digit before it enters (best-effort)
  const handleBeforeInputNumeric = (e: React.FormEvent<HTMLInputElement>) => {
    const ne = e.nativeEvent as InputEvent | null;
    const inserted = ne && 'data' in ne ? (ne as any).data ?? '' : '';
    if (inserted && !/^\d+$/.test(inserted)) {
      try { (ne as any).preventDefault?.(); } catch {}
      e.preventDefault();
    }
  };

  const handleKeyDownNumeric = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter','Home','End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (/^[0-9]$/.test(e.key)) return;
    e.preventDefault();
  };

  const handlePasteNumeric = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text') || '';
    if (!/^\d+$/.test(text)) {
      e.preventDefault();
      const digits = text.replace(/\D/g, '');
      if (!digits) return;
      const el = e.currentTarget as HTMLInputElement;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const newValue = el.value.slice(0, start) + digits + el.value.slice(end);
      setField(el.name, newValue);
      requestAnimationFrame(() => {
        const pos = start + digits.length;
        el.setSelectionRange(pos, pos);
      });
    }
  };

  const validateField = (name: string, value: string): string => {
    const v = value.trim();
    if (['tradeName','legalName','companyType'].includes(name)) {
      if (!v) return 'Requerido';
      return '';
    }
    if (numericFields.has(name)) {
      if (!v) return 'Requerido';
      if (!/^\d+$/.test(v)) return 'Solo números';
      return '';
    }
    if (name === 'companyEmail') {
      if (!v) return 'Requerido';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email inválido';
      return '';
    }
    return '';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setErrors((p) => ({ ...p, [name]: err }));
  };

  const validateAll = (): boolean => {
    const next: Record<string, string> = {};
    allFields.forEach((f) => {
      const err = validateField(f, form[f] ?? '');
      if (err) next[f] = err;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validateAll()) return;
    const cleaned: Record<string, any> = { ...form };
    numericFields.forEach((f) => {
      if (typeof cleaned[f] === 'string') cleaned[f] = cleaned[f].replace(/\D/g, '');
    });
    // include incorporationDate if present
    if (form.incorporationDate) cleaned.incorporationDate = form.incorporationDate;
    onSave(cleaned as Company);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl">
        <Dialog.Title className="text-xl font-bold mb-4">Editar Compañía</Dialog.Title>

        <div className="grid grid-cols-2 gap-4">
          {allFields.map((field) => {
            const isNumeric = numericFields.has(field);
            const value = form[field] ?? '';
            return (
              <div key={field} className="flex flex-col">
                <label className="sr-only" htmlFor={field}>{field}</label>
                <input
                  id={field}
                  name={field}
                  value={value}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onBeforeInput={isNumeric ? handleBeforeInputNumeric : undefined}
                  onKeyDown={isNumeric ? handleKeyDownNumeric : undefined}
                  onPaste={isNumeric ? handlePasteNumeric : undefined}
                  inputMode={isNumeric ? 'numeric' : undefined}
                  pattern={isNumeric ? '\\d*' : undefined}
                  placeholder={field}
                  className={`border p-2 rounded ${errors[field] ? 'border-red-500' : ''}`}
                  aria-invalid={!!errors[field]}
                  aria-describedby={errors[field] ? `${field}-error` : undefined}
                  autoComplete="off"
                />
                <div id={`${field}-error`} className="mt-1 text-sm" aria-live="polite">
                  {errors[field] ? <span className="text-red-500">{errors[field]}</span> : null}
                </div>
              </div>
            );
          })}

          <div className="col-span-2">
            <label className="sr-only" htmlFor="incorporationDate">incorporationDate</label>
            <input
              id="incorporationDate"
              name="incorporationDate"
              type="date"
              value={form.incorporationDate ?? ''}
              onChange={(e) => setField('incorporationDate', e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            aria-disabled={Object.keys(errors).length > 0}
          >
            Guardar
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}