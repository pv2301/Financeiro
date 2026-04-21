export type BillingMode = 'ANTICIPATED_FIXED' | 'ANTICIPATED_DAYS' | 'POSTPAID_CONSUMPTION';
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface Student {
  id: string;
  name: string;
  classId: string;
  responsibleName: string;
  responsibleCpf: string;
  contactPhone: string;
  personalDiscount: number; // Percentage or fixed amount
  hasTimelyPaymentDiscount: boolean; // Discount valid only until due date
}

export interface ClassInfo {
  id: string;
  name: string;
  billingMode: BillingMode;
  basePrice: number; // Fixed installment OR Base unit price
  applyAbsenceDiscount: boolean;
}

export interface Snack {
  id: string;
  name: string;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  studentId: string;
  monthYear: string; // MM/YYYY
  grossAmount: number;
  absenceDays: number;
  absenceDiscountAmount: number;
  personalDiscountAmount: number;
  netAmount: number;
  dueDate: string; // ISO string
  paymentStatus: PaymentStatus;
  ticketNumber: string; // Boleto
}
