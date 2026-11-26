// Aviso de actualización del sistema, lado empresa-spa (misión aviso-actualizacion-sistema, 25/11/2026).
//
// Cubre el CA20 del plan: reconocer la marca 503 `sistema_actualizando` y que `es_falta_de_conexion`
// NO la tome por "sin conexión" (si lo hiciera, `auth/me` entraría en modo sin conexión con la sesión
// guardada en vez de mandar al login). Además deja fijadas por lectura de código las conexiones que
// no se pueden ejercitar sin navegador: la rama del interceptor, el registro del store, el mixin, y
// los componentes montados en App.vue y en el login.
//
// Ejecutar con: node --test tests/actualizacion-del-sistema.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const raiz = path.resolve(__dirname, '..')

/** Lee un archivo de src/ como texto. */
function leer(ruta) {
	return fs.readFileSync(path.join(raiz, 'src', ruta), 'utf8')
}

/** Carga el módulo de utilidades de la actualización. */
function utils() {
	return cargar('utils/actualizacion_del_sistema.js')
}

/** Un error de axios con respuesta, como el que llega a los interceptores. */
function error_axios(status, data) {
	return { isAxiosError: true, response: { status: status, data: data } }
}

/** La marca que contesta la API de empresa (contrato §2.4 / §4.3 del plan). */
const MARCA = {
	error: 'sistema_actualizando',
	message: 'Estamos actualizando el sistema. Mientras tanto no se puede usar. Cuando termine vas a poder ingresar de nuevo desde esta pantalla.',
	reintentar_en_segundos: 30,
}

// ---------------------------------------------------------------------------------------------
// CA20: reconocer la marca
// ---------------------------------------------------------------------------------------------

test('es_respuesta_de_actualizacion es true solo para 503 con error=sistema_actualizando', () => {
	const { es_respuesta_de_actualizacion } = utils()
	assert.equal(es_respuesta_de_actualizacion(error_axios(503, MARCA)), true)
	// El login bloqueado trae además las claves de siempre: sigue siendo la marca.
	assert.equal(es_respuesta_de_actualizacion(error_axios(503, Object.assign({ login: false, user: null }, MARCA))), true)
})

test('es_respuesta_de_actualizacion es false para cualquier otra cosa', () => {
	const { es_respuesta_de_actualizacion } = utils()
	// El 503 genérico del `down` de Laravel y el de un proxy caído.
	assert.equal(es_respuesta_de_actualizacion(error_axios(503, { message: 'Service Unavailable' })), false)
	assert.equal(es_respuesta_de_actualizacion(error_axios(503, '<html>Bad gateway</html>')), false)
	assert.equal(es_respuesta_de_actualizacion(error_axios(503, null)), false)
	assert.equal(es_respuesta_de_actualizacion(error_axios(503, undefined)), false)
	// La clave sola, con otro estado HTTP, no alcanza.
	assert.equal(es_respuesta_de_actualizacion(error_axios(500, MARCA)), false)
	assert.equal(es_respuesta_de_actualizacion(error_axios(403, MARCA)), false)
	assert.equal(es_respuesta_de_actualizacion(error_axios(403, { error: 'prueba_vencida' })), false)
	// Sin respuesta (red cortada) o algo que no es un error.
	assert.equal(es_respuesta_de_actualizacion({ isAxiosError: true }), false)
	assert.equal(es_respuesta_de_actualizacion(null), false)
	assert.equal(es_respuesta_de_actualizacion(undefined), false)
	assert.equal(es_respuesta_de_actualizacion(new Error('boom')), false)
})

