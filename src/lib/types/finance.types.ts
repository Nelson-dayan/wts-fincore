export interface MoneyInput {
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

export interface FinanceTotals {
  subtotal: number;
  tax: number;
  total: number;
}
