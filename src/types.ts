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
  segment: string;                  // "Ensino Fundamental I" / "Educação Infantil"
  billingMode: BillingMode;
  basePrice: number;                // Valor fixo mensal (ANTICIPATED_FIXED) ou preço/dia (ANTICIPATED_DAYS)
  applyAbsenceDiscount: boolean;
  discountPerAbsence: number;       // Valor descontado por falta (R$)
  collegeSharePercent: number;      // % do líquido que vai para o colégio
  // Dias letivos por mês – chave: "YYYY-MM", valor: número de dias
  scholasticDays: Record<string, number>;
}

// ─── Student (Aluno) ───────────────────────────────────────────────────────
export interface Student {
  id: string;                       // CPF do responsável financeiro (único)
  name: string;                     // ALUNO
  classId: string;                  // FK → fin_classes
  segment: string;                  // car (Ensino Fundamental I)
  birthDate: string;                // DATANASCALUNO (ISO)

  // Responsável Financeiro
  responsibleName: string;          // NOME_RESPONS_FIN
  responsibleCpf: string;           // CPF_RESP_FIN
  contactPhone: string;             // TEL_RESP
  contactEmail: string;             // EMAIL_RESP
  landlinePhone?: string;           // TELEX

  // Dados adicionais (opcionais na importação)
  motherName?: string;              // MAE
  motherCpf?: string;               // CPF_MAE
  motherEmail?: string;             // EMAIL_MAE
  motherPhone1?: string;            // TEL_MAE1
  motherPhone2?: string;            // TEL_MAE2

  fatherName?: string;              // PAI
  fatherCpf?: string;               // CPF_PAI
  fatherEmail?: string;             // EMAIL_PAI
  fatherPhone1?: string;            // TEL_PAI1
  fatherPhone2?: string;            // TEL_PAI2

  // Descontos acordados
  personalDiscount: number;         // % ou valor fixo
  personalDiscountNote?: string;    // Observação (ex: "Filho de funcionária")
  hasTimelyPaymentDiscount: boolean;

  // Padrão para nome do arquivo PDF do boleto: "NOMECOMPLETO_"
  filenameSuffix: string;           // ex: "ALICESANTOSBARBOZA_"
}

// ─── Snack (Lanche) ────────────────────────────────────────────────────────
export interface Snack {
  id: string;
  name: string;
  unitPrice: number;
}

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