test('es_falta_de_conexion no toma la marca por falta de conexión y conserva el resto', () => {
	const { es_falta_de_conexion } = cargar('offline/sesion_sin_conexion.js', {
		'./db': { __esModule: true, default: {} },
	})
	// La marca: el servidor contestó y dijo "estamos actualizando"; no es un corte de red.
	assert.equal(es_falta_de_conexion(error_axios(503, MARCA)), false)
	// Un 503 genérico y cualquier 5xx siguen siendo "sin conexión" (como hoy).
	assert.equal(es_falta_de_conexion(error_axios(503, { message: 'Service Unavailable' })), true)
	assert.equal(es_falta_de_conexion(error_axios(502, null)), true)
	assert.equal(es_falta_de_conexion(error_axios(500, MARCA)), true)
	// Sin respuesta (red cortada, timeout): sin conexión, como hoy.
	assert.equal(es_falta_de_conexion({ isAxiosError: true }), true)
	// Los 4xx y lo que no es de axios: no es la red, como hoy.
	assert.equal(es_falta_de_conexion(error_axios(401, {})), false)
	assert.equal(es_falta_de_conexion(error_axios(403, { error: 'prueba_vencida' })), false)
	assert.equal(es_falta_de_conexion(new Error('boom')), false)
	assert.equal(es_falta_de_conexion(null), false)
})

// ---------------------------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------------------------

test('texto_faltan conjuga una o varias computadoras', () => {
	const { texto_faltan } = utils()
	assert.equal(texto_faltan(1), 'Falta 1 computadora por confirmar')
	assert.equal(texto_faltan(2), 'Faltan 2 computadoras por confirmar')
	assert.equal(texto_faltan(10), 'Faltan 10 computadoras por confirmar')
})

test('el mensaje de la marca se toma de la API y, si no viene, hay uno por defecto', () => {
	const { mensaje_de_actualizacion, MENSAJE_SISTEMA_ACTUALIZANDO } = utils()
	assert.equal(mensaje_de_actualizacion(error_axios(503, Object.assign({}, MARCA, { message: 'Texto de la API' }))), 'Texto de la API')
	assert.equal(mensaje_de_actualizacion(error_axios(503, { error: 'sistema_actualizando' })), MENSAJE_SISTEMA_ACTUALIZANDO)
	assert.equal(mensaje_de_actualizacion(error_axios(503, { error: 'sistema_actualizando', message: '   ' })), MENSAJE_SISTEMA_ACTUALIZANDO)
	assert.match(MENSAJE_SISTEMA_ACTUALIZANDO, /actualizando el sistema/)
})

test('minutos_para_responder redondea hacia arriba y nunca baja de 1 mientras queda tiempo', () => {
	const { minutos_para_responder } = utils()
	assert.equal(minutos_para_responder(600), 10)
	assert.equal(minutos_para_responder(601), 11)
	assert.equal(minutos_para_responder(59), 1)
	assert.equal(minutos_para_responder(1), 1)
	assert.equal(minutos_para_responder(0), 0)
	assert.equal(minutos_para_responder(-5), 0)
	assert.equal(minutos_para_responder(undefined), 0)
})

// ---------------------------------------------------------------------------------------------
// Conexiones por lectura de código (la app real las verifica el Coordinador, CA22)
// ---------------------------------------------------------------------------------------------

test('main.js tiene la rama de la marca antes de la guarda de autenticado y cierra la sesión del front', () => {
	const main = leer('main.js')
	const rama = main.indexOf('es_respuesta_de_actualizacion(error)')
	assert.ok(rama !== -1, 'main.js no usa es_respuesta_de_actualizacion')
	// Tiene que estar ANTES de las banderas de skip y de la guarda de `is_authenticated` del toast.
	assert.ok(rama < main.indexOf('const skip_validation_toast'), 'la rama va antes de skip_validation_toast')
	const bloque = main.slice(rama, main.indexOf('return Promise.reject(error)', rama))
	assert.match(bloque, /actualizacion_del_sistema\/set_bloqueado/)
	assert.match(bloque, /auth\/setLoading/)
	assert.match(bloque, /auth\/setAuthenticated.*false/)
	assert.match(bloque, /auth\/setUser.*null/)
	// Es un estado normal: ninguna notificación de error en esa rama.
	assert.doesNotMatch(bloque, /toast|errorEvent/)
})

test('el store actualizacion_del_sistema esta registrado en store/index.js', () => {
	const indice = leer('store/index.js')
	assert.match(indice, /import actualizacion_del_sistema from '@\/store\/actualizacion_del_sistema'/)
	assert.match(indice, /^\s*actualizacion_del_sistema,\s*$/m)
})

