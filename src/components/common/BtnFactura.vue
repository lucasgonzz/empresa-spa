<template>
	<div
	:id="'btn-factura-'+afip_ticket.id"
	class="factura-card s-1"
	:class="afip_ticket.cae ? 'border-primary' : 'border-danger'">
		<div class="factura-card__header">
			<div class="factura-card__title">
				<i class="bi bi-receipt factura-card__icon"></i>
				<span>
					Factura
					<strong v-if="afip_ticket.cbte_numero">N° {{ afip_ticket.cbte_numero }}</strong>
					<span
					v-else
					class="text-muted">(sin numero)</span>
				</span>
			</div>

			<b-button
			v-if="afip_ticket.cae"
			variant="primary"
			size="sm"
			title="Imprimir factura"
			@click.stop="print">
				<i class="bi bi-printer"></i>
			</b-button>
			<b-badge
			variant="danger"
			v-else>
				SIN CAE
			</b-badge>
		</div>

		<b-popover
		:target="'btn-factura-'+afip_ticket.id"
		triggers="hover"
		placement="left">
		    <template #title><strong>{{ title_description }}</strong></template>
		    <p
		    v-for="description in descriptions">
		  		{{ description }}
		    </p>
		 </b-popover>

		<b-button-group
		size="sm"
		class="factura-card__actions"
		v-if="show_acciones(afip_ticket)">

			<b-button
			@click.stop="consultar(afip_ticket)"
			variant="success"
			title="Consultar comprobante ante ARCA"
			v-if="!afip_ticket.cae && afip_ticket.cbte_numero">
				<i class="bi bi-arrow-repeat"></i>
				Consultar
			</b-button>

			<!-- Observaciones -->
			<b-button
			@click.stop="showObservations(afip_ticket)"
			variant="warning"
			title="Ver observaciones"
			v-if="afip_ticket.afip_observations.length">
				<i class="bi bi-info-circle"></i>
				{{ afip_ticket.afip_observations.length }}
			</b-button>

			<!-- Errores -->
			<b-button
			@click.stop="showErrors(afip_ticket)"
			variant="danger"
			title="Ver errores"
			v-if="afip_ticket.afip_errors.length">
				<i class="bi bi-exclamation-triangle"></i>
				{{ afip_ticket.afip_errors.length }}
			</b-button>

			<!-- Eliminar -->
			<b-button
			@click.stop="delete_afip_ticket(afip_ticket)"
			variant="outline-danger"
			title="Eliminar factura"
			v-if="puede_eliminar(afip_ticket)">
				<i class="bi bi-trash"></i>
			</b-button>

		</b-button-group>

		<div
		v-for="nota_credito_afip in afip_ticket.nota_credito_afip"
		:key="'btn-nc-'+nota_credito_afip.id"
		:id="'btn-nc-'+nota_credito_afip.id"
		class="factura-card m-t-10"
		:class="nota_credito_afip.cae ? 'border-primary' : 'border-danger'">
			<div class="factura-card__header">
				<div class="factura-card__title">
					<i class="bi bi-receipt-cutoff factura-card__icon"></i>
					<span>
						Nota de credito
						<strong v-if="nota_credito_afip.cbte_numero">N° {{ nota_credito_afip.cbte_numero }}</strong>
						<span
						v-else
						class="text-muted">(sin numero)</span>
					</span>
				</div>

				<b-button
				v-if="nota_credito_afip.cae"
				variant="primary"
				size="sm"
				title="Imprimir nota de credito"
				@click.stop="print_nota_credito_afip_ticket(nota_credito_afip)">
					<i class="bi bi-printer"></i>
				</b-button>
				<b-badge
				variant="danger"
				v-else>
					SIN CAE
				</b-badge>
			</div>

			<b-button-group
			size="sm"
			class="factura-card__actions"
			v-if="show_acciones_nota_credito(nota_credito_afip)">

				<b-button
				@click.stop="consultar_nota_credito_afip_ticket(nota_credito_afip)"
				variant="success"
				title="Consultar comprobante ante ARCA"
				v-if="!nota_credito_afip.cae && nota_credito_afip.cbte_numero">
					<i class="bi bi-arrow-repeat"></i>
					Consultar
				</b-button>

				<!-- Errores -->
				<b-button
				@click.stop="showErrors(nota_credito_afip)"
				variant="danger"
				title="Ver errores"
				v-if="nota_credito_afip.afip_errors.length">
					<i class="bi bi-exclamation-triangle"></i>
					{{ nota_credito_afip.afip_errors.length }}
				</b-button>

				<!-- Eliminar ticket NC AFIP (misma regla que factura: sin CAE y consultado o sin número) -->
				<b-button
				@click.stop="delete_nota_credito_afip_ticket(nota_credito_afip)"
				variant="outline-danger"
				title="Eliminar nota de credito"
				v-if="puede_eliminar(nota_credito_afip)">
					<i class="bi bi-trash"></i>
				</b-button>

			</b-button-group>

			<b-popover
			:target="'btn-nc-'+nota_credito_afip.id"
			triggers="hover"
			placement="left">
			    <template #title><strong>{{ title_description_nota_credito(nota_credito_afip) }}</strong></template>
			    <p
			    v-for="description in descriptions_nota_credito(nota_credito_afip)">
			  		{{ description }}
			    </p>
			 </b-popover>
		</div>

	</div>
