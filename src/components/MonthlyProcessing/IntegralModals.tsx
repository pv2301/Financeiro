import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon, Plus, Receipt, Trash2, Search } from 'lucide-react';
import { Student, ClassInfo as Class, ServiceItem as Service } from '../../types';
import { formatCurrencyBRL } from '../../lib/utils';

interface IntegralModalsProps {
  showIntegralServiceModal: string | null;
  setShowIntegralServiceModal: (id: string | null) => void;
  showIntegralSelectModal: boolean;
  setShowIntegralSelectModal: (show: boolean) => void;
  students: Student[];
  classes: Class[];
  services: Service[];
  integralItems: Record<string, any[]>;
  setIntegralItems: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  monthYear: string;
  ageRefDay: number;
  saveCurrentDraft: (overrideData?: any, silent?: boolean) => Promise<void>;
  getPriceKey: (cls: Class, student: Student | null, monthYear: string, refDay: number) => string;
  onConfirmSelection: (selectedIds: string[]) => void;
}

export const IntegralModals: React.FC<IntegralModalsProps> = ({
  showIntegralServiceModal,
  setShowIntegralServiceModal,
  showIntegralSelectModal,
  setShowIntegralSelectModal,
  students,
  classes,
  services,
  integralItems,
  setIntegralItems,
  monthYear,
  ageRefDay,
  saveCurrentDraft,
  getPriceKey,
  onConfirmSelection
}) => {
  const [localSearch, setLocalSearch] = React.useState('');
  const [localSegment, setLocalSegment] = React.useState('all');
  const [localClass, setLocalClass] = React.useState('all');
  const [localSelected, setLocalSelected] = React.useState<string[]>([]);

  // Initialize local selection when modal opens
  React.useEffect(() => {
    if (showIntegralSelectModal) {
      setLocalSelected([]);
      setLocalSearch('');
      setLocalSegment('all');
      setLocalClass('all');
    }
  }, [showIntegralSelectModal]);

  return (
    <>
      {/* Modal: Adicionar/Remover Serviços do Aluno */}
      <AnimatePresence>
        {showIntegralServiceModal && (
          (() => {
            const s = students.find((x) => x.id === showIntegralServiceModal);
            const currentItems = integralItems[showIntegralServiceModal!] || [];

            return (
              <div 
                key="integral-service-modal"
                className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh] bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
                style={{ scrollbarGutter: 'stable' }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden flex flex-col shadow-2xl mb-8"
                >
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <div className="flex flex-col">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">
                          Serviços do Aluno - {s?.segment || "—"}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500 font-medium">
                        {s?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowIntegralServiceModal(null)}
                      className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                    >
                      <XIcon size={24} />
                    </button>
                  </div>

                  <div className="p-8 space-y-6 bg-white min-h-[400px]">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Itens Lançados
                      </label>
                      {currentItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                        >
                          <div className="flex-1">
                            <p className="font-black text-slate-700 text-xs uppercase tracking-widest mb-0.5">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {formatCurrencyBRL(item.price)} unitário
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
                              <button
                                onClick={() => {
                                  const next = [...currentItems];
                                  next[idx] = {
                                    ...next[idx],
                                    quantity: Math.max(1, next[idx].quantity - 1),
                                  };
                                  setIntegralItems((prev) => ({
                                    ...prev,
                                    [s!.id]: next,
                                  }));
                                }}
                                className="p-1 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 1;
                                  const next = [...currentItems];
                                  next[idx] = { ...next[idx], quantity: qty };
                                  setIntegralItems((prev) => ({
                                    ...prev,
                                    [s!.id]: next,
                                  }));
                                }}
                                className="w-10 py-1 text-center text-xs font-black text-slate-700 focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  const next = [...currentItems];
                                  next[idx] = {
                                    ...next[idx],
                                    quantity: next[idx].quantity + 1,
                                  };
                                  setIntegralItems((prev) => ({
                                    ...prev,
                                    [s!.id]: next,
                                  }));
                                }}
                                className="p-1 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                const next = currentItems.filter(
                                  (_, i) => i !== idx,
                                );
                                setIntegralItems((prev) => ({
                                  ...prev,
                                  [s!.id]: next,
                                }));
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {currentItems.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                          <Receipt
                            className="mx-auto mb-2 text-slate-200"
                            size={32}
                          />
                          <p className="text-slate-400 text-xs font-medium italic">
                            Nenhum serviço adicionado ainda.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Adicionar Novo Serviço
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {services
                          .filter((svc) => {
                            const studentClass = classes.find(
                              (c) => c.id === s?.classId,
                            );
                            if (!studentClass) return false;
                            const priceKey = getPriceKey(
                              studentClass,
                              s || null,
                              monthYear,
                              ageRefDay,
                            );
                            const hasPrice = svc.priceByKey[priceKey] !== undefined;
                            
                            const isInfantilOrFundI = s?.segment === 'Educação Infantil' || s?.segment === 'Ensino Fundamental I';
                            const isLancheColetivo = svc.name.toUpperCase().includes('LANCHE COLETIVO');
                            
                            if (isInfantilOrFundI && isLancheColetivo) return false;
                            
                            return hasPrice;
                          })
                          .map((svc) => (
                            <button
                              key={svc.id}
                              onClick={() => {
                                if (s) {
                                  const studentClass = classes.find(
                                    (c) => c.id === s.classId,
                                  );
                                  if (studentClass) {
                                    const priceKey = getPriceKey(
                                      studentClass,
                                      s,
                                      monthYear,
                                      ageRefDay,
                                    );
                                    const price = svc.priceByKey[priceKey] || 0;

                                    setIntegralItems((prev) => {
                                      const currentStudentItems = [...(prev[s.id] || [])];
                                      const existingItemIndex = currentStudentItems.findIndex(item => item.serviceId === svc.id);
                                      
                                      if (existingItemIndex > -1) {
                                        currentStudentItems[existingItemIndex] = {
                                          ...currentStudentItems[existingItemIndex],
                                          quantity: currentStudentItems[existingItemIndex].quantity + 1
                                        };
                                      } else {
                                        currentStudentItems.push({
                                          serviceId: svc.id,
                                          name: svc.name,
                                          quantity: 1,
                                          price,
                                        });
                                      }
                                      
                                      return {
                                        ...prev,
                                        [s.id]: currentStudentItems,
                                      };
                                    });
                                  }
                                }
                              }}
                              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                  <Plus size={14} />
                                </div>
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                                  {svc.name}
                                </span>
                              </div>
                              <span className="text-xs font-black text-slate-400">
                                {(() => {
                                  const studentClass = classes.find(
                                    (c) => c.id === s?.classId,
                                  );
                                  if (!studentClass) return "—";
                                  const pk = getPriceKey(
                                    studentClass,
                                    s || null,
                                    monthYear,
                                    ageRefDay,
                                  );
                                  return formatCurrencyBRL(
                                    svc.priceByKey[pk] || 0,
                                  );
                                })()}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        Total a Cobrar
                      </p>
                      <p className="text-2xl font-black text-brand-blue leading-none tabular-nums">
                        {formatCurrencyBRL(
                          currentItems.reduce(
                            (a, b) => a + b.price * b.quantity,
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        saveCurrentDraft(undefined, true); 
                        setShowIntegralServiceModal(null);
                      }}
                      className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-transform"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()
        )}
      </AnimatePresence>

      {/* Modal: Selecionar Alunos para Integral */}
      <AnimatePresence>
        {showIntegralSelectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIntegralSelectModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange shadow-inner">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Selecionar Alunos (Integral)
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Educação Infantil e Fundamental I
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIntegralSelectModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Pesquisar aluno pelo nome..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 text-sm font-medium"
                      />
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={localSegment}
                        onChange={(e) => {
                          setLocalSegment(e.target.value);
                          setLocalClass('all');
                        }}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                      >
                        <option value="all">Todos os segmentos</option>
                        <option value="Educação Infantil">Educação Infantil</option>
                        <option value="Ensino Fundamental I">Ensino Fundamental I</option>
                      </select>
                      
                      <select
                        value={localClass}
                        onChange={(e) => setLocalClass(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                      >
                        <option value="all">Todas as turmas</option>
                        {classes
                          .filter(c => localSegment === 'all' || c.segment === localSegment)
                          .filter(c => c.segment === 'Educação Infantil' || c.segment === 'Ensino Fundamental I')
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                    {students
                      .filter(s => {
                        const cls = classes.find(c => c.id === s.classId);
                        if (!cls) return false;
                        const isTargetSegment = cls.segment === 'Educação Infantil' || cls.segment === 'Ensino Fundamental I';
                        const matchesSegment = localSegment === 'all' || cls.segment === localSegment;
                        const matchesClass = localClass === 'all' || s.classId === localClass;
                        const matchesSearch = !localSearch || s.name.toLowerCase().includes(localSearch.toLowerCase());
                        const isNotAlreadyAdded = !integralItems[s.id];
                        return isTargetSegment && matchesSegment && matchesClass && matchesSearch && isNotAlreadyAdded;
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(student => {
                        const isSelected = localSelected.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => {
                              if (isSelected) {
                                setLocalSelected(prev => prev.filter(id => id !== student.id));
                              } else {
                                setLocalSelected(prev => [...prev, student.id]);
                              }
                            }}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                              isSelected 
                                ? 'bg-brand-blue/5 border-brand-blue shadow-sm' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} 
                              className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-brand-blue cursor-pointer transition-all focus:ring-4 focus:ring-brand-blue/10"
                            />
                            <div className="flex-1">
                              <p className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-brand-blue' : 'text-slate-700'}`}>
                                {student.name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {student.segment} • {classes.find(c => c.id === student.classId)?.name || '—'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => onConfirmSelection(localSelected)}
                    className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-transform"
                  >
                    Adicionar Alunos Selecionados ({localSelected.length})
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
