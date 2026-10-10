import React from 'react';
import logo from '@/assets/NeoDairy_Logo.png';

interface PdfLoaderProps {
  isLoading: boolean;
  // Optional progress text and stop button for long exports
  message?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
}

const PdfLoader = ({ isLoading, message, onCancel, cancelLabel = 'Cancel' }: PdfLoaderProps) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/10 flex items-center justify-center z-50">
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg flex flex-col items-center gap-3 max-w-xs">
        <img src={logo} alt="Loading" className="h-20 w-20 animate-spin" />
        {message && <div className="text-sm text-gray-700 text-center">{message}</div>}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default PdfLoader;
