// Visibilidad de las cajas (misión cajas-permisos-claros, 24/11/2026): quién VE una caja en Tesorería y
// quién la USA en Vender. La regla es una sola y vive en src/utils/visibilidad_de_caja.js (espejo de la
// que aplica la API): lista de Tesorería -> si está vacía, lista de Vender -> si también, todos.
//
// Cubre CA6, CA7 y CA8 del PLAN.md. Ejecutar con: node --test tests/visibilidad-de-caja.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const {
	ve_en_tesoreria,
	opera_en_vender,
	origen_tesoreria,
	resumen_por_empleado,
	empleados_de_la_sucursal,
	texto_estado_vender,
	texto_estado_tesoreria,
} = cargar('utils/visibilidad_de_caja.js')

const SUC_A = 11
const SUC_B = 22

// Permiso que habilita entrar a Tesorería.
const con_tesoreria = [{ slug: 'caja.index' }]

const brisa = { id: 1, name: 'Brisa', owner_id: 99, address_id: SUC_A, admin_access: 0, permissions: con_tesoreria }
const beto = { id: 2, name: 'Beto', owner_id: 99, address_id: SUC_B, admin_access: 0, permissions: con_tesoreria }
const carla = { id: 3, name: 'Carla', owner_id: 99, address_id: SUC_A, admin_access: 0, permissions: [{ slug: 'vender.index' }] }
const admin = { id: 4, name: 'Admin', owner_id: 99, address_id: null, admin_access: 1, permissions: [] }
const duenio = { id: 99, name: 'Dueño', owner_id: null, address_id: null, admin_access: 0, permissions: [] }

const caja_a = { id: 100, name: 'Caja A', address_id: SUC_A, treasury_users: [{ id: brisa.id }], users: [] }
const caja_b = { id: 200, name: 'Caja B', address_id: SUC_B, treasury_users: [{ id: beto.id }], users: [] }
const caja_libre = { id: 300, name: 'Caja libre', address_id: null, treasury_users: [], users: [] }
const caja_hereda = { id: 400, name: 'Hereda', address_id: null, treasury_users: [], users: [{ id: brisa.id }] }

test('CA6 ve_en_tesoreria: lista de Tesorería, herencia de Vender y vacío = todos', () => {
	assert.equal(ve_en_tesoreria(caja_a, brisa), true)
	assert.equal(ve_en_tesoreria(caja_b, brisa), false)
	assert.equal(ve_en_tesoreria(caja_libre, brisa), true)
	// Herencia (CA2): Tesorería vacía y Vender con gente -> sólo los de Vender.
	assert.equal(ve_en_tesoreria(caja_hereda, brisa), true)
	assert.equal(ve_en_tesoreria(caja_hereda, beto), false)
})

test('CA6 ve_en_tesoreria: el dueño y el administrador ven todas', () => {
	assert.equal(ve_en_tesoreria(caja_b, duenio), true)
	assert.equal(ve_en_tesoreria(caja_b, admin), true)
})

test('CA6 ve_en_tesoreria: si la caja trae el campo del servidor, se respeta', () => {
	assert.equal(ve_en_tesoreria({ ...caja_libre, ve_en_tesoreria: false }, brisa), false)
	assert.equal(ve_en_tesoreria({ ...caja_b, ve_en_tesoreria: true }, brisa), true)
	// 0/1 (como puede mandarlo el backend) también valen.
	assert.equal(ve_en_tesoreria({ ...caja_b, ve_en_tesoreria: 1 }, brisa), true)
	assert.equal(ve_en_tesoreria({ ...caja_a, ve_en_tesoreria: 0 }, brisa), false)
})

test('CA6 opera_en_vender: lista de Vender, vacío = todos, admin siempre', () => {
	const con_lista = { id: 500, users: [{ id: brisa.id }], treasury_users: [] }
	assert.equal(opera_en_vender(con_lista, brisa), true)
	assert.equal(opera_en_vender(con_lista, beto), false)
	assert.equal(opera_en_vender(caja_libre, beto), true)
	assert.equal(opera_en_vender(con_lista, admin), true)
	assert.equal(opera_en_vender(con_lista, duenio), true)
	// Una lista de Tesorería no habilita ni quita operar en Vender.
	assert.equal(opera_en_vender(caja_a, beto), true)
	assert.equal(opera_en_vender({ ...con_lista, opera_en_vender: false }, brisa), false)
})

test('CA6 origen_tesoreria: de dónde sale la regla', () => {
	assert.equal(origen_tesoreria(caja_a), 'lista_tesoreria')
	assert.equal(origen_tesoreria(caja_hereda), 'lista_vender')
	assert.equal(origen_tesoreria(caja_libre), 'todos')
	assert.equal(origen_tesoreria({ ...caja_libre, origen_visibilidad_tesoreria: 'lista_vender' }), 'lista_vender')
})

