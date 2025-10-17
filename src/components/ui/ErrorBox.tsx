// src/components/ErrorBox.tsx
import React from "react";

export default function ErrorBox({
  message,
  onClose,
}: {
  message?: string | null;
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="w-full bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
      <svg className="w-5 h-5 mt-0.5 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59A1.5 1.5 0 0116.518 17H3.482a1.5 1.5 0 01-1.742-2.311L8.257 3.1zM11 9a1 1 0 10-2 0v3a1 1 0 002 0V9zm-1 6a1.25 1.25 0 110-2.5A1.25 1.25 0 0110 15z" clipRule="evenodd" />
      </svg>
      <div className="flex-1 text-sm leading-tight">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar mensaje de error"
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}