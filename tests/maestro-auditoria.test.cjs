const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

test('actualizar el perfil conserva el límite de descarga básico y respeta el cambio explícito a full', () => {
	const anterior = global.window
	global.window = { localStorage: { setItem() {}, clear() {} } }
	try {
		const auth = cargar('store/auth.js', {
			axios: { __esModule: true, default: { defaults: {} } },
			vue: { __esModule: true, default: {} },
			'@/runtime_config': { env: () => 'https://api.test' },
			'@/utils/canales_en_vivo': { set_canales_en_vivo() {} },
			'@/offline/sesion_sin_conexion': {},
		}).default
		const state = { user: { id: 10, es_acceso_maestro: true, es_sesion_soporte: false, skip_offline_articles_sync: true, master_login_mode: 'login' } }
		const cambiar = user => auth.mutations.setUser.call({ commit() {} }, state, user)
		cambiar({ id: 10, name: 'Perfil actualizado' })
		assert.equal(state.user.skip_offline_articles_sync, true)
		assert.equal(state.user.master_login_mode, 'login')
		cambiar({ id: 10, es_acceso_maestro: true, skip_offline_articles_sync: false, master_login_mode: 'login_full' })
		assert.equal(state.user.skip_offline_articles_sync, false)
		assert.equal(state.user.master_login_mode, 'login_full')
		state.user.es_sesion_soporte = true
		cambiar({ id: 10, es_acceso_maestro: true, es_sesion_soporte: false })
		assert.equal(state.user.es_sesion_soporte, false)
		cambiar({ id: 11 })
		assert.equal(state.user.es_acceso_maestro, undefined)
		assert.equal(state.user.skip_offline_articles_sync, undefined)
	} finally { global.window = anterior }
})

test('full puede guardar su sesión offline y básico sigue excluido por la omisión de artículos', () => {
	const { puede_guardar_sesion } = cargar('offline/sesion_sin_conexion.js', { './db': { __esModule: true, default: {} } })
	const maestro = { id: 10, es_acceso_maestro: true, sync_offline_articles: true }
	assert.equal(puede_guardar_sesion({ ...maestro, skip_offline_articles_sync: true }), false)
	assert.equal(puede_guardar_sesion({ ...maestro, skip_offline_articles_sync: false }), true)
	assert.equal(puede_guardar_sesion({ ...maestro, es_sesion_soporte: true }), false)
	assert.equal(puede_guardar_sesion({ ...maestro, sync_offline_articles: false }), false)
})

test('el maestro puede auditar el progreso de implementación y el soporte firmado no cambia', () => {
	const { puede_ver_implementacion } = cargar('store/implementacion.js', { axios: { __esModule: true, default: {} } })
	const auth = { authenticated: true, user: { id: 10, prueba: { activa: true }, es_acceso_maestro: true } }
	assert.equal(puede_ver_implementacion(auth), true)
	assert.equal(puede_ver_implementacion({ ...auth, user: { ...auth.user, es_sesion_soporte: true } }), false)
	assert.equal(puede_ver_implementacion({ ...auth, user: { ...auth.user, owner_id: 2 } }), false)
})
