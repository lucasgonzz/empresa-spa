// Misión envios-andreani, CA12/CA13 (empresa-spa): un pedido que la tienda marcó con
// `envio_proveedor = 'andreani'` no se despacha por Zipnova: el comercio lo carga a mano en el portal
// de Andreani con los datos del botón "Copiar datos" del modal Envío (PLAN §2.4; decisión P1 de Lucas,
// 25/11/2026: esta etapa NO genera órdenes ni etiquetas por la API de Andreani).
//
// Funciones puras de `src/utils/formas_de_envio.js` (lo que el PLAN define para este archivo):
//  - `envio_va_por_andreani(order)`: espejo de `Order::envio_va_por_andreani()` de empresa-api.
//  - `texto_datos_andreani(order, integracion)`: el texto plano que copia el botón "Copiar datos".
//    NOTA PARA EL PROGRAMADOR: el PLAN no fija el nombre de esta función; este test la fija en
//    `formas_de_envio.js` junto a `envio_va_por_zipnova`. `integracion` es el item de
//    `GET integraciones` (`{slug:'andreani', conectado, config:{cliente, contrato_domicilio,
//    contrato_sucursal, ...}}`, PLAN §10.4).
//
// Ejecutar con: node --test tests/envio-andreani.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const formas = cargar('utils/formas_de_envio.js')
const { envio_va_por_zipnova, envio_va_por_andreani, texto_datos_andreani } = formas

// --- Fixtures ------------------------------------------------------------------------------------

/** Item de la tarjeta Andreani tal como lo devuelve GET integraciones (sin secretos, PLAN §10.4). */
const integracion = {
	slug: 'andreani',
	name: 'Andreani',
	conectado: true,
	config: {
		cliente: 'CL0003750',
		contrato_domicilio: '400006709',
		contrato_sucursal: '400006711',
		sucursal_origen: null,
		api_cargada: false,
	},
}

/** Opción a domicilio con dos bultos (el segundo pesa menos de un kilo). */
const opcion_domicilio = {
	key: 'andreani|domicilio',
	proveedor: 'andreani',
	carrier_name: 'Andreani',
	service_type: 'domicilio',
	service_name: 'Envío a domicilio',
	es_punto_de_retiro: false,
	point_id: null,
	precio: 779.51,
	andreani: {
		tipo: 'domicilio',
		valor_declarado_total: 15000,
		bultos: [
			{ kilos: 2.5, alto_cm: 20, ancho_cm: 31, largo_cm: 42, volumen_cm3: 26040, valor_declarado: 9000 },
			{ kilos: 0.75, alto_cm: 11, ancho_cm: 12, largo_cm: 13, volumen_cm3: 1716, valor_declarado: 6000 },
		],
	},
}

/** Opción de retiro en sucursal, con la sucursal elegida entre las que trajo la cotización. */
const opcion_sucursal = {
	key: 'andreani|sucursal',
	proveedor: 'andreani',
	carrier_name: 'Andreani',
	service_type: 'sucursal',
	service_name: 'Retiro en sucursal Andreani',
	es_punto_de_retiro: true,
	point_id: 77,
	precio: 540.1,
	puntos_de_retiro: [
		{ point_id: 12, description: 'Sucursal Alta Córdoba', street: 'Av. Monseñor Pablo Cabrera', street_number: '3100', city: 'Córdoba' },
		{ point_id: 77, description: 'Sucursal Nueva Córdoba', street: 'Obispo Trejo', street_number: '300', city: 'Córdoba' },
	],
	andreani: {
		tipo: 'sucursal',
		valor_declarado_total: 0,
		bultos: [{ kilos: 1, alto_cm: 20, ancho_cm: 20, largo_cm: 20, volumen_cm3: 8000, valor_declarado: 0 }],
	},
}

const destino = {
	nombre: 'Lucía',
	apellido: 'Fernández',
	documento: '30123456',
	telefono: '3515551234',
	email: 'lucia@example.com',
	calle: 'Av. Colón',
	numero: '1234',
	piso_depto: '2B',
	localidad: 'Córdoba',
	provincia: 'Córdoba',
	codigo_postal: '5000',
}

/** Pedido de ejemplo: Andreani a domicilio. */
function pedido_andreani(cambios) {
	return Object.assign({
		id: 4521,
		envio_proveedor: 'andreani',
		envio_opcion: opcion_domicilio,
		envio_precio: 779.51,
		envio_destino: destino,
		buyer: { name: 'Otro', surname: 'Comprador', phone: '000', email: 'otro@example.com' },
	}, cambios || {})
}

// --- envio_va_por_andreani -----------------------------------------------------------------------

test('un pedido con envio_proveedor andreani y envio_opcion va por Andreani, no por Zipnova', () => {
	const order = pedido_andreani()
	assert.equal(envio_va_por_andreani(order), true)
	assert.equal(envio_va_por_zipnova(order), false)
})

test('tolera mayúsculas y espacios en envio_proveedor', () => {
	assert.equal(envio_va_por_andreani(pedido_andreani({ envio_proveedor: '  Andreani ' })), true)
})

test('tolera envio_opcion como string json (API sin el cast)', () => {
	assert.equal(envio_va_por_andreani(pedido_andreani({ envio_opcion: JSON.stringify(opcion_domicilio) })), true)
})

test('un pedido de Zipnova (proveedor vacío o zipnova) no va por Andreani', () => {
	const opcion_zipnova = { key: '12|pickup_point|carrier_dropoff', precio: 1000 }
	assert.equal(envio_va_por_andreani({ envio_proveedor: null, envio_opcion: opcion_zipnova }), false)
	assert.equal(envio_va_por_andreani({ envio_proveedor: 'zipnova', envio_opcion: opcion_zipnova }), false)
	assert.equal(envio_va_por_zipnova({ envio_proveedor: 'zipnova', envio_opcion: opcion_zipnova }), true)
})

