export const VERSION_ACTUAL = '2026.08.11'

export const NOVEDADES = [
  {
    version: '2026.08.11',
    fecha: '11 de agosto de 2026',
    titulo: 'Documentos y personal',
    cambios: [
      { tipo: 'nuevo', texto: 'Al subir la ARL puedes marcar si es una planilla, y en el certificado previo si es del SENA.' },
      { tipo: 'nuevo', texto: 'En Personal ahora eliges las funciones con casillas: entrenador, supervisor y coordinador, marcando las que apliquen.' },
      { tipo: 'nuevo', texto: 'Un coordinador solo necesita nombre y documento; la licencia y el título son opcionales para esa función.' },
      { tipo: 'mejora', texto: 'La bolita amarilla de datos faltantes se actualiza al instante cuando completas la información, sin recargar la página.' },
      { tipo: 'mejora', texto: 'Al desactivar a alguien en Personal, el sistema explica qué va a pasar antes de confirmarlo.' },
      { tipo: 'arreglo', texto: 'La fecha límite para reportar al ministerio ahora se calcula sola al crear cada grupo.' },
      { tipo: 'arreglo', texto: 'El nivel educativo ya aparece completo al abrir la edición de un aprendiz.' },
      { tipo: 'arreglo', texto: 'Las tablas anchas ya no descuadran el encabezado de la página.' },
    ],
  },
  {
    version: '2026.08.08',
    fecha: '8 de agosto de 2026',
    titulo: 'Permisos por rol y cargos',
    cambios: [
      { tipo: 'nuevo', texto: 'Cada rol ve solo las secciones y los botones que necesita para su trabajo.' },
      { tipo: 'nuevo', texto: 'Ahora puedes crear un cargo nuevo desde el mismo formulario de matrícula, sin salir a otra pantalla.' },
      { tipo: 'nuevo', texto: 'Si escribes un cargo parecido a uno que ya existe, el sistema te lo muestra antes de crear uno repetido.' },
      { tipo: 'nuevo', texto: 'Desde la ficha del aprendiz puedes corregir sus datos personales: nombres, sexo, RH, fecha de nacimiento, país y nivel educativo.' },
      { tipo: 'nuevo', texto: 'Se agregaron 10 EPS que faltaban en la lista.' },
      { tipo: 'mejora', texto: 'Un entrenador ahora solo ve los grupos pendientes de reportar, sin las secciones administrativas.' },
      { tipo: 'arreglo', texto: 'El nivel educativo ya aparece correctamente al editar un aprendiz.' },
      { tipo: 'arreglo', texto: 'El formulario para crear un grupo desde la matrícula ya no aparece duplicado y permite elegir supervisor.' },
      { tipo: 'arreglo', texto: 'Se corrigieron permisos internos que permitían acciones desde fuera del sistema.' },
    ],
  },
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