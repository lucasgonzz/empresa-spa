const { test } = require('node:test')
const assert = require('node:assert/strict')
const axios = require('axios')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const { instalar_guardia_cotizaciones } = cargar('utils/guardia_cotizaciones_articulos.js')
const reexpresar = cargar('mixins/vender/reexpresar_comprobante.js').default
const { aplicar_cotizacion } = cargar('utils/cotizacion_por_articulo.js')

function contexto(item) {
 const estado = { items: [item], forzar_total_monto: null }
 return Object.assign({ $store: { state: { vender: estado }, commit() {} } }, reexpresar.methods)
}

test('cambiar q, cambiar moneda y volver a cambiar q conserva precio y costo en moneda actual', () => {
 const item = { is_article: true, cotizacion_aplicada: 1000, cotizacion_origen: 'proveedor', moneda_base_precio: 1, moneda_base_costo: 2, pivot: { price: 15, cost: 10 }, cost: 10 }
 aplicar_cotizacion(item,1200,'manual',2)
 const ctx=contexto(item)
 ctx.reexpresar_comprobante_en_otra_moneda(2,1,900)
 assert.equal(item.pivot.price,15000)
 assert.equal(item.pivot.cost,12000)
 aplicar_cotizacion(item,1500,'manual',1)
 assert.equal(item.pivot.price,15000)
 assert.equal(item.pivot.cost,15000)
 ctx.reexpresar_comprobante_en_otra_moneda(1,2,900)
 assert.equal(item.pivot.price,10)
 assert.equal(item.pivot.cost,10)
})

test('varios precios conservan tasa y costo de cada subfila al cambiar moneda', () => {
 const fila = { cotizacion_aplicada: 1200, cotizacion_origen: 'manual', moneda_base_precio: 2, moneda_base_costo: 2, price_vender: 10, pivot: {price:10,cost:6}, cost:6, desde_comprobante_guardado:true }
 const item = { is_article:true, cotizacion_aplicada: 1200, cotizacion_origen:'manual', pivot:{price:10,cost:6}, varios_precios:[fila] }
 const ctx=contexto(item)
 ctx.reexpresar_comprobante_en_otra_moneda(2,1,900)
 assert.equal(fila.price_vender,12000)
 assert.equal(fila.pivot.cost,7200)
 ctx.reexpresar_comprobante_en_otra_moneda(1,2,900)
 assert.equal(fila.price_vender,10)
 assert.equal(fila.pivot.cost,6)
})

for (const [url,prefijo] of [['/api/sale','/api/'],['budget','']]) {
 test('rotación a servidor viejo bloquea antes de escribir '+url, async () => {
  let escrituras=0, lecturas=0
  const instancia=axios.create({adapter:config => {
   if(config.method==='get') {lecturas++;return Promise.resolve({data:{supported:false},status:200,config,headers:{}})}
   escrituras++;return Promise.resolve({data:{},status:201,config,headers:{}})
  }})
  instalar_guardia_cotizaciones(instancia,prefijo)
  await assert.rejects(instancia.post(url,{items:[{cotizacion_origen:'manual'}]}),/no se guardó/)
  assert.equal(escrituras,0)
  assert.equal(lecturas,1)
 })
 test('servidor nuevo conserva escritura '+url, async () => {
  let escrituras=0
  const instancia=axios.create({adapter:config => {
   if(config.method==='get') return Promise.resolve({data:{supported:true},status:200,config,headers:{}})
   escrituras++;return Promise.resolve({data:{},status:201,config,headers:{}})
  }})
  instalar_guardia_cotizaciones(instancia,prefijo)
  await instancia.post(url,{items:[{cotizacion_origen:'manual'}]})
  assert.equal(escrituras,1)
 })
}

test('lista propia USD guardada conserva foto y convierte costo al cambiar a pesos', () => {
 const item = { is_article:true, price_type_monedas:[{moneda_id:2}], cotizacion_aplicada:1000,cotizacion_origen:'manual',moneda_base_precio:2,moneda_base_costo:2,pivot:{price:15,cost:10},cost:10 }
 const ctx=contexto(item)
 ctx.reexpresar_comprobante_en_otra_moneda(2,1,900)
 assert.equal(item.pivot.price,15000)
 assert.equal(item.pivot.cost,10000)
 ctx.reexpresar_comprobante_en_otra_moneda(1,2,900)
 assert.equal(item.pivot.price,15)
 assert.equal(item.pivot.cost,10)
})

test('reagrupación conserva fotos y costos diferentes de cada subfila', () => {
 const { reagrupar_renglones_con_varios_precios }=cargar('utils/varios_precios_guardados.js')
 const filas=[1000,1500].map((q,i)=>({id:10,is_article:true,amount:i+1,article_variant_id:0,discount:null,cotizacion_aplicada:q,cotizacion_origen:i?'manual':'proveedor',moneda_base_precio:1,moneda_base_costo:1,pivot:{price:20,cost:i+8,amount:i+1},cost:i+8}))
 const grupo=reagrupar_renglones_con_varios_precios(filas,false,false)
 assert.equal(grupo.length,1)
 assert.equal(grupo[0].varios_precios[0].cotizacion_aplicada,1000)
 assert.equal(grupo[0].varios_precios[1].cotizacion_aplicada,1500)
 assert.equal(grupo[0].varios_precios[1].pivot.cost,9)
})

test('editar o recotizar y cancelar no modifica el modelo histórico compartido', () => {
 const historico={price:15,cost:10,cotizacion_aplicada:1000,cotizacion_origen:'proveedor',moneda_base_precio:1,moneda_base_costo:2}
 const item={pivot:historico,cotizacion_aplicada:1000,cotizacion_origen:'proveedor',moneda_base_precio:1,moneda_base_costo:2}
 const antes=JSON.stringify(historico)
 aplicar_cotizacion(item,1500,'manual',2)
 assert.equal(item.pivot.price,10)
 assert.equal(JSON.stringify(historico),antes)
 assert.notEqual(item.pivot,historico)
})

test('oferta fija conserva moneda del catálogo y precio manual usa la elegida', () => {
 const generales=cargar('mixins/generals.js', {moment:require('moment')}).default
 const ctx=Object.assign({owner:{cotizar_precios_en_dolares:1},$store:{state:{vender:{cotizacion_por_articulo_disponible:true,moneda_id:2,valor_dolar:900}}}},generales.methods)
 const oferta={is_article:true,cost_in_dollars:1,cotizacion_origen:'proveedor',cotizacion_aplicada:1000,moneda_base_precio:1,price_vender_personalizado:15000,precio_fijo_de_oferta_por_cantidad:15000}
 assert.equal(ctx.check_moneda(oferta,15000,false),15)
 assert.equal(oferta.moneda_base_precio,1)
 const manual={is_article:true,cotizacion_origen:'manual',cotizacion_aplicada:1000,moneda_base_precio:1,price_vender_personalizado:15000}
 assert.equal(ctx.check_moneda(manual,15000,false),15000)
 assert.equal(manual.moneda_base_precio,2)
})
