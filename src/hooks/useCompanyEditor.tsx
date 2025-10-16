// hooks/useCompanyEditor.ts
import { useState } from 'react';
import { Company } from 'types';

export function useCompanyEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  const openEditor = (c: Company) => {
    setCompany(c);
    setIsOpen(true);
  };

  const closeEditor = () => setIsOpen(false);

  return {
    isOpen,
    company,
    openEditor,
    closeEditor,
  };
}