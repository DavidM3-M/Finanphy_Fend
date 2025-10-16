import { Dialog } from '@headlessui/react';
import { Company } from 'types';
import { useState, useEffect } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSave: (updated: Company) => void;
};

export default function CompanyEditModal({ isOpen, onClose, company, onSave }: Props) {
  const [form, setForm] = useState<Company>(company);

  useEffect(() => {
    setForm(company); // Reset cuando cambia la empresa
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl">
        <Dialog.Title className="text-xl font-bold mb-4">Editar Compañía</Dialog.Title>
        <div className="grid grid-cols-2 gap-4">
          {[
            'tradeName', 'legalName', 'companyType', 'taxId', 'taxRegistry',
            'businessPurpose', 'companyEmail', 'companyPhone', 'fiscalAddress',
            'city', 'state', 'representativeName', 'representativeDocument'
          ].map((field) => (
            <input
              key={field}
              name={field}
              value={form[field as keyof Company]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
          <input
            name="incorporationDate"
            type="date"
            value={form.incorporationDate}
            onChange={handleChange}
            className="border p-2 rounded col-span-2"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}