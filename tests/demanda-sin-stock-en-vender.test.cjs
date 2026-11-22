// Vender: demanda no satisfecha (misión demanda-sin-stock-vender, 21/11/2026). Cuando Vender FRENA un
// artículo por falta de stock (check_article_stock_en_vender) el sistema lo anota como un pedido que no
// se pudo vender y avisa en pantalla, con un botón Cancelar por si fue un error. CA11 a CA14 del PLAN.
//
// Contrato de la API (§2.3 del PLAN): POST `unmet-demand` y PUT `unmet-demand/{id}/cancel`.
// La SPA tiene que quedar idéntica a hoy si el endpoint no existe o falla: sin aviso, sin toast extra,
// sin indicador global de carga.
//
// Ejecutar con: node --test tests/demanda-sin-stock-en-vender.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const raiz = path.resolve(__dirname, '..')

// check_stock.js importa el mixin computed (sólo getters del store): se lo reemplaza por uno vacío.
const mock_computed = { '@/mixins/vender/computed': { __esModule: true, default: {} } }

/**
 * Arma el `this` falso de check_stock.js: los métodos reales del mixin, un espía en el punto único de
 * registro y un toast que anota cada mensaje.
 *
 * @param {object} opciones extencion: lista de extensiones activas; presupuesto: bool; address_id: sucursal.
 * @returns {object} ctx con `llamadas` (registros enviados) y `toasts` (textos mostrados).
 */
function armar_ctx_de_stock(opciones) {
	const mixin = cargar('mixins/vender/check_stock.js', mock_computed).default
	const llamadas = []
	const toasts = []
	const extensiones = opciones.extencion || []
	const ctx = Object.assign({}, mixin.methods, {
		llamadas,
		toasts,
		guardar_como_presupuesto: !!opciones.presupuesto,
		muestra_sucursales: true,
		hasExtencion(nombre) { return extensiones.includes(nombre) },
		numero_es(numero) { return String(numero) },
		registrar_frenos_por_stock(registros, contexto) { llamadas.push({ registros, contexto }) },
		$toast: { error(texto) { toasts.push(texto) } },
		$store: { state: { vender: { address_id: opciones.address_id || 0, employee_id: 0 } } },
	})
	return ctx
}

/** Silencia el console.log de depuración que check_stock_disponible ya trae, para no ensuciar la salida. */
function sin_console_log(funcion) {
	const original = console.log
	console.log = () => {}
	try {
		return funcion()
	} finally {
		console.log = original
	}
}

/** Stub de document.getElementById que usa check_stock_mayor_a_cero al frenar. */
function instalar_document() {
	global.document = { getElementById() { return { value: 'x' } } }
}

const CHECK = ['check_article_stock_en_vender']
const WARN = ['warn_article_stock_en_vender']

// ---------------------------------------------------------------------------------------------------
// CA11 — sólo registra cuando frena
// ---------------------------------------------------------------------------------------------------

test('CA11: artículo en 0 con el freno: devuelve false y registra UNA vez el sin_stock', () => {
	instalar_document()
	const ctx = armar_ctx_de_stock({ extencion: CHECK })
	const item = { is_article: true, id: 10, name: 'Mecha 8', stock: 0 }
	assert.equal(ctx.check_stock_mayor_a_cero(item), false)
	assert.equal(ctx.llamadas.length, 1)
	assert.deepEqual(ctx.llamadas[0].registros, [{
		article_id: 10,
		article_variant_id: null,
		combo_id: null,
		motivo: 'sin_stock',
		cantidad_pedida: null,
		stock_disponible: 0,
	}])
	assert.deepEqual(ctx.llamadas[0].contexto.nombres, ['Mecha 8'])
	assert.deepEqual(ctx.toasts, ['Articulo sin stock, NO se agrego'])
})

test('CA11: con sólo warn_article_stock_en_vender devuelve true y no registra nada', () => {
	instalar_document()
	const ctx = armar_ctx_de_stock({ extencion: WARN })
	const item = { is_article: true, id: 10, name: 'Mecha 8', stock: 0 }
	assert.equal(ctx.check_stock_mayor_a_cero(item), true)
	assert.equal(ctx.llamadas.length, 0)
	assert.deepEqual(ctx.toasts, ['Articulo sin stock'])
})