test('CA7 resumen_por_empleado de Caja A', () => {
	const filas = resumen_por_empleado(caja_a, [brisa, beto, carla])
	assert.equal(filas.length, 3)

	const fila_brisa = filas.find(f => f.id == brisa.id)
	assert.equal(fila_brisa.name, 'Brisa')
	assert.equal(fila_brisa.sucursal_id, SUC_A)
	assert.equal(fila_brisa.entra_a_tesoreria, true)
	assert.equal(fila_brisa.ve_en_tesoreria, true)
	assert.equal(fila_brisa.motivo_tesoreria, 'Está en la lista')

	const fila_beto = filas.find(f => f.id == beto.id)
	assert.equal(fila_beto.ve_en_tesoreria, false)
	assert.equal(fila_beto.motivo_tesoreria, 'No está en la lista')

	const fila_carla = filas.find(f => f.id == carla.id)
	assert.equal(fila_carla.entra_a_tesoreria, false)
	assert.equal(fila_carla.ve_en_tesoreria, false)
	assert.equal(fila_carla.motivo_tesoreria, 'No tiene permiso para entrar a Tesorería')

	// Vender: lista vacía, los tres la usan.
	filas.forEach(fila => {
		assert.equal(fila.usa_en_vender, true)
		assert.equal(fila.motivo_vender, 'Lista vacía: la pueden usar todos')
	})
})

test('CA7 resumen_por_empleado: administrador, herencia y las dos listas vacías', () => {
	const sobre_hereda = resumen_por_empleado(caja_hereda, [brisa, beto, admin])
	assert.equal(sobre_hereda.find(f => f.id == brisa.id).motivo_tesoreria, 'Sin lista de Tesorería: se usa la de Vender')
	assert.equal(sobre_hereda.find(f => f.id == brisa.id).ve_en_tesoreria, true)
	assert.equal(sobre_hereda.find(f => f.id == beto.id).ve_en_tesoreria, false)
	assert.equal(sobre_hereda.find(f => f.id == admin.id).motivo_tesoreria, 'Administrador: ve todas')
	assert.equal(sobre_hereda.find(f => f.id == admin.id).ve_en_tesoreria, true)

	const sobre_libre = resumen_por_empleado(caja_libre, [brisa, carla])
	assert.equal(sobre_libre.find(f => f.id == brisa.id).motivo_tesoreria, 'Lista vacía: la ven todos')
	assert.equal(sobre_libre.find(f => f.id == brisa.id).ve_en_tesoreria, true)
	// Aun con las listas vacías, quien no entra a Tesorería no la ve.
	assert.equal(sobre_libre.find(f => f.id == carla.id).ve_en_tesoreria, false)
})

test('CA7 resumen_por_empleado: reacciona a las listas sin guardar (sólo mira la caja que recibe)', () => {
	const editada = { ...caja_libre, treasury_users: [{ id: brisa.id }] }
	const filas = resumen_por_empleado(editada, [brisa, beto])
	assert.equal(filas.find(f => f.id == brisa.id).ve_en_tesoreria, true)
	assert.equal(filas.find(f => f.id == beto.id).ve_en_tesoreria, false)
})

test('CA8 empleados_de_la_sucursal', () => {
	assert.deepEqual(empleados_de_la_sucursal(SUC_A, [brisa, beto]), [brisa.id])
	assert.deepEqual(empleados_de_la_sucursal(777, [brisa, beto]), [])
	assert.deepEqual(empleados_de_la_sucursal(null, [brisa, beto]), [])
})

test('textos de estado de las listas', () => {
	assert.equal(texto_estado_vender(caja_libre), 'Lista vacía: TODOS los empleados pueden usar esta caja en Vender.')
	assert.equal(texto_estado_vender({ users: [{ id: 1, name: 'Ana' }, { id: 2, name: 'Pedro' }] }), 'Sólo estos 2 empleados la usan en Vender.')
	assert.equal(texto_estado_vender({ users: [{ id: 1, name: 'Ana' }] }), 'Sólo 1 empleado la usa en Vender.')

	const libre = texto_estado_tesoreria(caja_libre)
	assert.match(libre.texto, /TODOS los empleados con permiso de Tesorería ven esta caja/)
	assert.equal(libre.aviso, true)

	const hereda = texto_estado_tesoreria({ treasury_users: [], users: [{ id: 1, name: 'Ana' }, { id: 2, name: 'Pedro' }] })
	assert.match(hereda.texto, /se usa la lista de Vender \(Ana, Pedro\)/)
	assert.equal(hereda.aviso, false)

	const propia = texto_estado_tesoreria({ treasury_users: [{ id: 1, name: 'Ana' }], users: [] })
	assert.equal(propia.texto, 'Sólo 1 empleado la ve en Tesorería.')
	assert.equal(propia.aviso, false)
})
