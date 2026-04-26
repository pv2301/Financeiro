import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, CheckSquare } from 'lucide-react';
import { ServiceItem, Segment } from '../types';

export const ALL_SEGMENTS = [
  {
    key: 'Berçário' as Segment, label: 'Berçário',
    subKeys: [
      { key: 'Berçário|Baby',   label: 'Baby (6 a 9 meses)' },
      { key: 'Berçário|Ninho',  label: 'Ninho (10 a 12 meses)' },
      { key: 'Berçário|Extra',  label: 'Extra (13 a 24 meses)' },
    ]
  },
  {
    key: 'Educação Infantil' as Segment, label: 'Educação Infantil',
    subKeys: [
      { key: 'Educação Infantil|Maternal', label: 'Maternal' },
      { key: 'Educação Infantil|Grupo 1',  label: 'Grupo 1' },
      { key: 'Educação Infantil|Grupo 2',  label: 'Grupo 2' },
      { key: 'Educação Infantil|Grupo 3',  label: 'Grupo 3' },
    ]
  },
  {
    key: 'Ensino Fundamental I' as Segment, label: 'Ensino Fundamental I',
    subKeys: [
      { key: 'Ensino Fundamental I|Ano 1', label: '1º Ano' },
      { key: 'Ensino Fundamental I|Ano 2', label: '2º Ano' },
      { key: 'Ensino Fundamental I|Ano 3', label: '3º Ano' },
      { key: 'Ensino Fundamental I|Ano 4', label: '4º Ano' },
      { key: 'Ensino Fundamental I|Ano 5', label: '5º Ano' },
    ]
  }
];

interface Props {
  service: ServiceItem;
  onSave: (id: string, name: string, prices: Record<string, number>, mandatorySegments: Segment[]) => void;
  onClose: () => void;
  isSaving?: boolean;
  mandatoryFor?: Segment[];
  targetSegment?: Segment;
}

export default function EditServiceModal({ service, onSave, onClose, isSaving, mandatoryFor, targetSegment }: Props) {
  const [name, setName] = useState(service.name);
  const [prices, setPrices] = useState<Record<string, number>>(service.priceByKey || {});
  const [mandatorySegments, setMandatorySegments] = useState<Segment[]>(mandatoryFor || []);
  
  // Bulk application state
  const [bulkValue, setBulkValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const handlePriceChange = (key: string, value: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const toggleSelection = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const selectSegment = (segmentKeys: string[]) => {
    const allSelected = segmentKeys.every(k => selectedKeys.has(k));
    const next = new Set(selectedKeys);
    if (allSelected) {
      segmentKeys.forEach(k => next.delete(k));
    } else {
      segmentKeys.forEach(k => next.add(k));
    }
    setSelectedKeys(next);
  };

  const applyBulk = () => {
    const val = parseFloat(bulkValue.replace(',', '.'));
    if (isNaN(val) || selectedKeys.size === 0) return;
    
    const newPrices = { ...prices };
    selectedKeys.forEach(key => {
      newPrices[key] = val;
    });
    setPrices(newPrices);
    setBulkValue('');
    setSelectedKeys(new Set()); // clear selection after apply
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-4xl my-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800">Editar Serviço</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Serviço</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Configurações de Faturamento</label>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckSquare size={14} /> Referencial de Faltas
                </p>
                <div className="flex flex-wrap gap-4">
                  {['Educação Infantil', 'Ensino Fundamental I']
                    .filter(seg => !targetSegment || seg === targetSegment)
                    .map((seg) => (
                    <label key={seg} className="flex items-center gap-2 cursor-pointer group">
                      <div 
                        onClick={() => {
                          if (mandatorySegments.includes(seg as Segment)) {
                            setMandatorySegments(mandatorySegments.filter(s => s !== seg));
                          } else {
                            // Since we isolated it, we can actually just replace or add
                            // If we want it to be exclusive per segment, we just toggle it.
                            setMandatorySegments([...mandatorySegments, seg as Segment]);
                          }
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${mandatorySegments.includes(seg as Segment) ? 'border-amber-500 bg-amber-500' : 'border-slate-300 bg-white'}`}
                      >
                        {mandatorySegments.includes(seg as Segment) && <X size={12} className="text-white rotate-45" />}
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-amber-600 transition-colors">{seg}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[9px] text-amber-500 mt-2 font-medium leading-tight">
                  💡 Marcar como referencial fará com que este lanche seja usado para calcular o desconto de faltas neste segmento.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-brand-blue flex items-center gap-2 mb-3">
              <CheckSquare size={16} /> Aplicação em Lote (Selecione as turmas abaixo)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
                <input
                  type="text"
                  placeholder="Ex: 14,50"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <button
                onClick={applyBulk}
                disabled={selectedKeys.size === 0 || !bulkValue}
                className="px-6 py-2 h-[38px] bg-brand-blue text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue/90"
              >
                Aplicar Valor às Selecionadas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ALL_SEGMENTS.map(seg => (
              <div key={seg.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">{seg.label}</h4>
                  <button 
                    onClick={() => selectSegment(seg.subKeys.map(k => k.key))}
                    className="text-[10px] font-bold text-brand-blue hover:underline"
                  >
                    Selecionar Todos
                  </button>
                </div>
                <div className="space-y-2">
                  {seg.subKeys.map(sk => {
                    const isSelected = selectedKeys.has(sk.key);
                    return (
                      <div key={sk.key} className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${isSelected ? 'bg-brand-blue/5 border-brand-blue/30' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                        <div 
                          onClick={() => toggleSelection(sk.key)}
                          className={`w-5 h-5 rounded flex-shrink-0 cursor-pointer border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'}`}
                        >
                          {isSelected && <CheckSquare size={12} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-700 cursor-pointer" onClick={() => toggleSelection(sk.key)}>
                            {sk.label}
                          </label>
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="R$ 0,00"
                            value={prices[sk.key] || ''}
                            onChange={(e) => handlePriceChange(sk.key, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 text-right focus:border-brand-blue focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button 
            disabled={isSaving}
            onClick={() => onSave(service.id, name, prices, mandatorySegments)} 
            className={`flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:bg-emerald-600 active:scale-95'}`}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} /> Salvar Serviço
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
