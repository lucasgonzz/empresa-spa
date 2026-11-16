const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const fiscal = cargar('utils/facturacion.js')
const vender = cargar('mixins/vender/guardar_venta/facturar.js').default
const ventas = cargar('mixins/sale/afip_ticket.js').default
const selector = cargar('components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectIncoterms.vue').default

test('ausencia histórica se convierte a null sin convertir estructuras ni textos reales', () => {
	for (const valor of [0, '0', '', null, undefined]) assert.equal(fiscal.incoterms_opcional(valor), null)
	for (const valor of ['CIF', 'FOB', false, 5]) assert.equal(fiscal.incoterms_opcional(valor), valor)
	const invalido = { incoterms: 'FOB' }
	assert.equal(fiscal.incoterms_opcional(invalido), invalido)
})

test('el selector refleja el valor del formulario y sólo emite la selección del usuario', () => {
	assert.equal(selector.props.value.default, null)
	const opciones = selector.computed.options.call({})
	assert.equal(opciones[0].value, null)
	let evento
	selector.methods.change.call({$emit: (...args) => { evento = args }}, 'CIF')
	assert.deepEqual(evento, ['set_selected', 'CIF'])
})

test('el mensaje local nombra el campo y un error desconocido exige revisar antes de reemitir', () => {
	const mensaje = 'Revisá la forma de pago: debe ser un texto. Corregí ese dato antes de confirmar.'
	assert.equal(fiscal.mensaje_error_facturacion({response: {status: 422, data: {message: mensaje}}}), mensaje)
	const desconocido = fiscal.mensaje_error_facturacion({response: {status: 500, data: {message: 'Server Error'}}})
	assert.match(desconocido, /Revisá los comprobantes/)
	assert.doesNotMatch(desconocido, /AFIP|ARCA|Server Error/)
})

test('respuestas nuevas y anteriores sólo muestran éxito con autorización del último intento', () => {
	assert.equal(fiscal.aviso_resultado_fiscal({estado: 'emitida'}), null)
	assert.match(fiscal.aviso_resultado_fiscal({estado: 'pendiente_verificacion'}), /pendiente de verificación/)
	assert.match(fiscal.aviso_resultado_fiscal({estado: 'rechazada'}), /rechazado/)
	assert.equal(fiscal.aviso_resultado_fiscal({sale: {afip_tickets: [{id: 1, cae: '123'}]}}), null)
	const parcial = {sale: {afip_tickets: [{id: 1, cae: '123'}, {id: 2, cae: null, resultado: 'R', afip_errors: [{message: 'Rechazado'}]}]}}
	assert.match(fiscal.aviso_resultado_fiscal(parcial), /rechazado/)
	parcial.sale.afip_tickets[1].resultado = null
	parcial.sale.afip_tickets[1].afip_errors = [{message: 'La respuesta de ARCA no quedó confirmada'}]
	assert.match(fiscal.aviso_resultado_fiscal(parcial), /pendiente de verificación/)
	assert.match(fiscal.aviso_resultado_fiscal({sale: {}}), /pendiente de verificación/)
})

function contexto(mixin) {
	const ctx = { commits: [], avisos: [], exitos: 0, cierres: 0, demoras: 0,
		maked_sale: {id: 97, total_a_facturar: 1000},
		$store: { commit(nombre, valor) { ctx.commits.push([nombre, valor]) }, dispatch() { return Promise.resolve() } },
		$toast: {error(mensaje) { ctx.avisos.push(mensaje) }},
	}
	for (const [nombre, metodo] of Object.entries(mixin.methods)) ctx[nombre] = metodo.bind(ctx)
	ctx.mostrar_tarjeta = () => {}
	ctx.ocultar_mensaje_demorado = () => { ctx.demoras++ }
	ctx.mostrar_mensaje_exitoso = () => { ctx.exitos++ }
	ctx.ocultar_tarjeta = () => { ctx.cierres++ }
	return ctx
}

test('Vender manda null por ausencia y conserva la validación local visible sin falso éxito', async () => {
	global.window = {setInterval: () => 1, clearInterval: () => {}}
	const ctx = contexto(vender)
	let payload
	const mensaje = 'Revisá la condición de venta de exportación (incoterms). Corregí el dato.'
	ctx.$api = {post: (ruta, datos) => { payload = datos; return Promise.reject({response: {status: 422, data: {message: mensaje}}}) }}
	ctx.facturar_venta({afip_information_id: 4, afip_tipo_comprobante_id: 2, incoterms: 0})
	await new Promise(setImmediate)
	assert.equal(payload.incoterms, null)
	assert.equal(payload.ventas_afip_information_id, 4)
	assert.equal(ctx.exitos, 0)
	assert.equal(ctx.cierres, 0)
	assert.equal(ctx.interval, null)
	assert.deepEqual(ctx.commits.at(-1), ['vender/setAfipResult', [{Msg: mensaje}]])
	assert.deepEqual(ctx.avisos, [mensaje])
})

test('Vender conserva datos de exportación y no anuncia éxito ante respuesta pendiente', async () => {
	global.window = {setInterval: () => 1, clearInterval: () => {}}
	const ctx = contexto(vender)
	let payload
	ctx.$api = {post: (ruta, datos) => { payload = datos; return Promise.resolve({data: {estado: 'pendiente_verificacion', sale: {id:97, afip_errors: [], afip_observations: [], afip_tickets: []}}}) }}
	ctx.facturar_venta({afip_information_id: 4, afip_tipo_comprobante_id: 8, incoterms: 'CIF', forma_de_pago: 'Transferencia', permiso_existente: 'N'})
	await new Promise(setImmediate)
	assert.equal(payload.incoterms, 'CIF')
	assert.equal(payload.forma_de_pago, 'Transferencia')
	assert.equal(payload.permiso_existente, 'N')
	assert.equal(ctx.exitos, 0)
	assert.equal(ctx.cierres, 0)
	assert.match(ctx.avisos[0], /pendiente de verificación/)
})

test('motor de Ventas y offline normaliza cola histórica y conserva error accionable', async () => {
	const ctx = contexto(ventas)
	const item = {sale: {id:97, num:61881}, datos_afip:{incoterms:'0', ventas_afip_information_id:4}, maked:false, fallo:false}
	ctx.afip_tickets_for_make = [item]
	let payload
	const mensaje = 'Revisá el permiso de exportación. Indicá S o N.'
	ctx.$api = {post: (ruta, datos) => {payload=datos; return Promise.reject({response:{status:422,data:{message:mensaje}}})}}
	await ctx.send_request(0)
	assert.equal(payload.incoterms, null)
	assert.equal(item.maked, false)
	assert.equal(item.fallo, true)
	assert.deepEqual(ctx.avisos, [mensaje])
})

test('motor de Ventas y offline no marca emitido un rechazo ni una incertidumbre', async () => {
	for (const estado of ['rechazada', 'pendiente_verificacion']) {
		const ctx = contexto(ventas)
		const item = {sale:{id:97}, maked:false, fallo:false}
		ctx.afip_tickets_for_make = [item]
		ctx.send_request = () => Promise.resolve({data:{estado, sale:{id:97,afip_errors:[],afip_observations:[]}}})
		ctx.emitir_una = ventas.methods.emitir_una.bind(ctx)
		ctx.terminar_emision = () => {}
		ctx.emitir_una(0)
		await new Promise(setImmediate)
		assert.equal(item.maked, false)
		assert.equal(item.fallo, true)
		assert.equal(ctx.avisos.length, 1)
	}
})
