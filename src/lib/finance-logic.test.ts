import { describe, it, expect } from 'vitest';
import { calculateAgeInMonths, getPriceKey, calculateStudentInvoice } from './finance-logic';
import { BillingMode, ClassInfo, Student, ServiceItem } from '../types';

describe('Finance Logic', () => {
  describe('calculateAgeInMonths', () => {
    it('should calculate age correctly on reference day', () => {
      const birth = '2025-03-05';
      const refDate = new Date(2026, 2, 5); // 05/03/2026
      expect(calculateAgeInMonths(birth, refDate)).toBe(12);
    });

    it('should handle birthday not reached in month', () => {
      const birth = '2025-03-10';
      const refDate = new Date(2026, 2, 5); // 05/03/2026
      expect(calculateAgeInMonths(birth, refDate)).toBe(11);
    });
  });

  describe('getPriceKey', () => {
    const mockClass: ClassInfo = {
      id: '1', name: 'Baby 1', segment: 'Berçário', billingMode: 'PREPAID_FIXED',
      basePrice: 500, applyAbsenceDiscount: true, collegeSharePercent: 20
    } as any;

    it('should return Baby for age between 6-9 months', () => {
      const student: Student = { id: 's1', name: 'Baby', classId: '1', birthDate: '2025-08-01', personalDiscount: 0 } as any;
      // March 2026 (ref day 5) -> 7 months
      expect(getPriceKey(mockClass, student, '03/2026', 5)).toBe('Berçário|Baby');
    });

    it('should return Ninho for age between 10-12 months', () => {
      const student: Student = { id: 's1', name: 'Baby', classId: '1', birthDate: '2025-05-01', personalDiscount: 0 } as any;
      // March 2026 (ref day 5) -> 10 months
      expect(getPriceKey(mockClass, student, '03/2026', 5)).toBe('Berçário|Ninho');
    });
  });

  describe('calculateStudentInvoice', () => {
    const services: ServiceItem[] = [
      { id: 'ALMOCO', name: 'Almoço', priceByKey: { 'Berçário|Baby': 30, 'Berçário|Ninho': 35 } } as any,
      { id: 'LANCHE', name: 'Lanche', priceByKey: { 'Berçário|Baby': 15, 'Berçário|Ninho': 15 } } as any
    ];

    it('should calculate PREPAID_DAYS correctly', () => {
      const student: Student = { id: 's1', name: 'John', classId: 'c1', birthDate: '2025-08-01', personalDiscount: 10 } as any;
      const studentClass: ClassInfo = { id: 'c1', name: 'Baby', segment: 'Berçário', billingMode: 'PREPAID_DAYS', basePrice: 0, applyAbsenceDiscount: true, collegeSharePercent: 0 } as any;
      
      const result = calculateStudentInvoice({
        student,
        studentClass,
        services,
        manualAbsences: 2,
        businessDays: 20,
        monthYear: '03/2026',
        ageRefDay: 5,
        emissionFee: 3.5,
        mandatorySnackBySegment: { 'Berçário': 'ALMOCO' }
      });

      // Price for Baby Almoço = 30
      // Gross = 30 * 20 = 600
      // Absence Discount = 2 * 30 = 60
      // Base for personal discount = 600 - 60 = 540
      // Personal Discount (10%) = 54
      // Net = 540 - 54 = 486
      
      expect(result.grossAmount).toBe(600);
      expect(result.absenceDiscountAmount).toBe(60);
      expect(result.personalDiscountAmount).toBe(54);
      expect(result.netAmount).toBe(486);
      expect(result.totalServices).toBe(20);
    });

    it('should calculate PREPAID_FIXED correctly', () => {
      const student: Student = { id: 's1', name: 'John', classId: 'c1', birthDate: '2025-08-01', personalDiscount: 0 } as any;
      const studentClass: ClassInfo = { 
        id: 'c1', name: 'Baby', segment: 'Berçário', billingMode: 'PREPAID_FIXED', 
        basePrice: 1000, applyAbsenceDiscount: true, collegeSharePercent: 0
      } as any;
      
      const result = calculateStudentInvoice({
        student,
        studentClass,
        services,
        manualAbsences: 3,
        businessDays: 22,
        monthYear: '03/2026',
        ageRefDay: 5,
        emissionFee: 3.5,
        mandatorySnackBySegment: { 'Berçário': 'ALMOCO' }
      });

      // Gross = 1000
      // Unit Price (Baby Almoço) = 30
      // Absence Discount = 3 * 30 = 90
      // Net = 1000 - 90 = 910
      
      expect(result.grossAmount).toBe(1000);
      expect(result.absenceDiscountAmount).toBe(90);
      expect(result.netAmount).toBe(910);
      expect(result.totalServices).toBe(22);
    });
  });
});