test('los componentes compilan y llevan sus data-testid', () => {
	const pedido = cargar('components/common/ActualizacionPedidoOkModal.vue')
	const faltan = cargar('components/common/ActualizacionFaltanAviso.vue')
	const tarjeta = cargar('components/common/AvisoSistemaActualizando.vue')
	assert.equal(typeof pedido.default.render, 'function')
	assert.equal(typeof faltan.default.render, 'function')
	assert.equal(typeof tarjeta.default.render, 'function')
	assert.match(leer('components/common/ActualizacionPedidoOkModal.vue'), /data-testid="actualizacion-pedido-ok"/)
	assert.match(leer('components/common/ActualizacionPedidoOkModal.vue'), /data-testid="actualizacion-aceptar"/)
	assert.match(leer('components/common/ActualizacionPedidoOkModal.vue'), /data-testid="actualizacion-ahora-no"/)
	assert.match(leer('components/common/ActualizacionFaltanAviso.vue'), /data-testid="actualizacion-faltan"/)
	assert.match(leer('components/common/AvisoSistemaActualizando.vue'), /data-testid="aviso-sistema-actualizando"/)
})

test('el modal del pedido no se puede cerrar sin responder', () => {
	const modal = leer('components/common/ActualizacionPedidoOkModal.vue')
	assert.match(modal, /no-close-on-backdrop/)
	assert.match(modal, /no-close-on-esc/)
	assert.match(modal, /hide-header-close/)
	assert.match(modal, /hide-footer/)
})

test('App.vue monta el modal y la pastilla y mezcla el mixin; el diff de App.vue se mantiene chico', () => {
	const app = leer('App.vue')
	assert.match(app, /<actualizacion-pedido-ok-modal><\/actualizacion-pedido-ok-modal>/)
	assert.match(app, /<actualizacion-faltan-aviso><\/actualizacion-faltan-aviso>/)
	assert.match(app, /import actualizacion_del_sistema from '@\/mixins\/actualizacion_del_sistema'/)
	assert.match(app, /mixins: \[[^\]]*actualizacion_del_sistema[^\]]*\]/)
	// Los dos se importan estáticos (no lazy): tienen que poder dibujarse aunque el chunk ya no exista
	// porque se está reemplazando el SPA.
	assert.match(app, /import ActualizacionPedidoOkModal from /)
	assert.match(app, /import ActualizacionFaltanAviso from /)
})

test('el login monta la tarjeta y LoginForm no muestra el toast de error ante la marca', () => {
	const login = leer('common-vue/views/Login.vue')
	assert.match(login, /<aviso-sistema-actualizando\s*\/>|<aviso-sistema-actualizando><\/aviso-sistema-actualizando>/)
	assert.ok(login.indexOf('<aviso-sistema-actualizando') < login.indexOf('<login-form'), 'la tarjeta va arriba del formulario')
	// El formulario sigue en pie (el acceso maestro del humo entra por ahí).
	assert.match(login, /<login-form :split_layout="true"\s*\/>/)
	const form = leer('common-vue/components/login/LoginForm.vue')
	assert.match(form, /es_respuesta_de_actualizacion\(err\)/)
	// La rama de la marca va antes del toast genérico del catch de login().
	const catch_login = form.slice(form.indexOf('login() {'), form.indexOf('forzar_login() {'))
	assert.ok(catch_login.indexOf('es_respuesta_de_actualizacion(err)') < catch_login.indexOf('Error al ingresar'))
})

test('el canal en vivo se escucha desde listenChannelsLocal y el polling se corta al cerrar sesión', () => {
	const canales = leer('mixins/broadcast.js')
	assert.match(canales, /escuchar_actualizacion_del_sistema/)
	const mixin = leer('mixins/actualizacion_del_sistema.js')
	assert.match(mixin, /actualizacion_del_sistema\./)
	assert.match(mixin, /\.ActualizacionDelSistemaCambio/)
	assert.match(mixin, /setInterval/)
	assert.match(mixin, /clearInterval/)
	// Regla del repo: sin async/await en src/.
	assert.doesNotMatch(mixin, /\basync\b|\bawait\b/)
})
