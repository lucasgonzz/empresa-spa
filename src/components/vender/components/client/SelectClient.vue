<template>
	<div>
		<div
		v-if="index_previus_sales == 0 && !budget">
			<search-component
			class="m-b-15"
			id="select_client_vender"
			@setSelected="setSelected"
			:prop="{text: 'Cliente', key: 'client_id'}"
			:model="_vender.client"
			model_name="client"
			:props_to_filter="['num', 'name', 'phone']"
			show_btn_create
			:props_extras="props_extras"
			set_selected_model_with_model_prop
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
		setSelected(result) {
			this.setPriceType()

			// this.bloquear_metodo_de_pago()
			this.bloquear_caja()
			
			let client = result.model 
			this.$store.commit('vender/setClient', client)

			this.set_afip_tipo_comprobante()
		},
		clearSelected() {
			this.$store.commit('vender/setClient', null)
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
</style>