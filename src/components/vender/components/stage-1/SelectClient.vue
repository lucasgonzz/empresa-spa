<template>
	<div>
		<modal-result
		:title="afip_modal_title"
		:afip_data="afip_data"
		:client_model="client_model_for_afip_modal"></modal-result>

		<!-- Buscador de cliente con ícono distintivo en etapa 1 de vender -->
		<div
		v-if="puede_cambiar_cliente"
		class="vender-stage__client-search">
			<search-component
			id="select_client_vender"
			@setSelected="setSelected"
			:prop="{text: 'Cliente', key: 'client_id'}"
			:model="_vender.client"
			model_name="client"
			:props_to_filter="['num', 'name', 'phone', 'dni', 'cuit']"
			show_btn_create
			search_from_api
			:tax_id_afip_lookup_on_second_enter="true"
			placeholder="Buscar cliente, CUIT o DNI"
			input_icon="icon-user-o"
			:props_extras="props_extras"
			set_selected_model_with_model_prop
			@requestClientAfipLookup="onRequestClientAfipLookup"
			@clearSelected="clearSelected"></search-component>
		</div>
		<div
		v-else-if="client">
			<p
			class="selected-client">
				<i class="icon-user"></i>
				Cliente seleccionado: {{ client.name }}
			</p>
		</div>
		<div
		v-if="hasExtencion('enviar_mail_a_clientes') && client && client.email"
		class="send-mail-check j-end m-b-15">
			<b-form-checkbox
			:value="1"
			:unchecked-value="0"
			v-model="send_mail">
				Enviar correo al cliente
			</b-form-checkbox>
		</div>
	</div>