test('CA11: guardar como presupuesto nunca frena ni registra', () => {
	instalar_document()
	const ctx = armar_ctx_de_stock({ extencion: CHECK, presupuesto: true })
	assert.equal(ctx.check_stock_mayor_a_cero({ is_article: true, id: 10, name: 'Mecha 8', stock: 0 }), true)
	assert.equal(ctx.llamadas.length, 0)
	assert.deepEqual(ctx.toasts, [])
})

test('CA11: stock null (no se controla) o con stock no frena ni registra', () => {
	instalar_document()
	const ctx = armar_ctx_de_stock({ extencion: CHECK })
	assert.equal(ctx.check_stock_mayor_a_cero({ is_article: true, id: 10, name: 'Mecha 8', stock: null }), true)
	assert.equal(ctx.check_stock_mayor_a_cero({ is_article: true, id: 10, name: 'Mecha 8', stock: 3 }), true)
	assert.equal(ctx.llamadas.length, 0)
})

// ---------------------------------------------------------------------------------------------------
// CA12 — stock insuficiente, variante y combo (y los toasts/retornos de siempre)
// ---------------------------------------------------------------------------------------------------

test('CA12: sucursal con 2 y cantidad 5: frena con "Solo hay 2 en Centro" y registra stock_insuficiente', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK, address_id: 7 })
	const item = {
		is_article: true, id: 10, name: 'Mecha 8', amount: 5,
		addresses: [{ id: 7, street: 'Centro', pivot: { amount: 2 } }],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), false)
	assert.deepEqual(ctx.toasts, ['Solo hay 2 en Centro'])
	assert.equal(ctx.llamadas.length, 1)
	assert.deepEqual(ctx.llamadas[0].registros, [{
		article_id: 10,
		article_variant_id: null,
		combo_id: null,
		motivo: 'stock_insuficiente',
		cantidad_pedida: 5,
		stock_disponible: 2,
	}])
})

test('CA12: sucursal con 0: sin_stock con la cantidad pedida y el texto de siempre', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK, address_id: 7 })
	const item = {
		is_article: true, id: 10, name: 'Mecha 8', amount: 5,
		addresses: [{ id: 7, street: 'Centro', pivot: { amount: 0 } }],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), false)
	assert.deepEqual(ctx.toasts, ['No hay stock en Centro'])
	assert.equal(ctx.llamadas.length, 1)
	assert.equal(ctx.llamadas[0].registros[0].motivo, 'sin_stock')
	assert.equal(ctx.llamadas[0].registros[0].cantidad_pedida, 5)
	assert.equal(ctx.llamadas[0].registros[0].stock_disponible, 0)
})

test('CA12: ítem de variante: el registro lleva article_variant_id y el id del ARTÍCULO', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK, address_id: 7 })
	const item = {
		is_article: true, id: 10, name: 'Remera', variant_id: 33, amount: 4,
		addresses: [{ id: 7, street: 'Centro', pivot: { amount: 1 } }],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), false)
	assert.equal(ctx.llamadas[0].registros[0].article_id, 10)
	assert.equal(ctx.llamadas[0].registros[0].article_variant_id, 33)
})

test('CA12: sin sucursales en el ítem compara contra item.stock y registra stock_insuficiente', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK })
	const item = { is_article: true, id: 10, name: 'Mecha 8', amount: 3, stock: 1, addresses: [] }
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), false)
	assert.deepEqual(ctx.toasts, ['Solo hay 1 en stock'])
	assert.deepEqual(ctx.llamadas[0].registros, [{
		article_id: 10,
		article_variant_id: null,
		combo_id: null,
		motivo: 'stock_insuficiente',
		cantidad_pedida: 3,
		stock_disponible: 1,
	}])
})

test('CA12: con stock suficiente no frena ni registra', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK, address_id: 7 })
	const item = {
		is_article: true, id: 10, name: 'Mecha 8', amount: 2,
		addresses: [{ id: 7, street: 'Centro', pivot: { amount: 9 } }],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), true)
	assert.equal(ctx.llamadas.length, 0)
	assert.deepEqual(ctx.toasts, [])
})

