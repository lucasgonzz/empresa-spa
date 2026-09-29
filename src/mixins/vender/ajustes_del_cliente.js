import vender_set_total from '@/mixins/vender_set_total'
/*
	Para decir en qué etapa están los paneles de Descuentos y Recargos en el diseño de Vender en uso
	(ver texto_de_donde_desactivar_ajustes, abajo).
*/
import diseno_de_vender from '@/mixins/vender/diseno_de_vender'
import { ETAPAS, TITULOS_DE_ETAPAS } from '@/components/vender/layout/elementos'
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

	🔴 ARRANQUE EN FRÍO. Solo se prenden ids que ya estén en el store de `discount` / `surchage`:
	`aplicar_discounts()` (vender_set_total.js) hace `find` sobre el store y un id que no está
	devuelve undefined y rompe el total. Pero si el vendedor elige el cliente antes de que esos
	stores terminen de cargar (entra y vende enseguida), no habría nada que prender y la venta se
	guardaría SIN la condición comercial del cliente, sin aviso. Por eso los ids que no se pudieron
	resolver con el store todavía vacío quedan en `vender.ajustes_pendientes_del_cliente`, y el
	watcher de abajo los prende (con su aviso) cuando el store carga, si el cliente sigue siendo el
	mismo y la venta no se está editando.

	Se aplica aunque el usuario no tenga el permiso `sale.discount_surchage.aplicar`: no es una
	decisión del vendedor sino una condición comercial del cliente, cargada por quien puede editar
	clientes. Por eso stage-3/Discounts.vue y Surchages.vue le muestran igual el grupo "Del cliente"
	a ese vendedor, para que los pueda apagar.
*/

/* Porcentaje usable de un descuento: `0 < d <= 100`. Mismo criterio que la tienda y el back. */
function descuento_usable(percentage) {
	return percentage > 0 && percentage <= 100
}

/* Porcentaje usable de un recargo: `r > 0`. */
function recargo_usable(percentage) {
	return percentage > 0
}

