import vender_set_total from '@/mixins/vender_set_total'
/*
	Descuentos y recargos del cliente en VENDER (misión descuentos-recargos-por-cliente, 23/9/2026).

	Un cliente puede tener vinculados descuentos y recargos de venta desde su ficha
	(`client.discounts` / `client.surchages`, tablas `client_discount` / `client_surchage`). Al
	elegirlo en VENDER se prenden solos y un aviso lo informa; el vendedor los puede apagar como
	cualquier otro.

	🔴 SE LLAMA SOLO DESDE LOS GESTOS DEL USUARIO (elegir un cliente en el buscador, sacarlo, usar
	el cliente del modal de AFIP) y NUNCA desde la mutation `vender/setClient` ni desde un watcher
	del cliente. Esos dos caminos también los recorren abrir una venta para editarla
	(`mixins/vender/previus_sale`), actualizar un presupuesto en VENDER y `limpiar_vender`: ahí el
	cliente se setea para RESTAURAR lo guardado, y prender sus descuentos pisaría los ajustes con
	los que la venta se guardó.

	Qué prendió el cliente queda anotado en `vender.ajustes_auto_del_cliente`, porque al cambiar o
	sacar el cliente se apagan SOLO esos (decisión 4 de Lucas): lo que el vendedor prendió a mano
	se queda. `limpiar_vender` lo resetea.

	Se aplica aunque el usuario no tenga el permiso `sale.discount_surchage.aplicar`: no es una
	decisión del vendedor sino una condición comercial del cliente, cargada por quien puede editar
	clientes.
*/
export default {
	mixins: [vender_set_total],
	methods: {
		/**
		 * Aplica los ajustes del cliente recién elegido (o `null` si se sacó el cliente): apaga los
		 * que había prendido solo el cliente anterior y prende los del nuevo.
		 *
		 * @param {Object|null} client
		 */
		aplicar_ajustes_del_cliente(client) {

			/*
				En edición (venta guardada o presupuesto) no se toca nada: la venta ya trae sus
				ajustes restaurados desde lo guardado. Esto cubre también el bloqueo de
				`desactivar_recargos` de stage-3/Surchages.vue, que solo existe en edición.
			*/
			if (this.editando_con_ajustes_guardados()) {
				return
			}

			let vender = this.$store.state.vender
			let auto = vender.ajustes_auto_del_cliente || { discounts_id: [], surchages_id: [] }

			let resultado_descuentos = this.recalcular_ajustes_del_cliente(
				vender.discounts_id,
				auto.discounts_id,
				client ? client.discounts : null,
				this.$store.state.discount.models,
				function (percentage) {
					return percentage > 0 && percentage <= 100
				}
			)

			let resultado_recargos = this.recalcular_ajustes_del_cliente(
				vender.surchages_id,
				auto.surchages_id,
				client ? client.surchages : null,
				this.$store.state.surchage.models,
				function (percentage) {
					return percentage > 0
				}
			)

			let cambio_algo = resultado_descuentos.cambio || resultado_recargos.cambio

			if (resultado_descuentos.cambio) {
				this.$store.commit('vender/setDiscountsId', resultado_descuentos.ids)
			}

			if (resultado_recargos.cambio) {
				this.$store.commit('vender/setSurchagesId', resultado_recargos.ids)

				/*
					Mismo criterio que el setter de stage-3/Surchages.vue: sin recargos, la opción de
					aplicarlos directo a los precios no tiene sobre qué actuar y hay que apagarla, si
					no la venta se guarda con la bandera en 1 y sin recargos.
				*/
				if (!resultado_recargos.ids.length && vender.aplicar_recargos_directo_a_items) {
					this.$store.commit('vender/set_aplicar_recargos_directo_a_items', 0)
				}
			}

			this.$store.commit('vender/set_ajustes_auto_del_cliente', {
				discounts_id: resultado_descuentos.auto,
				surchages_id: resultado_recargos.auto,
			})

			if (cambio_algo) {
				this.setTotal()
			}

			this.avisar_ajustes_del_cliente(client, resultado_descuentos, resultado_recargos)
		},

		/**
		 * ¿Se está editando un comprobante ya guardado? Mismo criterio que
		 * `SelectClient.vue::en_edicion_vender()`, leído del store para que el mixin sirva también
		 * en componentes que no tienen los computeds de VENDER.
		 *
		 * @returns {boolean}
		 */
		editando_con_ajustes_guardados() {
			return !!this.$store.state.vender.budget
				|| !!this.$store.getters['vender/previus_sales/editando_venta_previa']
		},

		/**
		 * Cuenta pura (sin tocar el store) de un tipo de ajuste: descuentos o recargos.
		 *
		 * 1. Saca de los prendidos los que había prendido solo el cliente anterior.
		 * 2. Suma los del cliente nuevo que existan en el store de VENDER con porcentaje usable
		 *    (un id que no está en el store haría fallar `aplicar_discounts()`, que lo busca ahí) y
		 *    que no estén ya prendidos. Uno que el vendedor ya había prendido a mano NO se anota como
		 *    automático: si se anotara, cambiar de cliente se lo apagaría.
		 *
		 * @param {Array<number>} prendidos Ids prendidos hoy en la venta.
		 * @param {Array<number>} auto_anteriores Ids que prendió solo el cliente anterior.
		 * @param {Array<Object>|null|undefined} del_cliente Relación del cliente nuevo.
		 * @param {Array<Object>} store Modelos del store (`discount` / `surchage`).
		 * @param {Function} es_usable Recibe el porcentaje (número) y dice si se puede aplicar.
		 * @returns {{ids: Array<number>, auto: Array<number>, sacados: Array<Object>, sumados: Array<Object>, cambio: boolean}}
		 */
		recalcular_ajustes_del_cliente(prendidos, auto_anteriores, del_cliente, store, es_usable) {

			prendidos = prendidos || []
			auto_anteriores = auto_anteriores || []
			store = store || []

			let buscar = function (id) {
				return store.find(function (model) {
					return model.id == id
				})
			}

			let ids = []
			let sacados = []

			prendidos.forEach(function (id) {
				if (auto_anteriores.indexOf(id) == -1) {
					ids.push(id)
				} else {
					let model = buscar(id)
					if (model) {
						sacados.push(model)
					}
				}
			})

			let auto = []
			let sumados = []

			if (Array.isArray(del_cliente)) {
				del_cliente.forEach(function (del_cliente_model) {

					let model = buscar(del_cliente_model.id)

					if (!model || !es_usable(Number(model.percentage))) {
						return
					}

					if (ids.indexOf(model.id) != -1) {
						return
					}

					ids.push(model.id)
					auto.push(model.id)
					sumados.push(model)
				})
			}

			/*
				Si lo que se sacó vuelve a entrar (el mismo ajuste en el cliente anterior y en el
				nuevo), para el vendedor no se sacó nada: no se lo nombra en el aviso.
			*/
			sacados = sacados.filter(function (model) {
				return auto.indexOf(model.id) == -1
			})

			let cambio = ids.length != prendidos.length
				|| ids.some(function (id, index) {
					return prendidos[index] != id
				})

			return {
				ids: ids,
				auto: auto,
				sacados: sacados,
				sumados: sumados,
				cambio: cambio,
			}
		},

		/**
		 * El aviso: qué se prendió por el cliente nuevo y qué se apagó del anterior. Sin cambios
		 * para el vendedor, no avisa nada.
		 *
		 * @param {Object|null} client
		 * @param {Object} descuentos Resultado de `recalcular_ajustes_del_cliente()`.
		 * @param {Object} recargos Resultado de `recalcular_ajustes_del_cliente()`.
		 */
		avisar_ajustes_del_cliente(client, descuentos, recargos) {

			let self = this

			let nombrar = function (models, tipo) {
				return models.map(function (model) {
					return tipo + ' ' + model.name + ' ' + self.porcentaje_es(model.percentage) + '%'
				})
			}

			let sumados = nombrar(descuentos.sumados, 'descuento').concat(nombrar(recargos.sumados, 'recargo'))
			let sacados = nombrar(descuentos.sacados, 'descuento').concat(nombrar(recargos.sacados, 'recargo'))

			let lineas = []

			if (sumados.length && client) {
				lineas.push('Se aplicaron los ajustes del cliente ' + client.name + ': ' + sumados.join(', ') + '. Podés sacarlos en los descuentos y recargos de la venta.')
			}

			if (sacados.length) {
				lineas.push('Se sacaron los ajustes del cliente anterior: ' + sacados.join(', ') + '.')
			}

			if (!lineas.length) {
				return
			}

			this.$toast.info(lineas.join(' '), {
				duration: 10000,
			})
		},
	},
}
