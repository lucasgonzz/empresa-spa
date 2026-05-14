<template>
	<div
	:id="'btn-factura-'+afip_ticket.id"
	class="btn-factura s-1">
		<p class="title-factura">
			Factura 
			<span
			v-if="afip_ticket.cbte_numero">
				N° {{ afip_ticket.cbte_numero }}
			</span>
			<span
			v-else>
				(sin numero)
			</span>
		</p>

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


		<div
		class="j-start align-center">
			
			<b-button
			v-if="afip_ticket.cae"
			variant="primary"
			class="m-r-10"
			@click.stop="print"
			size="sm">
				<i class="icon-print"></i>
			</b-button>
			<b-badge
			variant="danger"
			class="m-r-10"
			v-else>
				SIN CAE
			</b-badge>

			<b-button
			@click.stop="consultar(afip_ticket)"
			size="sm"
			variant="success"
			v-if="!afip_ticket.cae && afip_ticket.cbte_numero">
				Consultar
			</b-button>

			<!-- Observaciones -->
			<b-button
			size="sm"
			@click.stop="showObservations(afip_ticket)"
			variant="warning"
			v-if="afip_ticket.afip_observations.length">
				<i class="icon-eye"></i>
				{{ afip_ticket.afip_observations.length }}
			</b-button>


			<!-- Errores -->
			<b-button
			size="sm"
			@click.stop="showErrors(afip_ticket)"
			variant="danger"
			v-if="afip_ticket.afip_errors.length">
				<i class="icon-eye"></i>
				{{ afip_ticket.afip_errors.length }}
			</b-button>



			<!-- Eliminar -->
			<b-button
			size="sm"
			@click.stop="delete_afip_ticket(afip_ticket)"
			variant="outline-danger"
			v-if="puede_eliminar(afip_ticket)">
				<i class="icon-trash"></i>
			</b-button>



		</div>

			
		<div 
		v-for="nota_credito_afip in afip_ticket.nota_credito_afip"
		:key="'btn-nc-'+nota_credito_afip.id"
		:id="'btn-nc-'+nota_credito_afip.id" 
		class="btn-factura m-t-10">
			<p class="title-factura">
				Nota de credito
				<span
				v-if="nota_credito_afip.cbte_numero">
					N° {{ nota_credito_afip.cbte_numero }}
				</span>
				<span
				v-else>
					(sin numero)
				</span>
			</p>

			<b-button
			v-if="nota_credito_afip.cae"
			variant="primary"
			class="m-r-10"
			size="sm"
			@click.stop="print_nota_credito_afip_ticket(nota_credito_afip)">
				<i class="icon-print"></i>
			</b-button>
			<b-badge
			class="m-r-10"
			variant="danger"
			v-else>
				SIN CAE
			</b-badge>

			<div
			class="j-start align-center">

				<b-button
				@click.stop="consultar_nota_credito_afip_ticket(nota_credito_afip)"
				size="sm"
				variant="success"
				class="m-r-10"
				v-if="!nota_credito_afip.cae && nota_credito_afip.cbte_numero">
					Consultar
				</b-button>

				<!-- Errores -->
				<b-button
				size="sm"
				@click.stop="showErrors(nota_credito_afip)"
				variant="danger"
				class="m-r-10"
				v-if="nota_credito_afip.afip_errors.length">
					<i class="icon-eye"></i>
					{{ nota_credito_afip.afip_errors.length }}
				</b-button>

				<!-- Eliminar ticket NC AFIP (misma regla que factura: sin CAE y consultado o sin número) -->
				<b-button
				size="sm"
				@click.stop="delete_nota_credito_afip_ticket(nota_credito_afip)"
				variant="outline-danger"
				v-if="puede_eliminar(nota_credito_afip)">
					<i class="icon-trash"></i>
				</b-button>

			</div>

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
export default {
	props: {
		afip_ticket: Object,
		print_url: String,
	},
	computed: {
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
		print_afip_ticket() {
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
.btn-factura
	padding: 10px
	background: rgba(0,0,0,.2)
	border-radius: 5px

	p 
		margin: 0

	.title-factura
		font-size: 14px
		font-weight: bold

</style>