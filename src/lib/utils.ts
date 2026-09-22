
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Data local no formato YYYY-MM-DD (para colunas DATE do banco).
 * Não usar toISOString(): ele converte para UTC e, no Brasil, depois das 21h
 * devolveria o dia seguinte.
 */
export function toLocalISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Converte uma data vinda do banco em Date local.
 * Strings "YYYY-MM-DD" (colunas DATE) são interpretadas como meia-noite LOCAL;
 * new Date('YYYY-MM-DD') as trata como UTC e mostra o dia anterior no Brasil.
 */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

/**
 * Data de vencimento no dia `dia` do mês `mes` (0-11) de `ano`, limitada ao último
 * dia do mês. new Date(2025, 1, 31) viraria 3 de março; aqui vira 28 de fevereiro.
 */
export function dateWithDayClamped(ano: number, mes: number, dia: number): Date {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(dia, ultimoDia));
}
