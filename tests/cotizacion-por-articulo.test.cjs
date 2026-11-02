const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const { inicializar_cotizacion, aplicar_cotizacion, convertir_importe, cotizacion_valida } = cargar('utils/cotizacion_por_articulo.js')

function estado(moneda = 2) { return { cotizacion_por_articulo_disponible: true, moneda_id: moneda, valor_dolar: 1200 } }
const owner = { cotizar_precios_en_dolares: 1 }

test('proveedores distintos y fallback convierten precios y costos pesos por artículo', () => {
	const a = { is_article: true, cost_in_dollars: 1, provider: { dolar: 1000 } }
	const b = { is_article: true, cost_in_dollars: '0', provider: { dolar: 1500 } }
	const c = { is_article: true, cost_in_dollars: 0, provider: { dolar: -1 } }
	;[a,b,c].forEach(item => inicializar_cotizacion(item, estado(), owner))
	assert.equal(convertir_importe(15000, a.moneda_base_precio, 2, a.cotizacion_aplicada), 15)
	assert.equal(convertir_importe(15000, b.moneda_base_precio, 2, b.cotizacion_aplicada), 10)
	assert.equal(convertir_importe(12000, c.moneda_base_costo, 2, c.cotizacion_aplicada), 10)
	assert.equal(c.cotizacion_origen, 'vender')
	assert.equal(a.moneda_base_costo, 2)
	assert.equal(b.moneda_base_costo, 1)
})

test('cotización manual queda fija y no vuelve a inferir proveedor', () => {
	const item = { is_article: true, cost_in_dollars: 1, provider: { dolar: 1000 } }
	inicializar_cotizacion(item, estado(), owner)
	aplicar_cotizacion(item, 1100, 'manual', 2)
	item.provider.dolar = 1700
	inicializar_cotizacion(item, estado(), owner)
	assert.equal(item.cotizacion_aplicada, 1100)
	assert.equal(item.cotizacion_origen, 'manual')
})

test('venta histórica sólo usa dólar y moneda guardados', () => {
	const item = { is_article: true, cost_in_dollars: 1, provider: { dolar: 9000 }, pivot: { price: 10, cost: 5 } }
	inicializar_cotizacion(item, estado(), owner, { moneda_id: 2, valor_dolar: 800 })
	assert.equal(item.cotizacion_aplicada, 800)
	assert.equal(item.cotizacion_origen, 'historica')
	assert.equal(item.moneda_base_costo, 2)
	aplicar_cotizacion(item, 1600, 'proveedor', 2)
	assert.equal(item.pivot.price, 10)
	assert.equal(item.pivot.cost, 5)
})

test('histórico sin cotización no inventa cotización de hoy', () => {
	const item = { is_article: true, pivot: { price: 10, cost: 5 } }
	inicializar_cotizacion(item, estado(), owner, { moneda_id: 2, valor_dolar: null })
	assert.equal(item.cotizacion_aplicada, null)
})

test('recotización expresa congela costo USD pero cambia precio catálogo pesos en USD sin encadenar redondeos', () => {
	const item = { cotizacion_aplicada: 1000, cotizacion_origen: 'proveedor', moneda_base_precio: 1, moneda_base_costo: 2, pivot: { price: 15, cost: 10, price_sin_iva: 12.4 }, cost: 10 }
	aplicar_cotizacion(item, 1500, 'manual', 2)
	assert.equal(item.pivot.price, 10)
	assert.equal(item.pivot.cost, 10)
	aplicar_cotizacion(item, 1000, 'manual', 2)
	assert.equal(item.pivot.price, 15)
	assert.equal(item.pivot.cost, 10)
})

test('precio manual USD permanece y costo pesos cambia por cotización expresa', () => {
	const item = { cotizacion_aplicada: 1000, cotizacion_origen: 'manual', moneda_base_precio: 2, moneda_base_costo: 1, pivot: { price: 20, cost: 10 }, cost: 10 }
	aplicar_cotizacion(item, 1250, 'manual', 2)
	assert.equal(item.pivot.price, 20)
	assert.equal(item.pivot.cost, 8)
})

test('punta vieja no inicializa nuevo contrato', () => {
	const item = { is_article: true, provider: { dolar: 1000 } }
	inicializar_cotizacion(item, { cotizacion_por_articulo_disponible: false }, owner)
	assert.equal(item.cotizacion_origen, undefined)
})

test('catálogo USD conserva moneda cuando cotizar está apagado', () => {
	const item = { is_article: true, cost_in_dollars: 1 }
	inicializar_cotizacion(item, estado(1), { cotizar_precios_en_dolares: '0' })
	assert.equal(item.moneda_base_precio, 2)
	assert.equal(convertir_importe(10, 2, 1, item.cotizacion_aplicada), 12000)
})

test('cotizaciones inválidas no modifican fotos', () => {
	for (const invalida of [0, -1, 0.0000001, '', null, NaN, Infinity, 'texto']) {
		assert.equal(cotizacion_valida(invalida), false)
		const item = { cotizacion_aplicada: 1000 }
		assert.equal(aplicar_cotizacion(item, invalida, 'manual', 2), false)
		assert.equal(item.cotizacion_aplicada, 1000)
	}
})

test('venta pesos sin dólar conserva el camino legítimo sin conversión', () => {
 const item={is_article:true,cost_in_dollars:0}
 inicializar_cotizacion(item,{cotizacion_por_articulo_disponible:true,moneda_id:1,valor_dolar:null},owner)
 assert.equal(item.cotizacion_aplicada,null)
 assert.equal(item.cotizacion_origen,undefined)
 assert.equal(convertir_importe(1500,1,1,null),1500)
})


test('cotización aplicada se normaliza antes de calcular a los seis decimales persistibles', () => {
 const item={cotizacion_aplicada:1000,cotizacion_origen:'manual',moneda_base_precio:1,moneda_base_costo:2,pivot:{price:15,cost:10}}
 aplicar_cotizacion(item,0.0000014,'manual',2)
 assert.equal(item.cotizacion_aplicada,0.000001)
 assert.equal(item.pivot.price,15000000000)
 const nuevo={is_article:true,cost_in_dollars:0,provider:{dolar:1234.12345678}}
 inicializar_cotizacion(nuevo,estado(),owner)
 assert.equal(nuevo.cotizacion_aplicada,1234.123457)
})


test('una capacidad no consultable no descarta fotos históricas que el servidor ya devolvió', () => {
 const item={is_article:true,provider:{dolar:5000},pivot:{price:15,cost:10,cotizacion_aplicada:'1000.000000',cotizacion_origen:'proveedor',moneda_base_precio:1,moneda_base_costo:2}}
 inicializar_cotizacion(item,{cotizacion_por_articulo_disponible:false,valor_dolar:9000},owner,{moneda_id:2,valor_dolar:8000})
 assert.equal(item.cotizacion_origen,'proveedor')
 assert.equal(item.cotizacion_aplicada,'1000.000000')
 assert.equal(item.moneda_base_costo,2)
 assert.equal(item.pivot.price,15)
})