export default {
	mixins: [vender_set_total, diseno_de_vender],
	watch: {
		/*
			Cuando los stores terminan de cargar se resuelven los pendientes del arranque en frío.
			Si el componente está montado dos veces (el buscador y el modal de AFIP), el segundo
			watcher encuentra los pendientes ya vaciados por el primero y no hace nada.
		*/
		'$store.state.discount.models': function () {
			this.aplicar_ajustes_pendientes_del_cliente()
		},
		'$store.state.surchage.models': function () {
			this.aplicar_ajustes_pendientes_del_cliente()
		},
	},
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
				descuento_usable
			)

			let resultado_recargos = this.recalcular_ajustes_del_cliente(
				vender.surchages_id,
				auto.surchages_id,
				client ? client.surchages : null,
				this.$store.state.surchage.models,
				recargo_usable
			)

			this.guardar_ajustes_del_cliente(resultado_descuentos, resultado_recargos)

			/* Los pendientes del cliente anterior se descartan siempre: el cliente cambió. */
			this.$store.commit('vender/set_ajustes_pendientes_del_cliente', this.pendientes_de(client, resultado_descuentos, resultado_recargos))

			this.avisar_ajustes_del_cliente(client, resultado_descuentos, resultado_recargos)
		},

		/**
		 * Prende los ajustes que quedaron pendientes porque el store todavía no había cargado.
		 * Los llama el watcher de los stores.
		 */
		aplicar_ajustes_pendientes_del_cliente() {

			let vender = this.$store.state.vender
			let pendientes = vender.ajustes_pendientes_del_cliente

			if (!pendientes || !pendientes.client_id) {
				return
			}

			/*
				Si el cliente ya no es el mismo, o la venta pasó a ser una edición, los pendientes no
				corresponden a nada que esté en pantalla: se tiran sin tocar la venta.
			*/
			if (
				this.editando_con_ajustes_guardados()
				|| !vender.client
				|| vender.client.id != pendientes.client_id
			) {
				this.$store.commit('vender/set_ajustes_pendientes_del_cliente', null)
				return
			}

			let auto = vender.ajustes_auto_del_cliente || { discounts_id: [], surchages_id: [] }

			let resultado_descuentos = this.sumar_ajustes_pendientes(
				vender.discounts_id,
				auto.discounts_id,
				pendientes.discounts_id,
				this.$store.state.discount.models,
				descuento_usable
			)

			let resultado_recargos = this.sumar_ajustes_pendientes(
				vender.surchages_id,
				auto.surchages_id,
				pendientes.surchages_id,
				this.$store.state.surchage.models,
				recargo_usable
			)

			if (!resultado_descuentos.cambio && !resultado_recargos.cambio && !resultado_descuentos.resolvio && !resultado_recargos.resolvio) {
				return
			}

			this.guardar_ajustes_del_cliente(resultado_descuentos, resultado_recargos)

			this.$store.commit('vender/set_ajustes_pendientes_del_cliente', this.pendientes_de(vender.client, resultado_descuentos, resultado_recargos))

			this.avisar_ajustes_del_cliente(vender.client, resultado_descuentos, resultado_recargos)
		},

		/**
		 * Escribe en el store el resultado de un recálculo: los ids prendidos, lo que prendió el
		 * cliente, y el total.
		 *
		 * @param {Object} resultado_descuentos
		 * @param {Object} resultado_recargos
		 */
		guardar_ajustes_del_cliente(resultado_descuentos, resultado_recargos) {

			let vender = this.$store.state.vender

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

			if (resultado_descuentos.cambio || resultado_recargos.cambio) {
				this.setTotal()
			}
		},

		/**
		 * Lo que queda pendiente para el store, o `null` si no queda nada.
		 *
		 * @param {Object|null} client
		 * @param {Object} resultado_descuentos
		 * @param {Object} resultado_recargos
		 * @returns {Object|null}
		 */
		pendientes_de(client, resultado_descuentos, resultado_recargos) {

			if (!client || (!resultado_descuentos.pendientes.length && !resultado_recargos.pendientes.length)) {
				return null
			}

			return {
				client_id: client.id,
				discounts_id: resultado_descuentos.pendientes,
				surchages_id: resultado_recargos.pendientes,
			}
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
		 * 2. Suma los del cliente nuevo que existan en el store de VENDER con porcentaje usable y
		 *    que no estén ya prendidos. Uno que el vendedor ya había prendido a mano NO se anota como
		 *    automático: si se anotara, cambiar de cliente se lo apagaría.
		 * 3. Los que no están en el store: si el store está VACÍO (todavía no cargó) quedan
		 *    pendientes; si el store ya cargó y no está, se descartan (no existe o está borrado).
		 *
		 * @param {Array<number>} prendidos Ids prendidos hoy en la venta.
		 * @param {Array<number>} auto_anteriores Ids que prendió solo el cliente anterior.
		 * @param {Array<Object>|null|undefined} del_cliente Relación del cliente nuevo.
		 * @param {Array<Object>} store Modelos del store (`discount` / `surchage`).
		 * @param {Function} es_usable Recibe el porcentaje (número) y dice si se puede aplicar.
		 * @returns {{ids: Array<number>, auto: Array<number>, sacados: Array<Object>, sumados: Array<Object>, pendientes: Array<number>, cambio: boolean}}
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
			let pendientes = []

			if (Array.isArray(del_cliente)) {
				del_cliente.forEach(function (del_cliente_model) {

					let model = buscar(del_cliente_model.id)

					if (!model) {
						if (!store.length) {
							pendientes.push(del_cliente_model.id)
						}
						return
					}

					if (!es_usable(Number(model.percentage))) {
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

			return {
				ids: ids,
				auto: auto,
				sacados: sacados,
				sumados: sumados,
				pendientes: pendientes,
				cambio: this.cambiaron_los_ids(prendidos, ids),
			}
		},

		/**
		 * Cuenta pura de los pendientes de un tipo: con el store todavía vacío no hace nada; con el
		 * store cargado prende los que existen y son usables (anotándolos como automáticos) y
		 * descarta el resto.
		 *
		 * @param {Array<number>} prendidos
		 * @param {Array<number>} auto_actuales
		 * @param {Array<number>} pendientes
		 * @param {Array<Object>} store
		 * @param {Function} es_usable
		 * @returns {{ids: Array<number>, auto: Array<number>, sacados: Array<Object>, sumados: Array<Object>, pendientes: Array<number>, cambio: boolean, resolvio: boolean}}
		 */
		sumar_ajustes_pendientes(prendidos, auto_actuales, pendientes, store, es_usable) {

			prendidos = prendidos || []
			auto_actuales = auto_actuales || []
			pendientes = pendientes || []
			store = store || []

			let ids = prendidos.slice()
			let auto = auto_actuales.slice()

			if (!pendientes.length || !store.length) {
				return { ids: ids, auto: auto, sacados: [], sumados: [], pendientes: pendientes, cambio: false, resolvio: false }
			}

			let sumados = []

			pendientes.forEach(function (id) {

				let model = store.find(function (_model) {
					return _model.id == id
				})

				if (!model || !es_usable(Number(model.percentage)) || ids.indexOf(model.id) != -1) {
					return
				}

				ids.push(model.id)
				auto.push(model.id)
				sumados.push(model)
			})

			return {
				ids: ids,
				auto: auto,
				sacados: [],
				sumados: sumados,
				pendientes: [],
				cambio: this.cambiaron_los_ids(prendidos, ids),
				resolvio: true,
			}
		},

		/**
		 * @param {Array<number>} antes
		 * @param {Array<number>} despues
		 * @returns {boolean}
		 */
		cambiaron_los_ids(antes, despues) {
			return antes.length != despues.length
				|| despues.some(function (id, index) {
					return antes[index] != id
				})
		},

		/**
		 * El aviso, en palabras de mostrador: qué se activó automáticamente por el cliente y dónde
		 * se desactiva, y qué se desactivó del cliente anterior. Sin cambios, no avisa nada.
		 *
		 * "Dónde se desactiva" sale del diseño de Vender en uso (texto_de_donde_desactivar_ajustes):
		 * con el predeterminado los paneles están en la etapa 3, "Cierre y opciones", y el texto es
		 * el de siempre.
		 *
		 * @param {Object|null} client
		 * @param {Object} descuentos Resultado de `recalcular_ajustes_del_cliente()`.
		 * @param {Object} recargos Resultado de `recalcular_ajustes_del_cliente()`.
		 */
		avisar_ajustes_del_cliente(client, descuentos, recargos) {

			let self = this

			let listar = function (models) {
				return models.map(function (model) {
					return model.name + ' ' + self.porcentaje_es(model.percentage) + '%'
				}).join(', ')
			}

			/*
				"los descuentos", "los recargos" o "los descuentos y recargos", según lo que haya,
				con el detalle de cada grupo.
			*/
			let describir = function (lista_descuentos, lista_recargos) {
				if (lista_descuentos.length && lista_recargos.length) {
					return {
						que: 'los descuentos y recargos',
						detalle: 'descuentos ' + listar(lista_descuentos) + '; recargos ' + listar(lista_recargos),
					}
				}
				if (lista_descuentos.length) {
					return {
						que: 'los descuentos',
						detalle: listar(lista_descuentos),
					}
				}
				return {
					que: 'los recargos',
					detalle: listar(lista_recargos),
				}
			}

			let lineas = []

			if (client && (descuentos.sumados.length || recargos.sumados.length)) {
				let activados = describir(descuentos.sumados, recargos.sumados)
				lineas.push(
					'Se activaron automáticamente ' + activados.que + ' del cliente ' + client.name + ': ' + activados.detalle + '.'
					+ this.texto_de_donde_desactivar_ajustes(descuentos.sumados.length > 0, recargos.sumados.length > 0)
				)
			}

			if (descuentos.sacados.length || recargos.sacados.length) {
				let desactivados = describir(descuentos.sacados, recargos.sacados)
				lineas.push(
					'Se desactivaron ' + desactivados.que + ' que había activado el cliente anterior: ' + desactivados.detalle + '.'
				)
			}

			if (!lineas.length) {
				return
			}

			this.$toast.info(lineas.join(' '), {
				duration: 12000,
			})
		},

		/**
		 * La segunda mitad del aviso de "se activaron": dónde se desactivan, según el diseño de
		 * Vender en uso (misión diseno-vender-configurable, 28/9/2026). Empieza con un espacio, o es
		 * '' si no hay nada que decir.
		 *
		 * Hasta los diseños decía siempre "desplegá el paso 3 «Cierre y opciones»", porque ahí
		 * estaban los paneles. Ahora cada panel (Descuentos, Recargos) puede estar en cualquier
		 * etapa, o fuera del diseño:
		 * - todos en una etapa plegable (1 o 3): "desplegá el paso N «Título» y desactivalos en ..."
		 *   (con el predeterminado sale exactamente el texto de antes);
		 * - todos en la etapa 2, que no se pliega: "desactivalos en ... (paso 2 «Título»)";
		 * - en etapas distintas: cada panel con su paso entre paréntesis;
		 * - si el diseño sacó alguno, se nombra solo lo que se puede desactivar; si los sacó todos,
		 *   no se agrega nada: mandar al vendedor a buscar un panel que no existe es peor que no
		 *   decirle dónde. El aviso de que se aplicaron sale igual.
		 *
		 * @param {boolean} hay_descuentos si se activaron descuentos
		 * @param {boolean} hay_recargos si se activaron recargos
		 * @returns {string}
		 */
		texto_de_donde_desactivar_ajustes(hay_descuentos, hay_recargos) {
			let self = this
			let paneles = []

			if (hay_descuentos) {
				paneles.push({ key: 'descuentos', nombre: 'Descuentos', que: 'los descuentos' })
			}
			if (hay_recargos) {
				paneles.push({ key: 'recargos', nombre: 'Recargos', que: 'los recargos' })
			}

			/* Los paneles que el diseño en uso dibuja, con la etapa de cada uno */
			let ubicados = []
			paneles.forEach(function (panel) {
				let etapa = self.etapa_donde_se_dibuja_elemento_de_vender(panel.key)
				if (etapa) {
					ubicados.push({ panel: panel, etapa: etapa })
				}
			})

			if (!ubicados.length) {
				return ''
			}

			let paso = function (etapa) {
				return 'paso ' + (ETAPAS.indexOf(etapa) + 1) + ' «' + TITULOS_DE_ETAPAS[etapa] + '»'
			}

			/* "en Descuentos", "en Recargos" o "en Descuentos y en Recargos" */
			let nombres = []
			ubicados.forEach(function (ubicado) {
				nombres.push('en ' + ubicado.panel.nombre)
			})

			let misma_etapa = ubicados.every(function (ubicado) {
				return ubicado.etapa === ubicados[0].etapa
			})

			let donde = ''

			if (misma_etapa && ubicados[0].etapa !== 'etapa_2') {
				donde = 'desplegá el ' + paso(ubicados[0].etapa) + ' y desactivalos ' + nombres.join(' y ')
			} else if (misma_etapa) {
				donde = 'desactivalos ' + nombres.join(' y ') + ' (' + paso(ubicados[0].etapa) + ')'
			} else {
				let partes = []
				ubicados.forEach(function (ubicado) {
					partes.push('en ' + ubicado.panel.nombre + ' (' + paso(ubicado.etapa) + ')')
				})
				donde = 'desactivalos ' + partes.join(' y ')
			}

			/* Si el diseño sacó alguno de los dos, se habla solo del que queda */
			let que = ubicados.length === paneles.length ? 'aplicarlos' : 'aplicar ' + ubicados[0].panel.que

			return ' Si no querés ' + que + ', ' + donde + '.'
		},
	},
}
