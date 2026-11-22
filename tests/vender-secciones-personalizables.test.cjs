// Tests de aceptación de la misión vender-secciones-personalizables (CA7 a CA12 del plan).
// Ejecutar con: node --test tests/vender-secciones-personalizables.test.cjs
//
// No levanta servidores ni usa Playwright: carga con babel los módulos puros de src/ (el resolver de
// diseños, el catálogo, las secciones, el diseño ágil, el estado del editor y sus operaciones) y los
// ejecuta con un `vm` de prueba mínimo, que es lo único que esas funciones miran del componente.
//
// Qué módulos todavía no existen (los crea la misión): layout/secciones.js, layout/diseno_agil.js y
// editor/operaciones_de_secciones.js. Se cargan de forma perezosa dentro de cada test, así cada caso
// falla por su cuenta (con un mensaje que dice qué falta) y no se cae el archivo entero.
//
// Firmas que fija este archivo para las operaciones del editor (todas mutan el estado de trabajo que
// reciben y devuelven {ok, motivo, ...}; si devolvieran el estado nuevo en `estado` también se lo
// acepta):
//   agregar_seccion(estado, vm)                         quitar_seccion(estado, id, vm)
//   mover_a_columna_nueva(estado, id)                   mover_a_banda_nueva(estado, id)
//   cambiar_ancho_de_columna(estado, banda, columna, delta)
//   cambiar_alto(estado, id, alto)                      cambiar_alto_fijo(estado, id, fijo)
// y, cuando quitar_seccion bloquea por obligatorios, la lista de keys viene en `resultado.obligatorios`.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

/* Rutas (relativas a src/) de los módulos que participan. */
const RUTA_RESOLVER = 'components/vender/layout/resolver_diseno.js'
const RUTA_ELEMENTOS = 'components/vender/layout/elementos.js'
const RUTA_PREDETERMINADO = 'components/vender/layout/diseno_predeterminado.js'
const RUTA_SECCIONES = 'components/vender/layout/secciones.js'
const RUTA_AGIL = 'components/vender/layout/diseno_agil.js'
const RUTA_ESTADO = 'components/abm/disenos-de-vender/editor/estado_del_editor.js'
const RUTA_OPERACIONES = 'components/abm/disenos-de-vender/editor/operaciones_de_secciones.js'

/**
 * Carga un módulo nuevo de la misión. Si el archivo no existe falla con una aserción que lo dice
 * (en lugar de un ENOENT críptico); cualquier otro error del módulo se propaga tal cual.
 *
 * @param {string} ruta ruta relativa a src/
 * @returns {object} exports del módulo
 */
function cargar_nuevo(ruta) {
	try {
		return cargar(ruta)
	} catch (error) {
		if (error && error.code === 'ENOENT') {
			assert.fail('Falta el módulo nuevo src/' + ruta + ' (todavía no existe)')
		}
		throw error
	}
}

/**
 * `vm` mínimo del plan §7: sin extensiones, permisos abiertos, sin catálogos en el store.
 *
 * @param {string[]} [extensiones] extensiones prendidas
 * @param {boolean} [pide_cantidad] preferencia "pedir la cantidad al vender"
 * @returns {object}
 */
function vm_minimo(extensiones, pide_cantidad) {
	let prendidas = extensiones || []
	return {
		hasExtencion: function (extension) { return prendidas.indexOf(extension) !== -1 },
		can: function () { return true },
		user: { ask_amount_in_vender: !!pide_cantidad },
		owner: {},
		$store: { state: {}, getters: {} },
	}
}

/**
 * `vm` completo del plan §7: el mínimo más caja, tipos de venta, sucursales y listas de precios
 * disponibles (así los cinco obligatorios de la configuración inicial están a la vista).
 *
 * @returns {object}
 */
function vm_completo() {
	let vm = vm_minimo()
	vm.$store = {
		state: {
			caja: { models: [{ id: 1 }] },
			sale_type: { models: [{ id: 1 }, { id: 2 }] },
		},
		getters: {
			'address/muestra_sucursales': true,
			'price_type/muestra_listas': true,
		},
	}
	return vm
}

/**
 * Arma una lista de items de etapa a partir de pares [key, cols] o [key, cols, id] (marcadores).
 *
 * @param {Array[]} pares
 * @returns {Array}
 */
function items_de(pares) {
	let items = []
	pares.forEach(function (par) {
		let item = { key: par[0] }
		if (par.length > 2) {
			item.id = par[2]
		}
		item.cols = par[1]
		items.push(item)
	})
	return items
}

/**
 * Items de una lista de keys con un mismo ancho.
 *
 * @param {string[]} keys
 * @param {number} cols
 * @returns {Array}
 */
function items_con_ancho(keys, cols) {
	let items = []
	keys.forEach(function (key) {
		items.push({ key: key, cols: cols })
	})
	return items
}

/**
 * Todos los ids de sección de una disposición, en orden de lectura (banda, columna, apilado).
 *
 * @param {Array} disposicion
 * @returns {string[]}
 */
function ids_de(disposicion) {
	let ids = []
	;(disposicion || []).forEach(function (banda) {
		banda.columnas.forEach(function (columna) {
			columna.secciones.forEach(function (id) {
				ids.push(id)
			})
		})
	})
	return ids
}

/**
 * Las keys (sin marcadores) de todos los elementos del catálogo.
 *
 * @returns {string[]}
 */
function keys_del_catalogo() {
	let { ELEMENTOS } = cargar(RUTA_ELEMENTOS)
	let keys = []
	ELEMENTOS.forEach(function (el) {
		keys.push(el.key)
	})
	return keys
}

/**
 * Verifica la regla del resolver: cada key del catálogo aparece exactamente una vez entre las
 * secciones y `sacados` (los marcadores no cuentan).
 *
 * @param {object} resuelto salida de resolver_diseno()
 * @param {string} etiqueta para el mensaje
 */
function assert_catalogo_completo(resuelto, etiqueta) {
	let { es_marcador } = cargar(RUTA_ELEMENTOS)
	let veces = {}
	Object.keys(resuelto.etapas).forEach(function (id) {
		resuelto.etapas[id].forEach(function (item) {
			if (!es_marcador(item.key)) {
				veces[item.key] = (veces[item.key] || 0) + 1
			}
		})
	})
	resuelto.sacados.forEach(function (key) {
		veces[key] = (veces[key] || 0) + 1
	})
	let catalogo = keys_del_catalogo()
	assert.equal(catalogo.length, 34, 'el catálogo tiene 34 elementos')
	catalogo.forEach(function (key) {
		assert.equal(veces[key], 1, etiqueta + ': "' + key + '" tiene que aparecer exactamente una vez')
	})
	assert.equal(Object.keys(veces).length, 34, etiqueta + ': no sobra ninguna key')
}

