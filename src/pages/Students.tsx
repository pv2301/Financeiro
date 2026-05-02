import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Plus, Filter,
  Mail, Phone, Calendar,
  Download, ArrowUpRight, ShieldCheck, UserPlus, Trash2, Pencil,
  CreditCard, Clock, MapPin, Percent, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { finance } from '../services/finance';
import { Student, ClassInfo } from '../types';
import { cn, formatCurrencyBRL, formatFullAge } from '../lib/utils';
import { SYSTEM_VERSION } from '../lib/constants';
import { useNavigate } from 'react-router-dom';
import ImportStudentsModal from '../components/ImportStudentsModal';
import StudentModal from '../components/StudentModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { usePersistentSelection } from '../hooks/usePersistentSelection';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [dbConsumption, setDbConsumption] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const { selectedIds, setSelectedIds, toggleId, toggleAll, clearAll } = usePersistentSelection('students_selected_ids');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, c, cons] = await Promise.all([
        finance.getStudents(),
        finance.getClasses(),
        finance.getConsumption()
      ]);
      setStudents(s || []);
      setClasses(c || []);
      setDbConsumption(cons || []);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveStudent = async (studentToSave: Student) => {
    setIsSaving(true);
    try {
      await finance.saveStudent(studentToSave);
      setEditingStudent(null);
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await finance.deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           s.responsibleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           s.responsibleCpf?.includes(searchTerm);
      const matchesClass = classFilter === 'ALL' || s.classId === classFilter;
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? !s.deletedAt : !!s.deletedAt);
      return matchesSearch && matchesClass && matchesStatus;
    });

    result.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return result;
  }, [students, searchTerm, classFilter, statusFilter, sortOrder]);

  const stats = useMemo(() => {
    const discountGroups: Record<number, number> = {};
    students.forEach(s => {
      const d = s.personalDiscount || 0;
      if (d > 0) discountGroups[d] = (discountGroups[d] || 0) + 1;
    });
    const discountList = Object.entries(discountGroups)
      .map(([pct, count]) => ({ pct: Number(pct), count }))
      .sort((a, b) => a.pct - b.pct);
    return { total: students.length, discountList };
  }, [students]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6 font-sans bg-slate-50/30 min-h-screen">
      
      {/* Header - Compact */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Matrículas</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Gestão de Alunos e Responsáveis</p>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowImportModal(true)}
             className="h-11 bg-slate-50 text-slate-600 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2"
           >
             <Download size={16} /> Importar Planilha
           </button>
           <button 
             onClick={() => setShowAddModal(true)}
             className="h-11 bg-slate-900 text-white px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md flex items-center gap-2"
           >
             <UserPlus size={16} className="text-brand-lime" /> Novo Aluno
           </button>
        </div>
      </header>

      {/* Filters - Compact */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center gap-4">
        <div className="relative flex-1 group w-full">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
           <input 
             type="text" placeholder="BUSCAR POR NOME, RESPONSÁVEL OU CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full h-11 pl-12 pr-6 bg-slate-50 border-transparent rounded-xl font-bold text-[11px] text-slate-700 focus:bg-white focus:border-brand-blue transition-all"
           />
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select 
            value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            className="h-11 flex-1 lg:w-48 bg-slate-50 border-transparent rounded-xl px-4 font-black text-[10px] uppercase tracking-widest text-slate-600 focus:bg-white focus:border-brand-blue transition-all"
          >
            <option value="ALL">Todas Turmas</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 flex-1 lg:w-40 bg-slate-50 border-transparent rounded-xl px-4 font-black text-[10px] uppercase tracking-widest text-slate-600 focus:bg-white focus:border-brand-blue transition-all"
          >
            <option value="ALL">Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Alunos</p>
            <p className="text-4xl font-black text-slate-900 leading-none">{stats.total}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">matrículas ativas</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Percent size={18} />
          </div>
          <div className="flex-1 mt-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Descontos Ativos</p>
            {stats.discountList.length === 0 ? (
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum desconto ativo</p>
            ) : (
              <div className="space-y-2">
                {stats.discountList.map(({ pct, count }) => (
                  <div key={pct} className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, (count / stats.total) * 100 * 3)}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest tabular-nums w-24 text-right">{pct}% — {count} aluno{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="overflow-y-auto max-h-[calc(100vh-220px)] [scrollbar-gutter:stable]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
               <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                  <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="p-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"

                           onChange={() => toggleAll(filteredStudents.map(s => s.id))}

                        />
                     </th>
                     <th className="p-6 w-12 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">#</th>
                     <th 
                       className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 cursor-pointer hover:text-brand-blue transition-colors"
                       onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                     >
                        <div className="flex items-center gap-2">
                          Aluno
                          <Filter size={10} className={cn(sortOrder === 'desc' && "rotate-180 transition-transform")} />
                        </div>
                     </th>
                     <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável & Contato</th>
                     <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                     <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Modalidade</th>
                     <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Venc..</th>
                     <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Desc.</th>
                     <th className="p-6 w-20"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map((s, idx) => (
                     <tr key={s.id} className={cn("hover:bg-slate-50 transition-colors group", selectedIds.has(s.id) && "bg-brand-blue/5")}>
                        <td className="p-4 text-center">
                           <input 
                             type="checkbox" 
                             className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                             checked={selectedIds.has(s.id)}
                              onChange={() => toggleId(s.id)}

                           />
                        </td>
                        <td className="p-4 text-center">
                           <span className="text-[10px] font-black text-slate-300 tabular-nums">{idx + 1}</span>
                        </td>
                        <td className="p-4 px-6 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10">
                           <div className="flex items-center gap-4">
                              <div>
                                 <p className="font-black text-slate-900 uppercase tracking-tight text-sm leading-none mb-1">
                                    {s.name.replace(/^\([AEIOU]\)\s+/i, '')}
                                 </p>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <MapPin size={10} /> {s.segment || 'N/A'} {s.birthDate ? `| ${formatFullAge(s.birthDate)}` : ''}
                                 </p>
                              </div>
                           </div>
                        </td>
                        <td className="p-4 px-6">
                           <div>
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-tight leading-none mb-1">{s.responsibleName || '---'}</p>
                              <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Phone size={10} className="text-brand-blue" /> {s.contactPhone || '---'}
                                 </span>
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <CreditCard size={10} className="text-brand-blue" /> {s.responsibleCpf || '---'}
                                 </span>
                              </div>
                           </div>
                        </td>
                        <td className="p-4 px-6">
                           {(() => {
                             const studentClass = classes.find(c => c.id === s.classId);
                             if (!studentClass) {
                               return (
                                 <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1 w-fit">
                                   <AlertCircle size={12} /> S/ TURMA
                                 </span>
                               );
                             }
                             return (
                               <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
                                 {studentClass.name}
                               </span>
                             );
                           })()}
                        </td>
                        <td className="p-4 px-6">
                           <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                              {classes.find(c => c.id === s.classId)?.billingMode === 'POSTPAID_CONSUMPTION' ? 'Pós-Pago' : 'Pré-Pago'}
                           </span>
                        </td>
                        <td className="p-4 px-6 text-center">
                           <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{s.dueDay || '---'}</span>
                        </td>
                        <td className="p-4 px-6 text-right">
                           <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{s.personalDiscount ? `${s.personalDiscount}%` : '---'}</span>
                        </td>
                        <td className="p-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => setEditingStudent(s)}
                                 className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-brand-blue transition-colors rounded-lg hover:bg-slate-50"
                               >
                                  <Pencil size={16} />
                               </button>
                               <button 
                                 onClick={() => setDeleteTarget(s)}
                                 className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-50"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <footer className="pt-10 flex items-center justify-between opacity-30">
        <div className="flex items-center gap-4">
          <ShieldCheck size={20} className="text-slate-400" />
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Gestão de Matrículas &bull; {SYSTEM_VERSION}</p>
        </div>
      </footer>

      <AnimatePresence>
        {showImportModal && (
          <ImportStudentsModal 
            existingClasses={classes}
            onClose={() => setShowImportModal(false)}
            onComplete={loadData}
          />
        )}

        {(showAddModal || editingStudent) && (
          <StudentModal 
            student={editingStudent}
            classes={classes}
            isSaving={isSaving}
            onClose={() => { setEditingStudent(null); setShowAddModal(false); }}
            onSave={handleSaveStudent}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!deleteTarget}
        title="Remover Aluno"
        message={`Tem certeza que deseja remover ${deleteTarget?.name}? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover permanentemente"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
