<template>
	<div class="btn-facturar-nota-credito">

		<b-button
		variant="success"
		size="sm"
		class="m-l-5"
		:disabled="facturando"
		:title="'Emitir esta nota de crédito ante ARCA sobre la factura de su venta'"
		@click.stop="abrir">
			<i class="bi bi-receipt-cutoff"></i>
			{{ reintento ? 'Reintentar con ARCA' : 'Facturar con ARCA' }}
		</b-button>

		<b-modal
		:id="id_modal"
		title="Facturar nota de crédito"
		ok-title="Facturar con ARCA"
		cancel-title="Cancelar"
		ok-variant="success"
		centered
		@ok="facturar">

			<p>
				Se va a emitir ante ARCA la nota de crédito por
				<strong>{{ price(nota_credito.haber) }}</strong>
				sobre la factura de la venta N° {{ nota_credito.sale.num }}.
			</p>

			<p
			v-if="facturas.length == 1"
			class="m-b-0">
				Factura N° <strong>{{ facturas[0].cbte_numero }}</strong>
				({{ price(facturas[0].importe_total) }}).
			</p>

			<b-form-group
			v-else
			label="Factura sobre la que se emite"
			class="m-b-0">
				<b-form-select
				v-model="afip_ticket_id"
				:options="opciones_de_facturas"></b-form-select>
			</b-form-group>

		</b-modal>
	</div>
</template>
<script>
/**
 * Facturar ante ARCA una nota de crédito que se guardó SIN facturar (Comprobantes › Notas de crédito).
 *
 * Existe por CF (7/10/2026): la devolución de una venta facturada se guardó sin pasar por ARCA y no
 * había forma de facturarla después. Llama a `POST nota-credito/{id}/facturar`; la API valida todo
 * (que no esté facturada, que la factura sea de la venta, que el total cierre) y emite.
 *
 * Solo se muestra si la nota tiene venta con alguna factura autorizada y todavía no tiene un
 * comprobante con CAE ni con número (uno con número ya llegó a ARCA: se consulta, no se vuelve a emitir).
 */
export default {
	props: {
		// Movimiento de cuenta corriente de la nota de crédito, tal como lo trae el listado.
		nota_credito: Object,
		// Facturas autorizadas de la venta sobre las que se puede emitir.
		facturas: Array,
	},
	data() {
		return {
			// Evita el doble clic mientras ARCA responde.
			facturando: false,
			// Factura elegida cuando la venta tiene más de una.
			afip_ticket_id: null,
		}
	},
	computed: {
		id_modal() {
			return 'facturar-nota-credito-' + this.nota_credito.id
		},
		// El comprobante de la nota existe pero no llegó a ARCA: el botón pasa a "Reintentar".
		reintento() {
			return !!this.nota_credito.afip_ticket
		},
		opciones_de_facturas() {
			let opciones = []

			this.facturas.forEach(factura => {
				opciones.push({
					value: factura.id,
					text: 'Factura N° ' + factura.cbte_numero + ' (' + this.price(factura.importe_total) + ')',
				})
			})

			return opciones
		},
	},
	methods: {
		/**
		 * Abre la confirmación. Con más de una factura arranca sin elegir, para que el usuario
		 * tenga que decidir sobre cuál se emite; con una sola, esa es la factura.
		 */
		abrir() {
			this.afip_ticket_id = this.facturas.length == 1 ? this.facturas[0].id : null
			this.$bvModal.show(this.id_modal)
		},

		/**
		 * Manda la emisión. Si la API responde 200 con `facturada: false`, ARCA no autorizó la nota:
		 * se avisa y el comprobante queda con sus errores a la vista (botón rojo del renglón).
		 *
		 * @param {Object} evento Evento `ok` del modal (se frena si falta elegir factura).
		 */
		facturar(evento) {
			if (!this.afip_ticket_id) {
				evento.preventDefault()
				this.$toast.error('Elegí la factura sobre la que se emite la nota de crédito')
				return
			}

			if (this.facturando) {
				return
			}

			let self = this
			this.facturando = true
			this.$store.commit('auth/setMessage', 'Facturando la nota de crédito ante ARCA')
			this.$store.commit('auth/setLoading', true)

			// `skip_global_error_event`: el motivo lo muestra este componente, así sale un solo aviso.
			this.$api.post('nota-credito/' + this.nota_credito.id + '/facturar', {
				afip_ticket_id: this.afip_ticket_id,
			}, { skip_global_error_event: true })
			.then(res => {
				self.facturando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				self.$store.commit('nota_credito/add', res.data.model)

				if (res.data.facturada) {
					self.$toast.success(res.data.message)
				} else {
					self.$toast.error(res.data.message, { duration: 10000 })
				}
			})
			.catch(err => {
				self.facturando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				let data = err && err.response ? err.response.data : null
				let mensaje = data && data.message ? data.message : 'No se pudo facturar la nota de crédito. Volvé a intentar.'
				self.$toast.error(mensaje, { duration: 10000 })
			})
		},
	},
}
</script>
