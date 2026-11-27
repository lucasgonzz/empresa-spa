// Actualización masiva de artículos: confirmación cuando afecta más del 75% del inventario
// (misión masiva-sin-tope-confirmar-75, CA13). Componente
// src/common-vue/components/view/header/opciones-filtrados-seleccion/Index.vue.
//
// Ejecutar con: node --test tests/masiva-confirmar-porcentaje-inventario.test.cjs
// No levanta servidores ni usa Playwright: el componente se arma a mano (sin Vue) con la API, el
// diálogo de confirmación, el toast y el store reemplazados por dobles que anotan lo que reciben.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const Componente = cargar('common-vue/components/view/header/opciones-filtrados-seleccion/Index.vue').default

/** Texto que devuelve la API cuando pide confirmar (lo arma el servidor). */
const MENSAJE_CONFIRMACION = 'Esta actualización afecta el 76% de tu inventario (76 de 100 artículos). ¿Confirmás que querés seguir?'

/** Error de axios con respuesta 422 que pide confirmación. */
function error_de_confirmacion() {
	return {
		response: {
			status: 422,
			data: { requires_confirmation: true, code: 'confirmar_porcentaje_inventario', percentage: 76, count: 76, total: 100, message: MENSAJE_CONFIRMACION },
		},
	}
}

/**
 * Arma el componente a mano.
 *
 * @param {object} opciones
 * @param {Function[]} opciones.respuestas Una función por cada PUT, en orden: devuelve la promesa de la respuesta.
 * @param {boolean} [opciones.confirma] Qué contesta la persona en el diálogo.
 * @returns {{vista: object, puts: object[], eventos: string[], dialogos: object[], toasts: object[]}}
 */
function montar(opciones) {
	const puts = []
	const eventos = []
	const dialogos = []
	const toasts = []
	const vista = Object.assign({}, Componente.methods, {
		model_name: 'article',
		from_filter: false,
		loading: false,
		selecteds_id: [1, 2, 3],
		$api: {
			put: (url, cuerpo, config) => {
				puts.push({ url, cuerpo, config })
				return opciones.respuestas[puts.length - 1]()
			},
		},
		$bvModal: {
			hide: nombre => eventos.push('hide ' + nombre),
			msgBoxConfirm: (mensaje, config) => {
				dialogos.push({ mensaje, config })
				return Promise.resolve(opciones.confirma === true)
			},
		},
		$toast: {
			success: mensaje => toasts.push({ tipo: 'success', mensaje }),
			error: mensaje => toasts.push({ tipo: 'error', mensaje }),
		},
		$store: {
			state: { article: { filters: [{ key: 'name', value: 'x' }] } },
			commit: (nombre, valor) => eventos.push('commit ' + nombre + ' ' + JSON.stringify(valor)),
		},
	})
	return { vista, puts, eventos, dialogos, toasts }
}

/** Deja correr toda la cadena de promesas. */
const esperar = () => new Promise(resolver => setTimeout(resolver, 10))

test('el primer PUT siempre lleva check_inventory_percentage:true y confirmed_massive:false', async () => {
	const { vista, puts } = montar({ respuestas: [() => Promise.resolve({ data: { queued_count: 3 } })] })
	vista.update({ cost: 10 })
	await esperar()

	assert.equal(puts.length, 1)
	assert.equal(puts[0].url, 'update/article')
	assert.equal(puts[0].cuerpo.check_inventory_percentage, true)
	assert.equal(puts[0].cuerpo.confirmed_massive, false)
	assert.deepEqual(puts[0].cuerpo.update_form, { cost: 10 })
	assert.deepEqual(puts[0].cuerpo.models_id, [1, 2, 3])
})

test('un 422 con requires_confirmation abre el diálogo con el mensaje de la API y apaga el loading', async () => {
	const { vista, puts, eventos, dialogos, toasts } = montar({
		respuestas: [() => Promise.reject(error_de_confirmacion())],
		confirma: false,
	})
	vista.update({ cost: 10 })
	await esperar()

	assert.equal(dialogos.length, 1)
	assert.equal(dialogos[0].mensaje, MENSAJE_CONFIRMACION)
	assert.equal(dialogos[0].config.title, 'Confirmá la actualización masiva')
	assert.equal(dialogos[0].config.okTitle, 'Sí, actualizar')
	assert.equal(dialogos[0].config.cancelTitle, 'Cancelar')
	assert.equal(vista.loading, false)
	assert.ok(eventos.includes('commit auth/setLoading false'), 'el loading global se apaga antes de preguntar')
	assert.equal(toasts.filter(t => t.tipo === 'error').length, 0, 'pedir confirmación no es un error')
	assert.equal(puts.length, 1)
})

test('si la persona confirma, reenvía lo mismo con confirmed_massive:true', async () => {
	const { vista, puts, eventos, toasts } = montar({
		respuestas: [
			() => Promise.reject(error_de_confirmacion()),
			() => Promise.resolve({ data: { queued_count: 76 } }),
		],
		confirma: true,
	})
	vista.update({ cost: 10 })
	await esperar()

	assert.equal(puts.length, 2)
	assert.equal(puts[1].cuerpo.confirmed_massive, true)
	assert.equal(puts[1].cuerpo.check_inventory_percentage, true)
	assert.deepEqual(puts[1].cuerpo.update_form, puts[0].cuerpo.update_form)
	assert.deepEqual(puts[1].cuerpo.filter_form, puts[0].cuerpo.filter_form)
	assert.deepEqual(puts[1].cuerpo.models_id, puts[0].cuerpo.models_id)
	assert.equal(toasts.filter(t => t.tipo === 'success').length, 1)
	assert.ok(eventos.includes('hide article-update-models'))
})

test('si la persona cancela no hay segundo PUT, ni toast de error, ni loading prendido', async () => {
	const { vista, puts, toasts } = montar({
		respuestas: [() => Promise.reject(error_de_confirmacion())],
		confirma: false,
	})
	vista.update({ cost: 10 })
	await esperar()

	assert.equal(puts.length, 1)
	assert.equal(toasts.length, 0)
	assert.equal(vista.loading, false)
})

test('un 422 sin requires_confirmation muestra el toast con el message de la API', async () => {
	const { vista, puts, dialogos, toasts } = montar({
		respuestas: [() => Promise.reject({ response: { status: 422, data: { message: 'No se pudo actualizar: el máximo es 50.000.' } } })],
	})
	vista.update({ cost: 10 })
	await esperar()

	assert.equal(dialogos.length, 0)
	assert.equal(puts.length, 1)
	assert.equal(toasts.length, 1)
	assert.equal(toasts[0].tipo, 'error')
	assert.equal(toasts[0].mensaje, 'No se pudo actualizar: el máximo es 50.000.')
})
