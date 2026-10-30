import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tiện ích kết hợp class Tailwind CSS an toàn, tự động loại bỏ class trùng lặp.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

