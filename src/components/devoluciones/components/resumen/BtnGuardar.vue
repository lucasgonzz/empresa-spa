<template>
	<div>
		<!--
			Guardar: botón primario a lo ancho del panel. Sin renglones queda deshabilitado (antes
			desaparecía y el panel saltaba de alto). `btn-guardar-devolucion` es el testid de siempre,
			para los dos modos.
		-->
		<b-button
		class="dev-btn-guardar"
		data-testid="btn-guardar-devolucion"
		variant="primary"
		block
		:disabled="!items.length || guardando"
		@click="guardar">
			{{ texto }}
		</b-button>

		<!--
			Aviso de que la venta ya tiene una nota de crédito con esas unidades (la API responde 409):
			facturar la existente, crear otra de todos modos o cancelar.
		-->
		<notas-existentes-modal
		:notas="notas_existentes"
		@facturada="limpiar_devolucion"
		@crear_igual="guardar_confirmando_la_duplicada"></notas-existentes-modal>
	</div>
</template>
<script>
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	components: {
		NotasExistentesModal: () => import('@/components/devoluciones/components/resumen/NotasExistentesModal'),
	},
	data() {
		return {
			// Notas de crédito de la venta que chocan con lo que se quiere devolver (las manda la
			// API en el 409). Vacío si no hay aviso.
			notas_existentes: [],
			// true mientras el POST está en vuelo: el botón queda deshabilitado para que un
			// segundo clic no mande otra nota de crédito igual (la API tiene candado, pero el
			// segundo pedido terminaría en un 422 confuso o en una nota duplicada sin compra).
			guardando: false,
		}
	},
	computed: {
		/**
		 * @returns {String} Texto del botón según el modo y si está guardando.
		 */
		texto() {
			if (this.guardando) {
				return 'Guardando…'
			}
			return this.es_compra ? 'Guardar nota de crédito' : 'Guardar devolución'
		},
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		sale() {
			return this.$store.state.devoluciones.sale
		},
		provider() {
			return this.$store.state.devoluciones.provider
		},
		provider_order() {
			return this.$store.state.devoluciones.provider_order
		},
		items() {
			return this.$store.state.devoluciones.items
		},
		/**
		 * Proveedor de la nota de crédito a proveedor. Con compra cargada es SIEMPRE el de la
		 * compra (`provider_order.provider_id`): la API exige que coincidan, y así se guarda bien
		 * aunque el proveedor esté borrado y su objeto no venga.
		 *
		 * @returns {Number|null}
		 */
		provider_id_de_la_nota() {
			if (this.provider_order && this.provider_order.provider_id) {
				return this.provider_order.provider_id
			}
			return this.provider ? this.provider.id : null
		},
		descriptions() {
			return this.$store.state.devoluciones.descriptions
		},
		client() {
			return this.$store.state.devoluciones.client
		},
		total_devolucion() {
			return this.$store.state.devoluciones.total_devolucion
		},
		update_unidades_devueltas() {
			return this.$store.state.devoluciones.update_unidades_devueltas
		},
		regresar_stock() {
			return this.$store.state.devoluciones.regresar_stock
		},
		generar_current_acount() {
			return this.$store.state.devoluciones.generar_current_acount
		},
		addresses() {
			return this.$store.state.address.models
		},
		address_id() {
			return this.$store.state.devoluciones.address_id
		},
		facturar_nota_credito() {
			return this.$store.state.devoluciones.facturar_nota_credito
		},
		discounts_id() {
			return this.$store.state.devoluciones.discounts_id
		},
		surchages_id() {
			return this.$store.state.devoluciones.surchages_id
		},
	},
	methods: {
		/**
		 * Valida y manda POST devoluciones con el cuerpo del modo actual. Al terminar bien, avisa
		 * y deja el módulo en blanco (en el mismo modo).
		 */
		guardar() {
			this.enviar(false)
		},

		/**
		 * Cuerpo de guardar(). `confirmando_la_duplicada` es true solo en el reenvío que sigue a
		 * "Crear otra de todos modos": le dice a la API que salte el aviso y no vuelve a preguntar por
		 * facturar (el usuario ya eligió). Es un parámetro y no un dato del componente: así no puede
		 * quedar encendido si el reenvío se corta antes de salir (por ejemplo, al cancelar el
		 * confirm) y saltarse el aviso del próximo guardado sin que nadie lo haya elegido.
		 *
		 * @param {Boolean} confirmando_la_duplicada
		 */
		enviar(confirmando_la_duplicada) {
			if (this.guardando) {
				return
			}

			let ok = this.es_compra ? this.check_compra() : this.check_venta(confirmando_la_duplicada)
			if (!ok) {
				return
			}

			let self = this
			let datos = this.es_compra ? this.datos_compra() : this.datos_venta(confirmando_la_duplicada)

			this.guardando = true
			this.$store.commit('auth/setMessage', 'Guardando')
			this.$store.commit('auth/setLoading', true)

			// `skip_global_error_event`: el error lo muestra este componente (ver mensaje_de_error()),
			// así sale UN solo aviso con el motivo real y no el del interceptor más uno propio.
			this.$api.post('devoluciones', datos, { skip_global_error_event: true })
			.then(() => {

				self.guardando = false
				self.$store.commit('auth/setLoading', false)

				self.$toast.success(self.es_compra ? 'Nota de crédito al proveedor creada' : 'Devolución creada')

				self.limpiar_devolucion()
			})
			.catch(err => {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)

				// 409: la venta ya tiene una nota con esas unidades. No es un error: se le ofrece al
				// usuario facturar la existente, crear otra igual o cancelar.
				let data = err && err.response ? err.response.data : null
				if (err && err.response && err.response.status == 409 && data && data.nota_existente && data.notas && data.notas.length) {
					self.notas_existentes = data.notas
					self.$bvModal.show('devolucion-notas-existentes')
					return
				}

				let mensaje = self.mensaje_de_error(err)
				if (mensaje) {
					self.$toast.error(mensaje, { duration: 10000 })
				}
			})
		},

		/**
		 * "Crear otra de todos modos" del aviso de nota existente: reenvía la devolución diciéndole a
		 * la API que salte el aviso. El tope de stock de la API sigue valiendo.
		 */
		guardar_confirmando_la_duplicada() {
			this.enviar(true)
		},

		/**
		 * Texto a mostrar ante un error del POST.
		 *
		 * 🔴 Un 422 con `message` se muestra SIEMPRE, traiga o no `devolucion_excedida`: en compra
		 * la API también responde 422 con su motivo cuando falta el proveedor, la compra no existe
		 * o es de otro proveedor, o falta el depósito de un artículo que reparte por depósitos. Es
		 * lo único que le dice al usuario qué corregir.
		 *
		 * Un 422 de validación de Laravel (`errors` por campo) ya lo muestra el interceptor global
		 * con la lista de campos (esa parte no la apaga `skip_global_error_event`): ahí no se
		 * agrega nada.
		 *
		 * @param {Object} err Error de axios.
		 * @returns {String|null} Mensaje, o null si no hay que mostrar nada más.
		 */
		mensaje_de_error(err) {
			let data = err && err.response ? err.response.data : null

			if (
				data
				&& typeof data == 'object'
				&& data.errors
				&& typeof data.errors == 'object'
			) {
				return null
			}

			if (data && data.message) {
				return data.message
			}

			return 'Ocurrió un error al guardar la '+(this.es_compra ? 'nota de crédito' : 'devolución')+'. Volvé a intentar.'
		},

		/**
		 * Cuerpo del POST de una devolución de VENTA. Los campos son los de siempre; `tipo` se
		 * manda explícito aunque la API lo tome por defecto.
		 *
		 * @returns {Object}
		 */
		datos_venta(confirmando_la_duplicada) {
			return {
				tipo: 'venta',
				sale_id: this.sale ? this.sale.id : null,
				total_devolucion: this.total_devolucion,
				items: this.items,
				client_id: this.client ? this.client.id : null,
				update_unidades_devueltas: this.update_unidades_devueltas,
				regresar_stock: this.regresar_stock,
				generar_current_acount: this.generar_current_acount,
				address_id: this.address_id,
				facturar_nota_credito: this.facturar_nota_credito,
				descriptions: this.descriptions,
				discounts: this.get_models_by_id('discount', this.discounts_id),
				surchages: this.get_models_by_id('surchage', this.surchages_id),
				// Pide el aviso si la venta ya tiene una nota con esas unidades; con `confirmar_duplicada`
				// el usuario ya eligió "Crear otra de todos modos". Campos opcionales: una API que no los
				// conoce los ignora.
				verificar_notas_existentes: true,
				confirmar_duplicada: !!confirmando_la_duplicada,
			}
		},

		/**
		 * Cuerpo del POST de una nota de crédito a PROVEEDOR (contrato del plan §4.1).
		 * `regresar_stock` en compra significa SACAR del stock, y `address_id` es el depósito del
		 * que sale. Sin descuentos/recargos ni facturación.
		 *
		 * @returns {Object}
		 */
		datos_compra() {
			return {
				tipo: 'compra',
				provider_id: this.provider_id_de_la_nota,
				provider_order_id: this.provider_order ? this.provider_order.id : null,
				total_devolucion: this.total_devolucion,
				items: this.items,
				regresar_stock: this.regresar_stock,
				generar_current_acount: this.generar_current_acount,
				address_id: this.address_id,
				descriptions: this.descriptions,
				discounts: [],
				surchages: [],
			}
		},

		/**
		 * Validaciones de una devolución de venta: las tres de siempre (depósito, total en cero,
		 * tope sobre la factura) y el confirm si la venta está facturada y no se factura la nota.
		 *
		 * @param {Boolean} sin_preguntar true en el reenvío de "Crear otra de todos modos": no se vuelve
		 *   a mostrar el confirm de la venta facturada (el usuario ya decidió con el aviso).
		 * @returns {Boolean} true si se puede guardar.
		 */
		check_venta(sin_preguntar) {
			let ok = true
			if (
				this.regresar_stock
				&& this.addresses.length
				&& !this.address_id
			) {
				this.$toast.error('Indique el deposito destino')
				ok = false
			}

			if (this.total_devolucion == 0) {
				this.$toast.error('Indique unidades devueltas')
				ok = false
			}

			if (
				this.sale
				&& this.facturar_nota_credito
			) {
				let afip_ticket = this.sale.afip_tickets.find(m => m.id == this.facturar_nota_credito)
				// Tolerancia en pesos: el total de devolución puede exceder al de la factura hasta este monto (p. ej. redondeos).
				let max_total_devolucion_over_invoice = 2
				if (
					typeof afip_ticket != 'undefined'
					&& Number(this.total_devolucion) > Number(afip_ticket.importe_total) + max_total_devolucion_over_invoice
				) {
					this.$toast.error('El total de la devolucion ('+this.price(this.total_devolucion)+') no puede superar en más de '+this.price(max_total_devolucion_over_invoice)+' al total de la Factura N° '+afip_ticket.cbte_numero+' ('+ this.price(afip_ticket.importe_total) +')')
					ok = false
				}
			}

			// 🔴 Si alguna validación de arriba ya falló, se corta ACÁ. Antes el confirm de abajo
			// hacía `return confirm(...)` y, aceptándolo, guardaba igual una devolución sin
			// depósito o en cero que el propio check acababa de rechazar.
			if (!ok) {
				return false
			}

			if (
				this.sale
				&& this.sale.afip_tickets.length
				&& !this.facturar_nota_credito
				&& !sin_preguntar
			) {
				return confirm('La venta sobre la cual vas a generar esta nota de credito esta facturada, recomendamos facturar esta nota de credito sobre alguna factura de esta venta. ¿Queres continuar de todas formas y no facturar esta nota de credito?')
			}

			return ok
		},

		/**
		 * Validaciones de una nota de crédito a proveedor: proveedor elegido, total mayor a cero
		 * y depósito si se descuenta stock y el usuario trabaja con depósitos.
		 *
		 * @returns {Boolean} true si se puede guardar.
		 */
		check_compra() {
			let ok = true

			if (!this.provider_id_de_la_nota) {
				this.$toast.error('Elegí el proveedor')
				ok = false
			}

			if (!(Number(this.total_devolucion) > 0)) {
				this.$toast.error('Indicá las unidades que le devolvés al proveedor')
				ok = false
			}

			if (
				this.regresar_stock
				&& this.addresses.length
				&& !this.address_id
			) {
				this.$toast.error('Indicá el depósito del que sale la mercadería')
				ok = false
			}

			return ok
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-btn-guardar.btn
		height: 48px
		border-radius: 12px
		font-size: 1rem
		font-weight: 600
		letter-spacing: -0.01em
		box-shadow: none
</style>
