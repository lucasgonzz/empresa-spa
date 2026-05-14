<template>
	<div>
		<modal-result
		:title="afip_modal_title"
		:afip_data="afip_data"
		:client_model="client_model_for_afip_modal"></modal-result>

		<div
		v-if="index_previus_sales == 0 && !budget">
			<search-component
			class="m-b-15"
			id="select_client_vender"
			@setSelected="setSelected"
			:prop="{text: 'Cliente', key: 'client_id'}"
			:model="_vender.client"
			model_name="client"
			:props_to_filter="['num', 'name', 'phone', 'dni']"
			show_btn_create
			search_from_api
			:tax_id_afip_lookup_on_second_enter="true"
			placeholder="Buscar cliente, CUIT o DNI"
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
		ModalResult: () => import('@/components/vender/components/client/buscar-por-cuit/ModalResult'),
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
		}
	},
	watch: {
		client() {
			if (this.index_previus_sales > 0) {
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
		 * Segundo Enter en el buscador sin resultados: consulta AFIP por CUIT o DNI y abre el modal de alta/uso de cliente.
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
			
			let client = result.model 
			this.$store.commit('vender/setClient', client)

			this.setPriceType()
			
			this.set_afip_tipo_comprobante()
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