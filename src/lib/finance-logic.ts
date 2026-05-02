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

/**
 * Normaliza nomes de serviços importados para os nomes padrão do sistema.
 * Garante que variações de digitação ou nomes de planilhas externas encontrem o preço correto.
 */
export function normalizeServiceName(name: string): string {
  const n = name.toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  
  // Mapeamentos específicos para Berçário (Tallita)
  // Normalizamos para incluir "DA" se o sistema espera "DA", ou removemos se o sistema não tiver.
  // Aqui assumimos o padrão "LANCHE DA TARDE" como alvo.
  if (n.includes('LANCHE') && (n.includes('TARDE') || n.includes('VESPERTINO'))) {
    return 'LANCHE DA TARDE';
  }
  if (n.includes('LANCHE') && (n.includes('MANHA') || n.includes('MATUTINO'))) {
    return 'LANCHE DA MANHÃ';
  }
  
  if (n.includes('ALMOCO')) return 'ALMOÇO';
  if (n.includes('CEIA')) return 'CEIA';
  
  // Casos específicos de prefixos/sufixos (Ex: ALMOCO - CFC BABY)
  if (n.includes('CFC BABY') || n.includes('CFCBABY')) {
    if (n.includes('ALMOCO')) return 'ALMOÇO';
    if (n.includes('CEIA')) return 'CEIA';
  }

  if (n.includes('LANCHE') && n.includes('COLETIVO')) return 'LANCHE COLETIVO';
  if (n.includes('LANCHE') && n.includes('INTEGRAL')) return 'LANCHE INTEGRAL';
  
  return n;
}

export function getPriceKey(studentClass: ClassInfo, student: Student | null, processingMonthYear: string, ageRefDay: number): string {
  const isConsumption = studentClass.billingMode === 'POSTPAID_CONSUMPTION' || (studentClass as any).hasImportedConsumption;
  
  // Normalização do mês/ano (aceita MM/yyyy ou YYYY-MM ou MM-yyyy)
  let month = 0;
  let year = 0;
  if (processingMonthYear.includes('/')) {
    [month, year] = processingMonthYear.split('/').map(Number);
  } else if (processingMonthYear.includes('-')) {
    const parts = processingMonthYear.split('-');
    if (parts[0].length === 4) { // YYYY-MM
      year = Number(parts[0]);
      month = Number(parts[1]);
    } else { // MM-YYYY
      month = Number(parts[0]);
      year = Number(parts[1]);
    }
  }

  // Se for modo CONSUMO, ignora a turma e usa apenas a idade baseada na tabela do Berçário
  // Regra do Usuário: "Todo consumo importado da aba CONSUMO deve ser feito apenas com base na idade da criança nao importando sua turma"
  if (isConsumption) {
    if (student && student.birthDate) {
      const refDate = new Date(year, month - 1, ageRefDay || 1); 
      const ageMonths = calculateAgeInMonths(student.birthDate, refDate);
      
      if (ageMonths <= 9) return 'Berçário|Baby';
      if (ageMonths <= 12) return 'Berçário|Ninho';
      return 'Berçário|Extra';
    }
    return 'Berçário|Extra'; // Fallback se não tiver data de nascimento
  }

  const seg = studentClass.segment;
  const name = (studentClass.name || "").toLowerCase();

  // Lógica normal por turma para faturamentos Fixos ou Integrais
  if (seg === 'Berçário') {
    if (!student || !student.birthDate) return 'Berçário|Baby';
    
    const refDate = new Date(year, month - 1, ageRefDay || 1); 
    const ageMonths = calculateAgeInMonths(student.birthDate, refDate);
    
    if (ageMonths <= 9) return 'Berçário|Baby';
    if (ageMonths <= 12) return 'Berçário|Ninho';
    return 'Berçário|Extra';
  }
  
  if (seg === 'Educação Infantil') {
    const n = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); // Remove acentos
    if (n.includes('maternal')) return 'Educação Infantil|Maternal';
    if (n.includes('grupo 1') || n.includes('g1')) return 'Educação Infantil|Grupo 1';
    if (n.includes('grupo 2') || n.includes('g2')) return 'Educação Infantil|Grupo 2';
    if (n.includes('grupo 3') || n.includes('g3')) return 'Educação Infantil|Grupo 3';
    return 'Educação Infantil|Maternal'; 
  }
  
  if (seg === 'Ensino Fundamental I' || seg === 'Fundamental') {
    const n = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (n.includes('1') || n.includes('ano 1')) return 'Ensino Fundamental I|Ano 1';
    if (n.includes('2') || n.includes('ano 2')) return 'Ensino Fundamental I|Ano 2';
    if (n.includes('3') || n.includes('ano 3')) return 'Ensino Fundamental I|Ano 3';
    if (n.includes('4') || n.includes('ano 4')) return 'Ensino Fundamental I|Ano 4';
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
  categoryPrices?: Record<string, number>; // New
}

