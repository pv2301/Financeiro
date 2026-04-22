import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Student,
  ClassInfo,
  ServiceItem,
  Invoice,
  UserPresence,
  PaymentImportResult
} from '../types';

// ─── Collection names ─────────────────────────────────────────────────────
const C = {
  STUDENTS:  'fin_students',
  CLASSES:   'fin_classes',
  SERVICES:  'fin_snacks', // Kept as fin_snacks to match firestore.rules
  INVOICES:  'fin_invoices',
  CONFIG:    'fin_config',
  PRESENCE:  'fin_presence',
};

// ─── Generic helpers ──────────────────────────────────────────────────────
async function getAllFromCollection<T>(col: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, col));
    return snap.docs.map(d => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, col);
    return [];
  }
}

async function saveItem<T extends { id: string }>(col: string, item: T): Promise<void> {
  try {
    await setDoc(doc(db, col, item.id), JSON.parse(JSON.stringify(item)));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, col);
  }
}

async function deleteItem(col: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, col, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, col);
  }
}

async function saveAllToCollection<T extends { id: string }>(col: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    const existing = await getDocs(collection(db, col));
    existing.forEach(d => batch.delete(d.ref));
    items.forEach(item => batch.set(doc(db, col, item.id), JSON.parse(JSON.stringify(item))));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, col);
  }
}

async function mergeBatchToCollection<T extends { id: string }>(col: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach(item =>
      batch.set(doc(db, col, item.id), JSON.parse(JSON.stringify(item)), { merge: true })
    );
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, col);
  }
}

