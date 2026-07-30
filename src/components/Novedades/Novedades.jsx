import { NOVEDADES } from '../../constants/novedades'
import './Novedades.css'

const ETIQUETAS = {
  nuevo: 'Nuevo',
  mejora: 'Mejora',
  arreglo: 'Corregido',
}

function Novedades({ onCerrar }) {
  return (
    <div className="novedades">
      <div className="novedades__encabezado">
        <div>
          <p className="novedades__eyebrow">Novedades</p>
          <h2 className="novedades__titulo">Qué hay de nuevo</h2>
        </div>
        <button
          type="button"
          className="novedades__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="novedades__scroll">
        {NOVEDADES.map((v) => (
          <section key={v.version} className="novedades__version">
            <div className="novedades__version-cabecera">
              <span className="novedades__version-titulo">{v.titulo}</span>
              <span className="novedades__version-fecha">{v.fecha}</span>
            </div>

            <ul className="novedades__lista">
              {v.cambios.map((c, i) => (
                <li key={i} className="novedades__item">
                  <span className={`novedades__tipo novedades__tipo_${c.tipo}`}>
                    {ETIQUETAS[c.tipo]}
                  </span>
                  <span className="novedades__texto">{c.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="novedades__pie">
        <button className="novedades__boton" onClick={onCerrar}>
          Entendido
        </button>
      </div>
    </div>
  )
}

export default Novedades