/**
 * Ejecuta una operación del editor y devuelve el resultado junto con el estado a usar después.
 *
 * @param {Function} operacion
 * @param {object} estado
 * @param {...*} argumentos los que sigan al estado
 * @returns {{resultado: object, estado: object}}
 */
function aplicar(operacion, estado) {
	let argumentos = [estado].concat(Array.prototype.slice.call(arguments, 2))
	let resultado = operacion.apply(null, argumentos)
	assert.ok(resultado && typeof resultado == 'object', 'la operación devuelve {ok, motivo, ...}')
	assert.equal(typeof resultado.ok, 'boolean', 'el resultado trae `ok` booleano')
	return { resultado: resultado, estado: resultado.estado || estado }
}

/**
 * Un v2 con una sección propia: configuración a la izquierda (4), artículos y cierre a la derecha
 * (8) y "Observaciones" en una sección nueva en una banda debajo. Arranca del predeterminado.
 *
 * @param {object} vm
 * @returns {object}
 */
function layout_con_seccion_4(vm) {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let base = resolver_diseno(null, vm)
	let etapa_3 = base.etapas.etapa_3.filter(function (item) {
		return item.key !== 'observaciones'
	})
	return {
		version: 2,
		etapas: {
			etapa_1: base.etapas.etapa_1,
			etapa_2: base.etapas.etapa_2,
			etapa_3: etapa_3,
			seccion_4: [{ key: 'observaciones', cols: 6 }],
		},
		sacados: [],
		secciones: {
			seccion_4: { titulo: 'Notas', descripcion: 'Lo que hay que recordar', color: 'rojo', alto: 3, alto_fijo: true, plegado: 'no' },
		},
		disposicion: [
			{ columnas: [{ ancho: 4, secciones: ['etapa_1'] }, { ancho: 8, secciones: ['etapa_2', 'etapa_3'] }] },
			{ columnas: [{ ancho: 12, secciones: ['seccion_4'] }] },
		],
	}
}

/**
 * Un v2 sin la sección de configuración inicial: sus cinco obligatorios viven en una sección nueva.
 *
 * @param {object} vm
 * @returns {object}
 */
function layout_sin_etapa_1(vm) {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let base = resolver_diseno(null, vm)
	return {
		version: 2,
		etapas: {
			etapa_2: base.etapas.etapa_2,
			etapa_3: base.etapas.etapa_3,
			seccion_4: items_con_ancho(['metodo_de_pago', 'caja', 'sucursal', 'lista_de_precios', 'tipo_de_venta'], 6),
		},
		sacados: [],
		secciones: {
			seccion_4: { titulo: 'Pagos', descripcion: null, color: 'turquesa', alto: 4, alto_fijo: false, plegado: 'no' },
		},
		disposicion: [
			{ columnas: [{ ancho: 12, secciones: ['etapa_2', 'etapa_3', 'seccion_4'] }] },
		],
	}
}

/* ------------------------------------------------------------------ CA7 */

test('CA7 [caracterización] el predeterminado reparte los campos como hoy en las tres etapas', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let resuelto = resolver_diseno(null, vm_minimo())

	assert.deepStrictEqual(resuelto.etapas.etapa_1, items_de([
		['facturacion', 4], ['metodo_de_pago', 4], ['caja', 4], ['sucursal', 4], ['lista_de_precios', 4],
		['moneda', 4], ['tipo_de_venta', 4], ['vendedor', 4], ['fecha_de_venta', 4],
		['separador', 12, 'separador_1'],
		['cliente', 4], ['guardar_como_presupuesto', 4], ['omitir_en_cuenta_corriente', 4],
		['alerta_de_cobro', 4], ['enviar_correo', 4],
	]))
	assert.deepStrictEqual(resuelto.etapas.etapa_2, items_de([
		['resumen', 12], ['codigo_de_barras', 3], ['buscador_de_articulos', 6], ['combos', 2],
		['promociones', 2], ['servicio', 3], ['cantidad', 2],
	]))
	assert.deepStrictEqual(resuelto.etapas.etapa_3, items_de([
		['chequeo_de_deposito', 12], ['estado', 4], ['fecha_de_entrega', 4], ['orden_de_compra', 4], ['empleado', 4],
		['salto_de_fila', 12, 'salto_de_fila_1'],
		['precios_con_iva', 3], ['descontar_stock', 3], ['observaciones', 3], ['observaciones_ocultas', 3],
		['separador', 12, 'separador_2'],
		['descuentos', 6], ['recargos', 6], ['puntos', 12], ['nota_de_credito', 12],
	]))
	assert.deepStrictEqual(resuelto.sacados, [])
})

test('CA7 el predeterminado ya sale en formato v2 con una sola columna y los metadatos de hoy', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let resuelto = resolver_diseno(null, vm_minimo())

	assert.equal(resuelto.version, 2)
	assert.deepStrictEqual(resuelto.disposicion, [
		{ columnas: [{ ancho: 12, secciones: ['etapa_1', 'etapa_2', 'etapa_3'] }] },
	])
	assert.deepStrictEqual(resuelto.secciones.etapa_1, {
		titulo: 'Configuración inicial', descripcion: null, color: 'azul', alto: 4, alto_fijo: false, plegado: 'si_hay_venta',
	})
	assert.deepStrictEqual(resuelto.secciones.etapa_2, {
		titulo: 'Artículos y servicios', descripcion: null, color: 'verde', alto: 4, alto_fijo: false, plegado: 'no',
	})
	assert.deepStrictEqual(resuelto.secciones.etapa_3, {
		titulo: 'Cierre y opciones', descripcion: null, color: 'naranja', alto: 4, alto_fijo: false, plegado: 'arranca_plegada',
	})
	assert.deepStrictEqual(Object.keys(resuelto.secciones), ['etapa_1', 'etapa_2', 'etapa_3'])
})

test('CA7 un v1 explícito igual al predeterminado se resuelve igual que null (y también en v2)', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let del_sistema = resolver_diseno(null, vm)
	let v1 = { version: 1, etapas: JSON.parse(JSON.stringify(del_sistema.etapas)), sacados: [] }
	let resuelto_v1 = resolver_diseno(v1, vm)

	assert.deepStrictEqual(resuelto_v1, del_sistema)
	assert.equal(resuelto_v1.version, 2, 'un v1 sin disposición se resuelve al formato v2 con la disposición por defecto')
	assert.deepStrictEqual(resuelto_v1.disposicion, [
		{ columnas: [{ ancho: 12, secciones: ['etapa_1', 'etapa_2', 'etapa_3'] }] },
	])
})

