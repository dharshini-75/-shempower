/**
 * Centralized Indian Currency Formatting Module for SHEmpower
 * Ensures clean whole-rupee display without unnecessary decimals (.00, .50, .60)
 * Uses standard Indian numbering system (e.g. ₹1,800, ₹10,000, ₹1,00,000)
 */

export const formatCur = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  const rounded = Math.round(Number(num));
  return `₹${rounded.toLocaleString('en-IN')}`;
};

export const formatCurPlain = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const rounded = Math.round(Number(num));
  return rounded.toLocaleString('en-IN');
};

export const formatCurRs = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rs 0';
  const rounded = Math.round(Number(num));
  return `Rs ${rounded.toLocaleString('en-IN')}`;
};
