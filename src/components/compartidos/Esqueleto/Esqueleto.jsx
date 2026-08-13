import './Esqueleto.css'

export function EsqueletoTabla({ filas = 5, columnas = 6 }) {
  return (
    <div className="esq__tabla-wrap">
      <div className="esq__cabecera">
        {Array.from({ length: columnas }).map((_, i) => (
          <div key={i} className="esq__th" />
        ))}
      </div>

      {Array.from({ length: filas }).map((_, f) => (
        <div key={f} className="esq__fila" style={{ animationDelay: `${f * 0.05}s` }}>
          {Array.from({ length: columnas }).map((_, c) => (
            <div
              key={c}
              className="esq__celda"
              style={{ width: c === 0 ? '60%' : c === 1 ? '85%' : '70%' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EsqueletoTarjetas({ cantidad = 6 }) {
  return (
    <div className="esq__tarjetas">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="esq__tarjeta" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="esq__linea esq__linea_titulo" />
          <div className="esq__linea esq__linea_corta" />
          <div className="esq__linea" />
        </div>
      ))}
    </div>
  )
}

export function EsqueletoBloque({ altura = 120 }) {
  return <div className="esq__bloque" style={{ height: `${altura}px` }} />
}