test('CA7 [caracterización] el catálogo sigue teniendo 34 elementos y el predeterminado los ubica a todos una vez', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	assert_catalogo_completo(resolver_diseno(null, vm_minimo()), 'predeterminado')
})

/* ------------------------------------------------------------------ CA8 */

test('CA8a una sección quitada desaparece y los campos huérfanos caen en la primera sección que no es etapa_2', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let resuelto = resolver_diseno(layout_sin_etapa_1(vm), vm)

	assert.deepStrictEqual(ids_de(resuelto.disposicion), ['etapa_2', 'etapa_3', 'seccion_4'])
	assert.ok(!('etapa_1' in resuelto.etapas), 'etapa_1 no aparece en `etapas`')
	assert.ok(!('etapa_1' in resuelto.secciones), 'etapa_1 no aparece en `secciones`')
	assert.deepStrictEqual(Object.keys(resuelto.etapas).sort(), ['etapa_2', 'etapa_3', 'seccion_4'])
	/* "cliente" era de etapa_1 y el JSON no lo nombra: va a la primera sección en orden de lectura que no es etapa_2 */
	let cliente = resuelto.etapas.etapa_3.filter(function (item) { return item.key === 'cliente' })
	assert.equal(cliente.length, 1, 'cliente cae en etapa_3')
	assert.equal(cliente[0].cols, 4, 'con columna de 12 conserva su ancho por defecto')
	assert.equal(resuelto.secciones.seccion_4.titulo, 'Pagos')
	assert_catalogo_completo(resuelto, 'sin etapa_1')
})

test('CA8b sin etapa_2 en la disposición se agrega al final de la última columna de la primera banda', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let layout = {
		version: 2,
		etapas: {
			etapa_1: items_con_ancho(['metodo_de_pago'], 12),
			etapa_2: items_de([['resumen', 12], ['cantidad', 6]]),
			etapa_3: [],
		},
		sacados: [],
		disposicion: [
			{ columnas: [{ ancho: 4, secciones: ['etapa_1'] }, { ancho: 8, secciones: ['etapa_3'] }] },
			{ columnas: [{ ancho: 12, secciones: ['seccion_4'] }] },
		],
	}
	layout.etapas.seccion_4 = []
	let resuelto = resolver_diseno(layout, vm)

	assert.ok(Array.isArray(resuelto.disposicion), 'el resolver devuelve `disposicion`')
	assert.deepStrictEqual(resuelto.disposicion[0].columnas[0].secciones, ['etapa_1'])
	assert.deepStrictEqual(resuelto.disposicion[0].columnas[1].secciones, ['etapa_3', 'etapa_2'])
	assert.deepStrictEqual(resuelto.disposicion[1].columnas[0].secciones, ['seccion_4'])
	let keys_de_etapa_2 = resuelto.etapas.etapa_2.filter(function (item) { return item.key === 'resumen' || item.key === 'cantidad' })
	assert.deepStrictEqual(keys_de_etapa_2, items_de([['resumen', 12], ['cantidad', 6]]), 'conserva el orden y el ancho de sus campos')
})

test('CA8c los anchos de cada banda se normalizan: mínimo 3, suman 12 y hay hasta 4 columnas', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()

	/* Resuelve un diseño de una banda con las columnas dadas; las secciones van repartidas una por columna. */
	function anchos_de(anchos_de_entrada) {
		let ids = ['etapa_1', 'etapa_2', 'etapa_3', 'seccion_4', 'seccion_5']
		let columnas = []
		let etapas = {}
		anchos_de_entrada.forEach(function (ancho, indice) {
			columnas.push({ ancho: ancho, secciones: [ids[indice]] })
			etapas[ids[indice]] = []
		})
		let resuelto = resolver_diseno({ version: 2, etapas: etapas, sacados: [], disposicion: [{ columnas: columnas }] }, vm)
		let anchos = []
		assert.ok(Array.isArray(resuelto.disposicion), 'el resolver devuelve `disposicion`')
		resuelto.disposicion[0].columnas.forEach(function (columna) { anchos.push(columna.ancho) })
		return anchos
	}

	/* etapa_2 es obligatoria: con [4,4] el diseño de dos columnas lleva etapa_1 y etapa_2 */
	assert.deepStrictEqual(anchos_de([4, 4]), [4, 8])
	assert.deepStrictEqual(anchos_de([2, 10]), [3, 9])
	assert.deepStrictEqual(anchos_de([12, 12]), [6, 6])

	let cinco = anchos_de([3, 3, 2, 2, 2])
	assert.equal(cinco.length, 4, 'cinco columnas se cortan a cuatro')
	let suma = 0
	cinco.forEach(function (ancho) {
		assert.ok(ancho >= 3, 'ninguna columna baja de 3')
		suma += ancho
	})
	assert.equal(suma, 12)
})

test('CA8d hasta 6 secciones: las inválidas y las repetidas quedan afuera', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let etapas = {}
	;['etapa_1', 'etapa_2', 'etapa_3', 'seccion_4', 'seccion_5', 'seccion_6', 'seccion_7'].forEach(function (id) {
		etapas[id] = []
	})
	let resuelto = resolver_diseno({
		version: 2,
		etapas: etapas,
		sacados: [],
		disposicion: [
			{ columnas: [{ ancho: 12, secciones: ['foo', 'etapa_1', 'etapa_2', 'etapa_3', 'seccion_3', 'seccion_10', 'etapa_4'] }] },
			{ columnas: [{ ancho: 6, secciones: ['etapa_1', 'seccion_4'] }, { ancho: 6, secciones: ['seccion_5', 'seccion_6', 'seccion_7'] }] },
		],
	}, vm)

	let ids = ids_de(resuelto.disposicion)
	assert.deepStrictEqual(ids, ['etapa_1', 'etapa_2', 'etapa_3', 'seccion_4', 'seccion_5', 'seccion_6'])
	assert.deepStrictEqual(Object.keys(resuelto.etapas).sort(), ids.slice().sort())
	assert.deepStrictEqual(Object.keys(resuelto.secciones).sort(), ids.slice().sort())
	assert_catalogo_completo(resuelto, '7 secciones')
})

