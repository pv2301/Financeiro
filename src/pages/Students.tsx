import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Pencil, Trash2, Save, X, Search, Upload, Building2, FileText, Filter } from 'lucide-react';
import { Student, ClassInfo } from '../types';
import { finance } from '../services/finance';
import ImportStudentsModal from '../components/ImportStudentsModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDiscount, setFilterDiscount] = useState<'ALL' | 'WITH'>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  const [editingStudent, setEditingStudent] = useState<Student>({
    id: '', name: '', classId: '', segment: '', birthDate: '',
    responsibleName: '', responsibleCpf: '', contactPhone: '', contactEmail: '',
    personalDiscount: 0, hasTimelyPaymentDiscount: false, filenameSuffix: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [studentsData, classesData] = await Promise.all([
      finance.getStudents(),
      finance.getClasses()
    ]);
    setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));
    setClasses(classesData);
    setIsLoading(false);
  };


  const handleSave = async () => {
    if (!editingStudent.name || !editingStudent.classId) {
      return alert('Nome do aluno e turma são obrigatórios');
    }
    
    const studentToSave = {
      ...editingStudent,
      id: editingStudent.id || crypto.randomUUID()
    };
    
    await finance.saveStudent(studentToSave);
    await loadData();
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await finance.deleteStudent(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  const openModal = (s?: Student) => {
    if (s) {
      setEditingStudent({ ...s });
    } else {
      setEditingStudent({
        id: '', name: '', classId: classes.length > 0 ? classes[0].id : '',
        segment: '', birthDate: '', responsibleName: '', responsibleCpf: '',
        contactPhone: '', contactEmail: '', personalDiscount: 0,
        hasTimelyPaymentDiscount: false, filenameSuffix: '',
      });
    }
    setIsModalOpen(true);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.responsibleName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass || s.classId === filterClass;
    const matchesDiscount = filterDiscount === 'ALL' || s.personalDiscount > 0;
    return matchesSearch && matchesClass && matchesDiscount;
  });

  const getDiscountBadge = (s: Student) => {
    if (!s.personalDiscount || s.personalDiscount <= 0) return null;
    const note = (s.personalDiscountNote || '').toLowerCase();
    const isEmployee = note.includes('funcion') || note.includes('colaborador');
    return isEmployee
      ? { label: 'Funcionário', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', Icon: Building2 }
      : { label: 'Acordo', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100', Icon: FileText };
  };

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Alunos</h1>
            <p className="text-slate-500 font-medium">Gestão de alunos e descontos</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>
          
          <button 
            onClick={() => setShowImportModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
          >
            <Upload size={20} />
            Importar
          </button>

          <button 
            onClick={() => openModal()}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Novo Aluno
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm items-center">
        <div className="flex items-center gap-2 text-slate-400 px-2">
          <Filter size={18} />
          <span className="text-sm font-bold uppercase tracking-widest">Filtros:</span>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20">
            <option value="">Todas as Turmas</option>
            {classes.sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterDiscount} onChange={e => setFilterDiscount(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20">
            <option value="ALL">Todos os Alunos</option>
            <option value="WITH">Apenas com Desconto</option>
          </select>
        </div>
        <div className="md:ml-auto px-4 w-full md:w-auto text-center md:text-right">
          <span className="text-sm font-black text-brand-blue bg-brand-blue/10 px-4 py-2 rounded-xl">
            {filteredStudents.length} aluno{filteredStudents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando alunos...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nenhum aluno encontrado.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map((s) => {
              const studentClass = classes.find(c => c.id === s.classId);
              return (
                <div key={s.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800">{s.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-500 font-medium">
                      <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                        {studentClass?.name || 'Turma não encontrada'}
                      </span>
                      {s.responsibleName && (
                        <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                          Responsável: {s.responsibleName}
                        </span>
                      )}
                      {(() => {
                        const badge = getDiscountBadge(s);
                        if (!badge) return null;
                        return (
                          <span className={`${badge.bg} ${badge.text} border ${badge.border} px-3 py-1 rounded-full inline-flex items-center gap-1`}>
                            <badge.Icon size={12} />
                            {s.personalDiscount}% — {badge.label}
                            {s.hasTimelyPaymentDiscount ? ' (Até Venc.)' : ''}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end md:self-center">
                    <button onClick={() => openModal(s)} className="p-2 text-slate-400 hover:bg-brand-blue/10 hover:text-brand-blue rounded-xl transition-colors">
                      <Pencil size={20} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: s.id, name: s.name })} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-slate-800">{editingStudent.id ? 'Editar Aluno' : 'Novo Aluno'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Aluno</label>
                    <input
                      type="text"
                      value={editingStudent.name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Nome completo da criança"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Turma</label>
                    <select
                      value={editingStudent.classId}
                      onChange={(e) => setEditingStudent({ ...editingStudent, classId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    >
                      <option value="" disabled>Selecione uma turma...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Responsável Financeiro</label>
                    <input
                      type="text"
                      value={editingStudent.responsibleName}
                      onChange={(e) => setEditingStudent({ ...editingStudent, responsibleName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">CPF do Responsável</label>
                    <input
                      type="text"
                      value={editingStudent.responsibleCpf}
                      onChange={(e) => setEditingStudent({ ...editingStudent, responsibleCpf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={editingStudent.contactPhone}
                      onChange={(e) => setEditingStudent({ ...editingStudent, contactPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Regras de Desconto (Opcional)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Desconto Pessoal / Acordo (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingStudent.personalDiscount || ''}
                        onChange={(e) => setEditingStudent({ ...editingStudent, personalDiscount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                        placeholder="Ex: 10 para 10%"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-7">
                      <input
                        type="checkbox"
                        id="timelyPayment"
                        checked={editingStudent.hasTimelyPaymentDiscount}
                        onChange={(e) => setEditingStudent({ ...editingStudent, hasTimelyPaymentDiscount: e.target.checked })}
                        className="w-5 h-5 rounded text-brand-blue focus:ring-brand-blue border-slate-300"
                      />
                      <div>
                        <label htmlFor="timelyPayment" className="font-bold text-slate-700 cursor-pointer block text-sm">Válido até Vencimento?</label>
                        <span className="text-xs text-slate-500 font-medium">Se o boleto atrasar, o desconto é cancelado.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 sticky bottom-0">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-colors">
                  <Save size={20} />
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showImportModal && (
        <ImportStudentsModal
          existingClasses={classes}
          onClose={() => setShowImportModal(false)}
          onComplete={loadData}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir Aluno"
        message={`Deseja excluir o aluno "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
