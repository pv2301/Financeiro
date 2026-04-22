// ─── Billing & Payment Enums ───────────────────────────────────────────────
export type BillingMode =
  | 'ANTICIPATED_FIXED'       // Antecipado Fixo (valor mensal fixo)
  | 'ANTICIPATED_DAYS'        // Antecipado por Dias Letivos (valor/dia × dias - faltas)
  | 'POSTPAID_CONSUMPTION';   // Pós-Pago (consumo real da catraca)

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

// ─── ClassInfo (Turma) ─────────────────────────────────────────────────────
export interface ClassInfo {
  id: string;
  name: string;                     // "1º ANO A"
  segment: string;                  // "Berçário" / "Educação Infantil" / "Ensino Fundamental I"
  billingMode: BillingMode;
  basePrice: number;                // Valor fixo mensal ou preço/dia
  applyAbsenceDiscount: boolean;
  discountPerAbsence: number;       // Valor descontado por falta (R$)
  collegeSharePercent: number;      // % do líquido que vai para o colégio
  ageRange?: string;                // Faixa etária para Berçário: "6-9m", "10-12m", "13-24m"
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
}

// ─── ServiceItem (Serviço/Lanche) ──────────────────────────────────────────
export type Segment = 'Berçário' | 'Educação Infantil' | 'Ensino Fundamental I';

export interface ServiceItem {
  id: string;
  name: string;                     // "Lanche Coletivo", "Almoço", "Ceia", "INTEGRAL"
  // Preço por segmento + faixa etária (para Berçário)
  // Chave: "Berçário|6-9m", "Berçário|10-12m", "Educação Infantil|Maternal", "Ensino Fundamental I"
  priceByKey: Record<string, number>;
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
  amountCharged?: number;           // Valor Cobrado pelo banco (pode ter juros/multa)
  oscilacao?: number;               // Diferença entre netAmount e amountCharged

  // Relatório colégio
  collegeSharePercent: number;      // % do colégio definido na turma
  boletoEmissionFee: number;        // Taxa global de emissão do boleto (deduzida antes do % colégio)
  collegeShareAmount: number;       // (netAmount - boletoEmissionFee) × collegeSharePercent / 100

  // Observações (editável pelo usuário, inclui divergências automáticas)
  notes?: string;
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
