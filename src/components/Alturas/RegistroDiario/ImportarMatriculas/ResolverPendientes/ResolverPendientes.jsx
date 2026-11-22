import { useState } from 'react'
import SelectorBuscable from '../../../../compartidos/SelectorBuscable/SelectorBuscable'
import FormularioEmpresa from '../../../../compartidos/Empresas/FormularioEmpresa/FormularioEmpresa'
import FormularioGrupo from '../../../FormularioGrupo/FormularioGrupo'
import './ResolverPendientes.css'

const SECCIONES = [
  { titulo: 'Cursos', tipos: ['curso'] },
  { titulo: 'Grupos', tipos: ['grupo'] },
  { titulo: 'Empresas', tipos: ['empresa'] },
  {
    titulo: 'Otros datos',
    nota: 'Son opcionales: lo que quede vacío aparece después en Faltantes.',
    tipos: ['nivel_educativo', 'arl', 'eps', 'area', 'cargo', 'sector'],
  },
]

// Grupos y empresas se crean en el momento, con su formulario de siempre.
const CON_FORMULARIO = ['grupo', 'empresa']

const MAXIMO_FILAS_VISIBLES = 6

function resumirFilas(filas) {
  const primeras = filas.slice(0, MAXIMO_FILAS_VISIBLES).join(', ')
  const resto = filas.length - MAXIMO_FILAS_VISIBLES
  return resto > 0 ? `${primeras} y ${resto} más` : primeras
}

function porCrearConFormulario(p) {
  return CON_FORMULARIO.includes(p.tipo) && p.puedeCrear && !p.decision
}

function ResolverPendientes({ pendientes, rol, onDecidir, onCreado }) {
  // Un solo formulario abierto a la vez, y de entrada el primero que falte:
  // si hay empresas o grupos por crear, se empieza a llenar sin buscar dónde.
  const [abierto, setAbierto] = useState(() => pendientes.find(porCrearConFormulario)?.llave ?? null)

  // Al terminar uno se abre el siguiente que falte, para llenarlos de corrido.
  function abrirSiguiente(actual) {
    const siguiente = pendientes.find((q) => q.llave !== actual.llave && porCrearConFormulario(q))
    setAbierto(siguiente?.llave ?? null)
  }

  return SECCIONES.map((seccion) => {
    const items = pendientes.filter((p) => seccion.tipos.includes(p.tipo))
    if (items.length === 0) return null

    return (
      <section key={seccion.titulo} className="resolver__seccion">
        <h3 className="resolver__titulo">{seccion.titulo}</h3>
        {seccion.nota && <p className="resolver__nota-seccion">{seccion.nota}</p>}
        <div className="resolver__lista">
          {items.map((p) => (
            <Pendiente
              key={p.llave}
              p={p}
              rol={rol}
              // El tipo solo se repite donde la sección mezcla varios.
              mostrarTipo={seccion.tipos.length > 1}
              abierto={abierto === p.llave}
              onAbrir={() => setAbierto(p.llave)}
              onCerrarFormulario={() => setAbierto(null)}
              onDecidir={(decision) => onDecidir(p.llave, decision)}
              onCreado={(entidad) => {
                onCreado(p, entidad)
                abrirSiguiente(p)
              }}
              onUsarExistente={(id) => {
                onDecidir(p.llave, { accion: 'existente', id })
                abrirSiguiente(p)
              }}
            />
          ))}
        </div>
      </section>
    )
  })
}

function etiquetaCrear(p) {
  return CON_FORMULARIO.includes(p.tipo) ? 'Crear nuevo' : `Crear "${p.texto}"`
}

// La consecuencia de lo elegido, dicha en palabras: sin esto, elegir una opción
// no se nota hasta cargar.
function estadoElegido(p) {
  const d = p.decision
  if (!d) return null
  if (d.accion === 'existente') {
    const opcion = p.opciones.find((o) => o.id === d.id) || p.sugerencias.find((o) => o.id === d.id)
    return `Se usará: ${opcion?.nombre ?? 'el elegido'}`
  }
  if (d.accion === 'vacio') return 'Quedará vacío.'
  if (d.accion === 'crear') return `Se creará "${p.texto}" al cargar.`
  return null
}

