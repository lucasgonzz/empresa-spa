import { payload_de_registro } from '@/utils/demanda_sin_stock'

/*
	Demanda no satisfecha en Vender (misión demanda-sin-stock-vender, 21/11/2026).

	PUNTO ÚNICO de registro: check_stock.js lo llama sólo donde Vender FRENA un artículo por
	`check_article_stock_en_vender` (nunca con sólo `warn_…`, nunca en presupuestos). La API guarda un
	pedido que no se pudo vender y la SPA avisa en pantalla, con Cancelar.

	Es un registro de FONDO: no usa el indicador global de carga a propósito (excepción documentada),
	porque el mostrador no se puede trabar ni mostrar un "cargando" por esto. Si la API es vieja (404),
	no hay red o falla, no pasa nada visible: ni toast, ni aviso, y Vender sigue igual que antes.
*/
export default {
	methods: {

		/**
		 * Manda un POST silencioso `unmet-demand` por registro y, si al menos uno se guardó, muestra el aviso.
		 *
		 * @param {object[]} registros Salida de registro_de_articulo (uno por artículo frenado).
		 * @param {object} contexto `{ nombres: string[], combo_nombre: string|null }` para el texto del aviso;
		 *        `nombres[i]` es el nombre del artículo de `registros[i]`.
		 * @returns {Promise} Promesa que nunca rechaza.
		 */
		registrar_frenos_por_stock(registros, contexto) {

			// Sin nada que registrar no se hace ninguna llamada.
			if (!registros || !registros.length) {
				return Promise.resolve()
			}

			let self = this

			// Sucursal y empleado elegidos en Vender (0 = sin elegir; el payload los pasa a null).
			let address_id = self.$store.state.vender.address_id
			let employee_id = self.$store.state.vender.employee_id

			let nombres_del_contexto = contexto && contexto.nombres ? contexto.nombres : []
			let combo_nombre = contexto && contexto.combo_nombre ? contexto.combo_nombre : null

			// Una promesa por registro; cada una atrapa su propio error y devuelve null (nunca rechaza).
			let promesas = []
			registros.forEach(registro => {
				promesas.push(
					self.$api.post(
						'unmet-demand',
						payload_de_registro(registro, address_id, employee_id),
						{ skip_global_error_event: true, skip_global_validation_toast: true }
					)
					.then(response => response)
					.catch(() => null)
				)
			})

			return Promise.all(promesas).then(respuestas => {

				// Ids y nombres sólo de los registros que la API guardó (200/201).
				let ids = []
				let nombres = []
				respuestas.forEach((respuesta, indice) => {
					if (respuesta && respuesta.data && respuesta.data.model && respuesta.data.model.id) {
						if (!ids.includes(respuesta.data.model.id)) {
							ids.push(respuesta.data.model.id)
							nombres.push(nombres_del_contexto[indice] !== undefined ? nombres_del_contexto[indice] : '')
						}
					}
				})

				// Todos fallaron (API vieja, sin red): nada que avisar.
				if (!ids.length) {
					return
				}

				self.$store.commit('demanda_sin_stock/set_aviso', {
					ids: ids,
					nombres: nombres,
					motivo: registros[0].motivo,
					combo_nombre: combo_nombre,
				})
			}).catch(() => null)
		},
	},
}
