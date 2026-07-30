export const MODULOS = [
  {
    id: 'alturas',
    nombre: 'Alturas',
    descripcion: 'Formación, grupos y certificación en trabajo seguro en alturas',
    ruta: '/alturas/registro',
    roles: [
      'admin',
      'gerente-general',
      'director-operaciones',
      'coordinador-procesos',
      'coordinador',
      'supervisor',
      'auxiliar-admin',
      'entrenador',
      'espectador',
    ],
  },
  {
    id: 'contabilidad',
    nombre: 'Contabilidad',
    descripcion: 'Facturación, cartera y reportes financieros',
    ruta: '/contabilidad',
    roles: [
      'admin',
      'gerente-general',
      'director-operaciones',
      'coordinador-procesos',
      'contable',
      'auxiliar-cont',
    ],
  },
]

export function modulosDelRol(rol) {
  return MODULOS.filter((m) => m.roles.includes(rol))
}