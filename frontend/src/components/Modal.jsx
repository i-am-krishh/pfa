import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ onClose, title, children }) {
  const modalRef = useRef(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    // Save original overflow
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Handle clicking outside to close
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {title}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">Fill in the details below</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
