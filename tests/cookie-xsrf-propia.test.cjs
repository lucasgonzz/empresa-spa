// Cookie CSRF propia del sistema en una prueba gratuita (misión prueba-e2e-campana-imperio, ronda 4, 14/11/2026).
//
// El sistema y la tienda de la prueba viven bajo `.comerciocity.com` y escribían la misma `XSRF-TOKEN`: el sistema le
// pisaba el token a la tienda (419). En una prueba la API emite su token en `XSRF-<host de la API>` y el SPA lo lee de ahí.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const axios = require('axios')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const {
	nombre_cookie_xsrf_propia, hay_cookie, cookie_xsrf_del_pedido, interceptor_cookie_xsrf_propia,
} = cargar('utils/cookie_xsrf_propia.js')

const API = 'https://api-ferreteria-la-esquin.comerciocity.com'
const PROPIA = 'XSRF-api_ferreteria_la_esquin_comerciocity_com'

test('el nombre sale del host de la API: letras y números, todo lo demás guion bajo', () => {
	assert.equal(nombre_cookie_xsrf_propia(API), PROPIA)
	assert.equal(nombre_cookie_xsrf_propia('https://api-masquito.comerciocity.com/'), 'XSRF-api_masquito_comerciocity_com')
	assert.equal(nombre_cookie_xsrf_propia('http://localhost:8001'), 'XSRF-localhost', 'Sin puerto: el host solo.')
	assert.equal(nombre_cookie_xsrf_propia('HTTPS://API-X.ComercioCity.com/api'), 'XSRF-api_x_comerciocity_com')
	assert.equal(nombre_cookie_xsrf_propia(undefined), null)
	assert.equal(nombre_cookie_xsrf_propia('/api'), null)
})

test('usa la propia solo si existe y solo para pedidos a la API; si no, deja la de siempre', () => {
	const con_propia = 'XSRF-TOKEN=de_la_tienda; ' + PROPIA + '=del_sistema; laravel_session=x'
	const solo_comun = 'XSRF-TOKEN=del_sistema; laravel_session=x'
	assert.equal(cookie_xsrf_del_pedido({ baseURL: API, url: '/sanctum/csrf-cookie' }, API, con_propia), PROPIA)
	assert.equal(cookie_xsrf_del_pedido({ baseURL: API + '/api', url: 'article' }, API, con_propia), PROPIA)
	assert.equal(cookie_xsrf_del_pedido({ url: API + '/broadcasting/auth' }, API, con_propia), PROPIA)
	assert.equal(cookie_xsrf_del_pedido({ baseURL: API, url: '/api/user' }, API, solo_comun), null, 'Cliente fuera de prueba: como hoy.')
	assert.equal(cookie_xsrf_del_pedido({ baseURL: API, url: 'https://api.bluelytics.com.ar/v2/latest' }, API, con_propia), null,
		'A otro host no se le cambia nada.')
	assert.equal(cookie_xsrf_del_pedido({ url: '/img/x.png' }, API, con_propia), null, 'Sin base: no es un pedido a la API.')

	// Que el nombre aparezca como sufijo o adentro de otro no cuenta.
	assert.equal(hay_cookie('OTRA-' + PROPIA + '=1', PROPIA), false)
	assert.equal(hay_cookie(PROPIA + 'X=1', PROPIA), false)
	assert.equal(hay_cookie(PROPIA + '=1', PROPIA), true)
	assert.equal(hay_cookie('a=1;' + PROPIA + '=', PROPIA), true)
})

test('el interceptor llega al adaptador de axios y la lectura de axios encuentra la cookie con guiones y guiones bajos', () => {
	const anterior = global.document
	global.document = { cookie: 'XSRF-TOKEN=de_la_tienda; ' + PROPIA + '=del%3Dsistema' }
	// Los interceptores corren asincrónicos: el document falso se devuelve al terminar la cadena.
	const vistos = []
	const instancia = axios.create({ baseURL: API, withCredentials: true, adapter: config => {
		vistos.push(config.xsrfCookieName)
		return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
	} })
	instancia.interceptors.request.use(interceptor_cookie_xsrf_propia(() => API))
	return instancia.get('/sanctum/csrf-cookie').then(() => {
		assert.deepEqual(vistos, [PROPIA])
		// Copia textual de `cookies.read` de axios 1.2.1 (lib/helpers/cookies.js:35-36), que usa el adaptador xhr
		// (lib/adapters/xhr.js:182-186) para armar el header X-XSRF-TOKEN.
		const match = global.document.cookie.match(new RegExp('(^|;\\s*)(' + PROPIA + ')=([^;]*)'))
		assert.equal(match && decodeURIComponent(match[3]), 'del=sistema')

		global.document.cookie = 'XSRF-TOKEN=del_sistema'
		return instancia.get('/api/user')
	}).then(() => assert.deepEqual(vistos, [PROPIA, 'XSRF-TOKEN'])).finally(() => {
		global.document = anterior
	})
})
