import __base_store from '@/store/__base_store'

/**
 * Store de configuración online (modelo `online_configuration`) construido desde el factory común.
 */
let modulo = __base_store({
	state: {
		model_name: 'online_configuration',
	},
})

/**
 * `setModel` del factory, que este store envuelve (abajo).
 */
let set_model_base = modulo.mutations.setModel

/**
 * Pone la configuración en el formulario, con `ofrecer_envio_zipnova` en null dibujado como
 * PRENDIDO (misión formas-envio-direcciones-maps, 19/10/2026).
 *
 * En la base, `ofrecer_envio_zipnova` null quiere decir "se ofrece Zipnova" (es lo mismo que 1, el
 * comportamiento de siempre). Pero el interruptor del formulario genérico se dibuja con
 * `Number(valor) === 1` (common-vue/components/model/form/FieldCheckboxToggle.vue, que no se toca
 * desde acá): con null se vería "No" mientras la tienda sigue ofreciendo Zipnova.
 *
 * Por eso el formulario recibe una COPIA de la configuración con el null cambiado por 1. La fila del
 * listado (`models[0]`) no se toca. Si el dueño guarda sin tocar el interruptor, viaja 1 en vez de
 * null: es el mismo significado ("se ofrece"). No hay forma de dibujarlo prendido y mandar el null
 * intacto sin tocar common-vue: el formulario dibuja y manda el mismo objeto.
 *
 * Un valor 0/1 (o una API vieja que no manda la clave) pasa tal cual.
 *
 * @param {Object} state
 * @param {Object} value `{ model, properties }`, igual que la mutation base.
 * @returns {void}
 */
modulo.mutations.setModel = function (state, value) {
	if (value && value.model && value.model.ofrecer_envio_zipnova === null) {
		value = Object.assign({}, value, {
			model: Object.assign({}, value.model, { ofrecer_envio_zipnova: 1 }),
		})
	}
	set_model_base(state, value)
}

export default modulo
