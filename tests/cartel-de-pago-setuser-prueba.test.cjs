// CA36, ronda 2 (misión embudo-juan-pipeline, E4): el cartel de pago no puede volver durante la prueba
// cuando algún lugar (Cropper.vue al subir el logo, deleteImage) reemplaza al usuario con el modelo pelado
// de la API, sin `prueba`. Se prueba la mutación real `auth/setUser` (con sus imports mockeados) y la
// regla del cartel con el usuario que queda en el state. Además: fechas de pago inválidas no muestran nada.
const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// Lunes 23/11/2026 al mediodía, hora local.
const hoy = new Date(2026, 10, 23, 12, 0, 0)

/**
 * Corre `auth/setUser` real sobre un state con `usuario_actual` y devuelve el usuario que queda.
 *
 * @param {Object} usuario_actual Usuario ya guardado en la sesión.
 * @param {Object} usuario_nuevo Lo que llega (por ejemplo el modelo de un endpoint).
 * @returns {Object}
 */
function aplicar_set_user(usuario_actual, usuario_nuevo) {
	// localStorage mínimo: setUser lo usa para guardar el id.
	global.window = { localStorage: { setItem() {}, clear() {} } }
	const store = cargar('store/auth.js', {
		axios: { defaults: {} },
		vue: { set() {} },
		'@/runtime_config': { env: () => '' },
		'@/utils/canales_en_vivo': { set_canales_en_vivo() {} },
		'@/offline/sesion_sin_conexion': { leer_sesion() {}, es_falta_de_conexion() {} },
	}).default
	const state = { user: usuario_actual }
	store.mutations.setUser.call({ commit() {} }, state, usuario_nuevo)
	return state.user
}

test('setUser con el modelo sin `prueba` (logo/foto) conserva la prueba y el cartel no vuelve', () => {
	const { debe_mostrar_cartel_de_pago } = cargar('components/nav/payment_expire_reglas.js')
	const en_prueba = { id: 7, prueba: { activa: true, vence_at: '2027-11-23', vencida: false } }
	const owner = { payment_expired_at: '2026-11-22' }
	const resultado = aplicar_set_user(en_prueba, { id: 7, name: 'Raúl' })
	assert.deepEqual(resultado.prueba, en_prueba.prueba)
	assert.equal(debe_mostrar_cartel_de_pago(resultado, owner, hoy), false)
})

test('setUser con otro usuario no arrastra la prueba', () => {
	const en_prueba = { id: 7, prueba: { activa: true, vence_at: '2027-11-23', vencida: false } }
	const resultado = aplicar_set_user(en_prueba, { id: 8 })
	assert.equal(typeof resultado.prueba, 'undefined')
})

test('si el usuario nuevo trae `prueba`, manda la que viene', () => {
	const en_prueba = { id: 7, prueba: { activa: true, vence_at: '2027-11-23', vencida: false } }
	const vencida = { activa: true, vence_at: '2026-11-01', vencida: true }
	assert.deepEqual(aplicar_set_user(en_prueba, { id: 7, prueba: vencida }).prueba, vencida)
})

test('fechas de pago inválidas no muestran cartel ni modal', () => {
	const { debe_mostrar_cartel_de_pago, debe_abrir_aviso_vencido } = cargar('components/nav/payment_expire_reglas.js')
	const cliente_real = { id: 1 }
	;['basura', '0000-00-00 00:00:00', '2026-13-45'].forEach(fecha => {
		const owner = { payment_expired_at: fecha }
		assert.equal(debe_mostrar_cartel_de_pago(cliente_real, owner, hoy), false, 'cartel con ' + fecha)
		assert.equal(debe_abrir_aviso_vencido(cliente_real, owner, hoy), false, 'modal con ' + fecha)
	})
})