test('CA12: con sólo warn_ el stock insuficiente avisa (toast) pero devuelve true y no registra', () => {
	const ctx = armar_ctx_de_stock({ extencion: WARN, address_id: 7 })
	const item = {
		is_article: true, id: 10, name: 'Mecha 8', amount: 5,
		addresses: [{ id: 7, street: 'Centro', pivot: { amount: 2 } }],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), true)
	assert.deepEqual(ctx.toasts, ['Solo hay 2 en Centro'])
	assert.equal(ctx.llamadas.length, 0)
})

test('CA12: presupuesto con stock insuficiente: no frena ni registra', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK, address_id: 7, presupuesto: true })
	const item = {
		is_article: true, id: 10, name: 'Mecha 8', amount: 5,
		addresses: [{ id: 7, street: 'Centro', pivot: { amount: 2 } }],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(item)), true)
	assert.equal(ctx.llamadas.length, 0)
})

test('CA12: combo con 2 componentes, uno en 0: registra sólo ese, con combo_id; toast de siempre', () => {
	instalar_document()
	const ctx = armar_ctx_de_stock({ extencion: CHECK })
	const combo = {
		is_combo: true, id: 50, name: 'Kit taladro',
		articles: [
			{ id: 1, name: 'Mecha 8', stock: 0 },
			{ id: 2, name: 'Taco', stock: 4 },
		],
	}
	assert.equal(ctx.check_stock_mayor_a_cero(combo), false)
	assert.deepEqual(ctx.toasts, ['El articulo Mecha 8 no tiene stock'])
	assert.equal(ctx.llamadas.length, 1)
	assert.deepEqual(ctx.llamadas[0].registros, [{
		article_id: 1,
		article_variant_id: null,
		combo_id: 50,
		motivo: 'sin_stock',
		cantidad_pedida: null,
		stock_disponible: 0,
	}])
	assert.deepEqual(ctx.llamadas[0].contexto.nombres, ['Mecha 8'])
	assert.equal(ctx.llamadas[0].contexto.combo_nombre, 'Kit taladro')
})

test('CA12: combo con componente que no alcanza para la cantidad: stock_insuficiente con combo_id', () => {
	const ctx = armar_ctx_de_stock({ extencion: CHECK })
	const combo = {
		is_combo: true, id: 50, name: 'Kit taladro', amount: 3,
		articles: [
			{ id: 1, name: 'Mecha 8', stock: 1 },
			{ id: 2, name: 'Taco', stock: 9 },
		],
	}
	assert.equal(sin_console_log(() => ctx.check_stock_disponible(combo)), false)
	assert.deepEqual(ctx.toasts, ['Mecha 8 solo tiene 1 en stock'])
	assert.deepEqual(ctx.llamadas[0].registros, [{
		article_id: 1,
		article_variant_id: null,
		combo_id: 50,
		motivo: 'stock_insuficiente',
		cantidad_pedida: 3,
		stock_disponible: 1,
	}])
})

test('CA12: check_stock.js hereda el mixin de registro (así lo tienen los 4 llamadores)', () => {
	const mixin = cargar('mixins/vender/check_stock.js', mock_computed).default
	const registro = cargar('mixins/vender/demanda_sin_stock.js').default
	assert.ok(mixin.mixins.includes(registro), 'check_stock.js tiene que incluir mixins/vender/demanda_sin_stock')
	assert.equal(typeof registro.methods.registrar_frenos_por_stock, 'function')
})

// ---------------------------------------------------------------------------------------------------
// CA13 — envío silencioso
// ---------------------------------------------------------------------------------------------------

/**
 * Arma el `this` falso del mixin de registro con un $api falso. `respuestas` decide qué hace cada POST.
 *
 * @param {Function} responder Recibe (url, payload, config) y devuelve una promesa.
 * @param {object} [store] address_id y employee_id del store de Vender.
 */
