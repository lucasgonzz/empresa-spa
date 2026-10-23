// Regresión San Cayetano: ejecutar con node --test tests/total-antes-de-guardar.test.cjs.
// No levanta servidores ni usa la suite de Playwright. Ejecuta los métodos y el template reales.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')
const raiz = path.resolve(__dirname, '..')
const cache = new Map()

function cargar(ruta) {
	if (cache.has(ruta)) return cache.get(ruta)
	const archivo = path.join(raiz, 'src', ruta)
	const codigo = babel.transformSync(fs.readFileSync(archivo, 'utf8'), {
		babelrc: false, configFile: false,
		plugins: ['@babel/plugin-transform-modules-commonjs'],
	}).code
	const exports = {}
	cache.set(ruta, exports)
	vm.runInNewContext(codigo, {
		exports,
		require: nombre => {
			if (nombre.startsWith('@/utils/')) return cargar(nombre.slice(2) + '.js')
			if (nombre.startsWith('./')) return cargar(path.posix.join(path.posix.dirname(ruta), nombre) + '.js')
			if (nombre.includes('moneda_y_cotizacion_del_put')) {
				return {
					moneda_para_el_put_de_la_venta: valor => valor || 1,
					cotizacion_para_el_put_de_la_venta: () => null,
				}
			}
			return { generar_offline_uuid: () => 'caso-san-cayetano' }
		},
		console: { log() {} }, navigator: { onLine: true },
	}, { filename: archivo })
	return exports
}

function modulo(ruta) { return cargar(ruta).default }

const calculador = modulo('mixins/vender_set_total.js')
const modelos = modulo('mixins/model_functions.js')
const guardar = modulo('mixins/vender/guardar_venta/index.js')
const editar = modulo('mixins/vender/previus_sale/index.js')
const precios = modulo('mixins/vender/set_items_prices.js')
const generales = modulo('mixins/generals.js')

function escenario() {
	const estado = {
		items: [{ id: 54489, is_article: true, amount: 1, price_vender: 3700, price_vender_personalizado: 3700 }],
		total: 14800, sub_total: 14800, pending_attachments: [],
		selected_payment_methods: [], modal_payment_methods: [],
		current_acount_payment_method_id: 3, moneda_id: 1,
		previus_sales: {}, total_description: [], discounts_id: [],
	}
	const contexto = {
		vender_items: estado.items, items: estado.items,
		discounts_id: [], surchages_id: [], surcahges_models_vender: [],
		discounts_store: [], current_acount_payment_method_discounts: [],
		from_pivot: false, descuento: 0, descuento_puntos: 0, forzar_total_monto: null,
		previus_sale: { id: 46756 }, valor_dolar: null,
		price: String, porcentaje_es: String,
		hasExtencion: () => false,
		get_models_by_id: () => [], get_discounts: () => [], get_surchages: () => [],
		$toast: { warning() {}, error() {} }, resetear_vender() {},
		adjuntos_para_guardar_en_el_equipo: () => [],
		$store: {
			state: { vender: estado, auth: { online: true }, current_acount_payment_method_discount: { models: [] }, discount: { models: [] } }, getters: {},
			commit(nombre, valor) {
				const claves = {
					'vender/setItems': 'items', 'vender/setTotal': 'total',
					'vender/setSubTotal': 'sub_total', 'vender/set_total_description': 'total_description',
				}
				if (claves[nombre]) estado[claves[nombre]] = valor
			},
		},
	}
	Object.assign(contexto, generales.methods, precios.methods, calculador.methods)
	contexto.getTotalItem = modelos.methods.getTotalItem
	Object.defineProperties(contexto, {
		total: { get: () => estado.total }, sub_total: { get: () => estado.sub_total },
	})
	return { contexto, estado }
}

test('un input de cantidad sin keyup actualiza el total mostrado', () => {
	const { contexto, estado } = escenario()
	estado.items[0].amount = 4
	const fuente = fs.readFileSync(path.join(raiz, 'src/components/vender/components/remito/ArticlesTable.vue'), 'utf8')
	const plantilla = compiler.parseComponent(fuente).template.content
	const compilado = compiler.compile(plantilla)
	assert.deepEqual(compilado.errors, [])
	const vista = new Vue({
		data: () => ({ items: estado.items, table_items: estado.items, fields: [], image_dynamic_fields: [], fields_signature: '', previus_sale: null }),
		methods: { callSetTotal: () => contexto.setTotal(), id_de_renglon: item => item.id },
		render: new Function(compilado.render),
	})
	// Sólo se evalúa la celda de cantidad; las otras celdas son slots perezosos.
	const arbol = vista._render()
	function buscar(nodo, etiqueta) {
		if (nodo.tag === etiqueta) return nodo
		for (const hijo of nodo.children || []) {
			const encontrado = buscar(hijo, etiqueta)
			if (encontrado) return encontrado
		}
	}
	const tabla = buscar(arbol, 'b-table')
	const celda = tabla.data.scopedSlots['cell(amount)']({ index: 0 })[0]
	const input = buscar(celda, 'b-form-input')
	// Bootstrap-Vue aplica primero v-model y después el listener de input.
	input.data.model.callback('1')
	if (input.data.on.input) input.data.on.input('1')
	assert.equal(estado.total, 3700)
})