test('CA8e los metadatos de cada sección se acotan y completan', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let resuelto = resolver_diseno({
		version: 2,
		etapas: { etapa_1: [], etapa_2: [], etapa_3: [], seccion_4: [] },
		sacados: [],
		secciones: {
			etapa_1: { titulo: '', descripcion: 'd'.repeat(200), color: 'fucsia', alto: 0, alto_fijo: false, plegado: 'x' },
			etapa_2: { titulo: 'á'.repeat(80), descripcion: null, color: 'gris', alto: 20, alto_fijo: false, plegado: 'no' },
			etapa_3: { titulo: null, descripcion: null, color: null, alto: 'x', alto_fijo: true, plegado: 'arranca_plegada' },
			seccion_4: { alto: 7.9, alto_fijo: false },
		},
		disposicion: [{ columnas: [{ ancho: 12, secciones: ['etapa_1', 'etapa_2', 'etapa_3', 'seccion_4'] }] }],
	}, vm)

	assert.ok(resuelto.secciones && typeof resuelto.secciones == 'object', 'el resolver devuelve `secciones`')
	let s = resuelto.secciones
	assert.equal(s.etapa_1.titulo, 'Configuración inicial', 'título vacío -> el por defecto')
	assert.equal(s.etapa_1.descripcion.length, 160, 'descripción de 200 -> 160')
	assert.equal(s.etapa_1.color, 'azul', 'color desconocido -> el del id')
	assert.equal(s.etapa_1.alto, 1, 'alto 0 -> 1')
	assert.equal(s.etapa_1.plegado, 'no', 'plegado desconocido -> no')

	assert.equal(s.etapa_2.titulo, 'á'.repeat(60), 'título de 80 -> 60 caracteres')
	assert.equal(s.etapa_2.color, 'gris', 'un color de la paleta se respeta')
	assert.equal(s.etapa_2.alto, 12, 'alto 20 -> 12')

	assert.equal(s.etapa_3.titulo, 'Cierre y opciones', 'título null -> el por defecto')
	assert.equal(s.etapa_3.color, 'naranja', 'color null -> el del id')
	assert.equal(s.etapa_3.alto, 4, 'alto no numérico -> 4')
	assert.equal(s.etapa_3.alto_fijo, true)
	assert.equal(s.etapa_3.plegado, 'no', 'alto fijo fuerza plegado "no"')

	assert.equal(s.seccion_4.titulo, 'Sección nueva', 'título por defecto de una sección creada')
	assert.equal(s.seccion_4.color, 'violeta', 'color por defecto de una sección creada')
	assert.equal(s.seccion_4.alto, 7, 'alto 7.9 se trunca a 7')
	assert.equal(s.seccion_4.plegado, 'no')
})

test('CA8f un obligatorio forzado (cantidad con "pedir la cantidad") vuelve a etapa_2 y se conservan secciones y disposición', function () {
	let { resolver_diseno, aplicar_elementos_forzados } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo([], true)
	let base = resolver_diseno(null, vm)
	let layout = {
		version: 2,
		etapas: {
			etapa_1: base.etapas.etapa_1,
			etapa_2: base.etapas.etapa_2.filter(function (item) { return item.key !== 'cantidad' }),
			etapa_3: base.etapas.etapa_3,
		},
		sacados: ['cantidad'],
		disposicion: [{ columnas: [{ ancho: 4, secciones: ['etapa_1'] }, { ancho: 8, secciones: ['etapa_2', 'etapa_3'] }] }],
	}
	let resuelto = resolver_diseno(layout, vm)
	assert.deepStrictEqual(resuelto.sacados, ['cantidad'], 'el editor ve la cantidad en la bandeja')

	let forzado = aplicar_elementos_forzados(resuelto, vm)
	let en_etapa_2 = forzado.etapas.etapa_2.filter(function (item) { return item.key === 'cantidad' })
	assert.equal(en_etapa_2.length, 1, 'la cantidad vuelve a etapa_2')
	assert.deepStrictEqual(forzado.sacados, [])
	assert.equal(forzado.version, 2)
	assert.deepStrictEqual(forzado.disposicion, resuelto.disposicion, 'conserva la disposición')
	assert.deepStrictEqual(forzado.secciones, resuelto.secciones, 'conserva los metadatos de las secciones')

	/* Sin la preferencia del usuario, la cantidad sigue sacada */
	let sin_preferencia = vm_minimo([], false)
	assert.deepStrictEqual(aplicar_elementos_forzados(resolver_diseno(layout, sin_preferencia), sin_preferencia).sacados, ['cantidad'])
})

test('CA8g cada key del catálogo queda exactamente una vez en todos los casos', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let v1 = { version: 1, etapas: JSON.parse(JSON.stringify(resolver_diseno(null, vm).etapas)), sacados: ['combos', 'cantidad'] }
	v1.etapas.etapa_2 = v1.etapas.etapa_2.filter(function (item) { return item.key !== 'combos' && item.key !== 'cantidad' })
	let casos = {
		'null': null,
		'v1 con sacados': v1,
		'ágil sólo plantilla': { version: 2, plantilla: 'agil' },
		'v2 con seccion_4': layout_con_seccion_4(vm),
		'v2 sin etapa_1': layout_sin_etapa_1(vm),
		'v2 con obligatorios sacados': Object.assign(layout_con_seccion_4(vm), { sacados: ['metodo_de_pago', 'caja', 'combos'] }),
		'v2 con keys desconocidas': { version: 2, etapas: { etapa_1: [{ key: 'inexistente', cols: 3 }], etapa_2: [], etapa_3: [] }, sacados: ['tampoco'], disposicion: [{ columnas: [{ ancho: 12, secciones: ['etapa_1', 'etapa_2', 'etapa_3'] }] }] },
	}
	Object.keys(casos).forEach(function (nombre) {
		let resuelto = resolver_diseno(casos[nombre], vm)
		assert_catalogo_completo(resuelto, nombre)
		assert.ok(resuelto.etapas.etapa_2, nombre + ': etapa_2 siempre está')
		if (nombre === 'v2 con seccion_4') {
			assert.deepStrictEqual(resuelto.etapas.seccion_4, [{ key: 'observaciones', cols: 6 }], nombre + ': el campo queda en su sección nueva')
		}
		let obligatorios_sacados = resuelto.sacados.filter(function (key) {
			return ['metodo_de_pago', 'caja', 'sucursal', 'lista_de_precios', 'tipo_de_venta', 'resumen'].indexOf(key) !== -1
		})
		assert.deepStrictEqual(obligatorios_sacados, [], nombre + ': ningún obligatorio queda sacado')
	})
})

/* ------------------------------------------------------------------ CA9 */