function armar_ctx_de_registro(responder, store) {
	const mixin = cargar('mixins/vender/demanda_sin_stock.js').default
	const posts = []
	const commits = []
	const toasts = []
	const ctx = Object.assign({}, mixin.methods, {
		posts,
		commits,
		toasts,
		$api: {
			post(url, payload, config) {
				posts.push({ url, payload, config })
				return responder(url, payload, config)
			},
		},
		$store: {
			state: { vender: Object.assign({ address_id: 7, employee_id: 0 }, store || {}) },
			commit(nombre, valor) { commits.push({ nombre, valor }) },
		},
		$toast: {
			error(texto) { toasts.push(['error', texto]) },
			success(texto) { toasts.push(['success', texto]) },
			info(texto) { toasts.push(['info', texto]) },
		},
	})
	return ctx
}

const REGISTRO_SIN_STOCK = {
	article_id: 10, article_variant_id: null, combo_id: null,
	motivo: 'sin_stock', cantidad_pedida: null, stock_disponible: 0,
}

test('CA13: hace un POST a unmet-demand por registro, con sucursal y empleado del store (0 a null), en silencio', () => {
	const ctx = armar_ctx_de_registro(() => Promise.resolve({ data: { model: { id: 91 }, deduplicado: false } }))
	return ctx.registrar_frenos_por_stock([REGISTRO_SIN_STOCK], { nombres: ['Mecha 8'], combo_nombre: null }).then(() => {
		assert.equal(ctx.posts.length, 1)
		assert.equal(ctx.posts[0].url, 'unmet-demand')
		assert.deepEqual(ctx.posts[0].payload, {
			article_id: 10, article_variant_id: null, combo_id: null, address_id: 7, employee_id: null,
			motivo: 'sin_stock', cantidad_pedida: null, stock_disponible: 0,
		})
		assert.deepEqual(ctx.posts[0].config, { skip_global_error_event: true, skip_global_validation_toast: true })
	})
})

test('CA13: con empleado elegido y sin sucursal: employee_id va, address_id (0) va como null', () => {
	const ctx = armar_ctx_de_registro(
		() => Promise.resolve({ data: { model: { id: 91 } } }),
		{ address_id: 0, employee_id: 4 }
	)
	return ctx.registrar_frenos_por_stock([REGISTRO_SIN_STOCK], { nombres: ['Mecha 8'], combo_nombre: null }).then(() => {
		assert.equal(ctx.posts[0].payload.address_id, null)
		assert.equal(ctx.posts[0].payload.employee_id, 4)
	})
})

test('CA13: si responde, commit del aviso con los ids devueltos y el nombre; sin loading global', () => {
	const ctx = armar_ctx_de_registro(() => Promise.resolve({ data: { model: { id: 91 }, deduplicado: false } }))
	return ctx.registrar_frenos_por_stock([REGISTRO_SIN_STOCK], { nombres: ['Mecha 8'], combo_nombre: null }).then(() => {
		assert.deepEqual(ctx.commits, [{
			nombre: 'demanda_sin_stock/set_aviso',
			valor: { ids: [91], nombres: ['Mecha 8'], motivo: 'sin_stock', combo_nombre: null },
		}])
		assert.deepEqual(ctx.toasts, [])
	})
})

test('CA13: la API vieja (404) no deja toast, ni aviso, ni commit, y no tira excepción', () => {
	const ctx = armar_ctx_de_registro(() => Promise.reject({ response: { status: 404, data: {} } }))
	return ctx.registrar_frenos_por_stock([REGISTRO_SIN_STOCK], { nombres: ['Mecha 8'], combo_nombre: null }).then(() => {
		assert.equal(ctx.posts.length, 1)
		assert.deepEqual(ctx.commits, [])
		assert.deepEqual(ctx.toasts, [])
	})
})

test('CA13: sin red (rechazo sin response) tampoco hace ruido', () => {
	const ctx = armar_ctx_de_registro(() => Promise.reject(new Error('Network Error')))
	return ctx.registrar_frenos_por_stock([REGISTRO_SIN_STOCK], { nombres: ['Mecha 8'], combo_nombre: null }).then(() => {
		assert.deepEqual(ctx.commits, [])
		assert.deepEqual(ctx.toasts, [])
	})
})

