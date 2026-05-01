// ─── Billing & Payment Enums ───────────────────────────────────────────────
export type BillingMode = 'PREPAID_FIXED' | 'PREPAID_DAYS' | 'POSTPAID_CONSUMPTION';

export const BILLING_MODE_LABELS: Record<BillingMode, string> = {
  'PREPAID_FIXED': 'Pré-Pago Fixo',
  'PREPAID_DAYS': 'Pré-Pago por Dias Letivos',
  'POSTPAID_CONSUMPTION': 'Pós-Pago',
};

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

// ─── ClassInfo (Turma) ─────────────────────────────────────────────────────
export interface ClassInfo {
  id: string;
  name: string;                     // "1º ANO A"
  segment: string;                  // "Berçário" / "Educação Infantil" / "Ensino Fundamental I"
  billingMode: BillingMode;
  basePrice: number | string;       // Valor fixo mensal ou fórmula texto
  applyAbsenceDiscount: boolean;
  collegeSharePercent: number;      // % do líquido que vai para o colégio
  globalDiscountParams?: {
    discountPercent: number; // Porcentagem que o colégio desconta do bruto do Canteen
  };

  deletedAt?: string | null;
  deletedBy?: string | null;
}

// ─── ConsumptionRecord (Consumo de Catraca) ────────────────────────────────
export interface ConsumptionRecord {
  id: string; // "studentId_YYYY-MM"
  studentId: string;
  monthYear: string; // ex: "04-2026"
  periodLabel: string; // "De 01/04/2026 até 30/04/2026"
  summary: { 
    [serviceName: string]: number 
  };
  dailyDetails: {
    date: string; // "01/04/2026"
    items: { serviceName: string, quantity: number }[]
  }[];
  deletedAt?: string | null;
  deletedBy?: string | null;
}

// ─── Student (Aluno) ───────────────────────────────────────────────────────
export interface Student {
  id: string;
  name: string;
  classId: string;
  segment: string;
  birthDate: string;

  responsibleName: string;
  responsibleCpf: string;
  contactPhone: string;
  contactEmail: string;
  landlinePhone?: string;

  motherName?: string;
  motherCpf?: string;
  motherEmail?: string;
  motherPhone1?: string;
  motherPhone2?: string;

  fatherName?: string;
  fatherCpf?: string;
  fatherEmail?: string;
  fatherPhone1?: string;
  fatherPhone2?: string;

  personalDiscount: number;
  personalDiscountNote?: string;    // "Funcionário", "Acordo", etc.
  hasTimelyPaymentDiscount: boolean;
  filenameSuffix: string;
  dueDay?: number; // Dia de vencimento preferencial (1-31)
  deletedAt?: string | null;
  deletedBy?: string | null;
}

// ─── ServiceItem (Serviço/Lanche) ──────────────────────────────────────────
export type Segment = 'Berçário' | 'Educação Infantil' | 'Ensino Fundamental I';

export interface ServiceItem {
  id: string;
  name: string;                     // "Lanche Coletivo", "Almoço", "Ceia", "INTEGRAL"
  // Preço por segmento + faixa etária (para Berçário)
  // Chave: "Berçário|6-9m", "Berçário|10-12m", "Educação Infantil|Maternal", "Ensino Fundamental I"
  priceByKey: Record<string, number>;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

// Legacy alias for backward compat
export type Snack = ServiceItem;

// ─── Invoice (Boleto) ─────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  studentId: string;
  classId: string;
  monthYear: string;                // "ABRIL/2026"
  dueDate: string;                  // ISO string
  billingMode: BillingMode;
  bankSlipNumber?: string;
  note?: string;

  // Valores
  grossAmount: number;              // Valor bruto antes de descontos
  absenceDays: number;
  absenceDiscountAmount: number;
  personalDiscountAmount: number;
  netAmount: number;                // Valor do Título (enviado ao banco)

  // Boleto bancário
  nossoNumero: string;              // Gerado pelo banco, inserido manualmente ou via importação
  filename: string;                 // "NOMEALUNO_" padrão para PDF

  // Pagamento
  paymentStatus: PaymentStatus;
  paymentDate?: string;             // Data da Liquidação (vem da planilha do banco)
  paymentMethod?: 'PIX' | 'BOLETO'; // Método de pagamento (preenchido na baixa manual)
  amountCharged?: number;           // Valor Cobrado pelo banco (pode ter juros/multa)
  pagador?: string;                 // Nome de quem pagou (vem da planilha do banco)
  oscilacao?: number;               // Diferença entre netAmount e amountCharged
  
