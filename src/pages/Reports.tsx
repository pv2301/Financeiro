import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { Invoice, ClassInfo, Student } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('2026');
  const [semester, setSemester] = useState<'ALL' | '1' | '2'>('ALL');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [inv, cls, stu] = await Promise.all([
      finance.getInvoices(), finance.getClasses(), finance.getStudents()
    ]);
    setInvoices(inv); setClasses(cls); setStudents(stu);
    setIsLoading(false);
  };

  // Filter invoices by period
  const filtered = invoices.filter(inv => {
    const year = inv.monthYear?.split('/')?.[1] || '';
    if (!year.includes(period)) return false;
    if (semester === '1') {
      const month = parseInt(inv.monthYear?.split('/')?.[0] || '0');
      return month <= 6;
    }
    if (semester === '2') {
      const month = parseInt(inv.monthYear?.split('/')?.[0] || '0');
      return month >= 7;
    }
    return true;
  });

  // Aggregate by class
  const classStats = classes.map(cls => {
    const classInvoices = filtered.filter(i => i.classId === cls.id);
    const total = classInvoices.reduce((a, c) => a + c.netAmount, 0);
    const paid = classInvoices.filter(i => i.paymentStatus === 'PAID');
    const received = paid.reduce((a, c) => a + (c.amountCharged || c.netAmount), 0);
    const collegeShare = classInvoices.reduce((a, c) => a + (c.collegeShareAmount || 0), 0);
    const studentCount = students.filter(s => s.classId === cls.id).length;
    return { cls, total, received, pending: total - received, collegeShare, count: classInvoices.length, studentCount };
  }).filter(s => s.count > 0).sort((a, b) => b.total - a.total);

  const grandTotal = classStats.reduce((a, c) => a + c.total, 0);
  const grandReceived = classStats.reduce((a, c) => a + c.received, 0);
  const grandCollege = classStats.reduce((a, c) => a + c.collegeShare, 0);

  const exportExcel = () => {
    const rows = classStats.map(s => ({
      'Turma': s.cls.name,
      'Segmento': s.cls.segment,
      'Alunos': s.studentCount,
      'Boletos': s.count,
      'Total Cobrado (R$)': s.total.toFixed(2),
      'Total Recebido (R$)': s.received.toFixed(2),
      'Pendente (R$)': s.pending.toFixed(2),
      '% Colégio': s.cls.collegeSharePercent + '%',
      'Valor Colégio (R$)': s.collegeShare.toFixed(2),
    }));
    rows.push({
      'Turma': 'TOTAL', 'Segmento': '', 'Alunos': students.length, 'Boletos': filtered.length,
      'Total Cobrado (R$)': grandTotal.toFixed(2), 'Total Recebido (R$)': grandReceived.toFixed(2),
      'Pendente (R$)': (grandTotal - grandReceived).toFixed(2),
      '% Colégio': '', 'Valor Colégio (R$)': grandCollege.toFixed(2),
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Relatório ${period}`);
    XLSX.writeFile(wb, `Relatorio_Colegio_${period}_S${semester}.xlsx`);
  };

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Relatórios</h1>
            <p className="text-slate-500 font-medium">Prestação de contas ao colégio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value as any)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
            <option value="ALL">Ano Inteiro</option><option value="1">1º Semestre</option><option value="2">2º Semestre</option>
          </select>
          <button onClick={exportExcel}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-600 transition-colors">
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cobrado</p>
          <p className="text-3xl font-black text-slate-800">R$ {grandTotal.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Recebido</p>
          <p className="text-3xl font-black text-emerald-600">R$ {grandReceived.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">Repasse Colégio</p>
          <p className="text-3xl font-black text-brand-blue">R$ {grandCollege.toFixed(2)}</p>
        </motion.div>
      </div>

      {/* Table by class */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando dados...</div>
        ) : classStats.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nenhum dado encontrado para o período selecionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Turma</th>
                  <th className="px-6 py-4">Alunos</th>
                  <th className="px-6 py-4">Cobrado</th>
                  <th className="px-6 py-4">Recebido</th>
                  <th className="px-6 py-4">Pendente</th>
                  <th className="px-6 py-4">% Colégio</th>
                  <th className="px-6 py-4">Repasse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStats.map(s => (
                  <tr key={s.cls.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{s.cls.name}</p>
                      <p className="text-[10px] text-slate-400">{s.cls.segment}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">{s.studentCount}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">R$ {s.total.toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">R$ {s.received.toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-red-500">R$ {s.pending.toFixed(2)}</td>
                    <td className="px-6 py-4 font-bold text-slate-500">{s.cls.collegeSharePercent}%</td>
                    <td className="px-6 py-4 font-black text-brand-blue">R$ {s.collegeShare.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black">
                  <td className="px-6 py-4 text-slate-800">TOTAL</td>
                  <td className="px-6 py-4 text-slate-600">{students.length}</td>
                  <td className="px-6 py-4 text-slate-800">R$ {grandTotal.toFixed(2)}</td>
                  <td className="px-6 py-4 text-emerald-600">R$ {grandReceived.toFixed(2)}</td>
                  <td className="px-6 py-4 text-red-500">R$ {(grandTotal - grandReceived).toFixed(2)}</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-brand-blue">R$ {grandCollege.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