test('CA9 el diseño ágil: disposición, secciones y campos exactos del plan', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	cargar_nuevo(RUTA_AGIL)
	let vm = vm_minimo()
	let resuelto = resolver_diseno({ version: 2, plantilla: 'agil' }, vm)

	assert.equal(resuelto.version, 2)
	assert.equal(resuelto.plantilla, 'agil')
	assert.deepStrictEqual(resuelto.disposicion, [
		{ columnas: [{ ancho: 4, secciones: ['etapa_1'] }, { ancho: 8, secciones: ['etapa_2', 'etapa_3'] }] },
	])
	assert.deepStrictEqual(resuelto.secciones, {
		etapa_1: { titulo: 'Configuración inicial', descripcion: null, color: 'azul', alto: 12, alto_fijo: true, plegado: 'no' },
		etapa_2: { titulo: 'Artículos y servicios', descripcion: null, color: 'verde', alto: 8, alto_fijo: true, plegado: 'no' },
		etapa_3: { titulo: 'Cierre y opciones', descripcion: null, color: 'naranja', alto: 4, alto_fijo: true, plegado: 'no' },
	})
	assert.deepStrictEqual(resuelto.etapas.etapa_1, items_de([
		['cliente', 12], ['omitir_en_cuenta_corriente', 12], ['alerta_de_cobro', 12], ['enviar_correo', 12],
		['separador', 12, 'agil_separador_1'],
		['metodo_de_pago', 12], ['caja', 12], ['facturacion', 12], ['lista_de_precios', 12], ['tipo_de_venta', 12],
		['sucursal', 12], ['moneda', 12], ['vendedor', 12], ['fecha_de_venta', 12], ['guardar_como_presupuesto', 12],
	]))
	assert.deepStrictEqual(resuelto.etapas.etapa_2, items_de([
		['resumen', 12], ['codigo_de_barras', 3], ['buscador_de_articulos', 6], ['combos', 2],
		['promociones', 2], ['servicio', 3], ['cantidad', 2],
	]))
	assert.deepStrictEqual(resuelto.etapas.etapa_3, items_de([
		['nota_de_credito', 12], ['puntos', 12], ['chequeo_de_deposito', 12],
		['descuentos', 6], ['recargos', 6], ['observaciones', 6], ['observaciones_ocultas', 6],
		['salto_de_fila', 12, 'agil_salto_de_fila_1'],
		['precios_con_iva', 3], ['descontar_stock', 3], ['estado', 3], ['fecha_de_entrega', 3],
		['orden_de_compra', 6], ['empleado', 6],
	]))
	assert.deepStrictEqual(resuelto.sacados, [])
	assert_catalogo_completo(resuelto, 'ágil')
})

test('CA9 en el ágil el buscador mide lo mismo que en el predeterminado (con la extensión combos: 5)', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	cargar_nuevo(RUTA_AGIL)
	let vm = vm_minimo(['combos'])
	let agil = resolver_diseno({ version: 2, plantilla: 'agil' }, vm)
	let del_sistema = resolver_diseno(null, vm)

	function ancho_del_buscador(resuelto) {
		let encontrado = resuelto.etapas.etapa_2.filter(function (item) { return item.key === 'buscador_de_articulos' })
		assert.equal(encontrado.length, 1)
		return encontrado[0].cols
	}

	assert.equal(ancho_del_buscador(del_sistema), 5)
	assert.equal(ancho_del_buscador(agil), 5)
	assert.deepStrictEqual(agil.etapas.etapa_2, del_sistema.etapas.etapa_2, 'etapa_2 del ágil = la del predeterminado')
})

