import price_types from '@/mixins/vender/price_types'
import sonido_error from '@/mixins/sonido_error'
/* Por setTotal(): re-precia los renglones cuando la lista se resuelve recien al guardar. */
import vender_set_total from '@/mixins/vender_set_total'

/**
 * El texto del aviso, en un solo lugar. El spec e2e vender-lista-de-precios-obligatoria lo
 * busca por su fragmento "listas de precios".
 */
export const MENSAJE_SIN_LISTA_DE_PRECIOS = 'Esta cuenta trabaja con listas de precios y la venta no tiene ninguna. Elegí una lista de precios; si no aparece ninguna, recargá la página.'

/**
 * El aviso para cuando el catalogo de listas todavia puede llegar (el arranque no termino, o el
 * re-pedido esta en vuelo). Tambien lleva el fragmento "listas de precios" que busca el spec.
 */
export const MENSAJE_LISTAS_DE_PRECIOS_EN_CAMINO = 'Estamos trayendo las listas de precios. Probá guardar de nuevo en unos segundos.'

export default {
	mixins: [price_types, sonido_error, vender_set_total],
	methods: {
		/**
		 * Guarda de UX del guardado: una cuenta que vende con listas no guarda una venta ni un
		 * presupuesto sin lista.
		 *
		 * La autoridad es el 422 del backend (`sin_lista_de_precios: true` en POST sale y
		 * POST budget, y en el PUT cuando viaja null): esto es para no hacer el viaje y para que
		 * el aviso salga instantaneo y con sonido, que es lo que un mostrador necesita.
		 *
		 * Corre en los tres caminos de guardado: la venta nueva (checkear_vender), el presupuesto
		 * y la actualizacion de una venta guardada (los dos desde BtnGuardar.check(), que no pasan
		 * por checkear_vender).
		 *
		 * @returns {boolean} true = seguir guardando. false = abortar, ya se mostro el aviso.
		 */
		check_price_type() {
			if (!this.requiere_lista_de_precios()) {
				return true
			}

			if (this.price_type_vender && this.price_type_vender.id) {
				return true
			}

			/*
				Ultimo intento de resolver la lista por defecto ANTES de frenar: cubre el caso en
				que el catalogo llego y nadie volvio a aplicarla. En una venta nueva es la misma
				resolucion que corre al entrar a Vender y al limpiar; en edicion setPriceType() no
				toca nada (la lista de un comprobante guardado es la que quedo en el).
			*/
			this.setPriceType()

			if (this.price_type_vender && this.price_type_vender.id) {

				/*
					🔴 La lista se resolvio RECIEN AHORA, y el remito ya tiene renglones que se
					preciaron sin ella (a precio base). Se re-precian a la vista (setTotal, lo mismo
					que elegir la lista a mano) y NO se sigue guardando: el vendedor ya le dijo un
					total al cliente y los importes acaban de cambiar abajo suyo, asi que los revisa
					y vuelve a apretar Guardar. Seguir seria guardar "lista X" con renglones a costo
					--lo que el back se niega a producir-- o cobrar importes que nadie miro.
					Sin renglones no hay nada que re-preciar y se sigue.
				*/
				if (this.items.length) {

					this.setTotal()

					this.$store.commit('vender/append_sale_log', {
						event_key: 'price_list_applied_on_save',
						source_component: 'vender/check_price_type',
						before: null,
						after: {
							price_type_id: this.price_type_vender.id,
							items_count: this.items.length,
						},
						diff: null,
					})

					this.sonido_error()

					this.$toast.error('Se aplicó la lista de precios ' + this.price_type_vender.name + ': revisá los importes y volvé a guardar', {
						duration: 10000,
					})

					return false
				}

				return true
			}

			/*
				🔴 Si el catalogo TODAVIA PUEDE LLEGAR --el setPriceType() de arriba acaba de disparar
				el re-pedido, o el arranque de recursos no termino-- el aviso no puede decir "recarga
				la pagina": recargar tira la respuesta que esta por llegar y, en una cuenta con el
				flag prendido y cero listas, el vendedor que obedecia el aviso entraba en un loop (el
				primer Guardar de cada carga frenaba y el segundo pasaba). Se frena igual, con un
				texto que dice lo que pasa: en unos segundos la lista aparece elegida, o el servidor
				confirma que la cuenta no tiene listas y el chequeo deja de aplicar. El texto de
				"recarga" queda para cuando el re-pedido ya volvio y sigue sin haber lista.
			*/
			if (this.catalogo_de_listas_todavia_puede_llegar()) {

				this.$store.commit('vender/append_sale_log', {
					event_key: 'price_list_pending_on_save',
					source_component: 'vender/check_price_type',
					before: null,
					after: {
						price_types_count: this.price_types.length,
					},
					diff: null,
				})

				this.sonido_error()

				this.$toast.error(MENSAJE_LISTAS_DE_PRECIOS_EN_CAMINO, {
					duration: 8000,
				})

				return false
			}

			/*
				🔴 Si sigue sin lista, NO se elige una y se sigue guardando. Un articulo se precia
				en el momento en que entra al remito, con la lista que habia en ese momento;
				aplicar una lista recien aca dejaria el comprobante diciendo "lista X" con lineas
				preciadas sin ella --o, si se re-preciaran, cambiaria los importes abajo del
				vendedor, que ya le dijo el total al cliente--. Se frena, se avisa que lista falta
				y se deja que el vendedor la elija o recargue la pagina (que vuelve a bajar el
				catalogo: es el caso de Trama, donde la request del arranque no habia llegado).
			*/
			this.$store.commit('vender/append_sale_log', {
				event_key: 'price_list_missing_on_save',
				source_component: 'vender/check_price_type',
				before: null,
				after: {
					price_types_count: this.price_types.length,
					client_id: this.client ? this.client.id : null,
					guardar_como_presupuesto: this.guardar_como_presupuesto ? 1 : 0,
					editando_venta_previa: this.editando_venta_previa ? 1 : 0,
				},
				diff: null,
			})

			this.sonido_error()

			this.$toast.error(MENSAJE_SIN_LISTA_DE_PRECIOS, {
				duration: 10000,
			})

			return false
		},
	}
}
