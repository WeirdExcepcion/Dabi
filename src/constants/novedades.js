export const VERSION_ACTUAL = '2026.08.02'

export const NOVEDADES = [
  {
    version: '2026.08.02',
    fecha: '2 de agosto de 2026',
    titulo: 'Listado General y control del ministerio',
    cambios: [
      { tipo: 'nuevo', texto: 'Nueva sección "Listado General": el control de qué grupos hay que subir al Ministerio de Trabajo, con la fecha límite calculada y aviso de los que están por vencer o vencidos.' },
      { tipo: 'nuevo', texto: 'Desde ahí puedes descargar el archivo CSV con el formato que pide el ministerio, revisando antes cómo quedaron separados los nombres y apellidos.' },
      { tipo: 'nuevo', texto: 'Cuando registras el ID que devuelve el ministerio, el grupo queda cerrado y ya no admite más aprendices.' },
      { tipo: 'nuevo', texto: 'Los grupos ahora tienen supervisor y coordinador, además del entrenador.' },
      { tipo: 'nuevo', texto: 'Cada persona en Personal puede ser entrenador, supervisor, coordinador o varias cosas a la vez.' },
      { tipo: 'nuevo', texto: 'El menú lateral se puede plegar para darle más espacio a las tablas.' },
      { tipo: 'mejora', texto: 'Ya puedes matricular aprendices en grupos de días pasados, mientras no se hayan reportado al ministerio.' },
      { tipo: 'mejora', texto: 'Cada rol ve solo lo que necesita para su trabajo.' },
      { tipo: 'arreglo', texto: 'Los formularios ya no se cierran al hacer clic fuera ni al cambiar de pestaña del navegador: lo que estabas llenando se conserva.' },
      { tipo: 'arreglo', texto: 'La ARL ahora sí se guarda al crear una empresa nueva.' },
    ],
  },
  
  {
    version: '2026.07.29',
    fecha: '29 de julio de 2026',
    titulo: 'Empresas y documentos',
    cambios: [
      { tipo: 'nuevo', texto: 'Ahora puedes filtrar las empresas por sector, ARL y cantidad de aprendices, y ordenarlas como prefieras.' },
      { tipo: 'nuevo', texto: 'Al hacer clic en una empresa ves todos sus aprendices y puedes entrar a la ficha de cada uno.' },
      { tipo: 'nuevo', texto: 'El sistema avisa si estás creando una empresa que ya existe, para evitar duplicados.' },
      { tipo: 'nuevo', texto: 'Los aprendices independientes ya salen correctamente en el certificado con sus propios datos.' },
      { tipo: 'nuevo', texto: 'Puedes subir los documentos de cada aprendiz (cédula, ARL, EPS, examen médico) desde la pestaña Documentos.' },
      { tipo: 'nuevo', texto: 'Una bolita amarilla te señala qué información falta en cada matrícula.' },
      { tipo: 'mejora', texto: 'Los desplegables de empresa, ARL, EPS y cargo ahora tienen buscador.' },
      { tipo: 'mejora', texto: 'Las imágenes se comprimen al subirlas, así ocupan menos y cargan más rápido.' },
    ],
  },
]