test('CA13: dos registros (combo): uno falla y otro no, el aviso lleva sólo el que se guardó', () => {
	const respuestas = {
		1: () => Promise.resolve({ data: { model: { id: 91 } } }),
		2: () => Promise.reject({ response: { status: 500 } }),
	}
	const ctx = armar_ctx_de_registro((url, payload) => respuestas[payload.article_id]())
	const registros = [
		Object.assign({}, REGISTRO_SIN_STOCK, { article_id: 1, combo_id: 50 }),
		Object.assign({}, REGISTRO_SIN_STOCK, { article_id: 2, combo_id: 50 }),
	]
	return ctx.registrar_frenos_por_stock(registros, { nombres: ['Mecha 8', 'Taco'], combo_nombre: 'Kit taladro' }).then(() => {
		assert.equal(ctx.posts.length, 2)
		assert.equal(ctx.commits.length, 1)
		assert.deepEqual(ctx.commits[0].valor.ids, [91])
		assert.deepEqual(ctx.commits[0].valor.nombres, ['Mecha 8'])
		assert.equal(ctx.commits[0].valor.combo_nombre, 'Kit taladro')
	})
})

test('CA13: sin registros no hay POST ni aviso', () => {
	const ctx = armar_ctx_de_registro(() => Promise.resolve({ data: { model: { id: 1 } } }))
	return ctx.registrar_frenos_por_stock([], { nombres: [], combo_nombre: null }).then(() => {
		assert.equal(ctx.posts.length, 0)
		assert.deepEqual(ctx.commits, [])
	})
})

// ---------------------------------------------------------------------------------------------------
// CA14 — store, texto del aviso y componente
// ---------------------------------------------------------------------------------------------------

test('CA14: el store guarda el aviso, un aviso nuevo reemplaza al anterior y limpiar lo borra', () => {
	const store = cargar('store/vender/demanda_sin_stock.js').default
	assert.equal(store.namespaced, true)
	const state = store.state()
	assert.equal(state.aviso, null)
	store.mutations.set_aviso(state, { ids: [1], nombres: ['A'], motivo: 'sin_stock', combo_nombre: null })
	store.mutations.set_aviso(state, { ids: [2], nombres: ['B'], motivo: 'sin_stock', combo_nombre: null })
	assert.deepEqual(state.aviso.ids, [2])
	store.mutations.limpiar_aviso(state)
	assert.equal(state.aviso, null)
})

test('CA14: el store está registrado en src/store/index.js y el aviso montado en Vender.vue', () => {
	const index = fs.readFileSync(path.join(raiz, 'src/store/index.js'), 'utf8')
	assert.match(index, /@\/store\/vender\/demanda_sin_stock/)
	assert.match(index, /demanda_sin_stock/)
	const vender = fs.readFileSync(path.join(raiz, 'src/views/Vender.vue'), 'utf8')
	assert.match(vender, /<aviso-demanda-sin-stock/)
	assert.match(vender, /@\/components\/vender\/components\/AvisoDemandaSinStock/)
})

test('CA14: el texto del aviso de un artículo nombra el artículo, dice "sugerencia de compra" y "Cancelar"', () => {
	const { texto_del_aviso } = cargar('utils/demanda_sin_stock.js')
	const texto = texto_del_aviso({ ids: [91], nombres: ['Mecha 8'], motivo: 'sin_stock', combo_nombre: null })
	const todo = Object.keys(texto).map(clave => texto[clave]).join(' ')
	assert.match(texto.titulo, /Se guardó como sugerencia de compra/)
	assert.ok(todo.includes('«Mecha 8»'))
	assert.ok(todo.includes('no había stock'))
	assert.ok(todo.includes('sugerencia de compra'))
	assert.ok(todo.includes('Cancelar'))
})

