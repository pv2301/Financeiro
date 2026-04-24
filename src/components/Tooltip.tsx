import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | React.ReactNode;
  title?: string;
}

export default function Tooltip({ content, title }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updateCoords();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-slate-400 hover:text-brand-blue transition-colors cursor-help outline-none p-0.5"
        type="button"
      >
        <HelpCircle size={14} />
      </button>

      <AnimatePresence>
        {isOpen && createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              style={{ 
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'auto'
              }}
              className="mb-2 w-64"
            >
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 relative">
                {title && (
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-brand-blue mb-1.5">
                    {title}
                  </h4>
                )}
                <div className="text-[11px] font-medium leading-relaxed text-slate-200">
                  {content}
                </div>
                {/* Arrow */}
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 -mt-1.5" 
                  style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
                />
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
