import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Combina classes CSS de forma inteligente (Tailwind)
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Formata qualquer número para Real Brasileiro (R$ 1.700,00)
export function formatCurrency(value) {
  if (value === undefined || value === null) return "R$ 0,00";
  // Garante que o valor seja um número, mesmo que venha como string do Sanity
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

// Calcula a porcentagem de desconto entre preço atual e antigo
export function calculateDiscount(price, oldPrice) {
  if (!oldPrice || Number(oldPrice) <= Number(price)) return null;
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
  return `${discount}% OFF`;
}