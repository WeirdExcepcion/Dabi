const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatearPesos(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return PESOS.format(Number(valor))
}
