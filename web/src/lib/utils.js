import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Combina classes CSS (útil para lógica condicional)
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Formata número para Real Brasileiro
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Calcula desconto (Ex: de 100 por 80 = 20% off)
export function calculateDiscount(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return null;
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
  return `${discount}% OFF`;
}