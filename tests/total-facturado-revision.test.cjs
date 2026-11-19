const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const fiscal = cargar('utils/facturacion.js')
const vender = cargar('mixins/vender/guardar_venta/facturar.js').default
const ventas = cargar('mixins/sale/afip_ticket.js').default
const devoluciones = cargar('components/devoluciones/components/resumen/BtnGuardar.vue').default
const notas = cargar('components/comprobantes/components/notas-de-credito/table-buttons/BtnFacturarNotaCredito.vue').default
const mensaje = 'Factura autorizada por ARCA. El total facturado no coincide con sus comprobantes. No vuelvas a emitir: pedí a soporte revisar y reparar el acumulado.'
const respuesta = () => ({estado:'emitida', facturada:true, saldo_facturado_en_revision:true, message:mensaje,
	sale:{id:97,afip_tickets:[{id:1,cae:'123'}],afip_errors:[],afip_observations:[]}, model:{id:9}})
const terminar = () => new Promise(setImmediate)

function contexto(mixin) {
	const ctx = {commits:[],avisos:[],exitos:[],errores:[],limpiezas:0,
		$store:{commit(nombre,valor) {ctx.commits.push([nombre,valor])},dispatch() {return Promise.resolve()}},
		$toast:{warning(texto,opciones) {ctx.avisos.push([texto,opciones])},success(texto) {ctx.exitos.push(texto)},error(texto) {ctx.errores.push(texto)}},
		$api:{post() {return Promise.resolve({data:respuesta()})}},
	}
	for (const [nombre,metodo] of Object.entries(mixin.methods)) ctx[nombre] = metodo.bind(ctx)
	return ctx
}

test('el aviso local conserva el éxito fiscal y admite respuestas de API anteriores', () => {
	assert.equal(fiscal.aviso_resultado_fiscal(respuesta()), null)
	assert.equal(fiscal.aviso_revision_fiscal(respuesta()), mensaje)
	for (const datos of [null,{}, {estado:'emitida'}, {message:'Server Error'}, {saldo_facturado_en_revision:false}]) {
		assert.equal(fiscal.aviso_revision_fiscal(datos), null)
	}
	assert.match(fiscal.aviso_revision_fiscal({saldo_facturado_en_revision:true}), /autorizado quedó guardado/)
})

test('Vender conserva autorización y venta, y muestra revisión local sin marcar rechazo', async () => {
	global.window = {setInterval:()=>1,clearInterval:()=>{}}
	const original = global.setTimeout
	global.setTimeout = () => 1
	try {
		const ctx = contexto(vender)
		ctx.maked_sale = {id:97,total_a_facturar:11500}
		ctx.mostrar_tarjeta = () => {}
		ctx.ocultar_mensaje_demorado = () => {}
		ctx.mostrar_mensaje_exitoso = () => ctx.exitos.push('autorizada')
		ctx.facturar_venta({afip_information_id:4,afip_tipo_comprobante_id:1})
		await terminar()
		assert.deepEqual(ctx.avisos, [[mensaje,{duration:15000}]])
		assert.deepEqual(ctx.errores, [])
		assert.deepEqual(ctx.exitos, ['autorizada'])
		assert.ok(ctx.commits.some(([nombre,venta]) => nombre === 'sale/add' && venta.afip_tickets[0].cae))
	} finally {global.setTimeout = original}
})

test('lote de Ventas y offline no ofrece reemitir por una revisión posterior al CAE', async () => {
	const ctx = contexto(ventas)
	const item = {sale:{id:97},maked:false,fallo:false}
	ctx.afip_tickets_for_make = [item]
	ctx.send_request = () => Promise.resolve({data:respuesta()})
	ctx.terminar_emision = () => {}
	ctx.emitir_una(0)
	await terminar()
	assert.equal(item.maked,true)
	assert.equal(item.fallo,false)
	assert.deepEqual(ctx.avisos,[[mensaje,{duration:15000}]])
	assert.deepEqual(ctx.errores,[])
})

test('la devolución confirmada se limpia y muestra el motivo sin dejar el alta lista para repetir', async () => {
	const ctx = contexto(devoluciones)
	ctx.check_venta = () => true
	ctx.datos_venta = () => ({sale_id:97})
	ctx.limpiar_devolucion = () => ctx.limpiezas++
	ctx.enviar(false)
	await terminar()
	assert.equal(ctx.guardando,false)
	assert.equal(ctx.limpiezas,1)
	assert.deepEqual(ctx.exitos,['Devolución creada'])
	assert.deepEqual(ctx.avisos,[[mensaje,{duration:15000}]])
	assert.deepEqual(ctx.errores,[])
})

test('una nota existente conserva su modelo autorizado y muestra aviso completo', async () => {
	const ctx = contexto(notas)
	ctx.afip_ticket_id = 1
	ctx.nota_credito = {id:9}
	ctx.facturar({preventDefault() {throw new Error('No corresponde bloquear una selección válida')}})
	await terminar()
	assert.equal(ctx.facturando,false)
	assert.deepEqual(ctx.avisos,[[mensaje,{duration:15000}]])
	assert.deepEqual(ctx.errores,[])
	assert.ok(ctx.commits.some(([nombre]) => nombre === 'nota_credito/add'))
})

test('una API anterior sin aviso conserva el alta normal de devoluciones', async () => {
	const ctx = contexto(devoluciones)
	ctx.$api.post = () => Promise.resolve({data:null})
	ctx.check_venta = () => true
	ctx.datos_venta = () => ({sale_id:97})
	ctx.limpiar_devolucion = () => ctx.limpiezas++
	ctx.enviar(false)
	await terminar()
	assert.equal(ctx.limpiezas,1)
	assert.deepEqual(ctx.avisos,[])
	assert.deepEqual(ctx.errores,[])
})

test('la validación previa de devolución muestra qué revisar y conserva el formulario', async () => {
	const ctx = contexto(devoluciones)
	ctx.$api.post = () => Promise.reject({response:{status:422,data:{message:mensaje}}})
	ctx.check_venta = () => true
	ctx.datos_venta = () => ({sale_id:97})
	ctx.limpiar_devolucion = () => ctx.limpiezas++
	ctx.enviar(false)
	await terminar()
	assert.equal(ctx.guardando,false)
	assert.equal(ctx.limpiezas,0)
	assert.deepEqual(ctx.errores,[mensaje])
	assert.deepEqual(ctx.exitos,[])
})

test('la validación de nota existente muestra el motivo sin confirmar otra emisión', async () => {
	const ctx = contexto(notas)
	ctx.afip_ticket_id = 1
	ctx.nota_credito = {id:9}
	ctx.$api.post = () => Promise.reject({response:{status:422,data:{message:mensaje}}})
	ctx.facturar({preventDefault() {throw new Error('Selección válida')}})
	await terminar()
	assert.equal(ctx.facturando,false)
	assert.deepEqual(ctx.errores,[mensaje])
	assert.deepEqual(ctx.exitos,[])
	assert.equal(ctx.commits.some(([nombre]) => nombre === 'nota_credito/add'),false)
})