test('CA14: stock que no alcanza dice "stock suficiente"; el combo nombra los componentes y el combo', () => {
	const { texto_del_aviso } = cargar('utils/demanda_sin_stock.js')
	const insuficiente = texto_del_aviso({ ids: [1], nombres: ['Mecha 8'], motivo: 'stock_insuficiente', combo_nombre: null })
	assert.ok(Object.keys(insuficiente).map(c => insuficiente[c]).join(' ').includes('stock suficiente'))
	const combo = texto_del_aviso({ ids: [1, 2], nombres: ['Mecha 8', 'Taco'], motivo: 'sin_stock', combo_nombre: 'Kit taladro' })
	const todo = Object.keys(combo).map(c => combo[c]).join(' ')
	assert.ok(todo.includes('«Mecha 8» y «Taco»'))
	assert.ok(todo.includes('«Kit taladro»'))
})

test('CA14: payload_de_registro pasa 0 y vacío a null y toma la variante de variant_id o article_variant_id', () => {
	const util = cargar('utils/demanda_sin_stock.js')
	const registro = util.registro_de_articulo({ id: 10, variant_id: 33 }, 'stock_insuficiente', 5, 2, null)
	assert.deepEqual(registro, {
		article_id: 10, article_variant_id: 33, combo_id: null,
		motivo: 'stock_insuficiente', cantidad_pedida: 5, stock_disponible: 2,
	})
	assert.equal(util.registro_de_articulo({ id: 10, article_variant_id: 34 }, 'sin_stock', null, 0, null).article_variant_id, 34)
	const payload = util.payload_de_registro(registro, 0, 0)
	assert.equal(payload.address_id, null)
	assert.equal(payload.employee_id, null)
	assert.equal(payload.article_variant_id, 33)
})

/**
 * Arma el `this` falso del componente del aviso con un $api falso para el PUT.
 *
 * @param {Function} responder Recibe la url del PUT y devuelve una promesa.
 */
function armar_ctx_de_aviso(responder, ids) {
	const componente = cargar('components/vender/components/AvisoDemandaSinStock.vue').default
	const puts = []
	const commits = []
	const toasts = []
	const ctx = Object.assign(componente.data(), componente.methods, {
		puts,
		commits,
		toasts,
		$api: { put(url) { puts.push(url); return responder(url) } },
		$store: {
			state: {
				demanda_sin_stock: {
					aviso: { ids: ids || [91, 92], nombres: ['Mecha 8'], motivo: 'sin_stock', combo_nombre: null },
				},
			},
			commit(nombre, valor) { commits.push(nombre) },
		},
		$toast: {
			success(texto) { toasts.push(['success', texto]) },
			error(texto) { toasts.push(['error', texto]) },
		},
	})
	return ctx
}

test('CA14: cancelar() hace un PUT por id y, al terminar, limpia el aviso y avisa el éxito', () => {
	const ctx = armar_ctx_de_aviso(() => Promise.resolve({ data: { model: { id: 91, canceled_at: '2026-11-21' } } }))
	return ctx.cancelar().then(() => {
		assert.deepEqual(ctx.puts, ['unmet-demand/91/cancel', 'unmet-demand/92/cancel'])
		assert.deepEqual(ctx.commits, ['demanda_sin_stock/limpiar_aviso'])
		assert.deepEqual(ctx.toasts, [['success', 'Listo, no se guarda como sugerencia de compra']])
	})
})

test('CA14: si el cancelar falla el aviso queda y sale el toast de error', () => {
	const ctx = armar_ctx_de_aviso(url => (url.includes('/92/') ? Promise.reject({ response: { status: 500 } }) : Promise.resolve({ data: {} })))
	return ctx.cancelar().then(() => {
		assert.deepEqual(ctx.commits, [])
		assert.deepEqual(ctx.toasts, [['error', 'No se pudo cancelar, probá de nuevo']])
	})
})

test('CA14: "Entendido" cierra el aviso sin llamar a la API, y se cierra solo a los 12 segundos', () => {
	const componente = cargar('components/vender/components/AvisoDemandaSinStock.vue')
	assert.equal(componente.DURACION_AVISO_MS, 12000)
	const ctx = armar_ctx_de_aviso(() => Promise.resolve({ data: {} }))
	ctx.cerrar()
	assert.deepEqual(ctx.commits, ['demanda_sin_stock/limpiar_aviso'])
	assert.deepEqual(ctx.puts, [])
})
