// Misión historial-precios-proveedor, modales del listado (CA16 del PLAN): "Proveedores del artículo" con su
// pestaña "Historial de precios" (qué hizo cada precio de proveedor: si actualizó el costo, si cambió el
// proveedor del artículo, qué cambio de precio provocó) y "Cambios de precios" con la oferta que lo originó.
// Sin red ni navegador: se monta cada componente con Vue 2 SIN DOM (se llama a render, no a patch) y se lee el
// árbol de vnodes. Los componentes de bootstrap-vue se reemplazan por dobles mínimos (b-table recorre sus
// items y llama a los slots cell(...); el resto se queda como elemento común con sus hijos). Los componentes
// leen el artículo de $store.state.article.model y el permiso de costos de can('article.cost').
//
// Contrato que fija este archivo (PLAN §2.9):
//  - OfferHistory.vue pide GET provider-price-offer/article/{id} al crearse (vive dentro de la pestaña) y
//    muestra, por oferta, el uso que tuvo; "Ver cambio de precio" emite en $root 'price-changes:highlight'
//    con el id del evento y abre el modal 'price-changes'.
//  - price-changes/Index.vue muestra la columna "Precio de proveedor" sólo si algún modelo trae
//    provider_offers no vacío; "Ver historial del proveedor" emite en $root 'provider-offers:highlight' con
//    el id de la oferta y abre el modal 'article-providers'.
//  - Los listeners de $root se sacan al destruir el componente.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// ---------------------------------------------------------------- entorno falso

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.config.ignoredElements = [/^b-/]

// Lo que cada test lee y escribe: se reemplaza en cada caso con nuevo_entorno().
const entorno = { permisos: [], pedidos: [], configs: [], respuesta: null, commits: [], toasts: [], errores: [], modales: [], articulo: null }

function nuevo_entorno(opciones) {
	opciones = opciones || {}
	entorno.permisos = opciones.permisos || ['article.cost']
	entorno.pedidos = []
	entorno.configs = []
	entorno.respuesta = opciones.respuesta || function() { return Promise.resolve({ data: { models: [], can_see_cost: true } }) }
	entorno.commits = []
	entorno.toasts = []
	entorno.errores = []
	entorno.modales = []
	entorno.articulo = opciones.articulo || {
		id: 12,
		name: 'Taladro',
		providers: [
			{ id: 3, name: 'BA', pivot: { provider_code: 'BA-1', amount: 5, cost: 1000, price: 1500, updated_at: '2026-11-01 10:00:00' } },
			{ id: 4, name: 'Rosario', pivot: { provider_code: 'R-77', amount: 2, cost: 1200, price: 1700, updated_at: '2026-11-21 10:00:00' } },
		],
	}
}

Vue.config.errorHandler = function(error) { entorno.errores.push(error) }
Vue.prototype.$api = {
	get(url, config) {
		entorno.pedidos.push(url)
		// Opciones de axios con las que se pidió (ronda 2: skip_global_error_event).
		entorno.configs.push(config)
		return entorno.respuesta(url)
	},
}
Vue.prototype.$store = {
	state: {
		get article() { return { model: entorno.articulo } },
		price_type: { models: [] },
		employee: { models: [] },
		auth: {},
	},
	getters: {},
	commit(nombre, valor) { entorno.commits.push([nombre, valor]) },
}
Vue.prototype.$toast = { error(texto) { entorno.toasts.push(texto) }, success() {} }
Vue.prototype.$bvModal = { show(id) { entorno.modales.push(id) }, hide() {} }

// Mismos formatos que common-vue/mixins: price() con decimales por defecto, date() DD/MM/AAAA.
Vue.mixin({
	computed: {
		owner() { return { id: 1, name: 'Dueño' } },
		listas_visibles() { return [] },
	},
	methods: {
		can(permiso) { return entorno.permisos.indexOf(permiso) !== -1 },
		price(valor, con_decimales) {
			if (!valor) return '-'
			const con = con_decimales === undefined ? true : con_decimales
			const partes = Number(valor).toFixed(2).split('.')
			const miles = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
			return '$' + miles + (con ? ',' + partes[1] : '')
		},
		date(valor) {
			if (!valor) return '-'
			const dia = String(valor).slice(0, 10).split('-')
			return dia[2] + '/' + dia[1] + '/' + dia[0]
		},
	},
})

// b-table: una fila por item y una celda por campo, con el slot cell(campo) si existe, o el formatter, o el valor.
Vue.component('b-table', {
	functional: true,
	render(h, contexto) {
		const props = contexto.props || {}
		const attrs = contexto.data.attrs || {}
		const items = props.items || attrs.items || []
		const campos = (props.fields || attrs.fields || []).map(campo => typeof campo === 'string' ? { key: campo, label: campo } : campo)
		const clase_de_fila = attrs.tbodyTrClass || attrs['tbody-tr-class']
		const encabezado = h('thead', [h('tr', campos.map(campo => h('th', { attrs: { 'data-campo': campo.key } }, [campo.label])))])
		const cuerpo = h('tbody', items.map((item, indice) => {
			const celdas = campos.map(campo => {
				const slot = contexto.scopedSlots['cell(' + campo.key + ')']
				let contenido
				if (slot) {
					contenido = slot({ item: item, value: item[campo.key], index: indice, field: campo })
				} else if (typeof campo.formatter === 'function') {
					contenido = String(campo.formatter(item[campo.key], campo.key, item))
				} else {
					contenido = item[campo.key] === undefined || item[campo.key] === null || typeof item[campo.key] === 'object' ? '' : String(item[campo.key])
				}
				return h('td', { attrs: { 'data-campo': campo.key } }, [].concat(contenido))
			})
			const clases = [typeof clase_de_fila === 'function' ? clase_de_fila(item, 'row') : clase_de_fila, item._rowVariant ? 'table-' + item._rowVariant : '']
			return h('tr', { class: clases, attrs: { 'data-fila': indice } }, celdas)
		}))
		return h('table', [encabezado, cuerpo])
	},
})

// ---------------------------------------------------------------- utilidades de lectura

