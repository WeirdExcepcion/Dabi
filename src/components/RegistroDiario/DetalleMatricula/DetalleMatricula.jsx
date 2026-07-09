import './DetalleMatricula.css'

const ESTADOS = {
  en_proceso: 'En proceso',
  faltan_documentos: 'Faltan documentos',
  esperando_fecha: 'Esperando fecha',
  certificado: 'Certificado',
  anulado: 'Anulado',
}

function formatearFecha(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="detalle__dato">
      <p className="detalle__etiqueta">{etiqueta}</p>
      <p className="detalle__valor">{valor || '—'}</p>
    </div>
  )
}

function DetalleMatricula({ matricula, onCerrar }) {
  const a = matricula.aprendices
  const g = matricula.grupos

  const examenVencido =
    matricula.examen_vence && matricula.examen_vence < new Date().toISOString().slice(0, 10)

  return (
    <div className="detalle">
      <div className="detalle__encabezado">
        <div>
          <p className="detalle__eyebrow">Detalle de matrícula</p>
          <h2 className="detalle__titulo">
            {a.apellidos} {a.nombres}
          </h2>
          <p className="detalle__subtitulo">
            {a.tipo_documento} {a.numero_documento}
            {' · '}
            <span className={`detalle__estado detalle__estado_${matricula.estado}`}>
              {ESTADOS[matricula.estado]}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="detalle__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="detalle__seccion">
        <p className="detalle__seccion-titulo">Datos personales</p>
        <div className="detalle__grilla">
          <Dato etiqueta="Sexo" valor={a.sexo} />
          <Dato etiqueta="RH" valor={a.rh} />
          <Dato etiqueta="Fecha de nacimiento" valor={formatearFecha(a.fecha_nacimiento)} />
          <Dato etiqueta="País" valor={a.pais} />
          <Dato etiqueta="Nivel educativo" valor={a.niveles_educativos?.nombre} />
        </div>
      </div>

      <div className="detalle__seccion">
        <p className="detalle__seccion-titulo">Grupo</p>
        <div className="detalle__grilla">
          <Dato
            etiqueta="Curso"
            valor={`${g.cursos.nombre}${g.identificador ? ` (${g.identificador})` : ''}`}
          />
          <Dato etiqueta="Inicio" valor={formatearFecha(g.fecha_inicio)} />
          <Dato etiqueta="Fin" valor={formatearFecha(g.fecha_fin)} />
          <Dato etiqueta="Entrenador" valor={g.entrenador?.nombre_completo} />
        </div>
      </div>

      <div className="detalle__seccion">
        <p className="detalle__seccion-titulo">Empresa y cargo</p>
        <div className="detalle__grilla">
          <Dato etiqueta="Empresa" valor={matricula.empresas.razon_social} />
          <Dato etiqueta="Área" valor={matricula.areas?.nombre} />
          <Dato etiqueta="Cargo" valor={matricula.cargos?.nombre} />
        </div>
      </div>

      <div className="detalle__seccion">
        <p className="detalle__seccion-titulo">Documentos</p>
        <div className="detalle__grilla">
          <Dato etiqueta="ARL" valor={matricula.arls?.nombre} />
          <Dato etiqueta="Fecha ARL" valor={formatearFecha(matricula.fecha_arl)} />
          <Dato etiqueta="EPS" valor={matricula.eps?.nombre} />
          <Dato etiqueta="Examen médico" valor={formatearFecha(matricula.fecha_examen)} />
          <div className="detalle__dato">
            <p className="detalle__etiqueta">Vence examen</p>
            <p className={`detalle__valor ${examenVencido ? 'detalle__valor_alerta' : ''}`}>
              {formatearFecha(matricula.examen_vence)}
              {examenVencido && ' (vencido)'}
            </p>
          </div>
        </div>
      </div>

      <div className="detalle__pie">
        <Dato etiqueta="Fecha de ingreso" valor={formatearFecha(matricula.fecha_ingreso)} />
      </div>
    </div>
  )
}

export default DetalleMatricula