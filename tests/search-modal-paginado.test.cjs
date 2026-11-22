// Modal de busqueda: paginado siempre visible, contador con tope y paginado sin conexion
// (mision search-modal-paginado-y-busqueda-lenta, criterios CA-S1 a CA-S5 del PLAN).
//
// Lo que se prueba son las reglas puras de search/paginado_del_modal.js y el estado inicial de
// search/Pagination.vue. La parte de interfaz (alto del modal, reapertura en Vender) se verifica
// aparte en la app real.
//
// Ejecutar con: node --test tests/search-modal-paginado.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const {
	estado_de_paginado_al_abrir,
	pagina_inicial_del_paginador,
	debe_mostrar_paginador,
	pagina_de_resultados,
	total_de_paginas,
	texto_de_cantidad,
	criterio_para_buscar,
} = cargar('common-vue/components/search/paginado_del_modal.js')

// Arma una lista de n filas {id} para los tests de paginado en memoria.
function lista_de(n) {
	const lista = []
	for (let i = 1; i <= n; i++) {
		lista.push({ id: i })
	}
	return lista
}

// ---------------------------------------------------------------- CA-S1: reapertura en Vender

test('S1: Vender conserva la lista y reabre con el paginado de la busqueda anterior', () => {
	assert.deepEqual(
		estado_de_paginado_al_abrir({
			conserva_resultados: true,
			cantidad_resultados: 50,
			total_results: 201317,
			current_page: 3,
			total_pages: 4027,
		}),
		{ total_results: 201317, current_page: 3, total_pages: 4027 }
	)
})

test('S1: conserva el tope minimo tambien (total 1001 y pagina 3)', () => {
	assert.deepEqual(
		estado_de_paginado_al_abrir({
			conserva_resultados: true,
			cantidad_resultados: 50,
			total_results: 1001,
			current_page: 3,
			total_pages: 23,
		}),
		{ total_results: 1001, current_page: 3, total_pages: 23 }
	)
})

test('S1: si se conserva pero la lista esta vacia, no arrastra un paginado que no existe', () => {
	assert.deepEqual(
		estado_de_paginado_al_abrir({
			conserva_resultados: true,
			cantidad_resultados: 0,
			total_results: 80,
			current_page: 2,
			total_pages: 2,
		}),
		{ total_results: 0, current_page: null, total_pages: null }
	)
})

// ---------------------------------------------------------------- CA-S3: precarga de formularios

test('S3: la precarga (no conserva resultados) abre sin paginado ni total de una busqueda anterior', () => {
	assert.deepEqual(
		estado_de_paginado_al_abrir({
			conserva_resultados: false,
			cantidad_resultados: 10,
			total_results: 201317,
			current_page: 3,
			total_pages: 4027,
		}),
		{ total_results: 0, current_page: null, total_pages: null }
	)
})

// ---------------------------------------------------------------- Pagination: pagina inicial

test('S1: el paginador que nace de nuevo en la reapertura marca la pagina conservada', () => {
	assert.equal(pagina_inicial_del_paginador(3), 3)
	assert.equal(pagina_inicial_del_paginador(null), 1)
	assert.equal(pagina_inicial_del_paginador(undefined), 1)
	assert.equal(pagina_inicial_del_paginador(0), 1)
})

test('S1: Pagination.vue arranca currentPage con la pagina que le baja el modal', () => {
	const pagination = cargar('common-vue/components/search/Pagination.vue').default
	assert.equal(pagination.data.call({ current_page: 3 }).currentPage, 3)
	assert.equal(pagination.data.call({ current_page: null }).currentPage, 1)
})

test('S1: el paginador se ve cuando hay mas de una pagina (51 si, 50 no)', () => {
	assert.equal(debe_mostrar_paginador(50, 50), false)
	assert.equal(debe_mostrar_paginador(51, 50), true)
	assert.equal(debe_mostrar_paginador(0, 50), false)
	assert.equal(debe_mostrar_paginador(undefined, 50), false)
	assert.equal(debe_mostrar_paginador(1001, 50), true)
})

