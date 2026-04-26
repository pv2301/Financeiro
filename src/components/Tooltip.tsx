import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | React.ReactNode;
  title?: string;
  align?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ title, content, align = 'center', children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: 50 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      const tooltipWidth = 280; 
      const padding = 16;
      const screenWidth = window.innerWidth;

      // Centro ideal baseado no alinhamento sugerido
      let idealCenter = rect.left + rect.width / 2;
      if (align === 'left') idealCenter = rect.left + (tooltipWidth / 2) - 20;
      if (align === 'right') idealCenter = rect.right - (tooltipWidth / 2) + 20;

      // Garantir que o tooltip fique dentro da tela (Clamping)
      const boxLeft = Math.max(
        padding,
        Math.min(screenWidth - tooltipWidth - padding, idealCenter - tooltipWidth / 2)
      );

      // Calcular posição da seta relativa ao box (Sempre apontando para o centro do trigger)
      const triggerCenter = rect.left + rect.width / 2;
      const arrowLeftPx = triggerCenter - boxLeft;
      const arrowLeftPercent = Math.max(8, Math.min(92, (arrowLeftPx / tooltipWidth) * 100));

      setCoords({
        top: rect.top - 12, 
        left: boxLeft,
        arrowLeft: arrowLeftPercent
      });
    }
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="inline-flex items-center">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`transition-colors cursor-help inline-flex items-center ${
          !children && (isOpen ? 'text-brand-blue bg-brand-blue/10 p-0.5 rounded-full' : 'text-slate-300 hover:text-slate-400 p-0.5')
        }`}
      >
        {children || <HelpCircle size={14} />}
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div 
              ref={tooltipRef}
              className="fixed z-[9999] pointer-events-auto"
              style={{
                top: coords.top,
                left: coords.left,
                width: 280,
                transform: 'translateY(-100%)',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="bg-slate-900 text-white p-4 rounded-[1.25rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 relative overflow-visible"
              >
                {title && (
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-blue/80 mb-2 border-b border-white/5 pb-2">
                    {title}
                  </p>
                )}
                <div className="text-[11px] font-bold leading-relaxed text-slate-300 antialiased">
                  {content}
                </div>
                
                <div 
                  className="absolute -bottom-1.5 w-3 h-3 bg-slate-900 border-r border-b border-white/10 transform rotate-45"
                  style={{ 
                    left: `${coords.arrowLeft}%`,
                    marginLeft: '-6px'
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default Tooltip;