/** Texto de un vnode y de todo lo que tiene adentro, con espacios (incluidos los NBSP) colapsados. */
function texto(vnode) {
	function recorrer(actual) {
		if (!actual) return ''
		if (typeof actual === 'string') return actual
		if (actual.text !== undefined) return actual.text
		let acumulado = ''
		;(actual.children || []).forEach(hijo => { acumulado += ' ' + recorrer(hijo) })
		return acumulado
	}
	return recorrer(vnode).replace(/\s+/g, ' ').trim()
}

/** Todos los vnodes del árbol, incluida la raíz. */
function vnodes(raiz, acumulado) {
	acumulado = acumulado || []
	if (raiz && typeof raiz === 'object') {
		acumulado.push(raiz)
		;(raiz.children || []).forEach(hijo => vnodes(hijo, acumulado))
	}
	return acumulado
}

/** Filas de tabla (tr con cuerpo) del vnode. */
function filas(raiz) {
	return vnodes(raiz).filter(v => v.tag === 'tr' && v.data && v.data.attrs && v.data.attrs['data-fila'] !== undefined)
}

/** Fila que menciona un texto. */
function fila_con(raiz, buscado) {
	return filas(raiz).find(fila => texto(fila).indexOf(buscado) !== -1)
}

/** Botones o enlaces con un click que dicen exactamente algo. */
function boton(raiz, etiqueta) {
	return vnodes(raiz).find(v => {
		const on = (v.data && (v.data.on || v.data.nativeOn)) || {}
		return on.click && texto(v) === etiqueta
	})
}

/** Ejecuta el click de un vnode como lo haría el navegador. */
function clickear(vnode) {
	const on = Object.assign({}, vnode.data.nativeOn || {}, vnode.data.on || {})
	const evento = { preventDefault() {}, stopPropagation() {}, target: {}, currentTarget: {} }
	;[].concat(on.click).forEach(manejador => manejador(evento))
}

/** Espera a que terminen las promesas pendientes del componente (y un timer corto). */
function esperar() {
	return new Promise(resolver => setTimeout(resolver, 20))
}

/** Raíz que observa lo que el componente emite en $root, y el componente montado debajo. */
function montar(ruta, datos) {
	const componente = cargar(ruta).default
	const raiz = new Vue({ render: h => h('div') })
	const emitidos = []
	;['price-changes:highlight', 'provider-offers:highlight', 'bv::show::modal'].forEach(nombre => {
		raiz.$on(nombre, valor => emitidos.push([nombre, valor]))
	})
	const Constructor = Vue.extend(componente)
	const vm = new Constructor({ parent: raiz })
	vm.$mount()
	if (datos) Object.assign(vm, datos)
	return { vm, raiz, emitidos }
}

/** Cuántos listeners tiene $root para un evento, sin contar el que registra montar() para observar. */
function oyentes(raiz, evento) {
	return Math.max((raiz._events[evento] || []).length - 1, 0)
}

/** True si el modal 'id' se pidió abrir, por $bvModal o por el evento de bootstrap-vue. */
function se_abrio(id, emitidos) {
	return entorno.modales.indexOf(id) !== -1 || emitidos.some(par => par[0] === 'bv::show::modal' && par[1] === id)
}

// ---------------------------------------------------------------- fixtures (ficticias: CA4 del PLAN)

/** La oferta de Rosario de CA4: usó el costo, no cambió el proveedor, tiene evento de precio. */
function oferta_ca4(cambios) {
	return Object.assign({
		id: 91,
		provider_id: 4,
		provider_name: 'Rosario',
		provider_code: 'R-77',
		cost: 1200,
		moneda_id: 1,
		origen: 'importacion',
		fecha: '2026-11-21',
		referencia_id: 15,
		reference_label: 'Importación del 21/11/2026',
		last_seen_at: null,
		last_seen_reference_id: null,
		updated_article_cost: 1,
		previous_article_cost: 1000,
		price_change_id: 55,
		price_change_created_at: '2026-11-21 10:00:00',
		changed_article_provider: 0,
		previous_article_provider_id: 3,
		previous_article_provider_name: 'BA',
	}, cambios || {})
}

/** Respuesta de la API de historial con esas ofertas. */
function historial(ofertas, can_see_cost) {
	return function() {
		return Promise.resolve({ data: { models: ofertas, can_see_cost: can_see_cost !== false } })
	}
}

/** Un evento de price_changes con la oferta vinculada. */
function evento_con_oferta(id, ofertas) {
	return {
		id: id,
		article_id: 12,
		cost: 1200,
		price: 1560,
		final_price: 1560,
		created_at: '2026-11-21 10:00:00',
		origen: 'importacion',
		empleado_nombre: 'Lucía',
		precio_final_anterior: 1300,
		// Con detalle por lista el modal muestra también la columna Origen (sin detalle no se muestra).
		cambios_listas: [{ lista_nombre: 'Lista 1', moneda_nombre: 'Pesos', precio_anterior: 1300, precio_nuevo: 1560, operacion: 'cambio' }],
		price_types: [],
		provider_offers: ofertas,
	}
}

/** La oferta, tal como la trae el índice de cambios de precios. */
function oferta_en_cambio(cambios) {
	return Object.assign({
		id: 91,
		provider_id: 4,
		provider_name: 'Rosario',
		provider_code: 'R-77',
		cost: 1200,
		moneda_id: 1,
		fecha: '2026-11-21',
		origen: 'importacion',
		referencia_id: 15,
		changed_article_provider: 0,
		previous_article_provider_id: 3,
		previous_article_provider_name: 'BA',
	}, cambios || {})
}

// ---------------------------------------------------------------- historial por proveedor (OfferHistory)