export function calculateStudentInvoice(input: CalculationInput): Partial<Invoice> {
  const { 
    student, studentClass, services, consumption, 
    manualAbsences, businessDays, monthYear, ageRefDay, 
    collegeShareBySegment, mandatorySnackBySegment, categoryPrices 
  } = input;
  
  let totalServices = 0;
  let grossAmount = 0;
  let absenceDiscountAmount = 0;
  let personalDiscountAmount = 0;
  let comboDiscountAmount = 0;
  let netAmount = 0;
  let distinctServicesCount = 0;
  let applyAbsenceDiscount = studentClass.applyAbsenceDiscount;

  // Rule: Force absence discount for PREPAID modes
  if (studentClass.billingMode === 'PREPAID_FIXED' || studentClass.billingMode === 'PREPAID_DAYS') {
    applyAbsenceDiscount = true;
  }

  // 1. Calculate Total Services (Informative mainly)
  if (consumption && consumption.summary) {
    Object.entries(consumption.summary).forEach(([_, qty]) => {
      totalServices += qty;
    });
  }
  if (studentClass.billingMode === 'PREPAID_FIXED' || studentClass.billingMode === 'PREPAID_DAYS') {
    totalServices = businessDays; 
  }

  // 2. Calculate Gross Amount based on Billing Mode
  if (studentClass.billingMode === 'PREPAID_FIXED') {
    const className = studentClass.name.toUpperCase();
    let dynamicPrice = 0;

    if (className.includes('GRUPO') && categoryPrices?.['GRUPO']) {
      dynamicPrice = categoryPrices['GRUPO'];
    } else if (className.includes('MATERNAL') && categoryPrices?.['MATERNAL']) {
      dynamicPrice = categoryPrices['MATERNAL'];
    } else {
      dynamicPrice = typeof studentClass.basePrice === 'number' ? studentClass.basePrice : 0;
    }
    grossAmount = dynamicPrice;
  } 
  else if (studentClass.billingMode === 'PREPAID_DAYS') {
    const priceKey = getPriceKey(studentClass, student, monthYear, ageRefDay);
    const mandatoryId = mandatorySnackBySegment ? mandatorySnackBySegment[studentClass.segment] : null;
    const baseService = services.find(s => s.id === mandatoryId);
    
    if (baseService) {
      const unitPrice = baseService.priceByKey[priceKey] || 0;
      grossAmount = businessDays * unitPrice;
    } else {
      const fallbackPrice = typeof studentClass.basePrice === 'number' ? studentClass.basePrice : 0;
      grossAmount = businessDays * fallbackPrice;
      (input as any)._error = `Lanche referencial não configurado para ${studentClass.segment}`;
    }
  } 
  else if (studentClass.billingMode === 'POSTPAID_CONSUMPTION') {
    if (consumption && consumption.summary) {
      distinctServicesCount = Object.keys(consumption.summary).length;
      Object.entries(consumption.summary).forEach(([snackName, qty]) => {
        const normalized = normalizeServiceName(snackName);
        
        // Busca agressiva: normaliza ambos os lados
        let svc = services.find(s => {
          const dbNormalized = normalizeServiceName(s.name);
          return dbNormalized === normalized || s.id === normalized;
        });
        
        if (!svc && normalized === 'LANCHE COLETIVO') {
          svc = services.find(s => normalizeServiceName(s.name).includes('LANCHE COLETIVO'));
        }

        if (svc) {
          const priceKey = getPriceKey(studentClass, student, monthYear, ageRefDay);
          const price = svc.priceByKey[priceKey] || 0;
          grossAmount += (price * qty);
          
          if (price === 0) {
            (input as any)._debug = `${(input as any)._debug || ''} [Preço 0: ${snackName} p/ ${priceKey}]`.trim();
          }
        } else {
          (input as any)._debug = `${(input as any)._debug || ''} [Não encontrado: ${snackName}]`.trim();
          console.warn(`[finance-logic] Serviço não encontrado para cálculo: ${snackName} (Normalizado: ${normalized})`);
        }
      });
    }
  }

  // 3. Combo Discount calculation (Consumption only)
  if (studentClass.billingMode === 'POSTPAID_CONSUMPTION' && distinctServicesCount > 1) {
    comboDiscountAmount = grossAmount * 0.10;
  }

  // 4. Absence Discount calculation
  if (applyAbsenceDiscount && manualAbsences > 0) {
    const priceKey = getPriceKey(studentClass, student, monthYear, ageRefDay);
    const mandatoryId = mandatorySnackBySegment ? mandatorySnackBySegment[studentClass.segment] : null;
    const baseService = services.find(s => s.id === mandatoryId);
    
    if (baseService) {
      const unitPrice = baseService.priceByKey[priceKey] || 0;
      absenceDiscountAmount = manualAbsences * unitPrice;
    } else if (studentClass.billingMode !== 'POSTPAID_CONSUMPTION') {
      (input as any)._error = `Lanche referencial não configurado para ${studentClass.segment}`;
    }
  }

  // 5. Final amounts
  // Combo discount IS subtracted from netAmount for consumption IMMEDIATELY (not punctuality)
  netAmount = Math.max(0, grossAmount - comboDiscountAmount - absenceDiscountAmount);

  // 6. Personal Discount (Now always treated as punctuality discount per user request)
  if (student.personalDiscount > 0) {
    // For Consumption: Rule says apply Personal only if Combo criterion was NOT met
    if (studentClass.billingMode === 'POSTPAID_CONSUMPTION') {
      if (comboDiscountAmount === 0) {
        personalDiscountAmount = netAmount * (student.personalDiscount / 100);
        // Note: Personal discount for consumption is punctuality-based -> do NOT subtract from netAmount
      } else {
        personalDiscountAmount = 0; // Non-cumulative
      }
    } else {
      // For Monthly/Integral: Always calculate for display (punctuality)
      personalDiscountAmount = netAmount * (student.personalDiscount / 100);
      // Note: do NOT subtract from netAmount
    }
  }

  const segmentShare = collegeShareBySegment ? (collegeShareBySegment[studentClass.segment] || 0) : 0;
  const effectiveSharePercent = (studentClass.collegeSharePercent > 0) 
    ? studentClass.collegeSharePercent 
    : segmentShare;

  const collegeShareAmount = Math.max(0, netAmount * (effectiveSharePercent / 100));

  return {
    grossAmount,
    absenceDiscountAmount,
    personalDiscountAmount,
    comboDiscountAmount,
    netAmount,
    totalServices,
    collegeShareAmount,
    collegeSharePercent: effectiveSharePercent,
    billingMode: studentClass.billingMode,
    error: (input as any)._error,
    debug: (input as any)._debug
  } as Partial<Invoice>;
}