  createdAt?: string;               // Data de geração da fatura (ISO)

  // Relatório colégio
  collegeSharePercent: number;      // % do colégio definido na turma
  boletoEmissionFee: number;        // Taxa global de emissão do boleto (deduzida antes do % colégio)
  collegeShareAmount: number;       // (netAmount - boletoEmissionFee) × collegeSharePercent / 100
  totalServices?: number;           // Always calculate total services if consumption exists, regardless of billing mode

  // Observações (editável pelo usuário, inclui divergências automáticas)
  notes?: string;
  error?: string;
  isIntegral?: boolean;
  hasImportedConsumption?: boolean;
  items?: { description?: string; type?: string; amount?: number; name?: string; quantity?: number }[]; // Added for detailed reports and display
  archivedAt?: string;
  cancelledAt?: string;

  deletedAt?: string | null;
  deletedBy?: string | null;
}

// ─── UserPresence (Colaboração em Tempo Real) ──────────────────────────────
export interface UserPresence {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  currentPage: string;              // Rota atual: "/students", "/invoices"...
  lastSeen: number;                 // timestamp em ms
}

// ─── ImportResult (Resultado de importação) ───────────────────────────────
export interface StudentImportResult {
  studentsAdded: Student[];
  studentsUpdated: Student[];
  classesCreated: ClassInfo[];
  classesRenamed: Array<{ oldName: string; newName: string; classId: string }>;
  totalStudents: number;
}

// ─── PaymentImportResult (Baixa de boletos) ───────────────────────────────
export interface PaymentImportResult {
  processed: number;
  notFound: number;
  divergences: number;
  details: Array<{
    nossoNumero: string;
    studentName: string;
    status: 'OK' | 'NOT_FOUND' | 'VALUE_DIVERGENCE';
    divergenceNote?: string;
  }>;
}

// ─── GlobalConfig (Configurações Gerais) ──────────────────────────────────
export interface GlobalConfig {
  scholasticDays: Record<string, number | string>;
  boletoEmissionFee: number;
  defaultDueDay: number;
  defaultCollegeSharePercent: number;
  integralCollegeSharePercent: number;
  ageReferenceDay: number;
  collegeShareBySegment?: Record<string, number>;
  mandatorySnackBySegment?: Record<string, string>; // { 'Berçário': 'ALMOCO', ... }
  messageTemplates?: {
    fixed: string;
    consumption: string;
    integral: string;
  };
  presenceEnabled?: boolean;
}

// ─── Audit Log (Trilha de Auditoria) ──────────────────────────────────────
export interface AuditLog {
  id: string;
  action: string;
  collection: string;
  collectionName?: string; // Alias for UI
  docId: string;
  documentId?: string; // Alias for UI
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  performedBy: string;
  userEmail?: string; // Alias for UI
  performedAt: string;
  timestamp: string; // Alias for UI (used as date string)
  deletedAt?: string | null;
}

// ─── BillingDraft (Draft of manual entries in Monthly Processing) ─────────
export interface BillingDraft {
  id: string; // monthYear (e.g., "04-2026")
  manualAbsences: Record<string, number>;
  bankSlipNumbers: Record<string, string>;
  manualDueDates?: Record<string, string>;
  invoiceNotes?: Record<string, string>;
  integralItems?: Record<string, any>;
  removedStudentIds?: string[];
  selectedIds?: string[];
  categoryPrices?: Record<string, number>; // New: Category-based monthly prices
  lastUpdated?: string;
}

// ─── SystemStats (Dashboard High Performance) ─────────────────────────────
export interface SystemStats {
  totalStudents: number;
  totalClasses: number;
  totalInvoices: number;
  totalUnpaidInvoices: number;
  unpaidAmount: number;
  revenueCurrentMonth: number;
  paidInvoicesMonth: number;
  
  // Reports Support
  monthlySummary: Record<string, {
    faturado: number;
    recebido: number;
    paidCount: number;
    pendingCount: number;
  }>;
  segmentSummary: Record<string, {
    faturado: number;
    recebido: number;
  }>;
  topDevedores: Array<{
    studentId: string;
    studentName: string;
    amount: number;
  }>;

  lastUpdated: string;
}

export interface DataVersions {
  students: string;
  classes: string;
  services: string;
  invoices: Record<string, string>;
  drafts: Record<string, string>;
}

