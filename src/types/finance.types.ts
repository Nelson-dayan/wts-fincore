export interface LineItemInput {
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface FinanceTotals {
  subtotal: number;
  tax: number;
  total: number;
}