</template>
<script>
// import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import price_types from '@/mixins/vender/price_types'
import computed from '@/mixins/vender/computed'
import default_payment_method from '@/mixins/vender/default_payment_method'
import set_afip_tipo_comprobante from '@/mixins/vender/set_afip_tipo_comprobante'
export default {
	mixins: [price_types, vender_set_total, computed, default_payment_method, set_afip_tipo_comprobante],
	// mixins: [vender, vender_set_total],
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		/* Modal de resultado AFIP — ubicado en la subcarpeta de esta etapa */
		ModalResult: () => import('./buscar-por-cuit/ModalResult'),
	},
	data() {
		return {
			afip_modal_title: '',
			afip_data: null,
			client_model_for_afip_modal: null,
		}
	},
	computed: {
		price_types() {
			return this.$store.state.price_type.models
		},
		_vender: {
			get() {
				return this.$store.state.vender
			},
			set(value) {

			}
		},
		send_mail: {
			get() {
				return this.$store.state.vender.send_mail
			},
			set(value) {
				this.$store.commit('vender/set_send_mail', value)
			}
		},
		props_extras() {
			if (this.hasExtencion('filtrar_clientes_por_sucursal_en_vender')) {
				return [
					{
						key: 'address_id',
						value: this.address_id
					}
				]
			}
			return []
		},
		// Determina si se puede elegir/cambiar el cliente en VENDER.
		// - Venta nueva: siempre.
		// - Venta existente en edición: solo si está omitida en cuenta corriente.
		// - Presupuesto en edición: solo si no está confirmado (estado 2).
		//   (De todos modos el botón "Actualizar en VENDER" ya viene deshabilitado para confirmados.)
		puede_cambiar_cliente() {
			if (this.budget) {
				return this.budget.budget_status_id != 2
			}
			if (this.index_previus_sales == 0) {
				return true
			}
			return !!(this.previus_sale && this.previus_sale.omitir_en_cuenta_corriente)
		},
	},
	watch: {
		client() {
			// En edición (venta previa o presupuesto existente) se conservan los precios
			// ya guardados: se recalcula desde el pivot, igual que las ventas en edición.
			if (this.index_previus_sales > 0 || this.budget) {
				this.setItemsPrices(false, true)
			} else {
				this.setItemsPrices(false, false)
			}
			this.setTotal()
			// this.$store.commit('vender/setTotal')
		},
	},
	methods: {
		/**
		 * Segundo Enter en el buscador sin resultados: consulta AFIP por CUIT o DNI y abre el modal.
		 *
		 * @param {{ query: string, normalized_digits: string }} payload Criterio original y solo dígitos para la URL.
		 */
		onRequestClientAfipLookup(payload) {
			let self = this
			let digits = payload.normalized_digits
			this.$store.commit('auth/setMessage', 'Consultando a AFIP')
			this.$store.commit('auth/setLoading', true)
			this.$api.get('client/get-afip-information-by-cuit/' + encodeURIComponent(digits))
				.then(function (res) {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					let data = res.data
					if (data.hubo_un_error) {
						self.$toast.error('Afip dice: ' + data.error, {
							duration: 7000,
						})
						self.afip_data = null
						self.client_model_for_afip_modal = null
						return
					}
					self.afip_data = data.afip_data
					let existing = data.model || data.client_model
					if (existing) {
						self.afip_modal_title = 'Cliente ya existente en el sistema'
						self.client_model_for_afip_modal = existing
					} else {
						self.afip_modal_title = 'Resultados (cliente no registrado en sistema)'
						self.client_model_for_afip_modal = null
					}
					self.$bvModal.hide('select_client_vender-search-modal')
					self.$bvModal.show('afip-data-modal')
				})
				.catch(function (err) {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					console.log(err)
					self.$toast.error('Error al buscar')
				})
		},
		setSelected(result) {

			// this.bloquear_metodo_de_pago()
			this.bloquear_caja()

			// Cliente elegido en el buscador
			let client = result.model

			// En edición (presupuesto o venta existente) se conserva la lista de precios que
			// ya tiene el comprobante: NO se llama a setPriceType(). Si el negocio usa listas y
			// el cliente elegido trae otra distinta, se avisa que se mantiene la original.
			if (this.en_edicion_vender()) {
				this.avisar_si_cambia_lista_de_precios(client)
				this.$store.commit('vender/setClient', client)
			} else {
				this.$store.commit('vender/setClient', client)
				this.setPriceType()
			}

			this.set_afip_tipo_comprobante()
		},
		// Devuelve true si se está editando un comprobante ya guardado (presupuesto o venta previa),
		// false si es una venta nueva en curso.
		en_edicion_vender() {
			return !!this.budget || this.index_previus_sales > 0
		},
		// Si el negocio usa listas de precios y el cliente elegido tiene asignada una lista distinta
		// a la que ya tiene el comprobante, avisa que se mantiene la lista original (los precios no cambian).
		avisar_si_cambia_lista_de_precios(client) {
			if (!this.owner || !this.owner.listas_de_precio) {
				return
			}
			// Lista de precios del cliente elegido (si tiene)
			let lista_cliente = client ? client.price_type : null
			if (!lista_cliente) {
				return
			}
			// Lista de precios que ya tiene el comprobante actual
			let lista_actual = this.$store.state.vender.price_type
			// Compara si la lista del cliente elegido difiere de la que ya tiene el comprobante
			let cambia = !lista_actual || lista_actual.id != lista_cliente.id
			if (cambia) {
				let nombre_actual = lista_actual ? lista_actual.name : 'la que ya tenía'
				this.$toast.info(
					'El cliente seleccionado tiene la lista de precios "' + lista_cliente.name + '", pero se mantiene la lista "' + nombre_actual + '" del comprobante. Los precios no cambian.',
					{ duration: 8000 }
				)
			}
		},
		clearSelected() {
			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/set_send_mail', 0)
			this.setPriceType()
			this.habilitar_metodo_de_pago()
			this.set_afip_tipo_comprobante()
		},
	}
}
</script>
<style lang="sass">
.cont-client
	display: flex
	flex-direction: row
	justify-content: space-between
	align-items: flex-start
	margin-bottom: 15px
	& > div
		margin-bottom: 0 !important
		width: 80%

.selected-client
	font-size: 20px
	font-weight: bold

.send-mail-check
	margin-top: 8px
</style>