test('uso de la oferta: la que actualizó el costo y no cambió el proveedor lo dice y deja ir al cambio de precio', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	const { vm, raiz, emitidos } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.deepEqual(entorno.pedidos, ['provider-price-offer/article/12'])

	const vista = vm._render()
	const fila = fila_con(vista, 'Rosario')
	assert.ok(fila, 'no hay una fila para la oferta de Rosario')
	const dicho = texto(fila)
	assert.match(dicho, /Actualizó el costo: \$1\.000 → \$1\.200/)
	assert.match(dicho, /el artículo siguió siendo de BA/)
	assert.match(dicho, /R-77/)
	assert.match(dicho, /Importación/)

	const ver = boton(fila, 'Ver cambio de precio')
	assert.ok(ver, 'falta el botón "Ver cambio de precio"')
	clickear(ver)
	assert.deepEqual(emitidos.filter(par => par[0] === 'price-changes:highlight'), [['price-changes:highlight', 55]])
	assert.ok(se_abrio('price-changes', emitidos), 'tenía que abrir el modal price-changes')
	assert.deepEqual(entorno.errores, [])
	raiz.$destroy()
})

test('uso de la oferta: si además cambió el proveedor del artículo lo dice con el nombre del nuevo titular', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4({ changed_article_provider: 1 })]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const dicho = texto(fila_con(vm._render(), 'Rosario'))
	assert.match(dicho, /Actualizó el costo: \$1\.000 → \$1\.200/)
	assert.match(dicho, /el artículo pasó a ser de Rosario/)
	assert.doesNotMatch(dicho, /siguió siendo de/)
})