</template>
<script>
// Mixin de impresión Ticket 2.0 (conexión QZ Tray). Solo dispara la conexión
// cuando se invoca this.printTicket(sale) desde un método (ej. al click),
// nunca automáticamente al crear/montar el componente.
import print_ticket from '@/mixins/sale/print_ticket/index'

export default {
	mixins: [print_ticket],
	props: {
		afip_ticket: Object,
		print_url: String,
		// Venta completa (con articles/client/discounts) asociada a esta factura.
		// Opcional: si no viene (uso futuro sin la venta completa), se cae al
		// comportamiento de siempre (ticket común).
		sale: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Preferencia del dueño sobre qué PDF imprimir al presionar "Imprimir"
		 * en la tarjetita de la factura ARCA (ver users.sale_factura_print_option).
		 * `this.owner` está disponible globalmente vía el mixin `generals`.
		 *
		 * @returns {string|null}
		 */
		resolved_sale_factura_print_option() {
			return this.owner ? this.owner.sale_factura_print_option : null
		},
		title_description() {
			if (this.afip_ticket.cae) {
				return 'Factura de ARCA'
			} else {
				return 'Factura de ARCA con ERRORES'
			}

		},
		descriptions() {
			if (this.afip_ticket.cae) {
				return [
					'Factura de ARCA emitida correctamente',
					'Puede imprimirla',
				]
			} else {
				if (this.afip_ticket.cbte_numero) {

					return [
						'Esta Factura no tiene CAE.',
						'Puede haber ocurrido un error en los servidores de ARCA al intentar autorizar el comprobante, precione el boton verde "CONSULTAR" para chequear si el comprobante fue autorizado o no ante ARCA.',
						'En caso de haber sido autorizado, se actualizara la Factura en el sistema con el CAE correspondiente.',
						'Y en caso de que nunca se haya autorizado, se le informara para que elimine esta Factura y vuelva a emitir una nueva Factura.',
					]
				} else {
					return [
						'Esta Factura no tiene CAE ni numero de comprobante.',
						'Elimine esta Factura del sistema y vuelva a generar una nueva Factura.',
					]
				}
			}
		},
		modal_afip_errors_abierto() {
			return this.$store.state.afip_ticket.modal_afip_errors_abierto
		},
	},
	methods: {
		title_description_nota_credito(nota_credito_afip_ticket) {
			if (nota_credito_afip_ticket.cae) {
				return 'Nota de Credito Facturada ante ARCA'
				
			} else {
				return 'Nota de Credito CON ERRORES ante ARCA'
			}
		},
		descriptions_nota_credito(nota_credito_afip_ticket) {
			if (nota_credito_afip_ticket.cae) {
				return [
					'Nota de Credito autorizada correctamente ante ARCA'
				]
			} else {
				if (nota_credito_afip_ticket.cbte_numero) {

					return [
						'Esta Nota de Credito no tiene CAE.',
						'Puede haber ocurrido un error en los servidores de ARCA al intentar autorizar el comprobante, presione el boton verde "CONSULTAR" para chequear si el comprobante fue autorizado o no ante ARCA.',
						'En caso de haber sido autorizado, se actualizara la Nota de Credito en el sistema con el CAE correspondiente.',
						'Y en caso de que nunca se haya autorizado, se le informara para que elimine esta Nota de Credito y vuelva a emitir una nueva Nota de Credito facturada (por ejemplo desde DEVOLUCIONES con la opcion de facturar).',
					]
				} else {

					return [
						'Esta nota de credito no pudo autorizarce ante ARCA.',
						'Eliminela y vuelva a generar una nota de credito facturada desde el modulo de DEVOLUCIONES y seleccione la opcion para facturarla.',
					]
				}
			}
		},
		print() {

			if (this.afip_ticket.cae) {
				this.print_afip_ticket()
			}
		},
		puede_eliminar(afip_ticket) {
			if (
				!afip_ticket.cae
				&& (
					afip_ticket.consultado
					|| !afip_ticket.cbte_numero
				)
			) {
				return true
			}

			if (
				!afip_ticket.cae
				&& !afip_ticket.cbte_numero
			) {
				return true
			}
			return false
		},
		/**
		 * Indica si la fila de acciones secundarias de la factura tiene al menos un botón para
		 * mostrar (evita renderizar el b-button-group vacío, que se ve como una caja sin nada).
		 *
		 * @param {Object} afip_ticket
		 * @returns {boolean}
		 */
		show_acciones(afip_ticket) {
			return (!afip_ticket.cae && !!afip_ticket.cbte_numero)
				|| !!afip_ticket.afip_observations.length
				|| !!afip_ticket.afip_errors.length
				|| this.puede_eliminar(afip_ticket)
		},
		/**
		 * Misma idea que show_acciones, para la fila de acciones de la nota de crédito.
		 *
		 * @param {Object} nota_credito_afip
		 * @returns {boolean}
		 */
		show_acciones_nota_credito(nota_credito_afip) {
			return (!nota_credito_afip.cae && !!nota_credito_afip.cbte_numero)
				|| !!nota_credito_afip.afip_errors.length
				|| this.puede_eliminar(nota_credito_afip)
		},
		showObservations(afip_ticket) {
			this.$store.commit('afip_ticket/set_model', afip_ticket)
			this.$bvModal.show('afip-ticket-observations')
			console.log('MOSTRANDO')
		},
		showErrors(afip_ticket) {
			this.$store.commit('afip_ticket/set_model', afip_ticket)
			this.$bvModal.show('afip-ticket-errors')
		},
		delete_afip_ticket(afip_ticket) {
			let text = '¿Seguro que quiere eliminar esta factura?'

			if (afip_ticket.cbte_numero) {
				text += ' Recomendamos antes CONSULTAR a ARCA sobre este comprobante'
			}

			if (confirm(text)) {

				this.$store.commit('auth/setLoading', true)
				this.$api.delete('/afip-ticket/'+afip_ticket.id)
				.then(res => {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('sale/add', res.data.sale)
					this.$toast.success('Factura eliminada')
				})
				.catch(err => {
					this.$store.commit('auth/setLoading', false)
					this.$toast.error('Error al eliminar factura')
					console.log(err)
				})
			}
		},
		print_nota_credito_afip_ticket(nota_credito_afip_ticket) {
			let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+nota_credito_afip_ticket.nota_credito_id
			window.open(link)
		},
		/**
		 * Resuelve qué imprimir al presionar "Imprimir" en la factura ARCA,
		 * según la preferencia del dueño (sale_factura_print_option):
		 * - 'ticket_2': Ticket 2.0 vía QZ Tray (this.printTicket, del mixin print_ticket).
		 * - 'factura_a4:{id}': PDF A4 del perfil fiscal indicado.
		 * - default/sin preferencia/perfil inexistente: ticket común (comportamiento de siempre).
		 *
		 * @returns {void}
		 */
		print_afip_ticket() {
			// Preferencia configurada por el dueño (o null si no hay ninguna).
			const option = this.resolved_sale_factura_print_option

			// Ticket 2.0: reutiliza el mixin print_ticket ya usado en sale-print-buttons/Index.vue.
			// Requiere la venta completa (this.sale) para armar el contenido del ticket.
			if (option === 'ticket_2' && this.sale) {
				this.printTicket(this.sale)
				return
			}

			// Perfil de PDF A4 fiscal: se arma el link con el id del perfil elegido.
			if (option && this.sale && option.indexOf('factura_a4:') === 0) {
				const profile_id = parseInt(option.replace('factura_a4:', ''), 10)

				if (profile_id) {
					let link = process.env.VUE_APP_API_URL + '/sale/pdf/' + this.sale.id
						+ '?pdf_column_profile_id=' + profile_id
						+ '&afip_ticket_id=' + this.afip_ticket.id
					window.open(link)
					return
				}
			}

			// Default / fallback: ticket común (comportamiento de siempre, incluye el
			// caso "sale" no vino, o el perfil A4 configurado ya no existe/no aplica).
			let link = process.env.VUE_APP_API_URL+this.print_url
			window.open(link)

		},
		/**
		 * Consulta en ARCA el estado de una nota de credito AFIP (mismo endpoint que factura).
		 * Actualiza la venta en store cuando la API devuelve `sale` y refresca listados segun la ruta actual.
		 *
		 * @param {Object} nota_credito_afip_ticket Registro `AfipTicket` hijo (NC) con `id` propio.
		 * @returns {void}
		 */
		consultar_nota_credito_afip_ticket(nota_credito_afip_ticket) {
			this.$store.commit('auth/setMessage', 'Consultando comprobante (nota de credito)')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('/afip-ticket/consultar-comprobante/'+nota_credito_afip_ticket.id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let afip_ticket_consultado = res.data.afip_ticket
				if (afip_ticket_consultado.cae) {

					this.$toast.success('Comprobante existente en ARCA, cae actualizado correctamente', {
						duration: 10000,
					})
				} else {

					this.$toast.error('Comprobante inexistente en ARCA, elimine esta nota de credito en el sistema y vuelva a generar una nueva nota de credito facturada', {
						duration: 10000,
					})
				}
				if (
					this.modal_afip_errors_abierto
					|| this.route_name == 'alertas'
				) {
					this.$store.dispatch('afip_ticket/get_problemas_al_facturar')

				} else if (this.route_name == 'comprobantes') {

					this.$store.dispatch('nota_credito/getModels')

				}

				if (res.data.sale) {
					this.$store.commit('sale/add', res.data.sale)
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
			})
		},
		/**
		 * Elimina el ticket AFIP de una nota de credito y refresca la venta asociada en el store.
		 *
		 * @param {Object} nota_credito_afip_ticket Registro `AfipTicket` NC a eliminar.
		 * @returns {void}
		 */
		delete_nota_credito_afip_ticket(nota_credito_afip_ticket) {
			let text = '¿Seguro que quiere eliminar esta nota de credito AFIP?'

			if (nota_credito_afip_ticket.cbte_numero) {
				text += ' Recomendamos antes CONSULTAR a ARCA sobre este comprobante'
			}

			if (confirm(text)) {

				this.$store.commit('auth/setMessage', 'Eliminando nota de credito AFIP')
				this.$store.commit('auth/setLoading', true)
				this.$api.delete('/afip-ticket/'+nota_credito_afip_ticket.id)
				.then(res => {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$store.commit('sale/add', res.data.sale)
					this.$toast.success('Nota de credito AFIP eliminada')
				})
				.catch(err => {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$toast.error('Error al eliminar nota de credito AFIP')
					console.log(err)
				})
			}
		},
		consultar(afip_ticket) {
			this.$store.commit('auth/setMessage', 'Consultando comprobante')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('/afip-ticket/consultar-comprobante/'+afip_ticket.id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				// this.$store.commit('sale/add', res.data.sale)

				
				let afip_ticket_consultado = res.data.afip_ticket
				if (afip_ticket_consultado.cae) {

					this.$toast.success('Comprobante existente en ARCA, cae actualizado correctamente', {
						duration: 10000,
					})
				} else {

					this.$toast.error('Comprobante inexistente en ARCA, elimine esta factura en el sistema y vuelve a generar una nueva factura', {
						duration: 10000,
					})
				}
				if (
					this.modal_afip_errors_abierto
					|| this.route_name == 'alertas'
				) {
					this.$store.dispatch('afip_ticket/get_problemas_al_facturar')

				} else if (this.route_name == 'comprobantes') {

					this.$store.dispatch('nota_credito/getModels')

				} else if (this.route_name == 'sale') {

					this.$store.commit('sale/add', res.data.sale)

				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
			})
		}
	}
}
</script>
<style lang="sass">
// Tarjeta de factura/nota de credito ARCA: identidad (icono + numero) e imprimir arriba,
// acciones secundarias abajo agrupadas. El acento de color viene de las utilidades bootstrap
// border-primary/border-danger (aplicadas via :class en el template), asi que siempre queda
// igual al resto de los botones "primary"/"danger" del sistema aunque cambie el tema.
.factura-card
	padding: 10px 12px
	background: rgba(0,0,0,.15)
	border-radius: 5px
	border-left-width: 4px
	border-left-style: solid

	&__header
		display: flex
		align-items: center
		justify-content: space-between
		gap: 10px

	&__title
		display: flex
		align-items: center
		gap: 8px
		font-size: 14px
		font-weight: bold
		min-width: 0

	&__icon
		font-size: 16px
		flex-shrink: 0

	&__actions
		margin-top: 8px

</style>