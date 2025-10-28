
export interface Denomination {
  currency: 'USD' | 'CDF'
  value: number
  label: string
  quantity: number
}

export const USD_DENOMINATIONS: Denomination[] = [
  { currency: 'USD', value: 100, label: '100 USD', quantity: 0 },
  { currency: 'USD', value: 50, label: '50 USD', quantity: 0 },
  { currency: 'USD', value: 20, label: '20 USD', quantity: 0 },
  { currency: 'USD', value: 10, label: '10 USD', quantity: 0 },
  { currency: 'USD', value: 5, label: '5 USD', quantity: 0 },
  { currency: 'USD', value: 1, label: '1 USD', quantity: 0 },
]

export const CDF_DENOMINATIONS: Denomination[] = [
  { currency: 'CDF', value: 20000, label: '20,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 10000, label: '10,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 5000, label: '5,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 1000, label: '1,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 500, label: '500 CDF', quantity: 0 },
  { currency: 'CDF', value: 100, label: '100 CDF', quantity: 0 },
]