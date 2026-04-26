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
import { getAuth } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ConsumptionRecord,
  AuditLog,
  GlobalConfig,
  Invoice,
  PaymentImportResult,
  BillingDraft,
  ClassInfo,
  Student,
  ServiceItem,
  UserPresence
} from '../types';

// ─── Collection names ─────────────────────────────────────────────────────
const C = {
  STUDENTS:  'fin_students',
  CLASSES:   'fin_classes',
  SERVICES:  'fin_snacks', // Kept as fin_snacks to match firestore.rules
  INVOICES:  'fin_invoices',
  CONFIG:    'fin_config',
  PRESENCE:  'fin_presence',
  CONSUMPTION: 'fin_consumption',
  AUDIT_LOGS: 'fin_audit_logs',
  BILLING_DRAFTS: 'fin_billing_drafts',
};

// ─── Cache Helpers ────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData<T>(key: string): T[] | null {
  const cached = localStorage.getItem(`fin_cache_${key}`);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(`fin_cache_${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T[]) {
  localStorage.setItem(`fin_cache_${key}`, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

function invalidateCache(key?: string) {
  if (key) {
    localStorage.removeItem(`fin_cache_${key}`);
  } else {
    // Invalidate all
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('fin_cache_')) localStorage.removeItem(k);
    });
  }
}

async function getAllFromCollection<T extends { deletedAt?: string | null }>(col: string): Promise<T[]> {
  // Try cache first
  const cached = getCachedData<T>(col);
  if (cached) return cached;

  try {
    const snap = await getDocs(collection(db, col));
    const data = snap.docs.map(d => {
      const item = d.data() as any;
      if (item.billingMode === 'ANTICIPATED_FIXED') item.billingMode = 'PREPAID_FIXED';
      if (item.billingMode === 'ANTICIPATED_DAYS') item.billingMode = 'PREPAID_DAYS';
      return item as T;
    }).filter(item => !item.deletedAt);
    
    setCachedData(col, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, col);
    return [];
  }
}

async function createAuditLog(
  action: string,
  col: string,
  docId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Promise<void> {
  try {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    const logId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await setDoc(doc(db, 'fin_audit_logs', logId), {
      id: logId,
      action,
      collection: col,
      collectionName: col, // Fallback
      docId,
      documentId: docId, // Fallback
      before: before ?? null,
      after: after ?? null,
      performedBy: user?.email ?? 'sistema',
      userEmail: user?.email ?? 'sistema',
      performedAt: now,
      timestamp: now,
    });
  } catch {
    // Audit log failures are non-fatal — never block the main operation
  }
}

async function saveItem<T extends { id: string }>(col: string, item: T): Promise<void> {
  try {
    const docRef = doc(db, col, item.id);
    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.exists() ? existingSnap.data() : null;
    const action = existing ? 'UPDATE' : 'CREATE';

    const itemToSave = JSON.parse(JSON.stringify(item));
    await setDoc(docRef, itemToSave);
    await createAuditLog(action, col, item.id, existing, itemToSave);
    invalidateCache(col);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, col);
  }
}

async function softDeleteItem(col: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, col, id);
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) return;
    
    const existing = existingSnap.data();
    if (existing.deletedAt) return; // Already soft-deleted
    
    const auth = getAuth();
    const userEmail = auth.currentUser?.email || 'sistema@financeiro.com';

    const updated = { ...existing, deletedAt: new Date().toISOString(), deletedBy: userEmail };
    
    await setDoc(docRef, updated);
    await createAuditLog('SOFT_DELETE', col, id, existing, updated);
    invalidateCache(col);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, col);
  }
}

async function deleteItem(col: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, col, id);
    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.exists() ? existingSnap.data() : null;

    await deleteDoc(docRef);
    if (existing) {
      await createAuditLog('HARD_DELETE', col, id, existing, null);
    }
    invalidateCache(col);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, col);
  }
}

async function restoreDocument(col: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, col, id);
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) return;
    
    const existing = existingSnap.data();
    const updated = { ...existing };
    delete updated.deletedAt;
    delete updated.deletedBy;
    
    await setDoc(docRef, updated);
    await createAuditLog('UPDATE', col, id, existing, updated);
    invalidateCache(col);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, col);
  }
}

async function saveAllToCollection<T extends { id: string }>(col: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    const existing = await getDocs(collection(db, col));
    existing.forEach(d => batch.delete(d.ref));
    items.forEach(item => batch.set(doc(db, col, item.id), JSON.parse(JSON.stringify(item))));
    await batch.commit();
    invalidateCache(col);
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
    invalidateCache(col);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, col);
  }
}

// ─── Finance Service ──────────────────────────────────────────────────────
export const finance = {
  // ── Classes ──────────────────────────────────────────────────────────────
  getClasses:       ()                 => getAllFromCollection<ClassInfo>(C.CLASSES),
  saveClass:        (c: ClassInfo)     => saveItem(C.CLASSES, c),
  deleteClass:      (id: string)       => softDeleteItem(C.CLASSES, id),
  saveAllClasses:   (cs: ClassInfo[])  => saveAllToCollection(C.CLASSES, cs),
  mergeBatchClasses:(cs: ClassInfo[])  => mergeBatchToCollection(C.CLASSES, cs),

  // ── Students ─────────────────────────────────────────────────────────────
  getStudents:       ()                 => getAllFromCollection<Student>(C.STUDENTS),
  saveStudent:       (s: Student)       => saveItem(C.STUDENTS, s),
  deleteStudent:     (id: string)       => softDeleteItem(C.STUDENTS, id),
  mergeBatchStudents:(ss: Student[])    => mergeBatchToCollection(C.STUDENTS, ss),

  // ── Services (ex-Snacks) ──────────────────────────────────────────────────
  getServices:       ()                    => getAllFromCollection<ServiceItem>(C.SERVICES),
  saveService:       (s: ServiceItem)      => saveItem(C.SERVICES, s),
  deleteService:     (id: string)          => softDeleteItem(C.SERVICES, id),
  saveAllServices:   (ss: ServiceItem[])   => saveAllToCollection(C.SERVICES, ss),
  // Legacy aliases
  getSnacks:         ()                    => getAllFromCollection<ServiceItem>(C.SERVICES),
  saveSnack:         (s: ServiceItem)      => saveItem(C.SERVICES, s),
  deleteSnack:       (id: string)          => softDeleteItem(C.SERVICES, id),
  saveAllSnacks:     (ss: ServiceItem[])   => saveAllToCollection(C.SERVICES, ss),

  // ── Invoices ─────────────────────────────────────────────────────────────
  getInvoices:       ()                 => getAllFromCollection<Invoice>(C.INVOICES),
  saveInvoice:       (inv: Invoice)     => saveItem(C.INVOICES, inv),
  deleteInvoice:     (id: string)       => softDeleteItem(C.INVOICES, id),
  saveBatchInvoices: (invs: Invoice[])  => mergeBatchToCollection(C.INVOICES, invs),

  // ── Audit Logs ───────────────────────────────────────────────────────────
  getAuditLogs:      ()                 => getAllFromCollection<AuditLog>(C.AUDIT_LOGS),


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
      originalAmount?: number;
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

      // Verifica divergência de valor entre o que foi pago e o valor do título no banco
      // Ou entre o pago e o líquido do sistema se o originalAmount não vier
      const referenceAmount = row.originalAmount || invoice.netAmount;
      const hasDivergence = Math.abs(row.amountCharged - referenceAmount) > 0.01;
      const oscilacao = row.amountCharged - referenceAmount;
      
      let notes = invoice.notes || '';

      if (hasDivergence) {
        result.divergences++;
        const divergenceNote = `[DIVERGÊNCIA BANCO] Título: R$${referenceAmount.toFixed(2)} | Pago: R$${row.amountCharged.toFixed(2)} | Dif: R$${oscilacao.toFixed(2)}`;
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
        oscilacao,
        pagador: row.pagador,
        collegeShareAmount,
        notes
      };

      batch.set(doc(db, C.INVOICES, invoice.id), JSON.parse(JSON.stringify(updated)));

      result.processed++;
      result.details.push({
        nossoNumero: row.nossoNumero,
        studentName: row.pagador,
        status: hasDivergence ? 'VALUE_DIVERGENCE' : 'OK',
        divergenceNote: hasDivergence ? `Cobrado R$${row.amountCharged.toFixed(2)} vs Título R$${referenceAmount.toFixed(2)}` : undefined
      });
    }

    await batch.commit();
    invalidateCache(C.INVOICES);
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
      const docRef = doc(db, C.CONFIG, 'global');
      const existingSnap = await getDoc(docRef);
      const existing = existingSnap.exists() ? existingSnap.data() : null;
      
      await setDoc(docRef, data, { merge: true });
      await createAuditLog('UPDATE', C.CONFIG, 'global', existing, data);
      invalidateCache(C.CONFIG);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, C.CONFIG);
    }
  },

  // ── Global Config (typed) ───────────────────────────────────────────────
  getGlobalConfig: async (): Promise<GlobalConfig | null> => {
    try {
      const snap = await getDoc(doc(db, C.CONFIG, 'global'));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        scholasticDays: data.scholasticDays || {},
        boletoEmissionFee: data.boletoEmissionFee ?? 3.50,
        defaultDueDay: data.defaultDueDay ?? 10,
        defaultCollegeSharePercent: data.defaultCollegeSharePercent ?? 20,
        ageReferenceDay: data.ageReferenceDay ?? 5,
        collegeShareBySegment: data.collegeShareBySegment || {
          'Berçário': 20,
          'Educação Infantil': 20,
          'Ensino Fundamental I': 20
        },
        mandatorySnackBySegment: data.mandatorySnackBySegment || {
          'Berçário': 'ALMOCO',
          'Educação Infantil': 'LANCHE_COLETIVO',
          'Ensino Fundamental I': 'LANCHE_COLETIVO'
        }
      };
    } catch {
      return null;
    }
  },
   saveGlobalConfig: async (data: Partial<GlobalConfig>): Promise<void> => {
    try {
      const docRef = doc(db, C.CONFIG, 'global');
      const existingSnap = await getDoc(docRef);
      const existing = existingSnap.exists() ? existingSnap.data() : null;

      await setDoc(docRef, data, { merge: true });
      await createAuditLog('UPDATE', C.CONFIG, 'global', existing, data);
      invalidateCache(C.CONFIG);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, C.CONFIG);
    }
  },

  // ─── CONSUMPTION ──────────────────────────────────────────────────────────
  getConsumption: () => getAllFromCollection<ConsumptionRecord>(C.CONSUMPTION),
  getConsumptionByMonth: async (monthYear: string): Promise<ConsumptionRecord[]> => {
    try {
      const formatted = monthYear.replace('/', '-');
      const q = query(collection(db, C.CONSUMPTION), where("monthYear", "==", formatted));
      const snap = await getDocs(q);
      const records = snap.docs.map(d => d.data() as ConsumptionRecord).filter(c => !c.deletedAt);
      
      // Fallback: check with slash if nothing found (for legacy data)
      if (records.length === 0 && monthYear.includes('/')) {
        const q2 = query(collection(db, C.CONSUMPTION), where("monthYear", "==", monthYear));
        const snap2 = await getDocs(q2);
        return snap2.docs.map(d => d.data() as ConsumptionRecord).filter(c => !c.deletedAt);
      }
      
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, C.CONSUMPTION);
      return [];
    }
  },

  saveConsumptionRecords: async (records: ConsumptionRecord[]) => {
    try {
      const batch = writeBatch(db);
      for (const record of records) {
        const docRef = doc(db, C.CONSUMPTION, record.id);
        batch.set(docRef, record, { merge: true });
      }
      await batch.commit();
      invalidateCache(C.CONSUMPTION);
    } catch (error) {
      handleFirestoreError(error, OperationType.ADD, C.CONSUMPTION);
      throw error;
    }
  },

  // ─── DATA DELETION (Danger Zone) ──────────────────────────────────────────
  
  /** Deleta alunos e todos os seus vínculos (boletos e consumos) */
  deleteStudents: async (ids: string[]) => {
    for (const id of ids) {
      await softDeleteItem(C.STUDENTS, id);
      
      const invSnap = await getDocs(query(collection(db, C.INVOICES), where("studentId", "==", id)));
      for (const d of invSnap.docs) {
        await softDeleteItem(C.INVOICES, d.id);
      }
      
      // Consumption remains a hard delete if necessary, or soft delete it
      // Let's soft delete consumption too for consistency
      const consSnap = await getDocs(query(collection(db, C.CONSUMPTION), where("studentId", "==", id)));
      for (const d of consSnap.docs) {
        await softDeleteItem(C.CONSUMPTION, d.id);
      }
    }
  },

  /** Deleta turmas e todos os alunos vinculados a elas */
  deleteClasses: async (ids: string[]) => {
    for (const classId of ids) {
      const q = query(collection(db, C.STUDENTS), where("classId", "==", classId));
      const snap = await getDocs(q);
      const studentIds = snap.docs.map(d => d.id);
      
      if (studentIds.length > 0) {
        await finance.deleteStudents(studentIds);
      }
      
      await softDeleteItem(C.CLASSES, classId);
    }
  },

  /** Deleta todos os dados financeiros (boletos e consumos) de um mês específico */
  deleteMonthlyData: async (monthYear: string) => {
    const formatted = monthYear.replace('/', '-');
    // 1. Delete Invoices (Invoices usually use slash)
    const invSnap = await getDocs(query(collection(db, C.INVOICES), where("monthYear", "==", monthYear)));
    for (const d of invSnap.docs) {
      await softDeleteItem(C.INVOICES, d.id);
    }
    
    // 2. Delete Consumption (Supports both)
    const consSnap = await getDocs(query(collection(db, C.CONSUMPTION), where("monthYear", "==", formatted)));
    for (const d of consSnap.docs) {
      await softDeleteItem(C.CONSUMPTION, d.id);
    }
    // Fallback for legacy consumption with slash
    if (monthYear.includes('/')) {
      const consSnap2 = await getDocs(query(collection(db, C.CONSUMPTION), where("monthYear", "==", monthYear)));
      for (const d of consSnap2.docs) {
        await softDeleteItem(C.CONSUMPTION, d.id);
      }
    }

    // 3. Delete Billing Draft
    await finance.clearBillingDraft(monthYear);
  },

  /** Deleta registros de consumo específicos de alunos em um mês */
  deleteConsumptionByStudentMonth: async (studentIds: string[], monthYear: string) => {
    try {
      // O Firestore permite no máximo 30 valores no operador 'in'. 
      // Processamos em lotes de 25 para segurança.
      const CHUNK_SIZE = 25;
      for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
        const chunk = studentIds.slice(i, i + CHUNK_SIZE);
        const q = query(
          collection(db, C.CONSUMPTION), 
          where("monthYear", "==", monthYear),
          where("studentId", "in", chunk)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
      invalidateCache(C.CONSUMPTION);
    } catch (error) {
      console.error('Error deleting specific consumption:', error);
      throw error;
    }
  },

  /** Restaura um documento que estava na lixeira */
  restoreItem: async (col: string, id: string) => {
    await restoreDocument(col, id);
  },

  /** Limpeza definitiva (Hard Delete) de lixeira com mais de X dias */
  purgeOldDeletedItems: async (days: number = 90) => {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const thresholdISO = thresholdDate.toISOString();

    const collectionsToCheck = [C.STUDENTS, C.CLASSES, C.INVOICES, C.SERVICES, C.CONSUMPTION];
    const batch = writeBatch(db);
    let count = 0;

    for (const col of collectionsToCheck) {
      const snap = await getDocs(collection(db, col));
      for (const d of snap.docs) {
        const data = d.data();
        if (data.deletedAt && data.deletedAt < thresholdISO) {
          batch.delete(d.ref);
          count++;
          
          // Delete audit logs related to this doc if we want, or keep them. 
          // Keeping them is better for audit trail.
        }
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    return count;
  },

  /** Busca especificamente itens deletados de todas as coleções */
  getDeletedItems: async () => {
    const collectionsToCheck = [
      { name: 'Alunos', col: C.STUDENTS },
      { name: 'Turmas', col: C.CLASSES },
      { name: 'Boletos', col: C.INVOICES },
      { name: 'Consumo', col: C.CONSUMPTION },
      { name: 'Serviços', col: C.SERVICES }
    ];
    
    const results: any[] = [];
    
    for (const { name, col } of collectionsToCheck) {
      const snap = await getDocs(collection(db, col));
      for (const d of snap.docs) {
        const data = d.data();
        if (data.deletedAt) {
          results.push({
            ...data,
            _collection: col,
            _collectionName: name
          });
        }
      }
    }
    
    return results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  },

  /** Limpa absolutamente tudo das coleções principais */
  deleteAllData: async (categories: { students?: boolean, classes?: boolean, financial?: boolean }) => {
    const batch = writeBatch(db);
    
    if (categories.financial) {
      const invs = await getDocs(collection(db, C.INVOICES));
      invs.forEach(d => batch.delete(d.ref));
      const cons = await getDocs(collection(db, C.CONSUMPTION));
      cons.forEach(d => batch.delete(d.ref));
    }
    
    if (categories.students) {
      const stds = await getDocs(collection(db, C.STUDENTS));
      stds.forEach(d => batch.delete(d.ref));
    }
    
    if (categories.classes) {
      const clss = await getDocs(collection(db, C.CLASSES));
      clss.forEach(d => batch.delete(d.ref));
    }
    
    await batch.commit();
    invalidateCache(); // Invalidate all since multiple collections were hit
  },

  // ── Billing Drafts ────────────────────────────────────────────────────────
  getBillingDraft: async (monthYear: string): Promise<BillingDraft | null> => {
    try {
      const id = monthYear.replace('/', '-');
      const snap = await getDoc(doc(db, C.BILLING_DRAFTS, id));
      return snap.exists() ? snap.data() as BillingDraft : null;
    } catch {
      return null;
    }
  },

  getBillingDrafts: async (): Promise<any[]> => {
    try {
      const snap = await getDocs(collection(db, C.BILLING_DRAFTS));
      return snap.docs.map(d => ({ ...d.data(), id: d.id.replace('-', '/') }));
    } catch {
      return [];
    }
  },

  saveBillingDraft: async (draft: BillingDraft): Promise<void> => {
    try {
      const id = draft.id.replace('/', '-');
      await setDoc(doc(db, C.BILLING_DRAFTS, id), {
        ...draft,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving billing draft:', error);
    }
  },

  clearBillingDraft: async (monthYear: string): Promise<void> => {
    try {
      const id = monthYear.replace('/', '-');
      await deleteDoc(doc(db, C.BILLING_DRAFTS, id));
    } catch { /* silent */ }
  },

  // ── Logo Management ──────────────────────────────────────────────────────
  getLogo: async (): Promise<string | null> => {
    try {
      const docRef = doc(db, C.CONFIG, 'logo');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().value as string;
      }
      return null;
    } catch (error) {
      console.warn("Error getting logo:", error);
      return null;
    }
  },

  saveLogo: async (logo: string | null): Promise<void> => {
    try {
      const docRef = doc(db, C.CONFIG, 'logo');
      await setDoc(docRef, { value: logo });
      window.dispatchEvent(new CustomEvent('cardapio:logoUpdated', { detail: logo }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${C.CONFIG}/logo`);
    }
  }
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
    } catch {
      // Silence presence errors as they are non-critical and often blocked by ad-blockers
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
    }, error => {
      console.warn("Presence subscription error (likely permissions):", error);
      callback([]); // Return empty list on error
    });
  },
};
