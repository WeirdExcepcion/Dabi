import { useState, useEffect } from 'react'
import './VeloEntrada.css'

function leerMarca() {
  const hay = sessionStorage.getItem('dabi_entrada_modulo') === '1'
  return hay
}

function VeloEntrada() {
  const [activo, setActivo] = useState(leerMarca)
  const [contrayendo, setContrayendo] = useState(false)

  useEffect(() => {
    if (!activo) return

    let t1 = null
    let t2 = null

    const raf = requestAnimationFrame(() => {
      t1 = setTimeout(() => setContrayendo(true), 150)
      t2 = setTimeout(() => {
        setActivo(false)
        sessionStorage.removeItem('dabi_entrada_modulo')
      }, 1000)
    })

    return () => {
      cancelAnimationFrame(raf)
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [activo])

  if (!activo) return null

  return (
    <div className={contrayendo ? 'velo-ent velo-ent_contrayendo' : 'velo-ent'} />
  )
}

export default VeloEntrada