test('uso de la oferta: la que sólo se registró no dice que actualizó nada y aclara de quién es el artículo', async () => {
	const sola = oferta_ca4({ updated_article_cost: 0, previous_article_cost: null, price_change_id: null, price_change_created_at: null })
	nuevo_entorno({ respuesta: historial([sola]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const fila = fila_con(vm._render(), 'Rosario')
	const dicho = texto(fila)
	assert.match(dicho, /Sólo se registró el precio/)
	assert.match(dicho, /el artículo es de BA/)
	assert.doesNotMatch(dicho, /Actualizó el costo/)
	assert.equal(boton(fila, 'Ver cambio de precio'), undefined)
})

test('uso de la oferta: una fila anterior a esta versión (sin dato de uso) lo dice y no inventa un cambio', async () => {
	const vieja = oferta_ca4({ updated_article_cost: null, previous_article_cost: null, price_change_id: null, changed_article_provider: null, previous_article_provider_id: null, previous_article_provider_name: null })
	nuevo_entorno({ respuesta: historial([vieja]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const fila = fila_con(vm._render(), 'Rosario')
	const dicho = texto(fila)
	assert.match(dicho, /Registro anterior a esta versión/)
	assert.doesNotMatch(dicho, /Actualizó el costo|Sólo se registró/)
	assert.equal(boton(fila, 'Ver cambio de precio'), undefined)
})

test('uso de la oferta: si actualizó el costo pero ningún precio de venta cambió, sin botón y con la aclaración', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4({ price_change_id: null, price_change_created_at: null })]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const fila = fila_con(vm._render(), 'Rosario')
	assert.match(texto(fila), /Actualizó el costo: \$1\.000 → \$1\.200/)
	assert.match(texto(fila), /los precios de venta no cambiaron/)
	assert.equal(boton(fila, 'Ver cambio de precio'), undefined)
})

test('uso de la oferta: muestra cuándo se vio por última vez el mismo precio y el origen de compra', async () => {
	const compra = oferta_ca4({ id: 92, origen: 'compra', reference_label: 'Compra N° 12', referencia_id: 12, updated_article_cost: 0, previous_article_cost: null, price_change_id: null, last_seen_at: '2026-11-20 09:30:00', last_seen_reference_id: 12 })
	nuevo_entorno({ respuesta: historial([compra]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const dicho = texto(fila_con(vm._render(), 'Rosario'))
	assert.match(dicho, /Compra/)
	assert.match(dicho, /visto por última vez 20\/11/i)
})

test('uso de la oferta: sin permiso de costos la respuesta no trae costos y no se escribe undefined ni NaN', async () => {
	const sin_costos = oferta_ca4()
	delete sin_costos.cost
	delete sin_costos.previous_article_cost
	nuevo_entorno({ permisos: [], respuesta: historial([sin_costos], false) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const dicho = texto(vm._render())
	assert.match(dicho, /Rosario/)
	assert.doesNotMatch(dicho, /undefined|NaN/)
	assert.deepEqual(entorno.errores, [])
})

test('uso de la oferta: la oferta que llega por highlight se marca y las demás no; al destruir se sueltan los listeners', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4(), oferta_ca4({ id: 90, provider_id: 3, provider_name: 'BA', provider_code: 'BA-1', cost: 1000, updated_article_cost: 0, previous_article_cost: null, price_change_id: null, previous_article_provider_name: 'BA' })]) })
	const { vm, raiz } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const antes = vm._render()
	const marca = (vista, buscado) => JSON.stringify(fila_con(vista, buscado).data.class || '') + JSON.stringify(fila_con(vista, buscado).data.staticClass || '')
	const rosario_antes = marca(antes, 'Rosario')
	const ba_antes = marca(antes, 'BA-1')
	raiz.$emit('provider-offers:highlight', 91)
	await esperar()
	const despues = vm._render()
	assert.notEqual(marca(despues, 'Rosario'), rosario_antes, 'la fila de la oferta 91 tenía que quedar destacada')
	assert.equal(marca(despues, 'BA-1'), ba_antes, 'la otra fila no se toca')

	assert.ok(oyentes(raiz, 'provider-offers:highlight') > 0, 'tiene que escuchar provider-offers:highlight en $root')
	vm.$destroy()
	assert.equal(oyentes(raiz, 'provider-offers:highlight'), 0, 'al destruirse saca sus listeners de $root')
})

test('respuesta vieja de la api: sin el endpoint (404) el historial muestra el texto vacío y no hay error ni aviso', async () => {
	const errores_de_consola = []
	const original = console.error
	console.error = function() { errores_de_consola.push([].slice.call(arguments)) }
	try {
		nuevo_entorno({ respuesta: function() { return Promise.reject({ response: { status: 404, data: {} } }) } })
		const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
		await esperar()
		const dicho = texto(vm._render())
		assert.match(dicho, /Todavía no hay historial de precios por proveedor para este artículo\./)
		assert.deepEqual(entorno.toasts, [], 'un 404 no es un error para el usuario')
		assert.deepEqual(entorno.errores, [])
		assert.deepEqual(errores_de_consola, [])
	} finally {
		console.error = original
	}
})

test('respuesta vieja de la api: un historial vacío también muestra el texto vacío', async () => {
	nuevo_entorno({ respuesta: historial([]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.match(texto(vm._render()), /Todavía no hay historial de precios por proveedor para este artículo\./)
})

test('el historial usa el indicador global de carga y lo apaga al terminar, con éxito o con error', async () => {
	const prendido_y_apagado = function(commits) {
		const cargas = commits.filter(par => par[0] === 'auth/setLoading').map(par => par[1])
		return cargas.length >= 2 && cargas[0] === true && cargas[cargas.length - 1] === false
	}
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.ok(prendido_y_apagado(entorno.commits), 'éxito: setLoading true y después false')
	assert.deepEqual(entorno.commits[entorno.commits.length - 1], ['auth/setMessage', ''])

	nuevo_entorno({ respuesta: function() { return Promise.reject({ response: { status: 404 } }) } })
	montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.ok(prendido_y_apagado(entorno.commits), 'error: setLoading true y después false')
})

// ---------------------------------------------------------------- orquestador y tabla de hoy

test('Proveedores del artículo tiene la pestaña "Historial de precios" sólo con permiso de costos', () => {
	const titulos = function(vista) {
		return vnodes(vista).map(v => (v.data && v.data.attrs && v.data.attrs.title) || '').filter(Boolean)
	}
	const componentes = function(vista) {
		return vnodes(vista).filter(v => v.componentOptions).map(v => String(v.componentOptions.tag).toLowerCase().replace(/-/g, ''))
	}

	nuevo_entorno({ permisos: ['article.cost'] })
	const con_permiso = montar('components/listado/modals/article-providers/Index.vue').vm._render()
	assert.ok(titulos(con_permiso).indexOf('Proveedores') !== -1, 'falta la pestaña "Proveedores"')
	assert.ok(titulos(con_permiso).indexOf('Historial de precios') !== -1, 'falta la pestaña "Historial de precios"')
	assert.ok(componentes(con_permiso).indexOf('currentreferences') !== -1, 'falta CurrentReferences')
	assert.ok(componentes(con_permiso).indexOf('offerhistory') !== -1, 'falta OfferHistory')
	assert.ok(vnodes(con_permiso).some(v => v.data && v.data.attrs && v.data.attrs.id === 'article-providers'), 'el modal conserva el id article-providers')

	nuevo_entorno({ permisos: [] })
	const sin_permiso = montar('components/listado/modals/article-providers/Index.vue').vm._render()
	assert.ok(titulos(sin_permiso).indexOf('Historial de precios') === -1, 'sin article.cost no se ve la pestaña')
	assert.ok(componentes(sin_permiso).indexOf('offerhistory') === -1, 'sin article.cost ni se monta el historial')
	assert.ok(componentes(sin_permiso).indexOf('currentreferences') !== -1, 'la tabla de hoy sigue')
})

test('la tabla de hoy (CurrentReferences) conserva proveedor, código y vacío como antes', () => {
	nuevo_entorno()
	const { vm } = montar('components/listado/modals/article-providers/CurrentReferences.vue')
	const vista = vm._render()
	const dicho = texto(vista)
	assert.match(dicho, /BA/)
	assert.match(dicho, /BA-1/)
	assert.match(dicho, /Rosario/)
	assert.match(dicho, /R-77/)

	nuevo_entorno({ articulo: { id: 13, name: 'Martillo', providers: [] } })
	const vacio = montar('components/listado/modals/article-providers/CurrentReferences.vue').vm._render()
	assert.match(texto(vacio), /No hay referencias de proveedores para este artículo/)
})

// ---------------------------------------------------------------- Cambios de precios con la oferta

test('uso de la oferta: el cambio de precio que usó una oferta la muestra y deja volver al historial del proveedor', () => {
	nuevo_entorno()
	const { vm, raiz, emitidos } = montar('components/listado/modals/price-changes/Index.vue')
	vm.price_changes = [evento_con_oferta(55, [oferta_en_cambio()])]
	const vista = vm._render()
	assert.match(texto(vnodes(vista).find(v => v.tag === 'thead')), /Precio de proveedor/)
	const fila = fila_con(vista, 'Rosario')
	assert.ok(fila, 'la fila del cambio tiene que mostrar al proveedor')
	assert.match(texto(fila), /Rosario · \$1\.200 · Importación/)

	const volver = boton(fila, 'Ver historial del proveedor')
	assert.ok(volver, 'falta el botón "Ver historial del proveedor"')
	clickear(volver)
	assert.deepEqual(emitidos.filter(par => par[0] === 'provider-offers:highlight'), [['provider-offers:highlight', 91]])
	assert.ok(se_abrio('article-providers', emitidos), 'tenía que abrir el modal article-providers')
	assert.deepEqual(entorno.errores, [])
	raiz.$destroy()
})

test('uso de la oferta: una oferta de compra se rotula Compra y el costo no aparece sin permiso de costos', () => {
	nuevo_entorno({ permisos: [] })
	const { vm } = montar('components/listado/modals/price-changes/Index.vue')
	const sin_costo = oferta_en_cambio({ id: 93, origen: 'compra', referencia_id: 12 })
	delete sin_costo.cost
	const evento = evento_con_oferta(56, [sin_costo])
	delete evento.cost
	delete evento.price
	vm.price_changes = [evento]
	const dicho = texto(fila_con(vm._render(), 'Rosario'))
	assert.match(dicho, /Rosario/)
	assert.match(dicho, /Compra/)
	assert.doesNotMatch(dicho, /undefined|NaN/)
})

test('respuesta vieja sin provider_offers: la tabla de cambios es la de hoy, sin columna ni botones nuevos', () => {
	nuevo_entorno()
	const sin_clave = evento_con_oferta(55, [])
	delete sin_clave.provider_offers
	const con_vacio = evento_con_oferta(55, [])

	const a = montar('components/listado/modals/price-changes/Index.vue').vm
	a.price_changes = [sin_clave]
	const vista_a = a._render()
	const b = montar('components/listado/modals/price-changes/Index.vue').vm
	b.price_changes = [con_vacio]
	const vista_b = b._render()

	;[vista_a, vista_b].forEach(vista => {
		assert.doesNotMatch(texto(vista), /Precio de proveedor/)
		assert.equal(boton(vista, 'Ver historial del proveedor'), undefined)
		const dicho = texto(fila_con(vista, 'Lucía'))
		assert.match(dicho, /Lucía/)
		assert.match(dicho, /Importación/)
		assert.match(dicho, /\$1\.560/)
	})
	assert.equal(texto(vista_a), texto(vista_b), 'sin la clave y con la lista vacía se ve exactamente lo mismo')
	assert.deepEqual(entorno.errores, [])
})

test('uso de la oferta: el cambio que llega por highlight se marca y los demás no; al destruir se sueltan los listeners', () => {
	nuevo_entorno()
	const { vm, raiz } = montar('components/listado/modals/price-changes/Index.vue')
	vm.price_changes = [
		evento_con_oferta(55, [oferta_en_cambio()]),
		Object.assign(evento_con_oferta(56, []), { empleado_nombre: 'Marcos' }),
	]
	const marca = (vista, buscado) => JSON.stringify(fila_con(vista, buscado).data.class || '') + JSON.stringify(fila_con(vista, buscado).data.staticClass || '')
	const antes = vm._render()
	const a_antes = marca(antes, 'Lucía')
	const b_antes = marca(antes, 'Marcos')
	raiz.$emit('price-changes:highlight', 55)
	const despues = vm._render()
	assert.notEqual(marca(despues, 'Lucía'), a_antes, 'la fila del evento 55 tenía que quedar destacada')
	assert.equal(marca(despues, 'Marcos'), b_antes, 'la otra fila no se toca')

	assert.ok(oyentes(raiz, 'price-changes:highlight') > 0, 'tiene que escuchar price-changes:highlight en $root')
	vm.$destroy()
	assert.equal(oyentes(raiz, 'price-changes:highlight'), 0, 'al destruirse saca sus listeners de $root')
})

// ---------------------------------------------------------------- Ronda 2: las cuatro combinaciones costo x proveedor y dólares

/** Texto de la fila de Rosario para una oferta con esos valores de uso. */
async function texto_de_uso(cambios) {
	nuevo_entorno({ respuesta: historial([oferta_ca4(cambios)]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	return texto(fila_con(vm._render(), 'Rosario'))
}

test('ronda 2, cuatro combinaciones: (costo 1, proveedor 0) actualizó el costo y el artículo siguió siendo del titular', async () => {
	const dicho = await texto_de_uso({ updated_article_cost: 1, changed_article_provider: 0 })
	assert.match(dicho, /Actualizó el costo: \$1\.000 → \$1\.200/)
	assert.match(dicho, /el artículo siguió siendo de BA/)
	assert.doesNotMatch(dicho, /pasó a ser/)
})

test('ronda 2, cuatro combinaciones: (costo 1, proveedor 1) actualizó el costo y el artículo pasó a ser del proveedor', async () => {
	const dicho = await texto_de_uso({ updated_article_cost: 1, changed_article_provider: 1 })
	assert.match(dicho, /Actualizó el costo: \$1\.000 → \$1\.200/)
	assert.match(dicho, /el artículo pasó a ser de Rosario/)
	assert.doesNotMatch(dicho, /siguió siendo/)
})

test('ronda 2, cuatro combinaciones: (costo 0, proveedor 1) no cambió el costo pero el artículo pasó a ser del proveedor', async () => {
	const dicho = await texto_de_uso({ updated_article_cost: 0, changed_article_provider: 1, previous_article_cost: null, price_change_id: null, price_change_created_at: null })
	assert.match(dicho, /No cambió el costo/)
	assert.match(dicho, /el artículo pasó a ser de Rosario/)
	assert.doesNotMatch(dicho, /Sólo se registró el precio/, 'no puede decir que sólo se registró si el artículo cambió de proveedor')
	assert.doesNotMatch(dicho, /el artículo es de BA|Actualizó el costo/)
})

test('ronda 2, cuatro combinaciones: (costo 0, proveedor 0) sólo se registró el precio y el artículo es del titular', async () => {
	const dicho = await texto_de_uso({ updated_article_cost: 0, changed_article_provider: 0, previous_article_cost: null, price_change_id: null, price_change_created_at: null })
	assert.match(dicho, /Sólo se registró el precio/)
	assert.match(dicho, /el artículo es de BA/)
	assert.doesNotMatch(dicho, /pasó a ser|No cambió el costo|Actualizó el costo/)
})

test('ronda 2, cuatro combinaciones: (null, null) es un registro anterior a esta versión', async () => {
	const dicho = await texto_de_uso({ updated_article_cost: null, changed_article_provider: null, previous_article_cost: null, price_change_id: null })
	assert.match(dicho, /Registro anterior a esta versión/)
	assert.doesNotMatch(dicho, /pasó a ser|No cambió el costo|Sólo se registró|Actualizó el costo/)
})

test('ronda 2, dólares: el historial muestra los importes con la moneda de la oferta y no como pesos', async () => {
	const dicho = await texto_de_uso({ moneda_id: 2, cost: 12, previous_article_cost: 10 })
	assert.match(dicho, /US\$12/, 'la columna Costo en dólares')
	assert.match(dicho, /Actualizó el costo: US\$10 → US\$12/)
	assert.doesNotMatch(dicho.replace(/US\$/g, ''), /\$/, 'ningún importe queda sin la moneda')
	// En pesos sigue igual.
	assert.doesNotMatch(await texto_de_uso({ moneda_id: 1 }), /US\$/)
})

test('ronda 2, dólares: la columna "Precio de proveedor" de Cambios de precios también lo muestra en dólares', async () => {
	nuevo_entorno()
	const { vm } = montar('components/listado/modals/price-changes/Index.vue')
	assert.match(vm.etiqueta_de_oferta(oferta_en_cambio({ moneda_id: 2, cost: 12 })), /Rosario · US\$12 · Importación/)
	assert.match(vm.etiqueta_de_oferta(oferta_en_cambio({ moneda_id: 1, cost: 1200 })), /Rosario · \$1\.200 · Importación/)
	assert.doesNotMatch(vm.etiqueta_de_oferta(oferta_en_cambio({ moneda_id: 1, cost: 1200 })), /US\$/)
})

// ---------------------------------------------------------------- Ronda 2: api vieja sin toast doble

test('ronda 2, api vieja: el GET del historial pasa skip_global_error_event para que el interceptor global no avise', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.deepEqual(entorno.pedidos, ['provider-price-offer/article/12'])
	assert.equal(entorno.configs.length, 1)
	assert.ok(entorno.configs[0] && entorno.configs[0].skip_global_error_event === true, 'el GET tiene que ir con { skip_global_error_event: true }')
})

test('ronda 2, api vieja: con 404 el historial queda vacío, sin toast propio, y el indicador de carga se apaga', async () => {
	nuevo_entorno({ respuesta: function() { return Promise.reject({ response: { status: 404, data: {} } }) } })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.match(texto(vm._render()), /Todavía no hay historial de precios por proveedor para este artículo\./)
	assert.deepEqual(entorno.toasts, [])
	const cargas = entorno.commits.filter(par => par[0] === 'auth/setLoading').map(par => par[1])
	assert.deepEqual(cargas, [true, false])
	assert.equal(entorno.commits.filter(par => par[0] === 'auth/setMessage').pop()[1], '')
})

test('ronda 2, api vieja: con 500 hay UN solo aviso claro, el historial queda vacío y el indicador se apaga', async () => {
	nuevo_entorno({ respuesta: function() { return Promise.reject({ response: { status: 500, data: {} } }) } })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.equal(entorno.toasts.length, 1, 'un solo aviso')
	assert.match(entorno.toasts[0], /No se pudo cargar el historial de precios por proveedor/)
	assert.match(texto(vm._render()), /Todavía no hay historial de precios por proveedor para este artículo\./)
	const cargas = entorno.commits.filter(par => par[0] === 'auth/setLoading').map(par => par[1])
	assert.deepEqual(cargas, [true, false])
	// Sin respuesta (corte de red): también un solo aviso.
	nuevo_entorno({ respuesta: function() { return Promise.reject(new Error('Network Error')) } })
	montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.equal(entorno.toasts.length, 1)
})

// ---------------------------------------------------------------- Ronda 2: sin article.cost no se ofrece una pestaña oculta

test('ronda 2: sin article.cost Cambios de precios no ofrece "Ver historial del proveedor" (llevaría a una pestaña oculta)', () => {
	nuevo_entorno({ permisos: [] })
	const sin_permiso = montar('components/listado/modals/price-changes/Index.vue').vm
	const oferta = oferta_en_cambio({ id: 93, origen: 'compra', referencia_id: 12 })
	delete oferta.cost
	const evento = evento_con_oferta(56, [oferta])
	delete evento.cost
	delete evento.price
	sin_permiso.price_changes = [evento]
	const vista_sin = sin_permiso._render()
	assert.match(texto(fila_con(vista_sin, 'Rosario')), /Rosario · Compra/, 'la oferta se sigue mostrando')
	assert.equal(boton(vista_sin, 'Ver historial del proveedor'), undefined)

	// Con el permiso el vínculo sigue.
	nuevo_entorno({ permisos: ['article.cost'] })
	const con_permiso = montar('components/listado/modals/price-changes/Index.vue').vm
	con_permiso.price_changes = [evento_con_oferta(55, [oferta_en_cambio()])]
	assert.ok(boton(con_permiso._render(), 'Ver historial del proveedor'))
})

// ---------------------------------------------------------------- Ronda 3 (ADENDA 2 del PLAN): A2-4, A2-5 y A2-6

const fs_ronda3 = require('node:fs')
const path_ronda3 = require('node:path')

/** Fuente de un componente de src/ tal como está en disco. */
function fuente_de(ruta) {
	return fs_ronda3.readFileSync(path_ronda3.join(__dirname, '..', 'src', ruta), 'utf8')
}

/** Bloques <style> de un fuente .vue, uno tras otro. */
function estilos_de(fuente) {
	const bloques = []
	fuente.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (todo, contenido) => { bloques.push(contenido); return todo })
	return bloques.join('\n')
}

test('ronda 3, A2-4 tablet: cada columna del historial tiene ancho mínimo y la tabla scrollea dentro del modal', () => {
	nuevo_entorno()
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	vm.can_see_cost = true
	vm.fields.forEach(campo => {
		assert.ok(campo.thStyle && campo.thStyle.minWidth, 'la columna ' + campo.key + ' no tiene ancho mínimo (thStyle.minWidth)')
	})
	const fuente = fuente_de('components/listado/modals/article-providers/OfferHistory.vue')
	assert.match(fuente, /<b-table[\s\S]*?\bresponsive\b/, 'la tabla conserva el scroll horizontal propio (responsive)')
})

test('ronda 3, A2-4 tablet: fecha y precios no se parten (sin overflow-wrap:anywhere) y la regla gana a la del modal', () => {
	const fuente = fuente_de('components/listado/modals/article-providers/OfferHistory.vue')
	const estilos = estilos_de(fuente)
	assert.ok(estilos.length > 0, 'OfferHistory.vue necesita su propio <style> para pisar la regla del modal')
	assert.match(estilos, /#article-providers[^\n]*offer-history-table/, 'el selector tiene que llevar el id del modal para ganarle a la regla general')
	assert.match(estilos, /white-space:\s*nowrap/)
	assert.match(estilos, /overflow-wrap:\s*normal/)
	assert.doesNotMatch(estilos, /overflow-wrap:\s*anywhere/)
	assert.match(fuente, /table-class="offer-history-table"/)
	// Fecha y costo llevan la clase que no parte.
	nuevo_entorno()
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	;['fecha', 'costo'].forEach(clave => {
		const campo = vm.fields.find(f => f.key === clave)
		assert.ok(campo && /offer-history-nowrap/.test(String(campo.tdClass)), 'la columna ' + clave + ' tiene que llevar tdClass offer-history-nowrap')
	})
	// SASS sólo con tabs.
	assert.doesNotMatch(estilos, /^ +\S/m, 'el SASS usa tabs, no espacios')
})

test('ronda 3, A2-5 teléfono: Cambios de precios apila la tabla en teléfono y el botón del proveedor ocupa el ancho', () => {
	const fuente = fuente_de('components/listado/modals/price-changes/Index.vue')
	assert.match(fuente, /<b-table[\s\S]*?stacked="sm"/, 'la tabla se apila bajo 576 px (mismo patrón que el modal de proveedores)')
	const estilos = estilos_de(fuente)
	const media = estilos.match(/@media \(max-width: 575\.98px\)[\s\S]*?(?=\n@media|\n[^\s@/]|$)/)
	assert.ok(media, 'falta el @media (max-width: 575.98px) del teléfono')
	assert.match(media[0], /historial-cambio-vinculo[\s\S]*?width:\s*100%/, 'el botón ocupa el ancho completo en teléfono')
	assert.match(media[0], /white-space:\s*normal/, 'las celdas apiladas no heredan el nowrap global')
	assert.doesNotMatch(estilos, /^ +\S/m, 'el SASS usa tabs, no espacios')
})

test('ronda 3, A2-6: el historial hace scroll hasta la fila resaltada cuando llegan los datos, no antes', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	const { vm, raiz } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	const llamadas = []
	// El DOM falso sólo tiene la fila destacada cuando ya hay datos y la oferta está marcada.
	const fila = { scrollIntoView(opciones) { llamadas.push(opciones) } }
	const selectores = []
	vm.$el = { querySelector(selector) {
		selectores.push(selector)
		return vm.items.length && vm.highlighted_offer_id === 91 ? fila : null
	} }
	raiz.$emit('provider-offers:highlight', 91)
	await esperar()
	assert.ok(selectores.some(s => /offer-history-row--highlight/.test(s)), 'tiene que buscar la fila .offer-history-row--highlight')
	assert.ok(llamadas.length >= 1, 'después de cargar los datos tiene que hacer scrollIntoView sobre la fila')
	assert.equal(llamadas[llamadas.length - 1].block, 'center')
	assert.deepEqual(entorno.errores, [])
})

test('ronda 3, A2-6: el historial reintenta al terminar de pintarse el modal (bv::modal::shown) sólo para su modal', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	const { vm, raiz } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const llamadas = []
	vm.$el = { querySelector() { return { scrollIntoView() { llamadas.push(1) } } } }
	vm.highlighted_offer_id = 91
	raiz.$emit('bv::modal::shown', {}, 'otro-modal')
	await esperar()
	assert.equal(llamadas.length, 0, 'un modal ajeno no dispara el scroll')
	// El re-render por el cambio de highlighted_offer_id (sin DOM) descarta el $el falso: se vuelve a poner.
	vm.$el = { querySelector() { return { scrollIntoView() { llamadas.push(1) } } } }
	raiz.$emit('bv::modal::shown', {}, 'article-providers')
	await esperar()
	assert.ok(llamadas.length >= 1, 'al mostrarse article-providers tiene que ir a la fila')
	// Sin fila destacada no hace nada.
	llamadas.length = 0
	vm.highlighted_offer_id = null
	vm.$el = { querySelector() { return { scrollIntoView() { llamadas.push(1) } } } }
	raiz.$emit('bv::modal::shown', {}, 'article-providers')
	await esperar()
	assert.equal(llamadas.length, 0)
	vm.$destroy()
	assert.equal(oyentes(raiz, 'bv::modal::shown'), 0, 'al destruirse suelta el listener de bv::modal::shown')
})

test('ronda 3, A2-6: Cambios de precios hace scroll hasta el cambio destacado cuando llegan los datos', async () => {
	const eventos = [evento_con_oferta(55, [oferta_en_cambio()]), Object.assign(evento_con_oferta(56, []), { empleado_nombre: 'Marcos' })]
	nuevo_entorno({ respuesta: function() { return Promise.resolve({ data: { models: eventos } }) } })
	const { vm, raiz } = montar('components/listado/modals/price-changes/Index.vue')
	const llamadas = []
	const fila = { scrollIntoView(opciones) { llamadas.push(opciones) } }
	const selectores = []
	// La fila sólo existe en el DOM cuando terminó de cargar y es la del cambio destacado.
	global.document = { querySelector(selector) {
		selectores.push(selector)
		return !vm.loading && vm.price_changes.length && vm.highlighted_change_id === 55 ? fila : null
	} }
	try {
		raiz.$emit('price-changes:highlight', 55)
		vm.getPriceChanges()
		await esperar()
		assert.ok(selectores.some(s => /historial-cambio-destacado/.test(s)), 'tiene que buscar la fila .historial-cambio-destacado')
		assert.ok(llamadas.length >= 1, 'después de cargar los datos tiene que hacer scrollIntoView')
		assert.equal(llamadas[llamadas.length - 1].block, 'center')
		// Sin destacado no scrollea.
		llamadas.length = 0
		vm.highlighted_change_id = null
		vm.scroll_to_highlight()
		await esperar()
		assert.equal(llamadas.length, 0)
	} finally {
		delete global.document
	}
	assert.match(fuente_de('components/listado/modals/price-changes/Index.vue'), /@shown="scroll_to_highlight"/, 'el modal reintenta cuando termina de mostrarse')
})

// ---------------------------------------------------------------- Ronda 3b (INTERFAZ-2): scroll con reintento y vínculo del titular

/** Pausa real de n milisegundos (los reintentos del scroll usan timers cortos). */
function pausa(milisegundos) {
	return new Promise(resolver => setTimeout(resolver, milisegundos))
}

/** Fila falsa con rectángulo: 'visible' dice si hoy está dentro de la pantalla (800 px de alto). */
function fila_con_rectangulo(estado, alAlcanzar) {
	return {
		scrollIntoView() { estado.llamadas++; estado.visible = true; if (alAlcanzar) alAlcanzar() },
		getBoundingClientRect() { return estado.visible ? { top: 100, bottom: 140 } : { top: 1500, bottom: 1540 } },
	}
}

test('ronda 3b, A2-6 Cambios de precios: reintenta hasta que b-table pintó la fila de la recarga y scrollea', async () => {
	nuevo_entorno()
	const { vm, raiz } = montar('components/listado/modals/price-changes/Index.vue')
	const estado = { llamadas: 0, visible: false, consultas: 0 }
	global.window = { innerHeight: 800 }
	// La fila no existe en las dos primeras consultas (tabla vieja o vacía) y aparece a la tercera.
	global.document = { querySelector() { estado.consultas++; return estado.consultas >= 3 ? fila_con_rectangulo(estado) : null } }
	try {
		raiz.$emit('price-changes:highlight', 55)
		vm.scroll_to_highlight()
		await pausa(700)
		assert.ok(estado.consultas >= 3, 'tenía que reintentar mientras la fila no existía')
		assert.equal(estado.llamadas, 1, 'scrollea una sola vez y, al verla a la vista, no insiste')
		const consultas = estado.consultas
		await pausa(500)
		assert.equal(estado.consultas, consultas, 'una vez a la vista no hay más reintentos (no se le roba el scroll al usuario)')
		vm.$destroy()
	} finally {
		delete global.document
		delete global.window
	}
})

test('ronda 3b, A2-6 Cambios de precios: sin destacado no consulta nada; al cerrar el modal o destruirse se corta el reintento', async () => {
	nuevo_entorno()
	const { vm, raiz } = montar('components/listado/modals/price-changes/Index.vue')
	let consultas = 0
	global.window = { innerHeight: 800 }
	global.document = { querySelector() { consultas++; return null } }
	try {
		vm.scroll_to_highlight()
		await pausa(300)
		assert.equal(consultas, 0, 'sin destacado no hace nada')
		raiz.$emit('price-changes:highlight', 55)
		vm.scroll_to_highlight()
		await pausa(250)
		assert.ok(consultas > 0)
		vm.al_cerrar_modal()
		const al_cerrar = consultas
		await pausa(400)
		assert.equal(consultas, al_cerrar, 'al cerrar el modal se corta el timer')
		raiz.$emit('price-changes:highlight', 55)
		vm.scroll_to_highlight()
		await pausa(100)
		vm.$destroy()
		const al_destruir = consultas
		await pausa(400)
		assert.equal(consultas, al_destruir, 'al destruirse se limpia el timer')
		assert.deepEqual(entorno.errores, [])
	} finally {
		delete global.document
		delete global.window
	}
})

test('ronda 3b, A2-6 historial: si bootstrap-vue vuelve el scroll a 0 después de shown, vuelve a llevar la fila a la vista', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	const { vm, raiz } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	vm.highlighted_offer_id = 91
	await esperar()
	const estado = { llamadas: 0, visible: false }
	// focusFirst() de bootstrap-vue hace modal.scrollTop = 0 poco después de shown: la fila deja de verse.
	const fila = fila_con_rectangulo(estado, () => { if (estado.llamadas === 1) setTimeout(() => { estado.visible = false }, 60) })
	global.window = { innerHeight: 800 }
	vm.$el = { querySelector() { return fila } }
	try {
		raiz.$emit('bv::modal::shown', {}, 'article-providers')
		await pausa(900)
		assert.ok(estado.llamadas >= 2, 'tenía que reintentar tras el reinicio del scroll (llamadas: ' + estado.llamadas + ')')
		assert.equal(estado.visible, true, 'termina con la fila a la vista')
		const llamadas = estado.llamadas
		await pausa(500)
		assert.equal(estado.llamadas, llamadas, 'a la vista no se vuelve a scrollear')
		vm.$destroy()
	} finally {
		delete global.window
	}
})

test('ronda 3b, A2-6 historial: al destruirse corta el reintento pendiente', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4()]) })
	const { vm, raiz } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	vm.highlighted_offer_id = 91
	await esperar()
	let consultas = 0
	vm.$el = { querySelector() { consultas++; return null } }
	raiz.$emit('bv::modal::shown', {}, 'article-providers')
	await pausa(200)
	assert.ok(consultas > 0)
	vm.$destroy()
	const al_destruir = consultas
	await pausa(500)
	assert.equal(consultas, al_destruir)
})

test('ronda 3b, defecto 5: si cambió el titular sin cambiar el costo y hay price_change_id, ofrece "Ver cambio de precio"', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4({ updated_article_cost: 0, changed_article_provider: 1, previous_article_cost: null, price_change_id: 19 })]) })
	const { vm, emitidos } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	const fila = fila_con(vm._render(), 'Rosario')
	const dicho = texto(fila)
	assert.match(dicho, /No cambió el costo/)
	assert.match(dicho, /el artículo pasó a ser de Rosario/)
	assert.doesNotMatch(dicho, /Sólo se registró el precio|Actualizó el costo|los precios de venta no cambiaron/)
	const ver = boton(fila, 'Ver cambio de precio')
	assert.ok(ver, 'falta el botón "Ver cambio de precio" en la rama "no cambió el costo"')
	clickear(ver)
	assert.deepEqual(emitidos.filter(par => par[0] === 'price-changes:highlight'), [['price-changes:highlight', 19]])
	assert.ok(se_abrio('price-changes', emitidos))
})

test('ronda 3b, defecto 5: sin price_change_id no hay botón y sólo registrar el precio nunca lo ofrece', async () => {
	nuevo_entorno({ respuesta: historial([oferta_ca4({ updated_article_cost: 0, changed_article_provider: 1, previous_article_cost: null, price_change_id: null })]) })
	const { vm } = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.equal(boton(fila_con(vm._render(), 'Rosario'), 'Ver cambio de precio'), undefined)
	nuevo_entorno({ respuesta: historial([oferta_ca4({ updated_article_cost: 0, changed_article_provider: 0, previous_article_cost: null, price_change_id: 19 })]) })
	const otra = montar('components/listado/modals/article-providers/OfferHistory.vue')
	await esperar()
	assert.equal(boton(fila_con(otra.vm._render(), 'Rosario'), 'Ver cambio de precio'), undefined, 'sólo registrar el precio no provocó ningún cambio de precio que mostrar')
})
