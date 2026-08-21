import { useState } from 'react'

// Los cargos que el usuario crea al vuelo (con SelectorCargo) todavía no están
// en el catálogo cargado, así que se guardan aquí para que aparezcan en la lista
// sin tener que recargar. Evita duplicados contra lo local y contra el catálogo.
export function useCargosLocales(cargosCatalogo) {
  const [cargosLocales, setCargosLocales] = useState([])

  function agregarCargo(nuevo) {
    setCargosLocales((antes) => {
      const yaEsta =
        antes.some((c) => c.id === nuevo.id) ||
        (cargosCatalogo ?? []).some((c) => c.id === nuevo.id)
      return yaEsta ? antes : [...antes, nuevo]
    })
  }

  return { cargosLocales, agregarCargo }
}