import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
export function formatFullAge(birthDate: string, refDate: Date = new Date()): string {
  if (!birthDate) return '---';
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return '---';
  
  let years = refDate.getFullYear() - birth.getFullYear();
  let months = refDate.getMonth() - birth.getMonth();
  
  if (refDate.getDate() < birth.getDate()) {
    months--;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const yLabel = years === 1 ? 'ano' : 'anos';
  const mLabel = months === 1 ? 'mês' : 'meses';
  
  if (years === 0) return `${months} ${mLabel}`;
  if (months === 0) return `${years} ${yLabel}`;
  return `${years} ${yLabel} e ${months} ${mLabel}`;
}