test('CA9 el ágil no deja ningún obligatorio sacado y un campo nuevo del futuro cae en la columna izquierda', function () {
	let { resolver_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let agil = resolver_diseno({ version: 2, plantilla: 'agil' }, vm)
	assert.deepStrictEqual(agil.sacados, [])

	/* Un ágil guardado al que "le falta" un campo (como si el catálogo hubiera crecido): vuelve a su sección por defecto */
	let guardado = JSON.parse(JSON.stringify(agil))
	guardado.etapas.etapa_1 = guardado.etapas.etapa_1.filter(function (item) { return item.key !== 'moneda' })
	let resuelto = resolver_diseno(guardado, vm)
	let moneda = resuelto.etapas.etapa_1.filter(function (item) { return item.key === 'moneda' })
	assert.equal(moneda.length, 1)
	assert.equal(moneda[0].cols, 12, 'ancho por defecto 4 escalado a la columna de 4/12 -> 12')
})

/* ------------------------------------------------------------------ CA10 */

test('CA10 serializar y volver a resolver es idempotente para null, v1, el ágil y un v2 con seccion_4 (sin perder secciones)', function () {
	let { resolver_diseno, serializar_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()
	let v1 = { version: 1, etapas: JSON.parse(JSON.stringify(resolver_diseno(null, vm).etapas)), sacados: [] }
	let casos = {
		'null': null,
		'v1': v1,
		'ágil': { version: 2, plantilla: 'agil' },
		'v2 con seccion_4': layout_con_seccion_4(vm),
		'v2 sin etapa_1': layout_sin_etapa_1(vm),
	}
	Object.keys(casos).forEach(function (nombre) {
		let resuelto = resolver_diseno(casos[nombre], vm)
		let serializado = serializar_diseno(resuelto)
		let ida_y_vuelta = resolver_diseno(JSON.parse(JSON.stringify(serializado)), vm)
		assert.deepStrictEqual(ida_y_vuelta, resuelto, nombre + ': resolver(serializar(resolver(x))) = resolver(x)')
		assert.deepStrictEqual(serializar_diseno(ida_y_vuelta), serializado, nombre + ': serializar es estable')
		assert.deepStrictEqual(ids_de(ida_y_vuelta.disposicion), ids_de(resuelto.disposicion), nombre + ': mismas secciones')
		assert.ok(resuelto.version === 2 && Array.isArray(resuelto.disposicion), nombre + ': resuelve a v2 con disposición')
		if (nombre === 'v2 con seccion_4') {
			assert.deepStrictEqual(ida_y_vuelta.etapas.seccion_4, [{ key: 'observaciones', cols: 6 }], nombre + ': seccion_4 sobrevive a la ida y vuelta')
		}
	})
})

test('CA10 el serializado sale en v2, con secciones y disposición, y sin propiedades de interfaz', function () {
	let { resolver_diseno, serializar_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_minimo()

	let del_sistema = serializar_diseno(resolver_diseno(null, vm))
	assert.equal(del_sistema.version, 2)
	assert.ok(del_sistema.secciones && del_sistema.disposicion, 'trae secciones y disposición')
	assert.ok(!('plantilla' in del_sistema), 'sin plantilla cuando no viene de una')

	let agil = serializar_diseno(resolver_diseno({ version: 2, plantilla: 'agil' }, vm))
	assert.equal(agil.version, 2)
	assert.equal(agil.plantilla, 'agil', 'conserva la plantilla de origen')

	let con_seccion = serializar_diseno(resolver_diseno(layout_con_seccion_4(vm), vm))
	assert.deepStrictEqual(Object.keys(con_seccion.etapas), ['etapa_1', 'etapa_2', 'etapa_3', 'seccion_4'])
	Object.keys(con_seccion.etapas).forEach(function (id) {
		con_seccion.etapas[id].forEach(function (item) {
			item_sin_extras(item)
		})
	})
	Object.keys(con_seccion.secciones).forEach(function (id) {
		assert.deepStrictEqual(Object.keys(con_seccion.secciones[id]).sort(),
			['alto', 'alto_fijo', 'color', 'descripcion', 'plegado', 'titulo'], id + ': sólo las 6 propiedades de metadatos')
	})
	assert.deepStrictEqual(con_seccion.secciones.seccion_4, {
		titulo: 'Notas', descripcion: 'Lo que hay que recordar', color: 'rojo', alto: 3, alto_fijo: true, plegado: 'no',
	})
	con_seccion.disposicion.forEach(function (banda) {
		assert.deepStrictEqual(Object.keys(banda), ['columnas'])
		banda.columnas.forEach(function (columna) {
			assert.deepStrictEqual(Object.keys(columna).sort(), ['ancho', 'secciones'])
		})
	})

	/* Un item serializado trae sólo key, cols y (marcadores) id */
	function item_sin_extras(item) {
		let permitidas = ['cols', 'id', 'key']
		Object.keys(item).forEach(function (propiedad) {
			assert.ok(permitidas.indexOf(propiedad) !== -1, 'propiedad de interfaz en un item: ' + propiedad)
		})
	}
})

test('CA10 es_layout_de_plantilla y layout_de_plantilla reconocen el "sólo plantilla"', function () {
	let secciones = cargar_nuevo(RUTA_SECCIONES)
	assert.equal(secciones.es_layout_de_plantilla(null), true)
	assert.equal(secciones.es_layout_de_plantilla({ version: 2, plantilla: 'agil' }), true)
	assert.equal(secciones.es_layout_de_plantilla({ version: 2, plantilla: 'agil', etapas: { etapa_1: [] } }), false)
	assert.deepStrictEqual(secciones.layout_de_plantilla('agil'), { version: 2, plantilla: 'agil' })
})

/* ------------------------------------------------------------------ CA11 */

test('CA11 alto_en_px reparte el área útil en doceavos, con piso de 420', function () {
	let { alto_en_px } = cargar_nuevo(RUTA_SECCIONES)
	assert.equal(alto_en_px(12, 550, 18), 550)
	assert.ok(Math.abs(alto_en_px(8, 550, 18) - 360.667) < 0.001, '8/12 de 550 = 360,667')
	assert.ok(Math.abs(alto_en_px(4, 550, 18) - 171.333) < 0.001, '4/12 de 550 = 171,333')
	assert.equal(alto_en_px(12, 300, 18), 420, 'con un área menor a 420 se usa 420')
})

test('CA11 cols_al_apilar convierte el ancho de un campo al de la columna donde vive', function () {
	let { cols_al_apilar } = cargar_nuevo(RUTA_SECCIONES)
	assert.equal(cols_al_apilar(12, 12), 12)
	assert.equal(cols_al_apilar(2, 12), 2)
	assert.equal(cols_al_apilar(12, 4), 4)
	assert.equal(cols_al_apilar(6, 8), 4)
	assert.equal(cols_al_apilar(3, 4), 3)
	assert.equal(cols_al_apilar(3, 8), 3)
})

test('CA11 nuevo_id_de_seccion usa el menor seccion_N libre (4 a 9) y null si no hay', function () {
	let { nuevo_id_de_seccion } = cargar_nuevo(RUTA_SECCIONES)
	assert.equal(nuevo_id_de_seccion(['etapa_1', 'etapa_2', 'etapa_3']), 'seccion_4')
	assert.equal(nuevo_id_de_seccion(['etapa_2', 'etapa_3', 'seccion_4']), 'seccion_5')
	assert.equal(nuevo_id_de_seccion(['etapa_2', 'seccion_4', 'seccion_5', 'seccion_6', 'seccion_7', 'seccion_8', 'seccion_9']), null)
})

test('CA11 seccion_de_respaldo prefiere la sección por defecto, después la primera que no es etapa_2', function () {
	let { seccion_de_respaldo } = cargar_nuevo(RUTA_SECCIONES)
	assert.equal(seccion_de_respaldo('etapa_1', ['etapa_2', 'seccion_4']), 'seccion_4')
	assert.equal(seccion_de_respaldo('etapa_1', ['etapa_2']), 'etapa_2')
	assert.equal(seccion_de_respaldo('etapa_1', ['etapa_1', 'etapa_2', 'seccion_4']), 'etapa_1')
	assert.equal(seccion_de_respaldo('etapa_2', ['etapa_2', 'seccion_4']), 'etapa_2')
})

/* ------------------------------------------------------------------ CA12 */

/* Los cinco obligatorios de la configuración inicial, en el orden del catálogo. */
const OBLIGATORIOS_DE_ETAPA_1 = ['metodo_de_pago', 'caja', 'sucursal', 'lista_de_precios', 'tipo_de_venta']

/**
 * Pasa a mano unos campos de una sección a otra del estado de trabajo (lo que haría el arrastre).
 *
 * @param {object} estado
 * @param {string} desde id de sección
 * @param {string} hasta id de sección
 * @param {string[]} keys
 */
function mover_campos(estado, desde, hasta, keys) {
	let movidos = estado.etapas[desde].filter(function (item) { return keys.indexOf(item.key) !== -1 })
	estado.etapas[desde] = estado.etapas[desde].filter(function (item) { return keys.indexOf(item.key) === -1 })
	movidos.forEach(function (item) {
		estado.etapas[hasta].push(item)
	})
}

test('CA12 etapa_2 no se puede quitar: lleva la tabla de artículos', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { quitar_seccion } = cargar_nuevo(RUTA_OPERACIONES)
	let vm = vm_completo()
	let estado = armar_estado_de_trabajo(null, vm)

	let { resultado } = aplicar(quitar_seccion, estado, 'etapa_2', vm)
	assert.equal(resultado.ok, false)
	assert.match(resultado.motivo, /Lleva la tabla de artículos/)
	assert.ok(estado.etapas.etapa_2.length > 0, 'no se tocó la sección')
})

test('CA12 quitar la configuración inicial: bloquea con la lista de obligatorios y, ya movidos, manda los opcionales a la bandeja', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { quitar_seccion } = cargar_nuevo(RUTA_OPERACIONES)
	let vm = vm_completo()
	let estado = armar_estado_de_trabajo(null, vm)

	let bloqueada = aplicar(quitar_seccion, estado, 'etapa_1', vm)
	assert.equal(bloqueada.resultado.ok, false)
	assert.deepStrictEqual(bloqueada.resultado.obligatorios, OBLIGATORIOS_DE_ETAPA_1)
	assert.ok(estado.etapas.etapa_1.length > 0, 'bloqueada: la sección sigue')

	/* Los opcionales que se ven y los que no están disponibles, antes de quitar */
	let opcionales_visibles = estado.etapas.etapa_1.filter(function (item) {
		return item.key.indexOf('separador') === -1 && OBLIGATORIOS_DE_ETAPA_1.indexOf(item.key) === -1
	}).map(function (item) { return item.key })
	assert.ok(opcionales_visibles.length > 0)
	let cantidad_de_sacados = estado.sacados.length

	mover_campos(estado, 'etapa_1', 'etapa_3', OBLIGATORIOS_DE_ETAPA_1)
	let quitada = aplicar(quitar_seccion, estado, 'etapa_1', vm)
	assert.equal(quitada.resultado.ok, true, 'sin obligatorios ya se puede quitar: ' + quitada.resultado.motivo)

	let sacados = quitada.estado.sacados
	assert.equal(sacados.length, cantidad_de_sacados + opcionales_visibles.length)
	let primeros = sacados.slice(0, opcionales_visibles.length).map(function (item) { return item.key })
	assert.deepStrictEqual(primeros.slice().sort(), opcionales_visibles.slice().sort(), 'los opcionales visibles quedan al principio de la bandeja')
	sacados.forEach(function (item) {
		assert.ok(item.key.indexOf('separador') === -1 && item.key.indexOf('salto_de_fila') === -1, 'los marcadores se descartan')
	})
	assert.ok(!('etapa_1' in quitada.estado.etapas), 'etapa_1 sale de `etapas`')
	assert.ok(!('etapa_1' in quitada.estado.secciones), 'etapa_1 sale de `secciones`')
	assert.ok(!('etapa_1' in quitada.estado.ocultos), 'etapa_1 sale de `ocultos`')
	assert.deepStrictEqual(quitada.estado.disposicion, [
		{ columnas: [{ ancho: 12, secciones: ['etapa_2', 'etapa_3'] }] },
	])
})

test('CA12 con el vm mínimo sólo bloquea metodo_de_pago y los obligatorios ocultos terminan en la sección de respaldo', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { quitar_seccion } = cargar_nuevo(RUTA_OPERACIONES)
	let vm = vm_minimo()
	let estado = armar_estado_de_trabajo(null, vm)

	let bloqueada = aplicar(quitar_seccion, estado, 'etapa_1', vm)
	assert.equal(bloqueada.resultado.ok, false)
	assert.deepStrictEqual(bloqueada.resultado.obligatorios, ['metodo_de_pago'])

	mover_campos(estado, 'etapa_1', 'etapa_3', ['metodo_de_pago'])
	let ocultos_opcionales = estado.ocultos.etapa_1.filter(function (oculto) {
		return OBLIGATORIOS_DE_ETAPA_1.indexOf(oculto.item.key) === -1
	}).map(function (oculto) { return oculto.item.key })

	let quitada = aplicar(quitar_seccion, estado, 'etapa_1', vm)
	assert.equal(quitada.resultado.ok, true, 'motivo: ' + quitada.resultado.motivo)

	let ocultos_en_respaldo = quitada.estado.ocultos.etapa_3.map(function (oculto) { return oculto.item.key })
	;['caja', 'sucursal', 'lista_de_precios', 'tipo_de_venta'].forEach(function (key) {
		assert.ok(ocultos_en_respaldo.indexOf(key) !== -1, key + ' (obligatorio oculto) va a los ocultos de etapa_3')
		let en_sacados_ocultos = quitada.estado.sacados_ocultos.filter(function (oculto) { return oculto.key === key })
		assert.equal(en_sacados_ocultos.length, 0, key + ' no va a sacados ocultos')
	})
	let sacados_ocultos = quitada.estado.sacados_ocultos.map(function (oculto) { return oculto.key })
	ocultos_opcionales.forEach(function (key) {
		assert.ok(sacados_ocultos.indexOf(key) !== -1, key + ' (opcional oculto) va a sacados ocultos')
	})
})