// ---------------------------------------------------------------- CA-S2: paginar despues de reabrir

test('S2: al paginar manda el criterio de la ultima busqueda, no lo que diga hoy el input', () => {
	assert.equal(
		criterio_para_buscar({ from_pagination: true, query: 'otro texto', query_value_ultima_busqueda: 'MA' }),
		'MA'
	)
	assert.equal(
		criterio_para_buscar({ from_pagination: true, query: '', query_value_ultima_busqueda: 'MA' }),
		'MA'
	)
})

test('S2: busqueda nueva (Enter) usa lo que se escribio, aunque haya una busqueda anterior', () => {
	assert.equal(
		criterio_para_buscar({ from_pagination: false, query: 'martillo', query_value_ultima_busqueda: 'MA' }),
		'martillo'
	)
})

test('S2: sin busqueda anterior (precarga) paginar cae al texto del input', () => {
	assert.equal(
		criterio_para_buscar({ from_pagination: true, query: 'tornillo', query_value_ultima_busqueda: undefined }),
		'tornillo'
	)
	assert.equal(
		criterio_para_buscar({ from_pagination: true, query: 'tornillo', query_value_ultima_busqueda: null }),
		'tornillo'
	)
})

// ---------------------------------------------------------------- CA-S4: contador con tope

test('S4: total_es_minimo con 1001 dice «Más de 1.000»', () => {
	assert.equal(texto_de_cantidad(1001, true), 'Más de 1.000')
})

test('S4: con el tope corrido tambien resta uno (total 2001 -> «Más de 2.000»)', () => {
	assert.equal(texto_de_cantidad(2001, true), 'Más de 2.000')
})

test('S4: sin la clave (API vieja) el contador es exacto: 1001 -> «1.001»', () => {
	assert.equal(texto_de_cantidad(1001, undefined), '1.001')
	assert.equal(texto_de_cantidad(1001, false), '1.001')
})

test('S4: numeros chicos y grandes con separador de miles', () => {
	assert.equal(texto_de_cantidad(0, false), '0')
	assert.equal(texto_de_cantidad(50, false), '50')
	assert.equal(texto_de_cantidad(999, false), '999')
	assert.equal(texto_de_cantidad(201317, false), '201.317')
	assert.equal(texto_de_cantidad(1234567, false), '1.234.567')
})

// ---------------------------------------------------------------- CA-S5: sin conexion

test('S5: la pagina 1 de 120 filas tiene 50 y la 2 tiene de la 51 a la 100', () => {
	const lista = lista_de(120)
	const pagina_1 = pagina_de_resultados(lista, 1, 50)
	const pagina_2 = pagina_de_resultados(lista, 2, 50)
	assert.equal(pagina_1.length, 50)
	assert.equal(pagina_1[0].id, 1)
	assert.equal(pagina_2.length, 50)
	assert.equal(pagina_2[0].id, 51)
	assert.equal(pagina_2[49].id, 100)
})

test('S5: la ultima pagina trae el resto y una pagina fuera de rango o sin lista, vacio', () => {
	const lista = lista_de(120)
	assert.deepEqual(pagina_de_resultados(lista, 3, 50).map(fila => fila.id), lista_de(120).slice(100).map(fila => fila.id))
	assert.equal(pagina_de_resultados(lista, 4, 50).length, 0)
	assert.equal(pagina_de_resultados([], 1, 50).length, 0)
	assert.equal(pagina_de_resultados(null, 1, 50).length, 0)
})

test('S5: pagina_de_resultados no muta la lista completa (el re-corte no vuelve a filtrar)', () => {
	const lista = lista_de(120)
	pagina_de_resultados(lista, 2, 50)
	assert.equal(lista.length, 120)
})

test('S5: el total de paginas de 120 filas en paginas de 50 es 3 y el de 0 filas es 0', () => {
	assert.equal(total_de_paginas(120, 50), 3)
	assert.equal(total_de_paginas(100, 50), 2)
	assert.equal(total_de_paginas(101, 50), 3)
	assert.equal(total_de_paginas(0, 50), 0)
})