// ─── Finance Service ──────────────────────────────────────────────────────
export const finance = {
  // ── Classes ──────────────────────────────────────────────────────────────
  getClasses:       ()                 => getAllFromCollection<ClassInfo>(C.CLASSES),
  saveClass:        (c: ClassInfo)     => saveItem(C.CLASSES, c),
  deleteClass:      (id: string)       => deleteItem(C.CLASSES, id),
  saveAllClasses:   (cs: ClassInfo[])  => saveAllToCollection(C.CLASSES, cs),
  mergeBatchClasses:(cs: ClassInfo[])  => mergeBatchToCollection(C.CLASSES, cs),

  // ── Students ─────────────────────────────────────────────────────────────
  getStudents:       ()                 => getAllFromCollection<Student>(C.STUDENTS),
  saveStudent:       (s: Student)       => saveItem(C.STUDENTS, s),
  deleteStudent:     (id: string)       => deleteItem(C.STUDENTS, id),
  mergeBatchStudents:(ss: Student[])    => mergeBatchToCollection(C.STUDENTS, ss),

  // ── Services (ex-Snacks) ──────────────────────────────────────────────────
  getServices:       ()                    => getAllFromCollection<ServiceItem>(C.SERVICES),
  saveService:       (s: ServiceItem)      => saveItem(C.SERVICES, s),
  deleteService:     (id: string)          => deleteItem(C.SERVICES, id),
  saveAllServices:   (ss: ServiceItem[])   => saveAllToCollection(C.SERVICES, ss),
  // Legacy aliases
  getSnacks:         ()                    => getAllFromCollection<ServiceItem>(C.SERVICES),
  saveSnack:         (s: ServiceItem)      => saveItem(C.SERVICES, s),
  deleteSnack:       (id: string)          => deleteItem(C.SERVICES, id),
  saveAllSnacks:     (ss: ServiceItem[])   => saveAllToCollection(C.SERVICES, ss),

  // ── Invoices ─────────────────────────────────────────────────────────────
  getInvoices:       ()                 => getAllFromCollection<Invoice>(C.INVOICES),
  saveInvoice:       (inv: Invoice)     => saveItem(C.INVOICES, inv),
  deleteInvoice:     (id: string)       => deleteItem(C.INVOICES, id),
  saveBatchInvoices: (invs: Invoice[])  => mergeBatchToCollection(C.INVOICES, invs),

  /**
   * Importa planilha do banco (Cobrança Títulos) e dá baixa automática nos boletos.
   * Lê o campo nossoNumero de cada boleto e compara com os do sistema.
   * Se valores divergirem, insere nota de divergência no campo notes.
   */
  processPaymentImport: async (
    bankRows: Array<{
      nossoNumero: string;
      paymentDate: string;
      amountCharged: number;
      oscilacao: number;
      pagador: string;
    }>,
    emissionFee: number
  ): Promise<PaymentImportResult> => {
    const allInvoices = await finance.getInvoices();
    const invoicesByNosso = new Map(allInvoices.map(i => [i.nossoNumero?.trim(), i]));

    const result: PaymentImportResult = {
      processed: 0,
      notFound: 0,
      divergences: 0,
      details: []
    };

    const batch = writeBatch(db);

    for (const row of bankRows) {
      const nn = row.nossoNumero.replace(/^0+/, '').trim(); // normaliza zeros à esquerda
      const invoice = invoicesByNosso.get(row.nossoNumero.trim()) || invoicesByNosso.get(nn);

      if (!invoice || !invoice.id) {
        result.notFound++;
        result.details.push({
          nossoNumero: row.nossoNumero,
          studentName: row.pagador,
          status: 'NOT_FOUND'
        });
        continue;
      }

      // Verifica divergência de valor (tolerância de R$0,01)
      const hasDivergence = Math.abs(row.amountCharged - invoice.netAmount) > 0.01;
      let notes = invoice.notes || '';

      if (hasDivergence) {
        result.divergences++;
        const divergenceNote = `[DIVERGÊNCIA] Valor do título: R$${invoice.netAmount.toFixed(2)} | Valor cobrado pelo banco: R$${row.amountCharged.toFixed(2)} | Oscilação: R$${row.oscilacao.toFixed(2)}`;
        notes = notes ? `${notes}\n${divergenceNote}` : divergenceNote;
      }

      // Recalculate college share with updated data
      const collegeBase = invoice.netAmount - emissionFee;
      const collegeShareAmount = Math.max(0, collegeBase * invoice.collegeSharePercent / 100);

      const updated: Invoice = {
        ...invoice,
        paymentStatus: 'PAID',
        paymentDate: row.paymentDate,
        amountCharged: row.amountCharged,
        oscilacao: row.oscilacao,
        collegeShareAmount,
        notes
      };

      batch.set(doc(db, C.INVOICES, invoice.id), JSON.parse(JSON.stringify(updated)));

      result.processed++;
      result.details.push({
        nossoNumero: row.nossoNumero,
        studentName: row.pagador,
        status: hasDivergence ? 'VALUE_DIVERGENCE' : 'OK',
        divergenceNote: hasDivergence ? `Cobrado R$${row.amountCharged.toFixed(2)} vs Título R$${invoice.netAmount.toFixed(2)}` : undefined
      });
    }

    await batch.commit();
    return result;
  },

  // ── Config (taxa global de emissão de boleto) ─────────────────────────
  getConfig: async (): Promise<Record<string, unknown>> => {
    try {
      const snap = await getDoc(doc(db, C.CONFIG, 'global'));
      return snap.exists() ? snap.data() : {};
    } catch {
      return {};
    }
  },
  saveConfig: async (data: Record<string, unknown>): Promise<void> => {
    try {
      await setDoc(doc(db, C.CONFIG, 'global'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, C.CONFIG);
    }
  },

  // ── Global Config (typed) ───────────────────────────────────────────────
  getGlobalConfig: async (): Promise<{ scholasticDays: Record<string, number>; boletoEmissionFee: number; defaultDueDay: number } | null> => {
    try {
      const snap = await getDoc(doc(db, C.CONFIG, 'global'));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        scholasticDays: data.scholasticDays || {},
        boletoEmissionFee: data.boletoEmissionFee ?? 3.50,
        defaultDueDay: data.defaultDueDay ?? 10,
        defaultCollegeSharePercent: data.defaultCollegeSharePercent ?? 20,
      };
    } catch {
      return null;
    }
  },
  saveGlobalConfig: async (data: { scholasticDays: Record<string, number>; boletoEmissionFee: number; defaultDueDay?: number; defaultCollegeSharePercent?: number }): Promise<void> => {
    try {
      await setDoc(doc(db, C.CONFIG, 'global'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, C.CONFIG);
    }
  },
};

// ─── Presence Service ─────────────────────────────────────────────────────
export const presenceService = {
  /**
   * Atualiza presença do usuário logado.
   * Deve ser chamado ao mudar de página e em heartbeat periódico.
   */
  update: async (uid: string, displayName: string, email: string, currentPage: string, photoURL?: string): Promise<void> => {
    try {
      const presenceData: UserPresence = {
        uid,
        displayName: displayName || email,
        email,
        photoURL,
        currentPage,
        lastSeen: Date.now(),
      };
      await setDoc(doc(db, C.PRESENCE, uid), JSON.parse(JSON.stringify(presenceData)));
    } catch (error) {
      console.error('Presence update failed:', error);
    }
  },

  /** Remove presença do usuário (ao fazer logout). */
  remove: async (uid: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, C.PRESENCE, uid));
    } catch { /* silent */ }
  },

  /**
   * Escuta presença de todos os usuários em tempo real.
   * Filtra usuários inativos há mais de 5 minutos.
   */
  subscribe: (callback: (users: UserPresence[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, C.PRESENCE), snap => {
      const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 min
      const now = Date.now();
      const active = snap.docs
        .map(d => d.data() as UserPresence)
        .filter(u => now - u.lastSeen < INACTIVITY_LIMIT_MS);
      callback(active);
    });
  },
};