test('guardar recalcula antes de validar el cobro, también con atajo de teclado', () => {
	const { contexto, estado } = escenario()
	contexto.checkear_vender = () => {
		assert.equal(estado.total, 3700)
		return true
	}
	contexto.guardar_venta_online = () => assert.equal(estado.total, 3700)
	guardar.methods.guardar_venta.call(contexto)
})

test('el alta envía el total recalculado aunque se invoque su camino directo', () => {
	const { contexto, estado } = escenario()
	contexto.$store.dispatch = () => {
		assert.equal(estado.total, 3700)
		assert.equal(estado.sub_total, 3700)
		return new Promise(() => {})
	}
	guardar.methods.guardar_venta_online.call(contexto, 'caso-san-cayetano')
})

test('el PUT de edición envía los renglones y el total de la misma foto', () => {
	const { contexto } = escenario()
	contexto.$store.dispatch = (accion, cuerpo) => {
		assert.equal(accion, 'vender/previus_sales/updateSale')
		assert.equal(cuerpo.items[0].amount, 1)
		assert.equal(cuerpo.total, 3700)
		assert.equal(cuerpo.sub_total, 3700)
		return new Promise(() => {})
	}
	editar.methods.updateSale.call(contexto)
})

test('el guardado sin conexión conserva el total recalculado', () => {
	const { contexto } = escenario()
	contexto.save_sale_offline = cuerpo => {
		assert.equal(cuerpo.total, 3700)
		assert.equal(cuerpo.sub_total, 3700)
		return Promise.resolve()
	}
	return guardar.methods.guardar_venta_offline.call(contexto, 'caso-san-cayetano')
})

test('recalcular dos veces preserva precio manual, descuento directo, puntos y forzado', () => {
	const { contexto, estado } = escenario()
	estado.aplicar_descuentos_directo_a_items = 1
	estado.discounts_id = [1]
	contexto.$store.state.discount.models = [{ id: 1, percentage: 10 }]
	contexto.discounts_id = [1]
	contexto.descuentos_en_precios_efectivos = true
	contexto.descuento_puntos = 100
	contexto.puntos_canjeados = 10
	contexto.forzar_total_monto = -30
	for (let repeticion = 0; repeticion < 2; repeticion++) {
		contexto.setTotal()
		assert.equal(estado.items[0].price_vender_personalizado, 3700)
		assert.equal(estado.items[0].price_vender, 3330)
		assert.equal(estado.items[0].price_vender_sin_descuentos, 3700)
		assert.equal(estado.total, 3200) // 3700 × 0,9 − 100 − 30.
	}
})

test('recalcular una venta en dólares usa el precio guardado sin volver a cotizarlo', () => {
	const { contexto, estado } = escenario()
	estado.moneda_id = 2
	contexto.moneda_id = 2
	contexto.valor_dolar = 1500
	contexto.from_pivot = true
	estado.items[0].price_vender_personalizado = null
	estado.items[0].pivot = { price: 2.5, amount: 4 }
	for (let repeticion = 0; repeticion < 2; repeticion++) {
		contexto.setTotal()
		assert.equal(estado.items[0].price_vender, 2.5)
		assert.equal(estado.total, 2.5) // Cantidad actual 1, no las 4 del pivot anterior.
	}
})

test('el alta recalcula las filas de varios precios aunque no se haya pulsado Enter', () => {
	const { contexto, estado } = escenario()
	estado.items[0].varios_precios = [{ price_vender: 3700, amount: 1 }]
	estado.items[0].calculated_price_vender = 14800
	contexto.$store.dispatch = () => {
		assert.equal(estado.items[0].calculated_price_vender, 3700)
		assert.equal(estado.total, 3700)
		return new Promise(() => {})
	}
	guardar.methods.guardar_venta_online.call(contexto, 'caso-varios-precios')
})