test('CA12 agregar_seccion llega hasta 6 secciones y rechaza la séptima', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { agregar_seccion } = cargar_nuevo(RUTA_OPERACIONES)
	let vm = vm_completo()
	let estado = armar_estado_de_trabajo(null, vm)
	let colores_esperados = { seccion_4: 'violeta', seccion_5: 'rojo', seccion_6: 'turquesa' }

	;['seccion_4', 'seccion_5', 'seccion_6'].forEach(function (id) {
		let agregada = aplicar(agregar_seccion, estado, vm)
		assert.equal(agregada.resultado.ok, true, id + ': ' + agregada.resultado.motivo)
		estado = agregada.estado
		assert.deepStrictEqual(estado.etapas[id], [], id + ' arranca vacía')
		assert.deepStrictEqual(estado.secciones[id], {
			titulo: 'Sección nueva', descripcion: null, color: colores_esperados[id], alto: 4, alto_fijo: false, plegado: 'no',
		})
		let ultima_banda = estado.disposicion[estado.disposicion.length - 1]
		assert.deepStrictEqual(ultima_banda, { columnas: [{ ancho: 12, secciones: [id] }] }, id + ' va en una banda nueva al final')
	})
	assert.equal(ids_de(estado.disposicion).length, 6)

	let septima = aplicar(agregar_seccion, estado, vm)
	assert.equal(septima.resultado.ok, false)
	assert.equal(typeof septima.resultado.motivo, 'string')
	assert.equal(ids_de(septima.estado.disposicion).length, 6, 'sigue habiendo 6')
})

test('CA12 mover_a_columna_nueva parte la columna en dos y rechaza una sección sola en la suya', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { mover_a_columna_nueva } = cargar_nuevo(RUTA_OPERACIONES)
	let vm = vm_completo()

	let estado = armar_estado_de_trabajo(null, vm)
	let movida = aplicar(mover_a_columna_nueva, estado, 'etapa_1')
	assert.equal(movida.resultado.ok, true, movida.resultado.motivo)
	assert.deepStrictEqual(movida.estado.disposicion, [
		{ columnas: [{ ancho: 6, secciones: ['etapa_2', 'etapa_3'] }, { ancho: 6, secciones: ['etapa_1'] }] },
	])

	/* En el ágil, la configuración inicial está sola en su columna de 4: no hay nada que partir */
	let agil = armar_estado_de_trabajo({ version: 2, plantilla: 'agil' }, vm)
	let sola = aplicar(mover_a_columna_nueva, agil, 'etapa_1')
	assert.equal(sola.resultado.ok, false)
	assert.equal(typeof sola.resultado.motivo, 'string')
	assert.deepStrictEqual(sola.estado.disposicion, [
		{ columnas: [{ ancho: 4, secciones: ['etapa_1'] }, { ancho: 8, secciones: ['etapa_2', 'etapa_3'] }] },
	], 'la disposición no cambia')
})

