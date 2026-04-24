import { Student, ClassInfo, ServiceItem, BillingMode, Invoice } from '../types';

export function calculateAgeInMonths(birthDateStr: string, refDate: Date): number {
  if (!birthDateStr) return 0;
  const birth = new Date(birthDateStr);
  let years = refDate.getFullYear() - birth.getFullYear();
  let months = refDate.getMonth() - birth.getMonth();
  if (refDate.getDate() < birth.getDate()) {
    months--;
  }
  return (years * 12) + months;
}

export function getPriceKey(studentClass: ClassInfo, student: Student | null, processingMonthYear: string, ageRefDay: number): string {
  const seg = studentClass.segment;
  const name = studentClass.name.toLowerCase();
  
  if (seg === 'Berçário') {
    if (!student?.birthDate) return 'Berçário|Baby';
    
    const [m, y] = processingMonthYear.split('/').map(Number);
    const refDay = ageRefDay || 5; 
    const refDate = new Date(y, m - 1, refDay); 
    const ageMonths = calculateAgeInMonths(student.birthDate, refDate);
    
    if (ageMonths >= 6 && ageMonths <= 9) return 'Berçário|Baby';
    if (ageMonths >= 10 && ageMonths <= 12) return 'Berçário|Ninho';
    if (ageMonths >= 13 && ageMonths <= 24) return 'Berçário|Extra';
    
    return ageMonths < 6 ? 'Berçário|Baby' : 'Berçário|Extra';
  }
  
  if (seg === 'Educação Infantil') {
    if (name.includes('maternal')) return 'Educação Infantil|Maternal';
    if (name.includes('grupo 1')) return 'Educação Infantil|Grupo 1';
    if (name.includes('grupo 2')) return 'Educação Infantil|Grupo 2';
    if (name.includes('grupo 3')) return 'Educação Infantil|Grupo 3';
    return 'Educação Infantil|Maternal'; 
  }

  if (seg === 'Ensino Fundamental I' || seg === 'Fundamental') {
    if (name.includes('1º') || name.includes('1o') || name.includes('ano 1')) return 'Ensino Fundamental I|Ano 1';
    if (name.includes('2º') || name.includes('2o') || name.includes('ano 2')) return 'Ensino Fundamental I|Ano 2';
    if (name.includes('3º') || name.includes('3o') || name.includes('ano 3')) return 'Ensino Fundamental I|Ano 3';
    if (name.includes('4º') || name.includes('4o') || name.includes('ano 4')) return 'Ensino Fundamental I|Ano 4';
    if (name.includes('5º') || name.includes('5o') || name.includes('ano 5')) return 'Ensino Fundamental I|Ano 5';
    return 'Ensino Fundamental I|Ano 1'; 
  }
  
  return studentClass.segment;
}

export interface CalculationInput {
  student: Student;
  studentClass: ClassInfo;
  services: ServiceItem[];
  consumption?: {
    summary: Record<string, number>;
  };
  manualAbsences: number;
  businessDays: number;
  monthYear: string;
  ageRefDay: number;
  emissionFee: number;
  collegeShareBySegment?: Record<string, number>;
  mandatorySnackBySegment?: Record<string, string>;
}