test('sin envio_opcion no va por Andreani (aunque el proveedor diga andreani)', () => {
	assert.equal(envio_va_por_andreani(pedido_andreani({ envio_opcion: null })), false)
	assert.equal(envio_va_por_andreani(pedido_andreani({ envio_opcion: {} })), false)
})

test('un pedido sin envío por correo ni forma propia no va por Andreani, y null no tira', () => {
	assert.equal(envio_va_por_andreani({ envio_proveedor: null, envio_opcion: null, delivery_zone: { id: 3 } }), false)
	assert.equal(envio_va_por_andreani(null), false)
	assert.equal(envio_va_por_andreani(undefined), false)
})

// --- texto de "Copiar datos" ---------------------------------------------------------------------

test('a domicilio: el texto trae pedido, destinatario, dirección, bultos, valor y contrato', () => {
	const texto = texto_datos_andreani(pedido_andreani(), integracion)
	assert.equal(typeof texto, 'string')
	// Pedido y servicio.
	assert.match(texto, /4521/)
	assert.match(texto, /domicilio/i)
	// Destinatario: el del destino de la tienda manda sobre el comprador del pedido.
	assert.match(texto, /Lucía Fernández/)
	assert.match(texto, /30123456/)
	assert.match(texto, /3515551234/)
	assert.match(texto, /lucia@example\.com/)
	assert.doesNotMatch(texto, /otro@example\.com/)
	// Dirección completa con piso/depto y código postal.
	assert.match(texto, /Av\. Colón 1234/)
	assert.match(texto, /2B/)
	assert.match(texto, /5000/)
	assert.match(texto, /Córdoba/)
	// Bultos: kilos y centímetros por bulto (separador decimal punto o coma).
	assert.match(texto, /2[.,]5\s*kg/i)
	assert.match(texto, /0[.,]75\s*kg/i)
	assert.match(texto, /20/)
	assert.match(texto, /31/)
	assert.match(texto, /42/)
	assert.match(texto, /11/)
	assert.match(texto, /12/)
	assert.match(texto, /13/)
	// Valor declarado total.
	assert.match(texto, /15\.?000/)
	// Cliente y contrato de domicilio (de la tarjeta); no el de sucursal.
	assert.match(texto, /CL0003750/)
	assert.match(texto, /400006709/)
	assert.doesNotMatch(texto, /400006711/)
})

test('un bulto por línea: dos bultos aparecen en líneas distintas', () => {
	const lineas = texto_datos_andreani(pedido_andreani(), integracion).split('\n')
	const con_primer_bulto = lineas.filter(linea => /2[.,]5\s*kg/i.test(linea))
	const con_segundo_bulto = lineas.filter(linea => /0[.,]75\s*kg/i.test(linea))
	assert.equal(con_primer_bulto.length, 1)
	assert.equal(con_segundo_bulto.length, 1)
	assert.notEqual(lineas.indexOf(con_primer_bulto[0]), lineas.indexOf(con_segundo_bulto[0]))
})

test('a sucursal: trae la sucursal elegida (id y descripción) y el contrato de sucursal', () => {
	const order = pedido_andreani({
		envio_opcion: opcion_sucursal,
		envio_precio: 540.1,
		envio_destino: Object.assign({}, destino, { point_id: 77 }),
	})
	const texto = texto_datos_andreani(order, integracion)
	assert.match(texto, /sucursal/i)
	assert.match(texto, /77/)
	assert.match(texto, /Sucursal Nueva Córdoba/)
	assert.match(texto, /Obispo Trejo 300/)
	assert.doesNotMatch(texto, /Sucursal Alta Córdoba/)
	assert.match(texto, /400006711/)
	assert.doesNotMatch(texto, /400006709/)
	assert.match(texto, /Lucía Fernández/)
})

test('sin destino de la tienda, usa el comprador del pedido', () => {
	const order = pedido_andreani({ envio_destino: null, address: 'Belgrano 50, Rosario' })
	const texto = texto_datos_andreani(order, integracion)
	assert.match(texto, /Otro Comprador/)
	assert.match(texto, /otro@example\.com/)
	assert.match(texto, /Belgrano 50, Rosario/)
})

test('lectura tolerante: envio_opcion sin andreani ni bultos muestra el resto y no tira', () => {
	const sin_bultos = Object.assign({}, opcion_domicilio)
	delete sin_bultos.andreani
	let texto
	assert.doesNotThrow(() => { texto = texto_datos_andreani(pedido_andreani({ envio_opcion: sin_bultos }), integracion) })
	assert.match(texto, /4521/)
	assert.match(texto, /Lucía Fernández/)
	assert.match(texto, /400006709/)
})

test('sin la tarjeta (integración null o sin config) no tira y sigue trayendo los datos del pedido', () => {
	let texto
	assert.doesNotThrow(() => { texto = texto_datos_andreani(pedido_andreani(), null) })
	assert.match(texto, /4521/)
	assert.match(texto, /Av\. Colón 1234/)
	assert.doesNotThrow(() => texto_datos_andreani(pedido_andreani(), { slug: 'andreani', conectado: false }))
})

test('el texto nunca incluye credenciales ni el token, aunque la integración los traiga por error', () => {
	const sucia = JSON.parse(JSON.stringify(integracion))
	sucia.config.access_token = 'TOKEN-SECRETO-XYZ'
	sucia.config.password = 'CLAVE-SECRETA-XYZ'
	sucia.config.usuario = 'USUARIO-SECRETO-XYZ'
	const texto = texto_datos_andreani(pedido_andreani(), sucia)
	assert.doesNotMatch(texto, /SECRETO|SECRETA/)
})