test('CA12 mover_a_banda_nueva saca la sección de su columna y la pone en una fila debajo', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { mover_a_banda_nueva } = cargar_nuevo(RUTA_OPERACIONES)
	let estado = armar_estado_de_trabajo(null, vm_completo())

	let movida = aplicar(mover_a_banda_nueva, estado, 'etapa_3')
	assert.equal(movida.resultado.ok, true, movida.resultado.motivo)
	assert.deepStrictEqual(movida.estado.disposicion, [
		{ columnas: [{ ancho: 12, secciones: ['etapa_1', 'etapa_2'] }] },
		{ columnas: [{ ancho: 12, secciones: ['etapa_3'] }] },
	])
})

test('CA12 cambiar_ancho_de_columna traspasa con la vecina, respeta el mínimo 3 y la suma 12', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { mover_a_columna_nueva, cambiar_ancho_de_columna } = cargar_nuevo(RUTA_OPERACIONES)
	let estado = armar_estado_de_trabajo(null, vm_completo())
	estado = aplicar(mover_a_columna_nueva, estado, 'etapa_1').estado

	function anchos(e) {
		return e.disposicion[0].columnas.map(function (columna) { return columna.ancho })
	}
	assert.deepStrictEqual(anchos(estado), [6, 6])

	let mas_uno = aplicar(cambiar_ancho_de_columna, estado, 0, 0, 1)
	assert.equal(mas_uno.resultado.ok, true, mas_uno.resultado.motivo)
	assert.deepStrictEqual(anchos(mas_uno.estado), [7, 5])

	let al_maximo = aplicar(cambiar_ancho_de_columna, mas_uno.estado, 0, 0, 10)
	let despues_de_max = anchos(al_maximo.estado)
	assert.ok(despues_de_max[0] >= 3 && despues_de_max[1] >= 3, 'la vecina no baja de 3: ' + despues_de_max)
	assert.equal(despues_de_max[0] + despues_de_max[1], 12)

	let al_minimo = aplicar(cambiar_ancho_de_columna, al_maximo.estado, 0, 0, -20)
	let despues_de_min = anchos(al_minimo.estado)
	assert.ok(despues_de_min[0] >= 3 && despues_de_min[1] >= 3, 'la columna no baja de 3: ' + despues_de_min)
	assert.equal(despues_de_min[0] + despues_de_min[1], 12)
})

test('CA12 cambiar_alto acota 1..12 y cambiar_alto_fijo(true) deja plegado "no"', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { cambiar_alto, cambiar_alto_fijo } = cargar_nuevo(RUTA_OPERACIONES)
	let estado = armar_estado_de_trabajo(null, vm_completo())
	assert.equal(estado.secciones.etapa_3.plegado, 'arranca_plegada', 'de partida la etapa 3 arranca plegada')

	let fija = aplicar(cambiar_alto_fijo, estado, 'etapa_3', true)
	assert.equal(fija.resultado.ok, true, fija.resultado.motivo)
	assert.equal(fija.estado.secciones.etapa_3.alto_fijo, true)
	assert.equal(fija.estado.secciones.etapa_3.plegado, 'no', 'una sección fija no se pliega')

	let seis = aplicar(cambiar_alto, fija.estado, 'etapa_3', 6)
	assert.equal(seis.estado.secciones.etapa_3.alto, 6)

	let excedido = aplicar(cambiar_alto, seis.estado, 'etapa_3', 20)
	assert.ok(excedido.estado.secciones.etapa_3.alto >= 1 && excedido.estado.secciones.etapa_3.alto <= 12, 'el alto queda en 1..12')
	let cero = aplicar(cambiar_alto, excedido.estado, 'etapa_3', 0)
	assert.ok(cero.estado.secciones.etapa_3.alto >= 1 && cero.estado.secciones.etapa_3.alto <= 12, 'el alto queda en 1..12')
})

test('CA12 la huella del diseño cambia si sólo cambia un color o la disposición, y no si no se toca nada', function () {
	let { armar_estado_de_trabajo, armar_diseno_completo, huella_del_diseno } = cargar(RUTA_ESTADO)
	let vm = vm_completo()
	let estado = armar_estado_de_trabajo(null, vm)
	let original = huella_del_diseno(estado)

	assert.equal(huella_del_diseno(armar_estado_de_trabajo(null, vm)), original, 'sin tocar nada la huella es la misma')

	let completo = armar_diseno_completo(estado)
	assert.ok(completo.secciones && completo.disposicion, 'el diseño completo incluye secciones y disposición')

	estado.secciones.etapa_1.color = 'rojo'
	assert.notEqual(huella_del_diseno(estado), original, 'cambiar sólo un color marca "tocado"')
	estado.secciones.etapa_1.color = 'azul'
	assert.equal(huella_del_diseno(estado), original)

	estado.disposicion[0].columnas[0].ancho = 12
	estado.disposicion[0].columnas.push({ ancho: 0, secciones: [] })
	assert.notEqual(huella_del_diseno(estado), original, 'cambiar la disposición también')
})

test('CA12 abrir un diseño y guardarlo sin tocar nada devuelve el mismo diseño (null, ágil y un v2 con seccion_4 intacta)', function () {
	let { armar_estado_de_trabajo, armar_diseno_completo } = cargar(RUTA_ESTADO)
	let { resolver_diseno, serializar_diseno } = cargar(RUTA_RESOLVER)
	let vm = vm_completo()
	let casos = {
		'null': null,
		'ágil': { version: 2, plantilla: 'agil' },
		'v2 con seccion_4': layout_con_seccion_4(vm),
	}
	Object.keys(casos).forEach(function (nombre) {
		let estado = armar_estado_de_trabajo(casos[nombre], vm)
		let guardado = serializar_diseno(armar_diseno_completo(estado))
		assert.deepStrictEqual(resolver_diseno(guardado, vm), resolver_diseno(casos[nombre], vm), nombre)
		assert.ok(Array.isArray(estado.disposicion) && estado.secciones, nombre + ': el estado de trabajo trae disposición y secciones')
		if (nombre === 'v2 con seccion_4') {
			assert.deepStrictEqual(estado.etapas.seccion_4, [{ key: 'observaciones', cols: 6 }], nombre + ': seccion_4 está en el estado de trabajo')
		}
	})
})