export function calculateStudentInvoice(input: CalculationInput): Partial<Invoice> {
  const { student, studentClass, services, consumption, manualAbsences, businessDays, monthYear, ageRefDay, emissionFee, collegeShareBySegment, mandatorySnackBySegment } = input;
  
  let totalServices = 0;
  let grossAmount = 0;
  let absenceDiscountAmount = 0;
  let personalDiscountAmount = 0;
  let netAmount = 0;
  
  // Se for férias (dias letivos = 0) e não houver consumo, zerar tudo para Pré-Pago
  if (businessDays === 0 && studentClass.billingMode !== 'POSTPAID_CONSUMPTION') {
    return {
      grossAmount: 0,
      absenceDiscountAmount: 0,
      personalDiscountAmount: 0,
      netAmount: 0,
      totalServices: 0,
      collegeShareAmount: 0,
      collegeSharePercent: studentClass.collegeSharePercent,
      billingMode: studentClass.billingMode
    };
  }

  // 1. Calculate Total Services
  if (consumption && consumption.summary) {
    Object.entries(consumption.summary).forEach(([_, qty]) => {
      totalServices += qty;
    });
  }

  if (studentClass.billingMode === 'PREPAID_FIXED' || studentClass.billingMode === 'PREPAID_DAYS') {
    // Rule: one service per day based on scholastic days
    totalServices = businessDays; 
  }

  // 2. Calculate Gross Amount and Absence Discount
  if (studentClass.billingMode === 'POSTPAID_CONSUMPTION') {
    if (consumption && consumption.summary) {
      Object.entries(consumption.summary).forEach(([snackName, qty]) => {
        const svc = services.find(s => s.name.toLowerCase() === snackName.toLowerCase());
        if (svc) {
          const priceKey = getPriceKey(studentClass, student, monthYear, ageRefDay);
          const price = svc.priceByKey[priceKey] || 0;
          grossAmount += (price * qty);
        }
      });
    }
    netAmount = grossAmount;
  } 
  else if (studentClass.billingMode === 'PREPAID_DAYS') {
    const priceKey = getPriceKey(studentClass, student, monthYear, ageRefDay);
    
    const mandatoryId = mandatorySnackBySegment ? mandatorySnackBySegment[studentClass.segment] : null;
    const baseService = services.find(s => s.id === mandatoryId);
    
    if (!baseService) {
      return {
        grossAmount: 0,
        absenceDiscountAmount: 0,
        personalDiscountAmount: 0,
        netAmount: 0,
        totalServices: 0,
        collegeShareAmount: 0,
        collegeSharePercent: 0,
        billingMode: studentClass.billingMode,
        error: `Lanche referencial não configurado para ${studentClass.segment}`
      };
    }

    const unitPrice = baseService.priceByKey[priceKey] || 0;

    grossAmount = unitPrice * businessDays;
    absenceDiscountAmount = manualAbsences * unitPrice;
    
    netAmount = grossAmount - absenceDiscountAmount;
  }
  else {
    // PREPAID_FIXED
    grossAmount = typeof studentClass.basePrice === 'number' ? studentClass.basePrice : 0;
    
    if (studentClass.applyAbsenceDiscount) {
      const priceKey = getPriceKey(studentClass, student, monthYear, ageRefDay);
      const mandatoryId = mandatorySnackBySegment ? mandatorySnackBySegment[studentClass.segment] : null;
      
      const baseService = services.find(s => s.id === mandatoryId);
      
      if (!baseService) {
        return {
          grossAmount: studentClass.basePrice || 0,
          absenceDiscountAmount: 0,
          personalDiscountAmount: 0,
          netAmount: 0,
          totalServices: 0,
          collegeShareAmount: 0,
          collegeSharePercent: 0,
          billingMode: studentClass.billingMode,
          error: `Lanche referencial não configurado para ${studentClass.segment}`
        };
      }

      const unitPrice = baseService.priceByKey[priceKey] || 0;
      absenceDiscountAmount = manualAbsences * unitPrice;
    }

    netAmount = grossAmount - absenceDiscountAmount;
  }

  // 3. Calculate Personal Discount (Percentage)
  if (student.personalDiscount > 0) {
    const baseAfterAbsence = grossAmount - absenceDiscountAmount;
    personalDiscountAmount = baseAfterAbsence * (student.personalDiscount / 100);
  }
  
  // netAmount is Base - Absence Discount - Personal Discount (Emission Fee removed from calculations as per request)
  netAmount = Math.max(0, grossAmount - absenceDiscountAmount - personalDiscountAmount);

  // 4. College Share calculation
  // Precedence: Class Specific > Segment Default > 0
  const segmentShare = collegeShareBySegment ? (collegeShareBySegment[studentClass.segment] || 0) : 0;
  const effectiveSharePercent = (studentClass.collegeSharePercent > 0) 
    ? studentClass.collegeSharePercent 
    : segmentShare;

  const collegeBase = netAmount; 
  const collegeShareAmount = Math.max(0, collegeBase * (effectiveSharePercent / 100));

  return {
    grossAmount,
    absenceDiscountAmount,
    personalDiscountAmount,
    netAmount,
    totalServices,
    collegeShareAmount,
    collegeSharePercent: effectiveSharePercent,
    billingMode: studentClass.billingMode,
    error: undefined
  };
}