function Pendiente({
  p, rol, mostrarTipo, abierto,
  onAbrir, onCerrarFormulario, onDecidir, onCreado, onUsarExistente,
}) {
  const elegida = p.elegida
  const conFormulario = CON_FORMULARIO.includes(p.tipo)

  const acciones = [
    p.opciones.length > 0 && { id: 'existente', etiqueta: 'Usar uno existente' },
    p.puedeCrear && { id: 'crear', etiqueta: etiquetaCrear(p) },
    p.puedeVaciar && { id: 'vacio', etiqueta: 'Dejar vacío' },
  ].filter(Boolean)

  const activa = abierto ? 'crear' : elegida?.accion

  function elegirAccion(accion) {
    if (accion === 'crear' && conFormulario) {
      onAbrir()
      return
    }
    // Solo se cierra el formulario de esta tarjeta: elegir algo en otra no
    // debe tumbar lo que se está llenando aquí.
    if (abierto) onCerrarFormulario()
    if (accion === elegida?.accion) return
    if (accion === 'existente') onDecidir({ accion, id: p.sugerencias[0]?.id ?? null })
    else onDecidir({ accion })
  }

  const estado = estadoElegido(p)

  return (
    <div
      className={[
        'resolver__item',
        !p.decision && 'resolver__item_falta',
        abierto && 'resolver__item_formulario',
      ].filter(Boolean).join(' ')}
    >
      <div className="resolver__cabeza">
        <div>
          {mostrarTipo && <span className="resolver__tipo">{p.etiqueta}</span>}
          <p className="resolver__texto">{p.texto}</p>
          {p.nit && p.texto !== `NIT ${p.nit}` && <p className="resolver__nit">NIT {p.nit}</p>}
          {p.nota && <p className="resolver__nota">{p.nota}</p>}
        </div>
        <span className="resolver__filas">
          {p.filas.length === 1 ? 'Fila' : 'Filas'} {resumirFilas(p.filas)}
        </span>
      </div>

      {acciones.length === 0 ? (
        <p className="resolver__sin-salida">
          Tu rol no permite crearlo y no hay uno existente que elegir: estas filas no se
          pueden cargar. Pídele a coordinación que lo cree y vuelve a subir el archivo.
        </p>
      ) : (
        <div className="resolver__acciones" role="radiogroup" aria-label={`Qué hacer con ${p.texto}`}>
          {acciones.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={activa === a.id}
              className={
                activa === a.id ? 'resolver__accion resolver__accion_activa' : 'resolver__accion'
              }
              onClick={() => elegirAccion(a.id)}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
      )}

      {!abierto && estado && <p className="resolver__estado">{estado}</p>}

      {!abierto && elegida?.accion === 'existente' && (
        <div className="resolver__detalle">
          {p.sugerencias.length > 0 && (
            <div className="resolver__sugerencias">
              <span className="resolver__sugerencias-titulo">Parecidos:</span>
              {p.sugerencias.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={
                    elegida.id === s.id
                      ? 'resolver__sugerencia resolver__sugerencia_activa'
                      : 'resolver__sugerencia'
                  }
                  onClick={() => onDecidir({ accion: 'existente', id: s.id })}
                >
                  {s.nombre}
                </button>
              ))}
            </div>
          )}
          <SelectorBuscable
            id={`resolver_${p.llave}`}
            opciones={p.opciones}
            valor={elegida.id ? String(elegida.id) : ''}
            onCambio={(id) => onDecidir({ accion: 'existente', id: id ? Number(id) : null })}
            placeholder="Buscar…"
            vacioTexto="Elige uno…"
          />
        </div>
      )}

      {abierto && p.tipo === 'empresa' && (
        <div className="resolver__formulario">
          <FormularioEmpresa
            inicial={p.inicial}
            rol={rol}
            onGuardada={onCreado}
            onCancelar={onCerrarFormulario}
            onUsarExistente={onUsarExistente}
          />
        </div>
      )}

      {abierto && p.tipo === 'grupo' && (
        <div className="resolver__formulario">
          <FormularioGrupo
            inicial={p.inicial}
            onCreado={onCreado}
            onCancelar={onCerrarFormulario}
          />
        </div>
      )}
    </div>
  )
}

export default ResolverPendientes
