export const getSPIColor = (spi: number) => {
  if (spi >= 0.95) return 'text-green-600'
  if (spi >= 0.80) return 'text-yellow-600'
  return 'text-red-600'
}

export const getCPIColor = (cpi: number) => {
  if (cpi >= 0.95) return 'text-green-600'
  if (cpi >= 0.80) return 'text-yellow-600'
  return 'text-red-600'
}

export const getDelayRateColor = (rate: number) => {
  if (rate <= 5) return 'text-green-600'
  if (rate <= 20) return 'text-yellow-600'
  return 'text-red-600'
}
