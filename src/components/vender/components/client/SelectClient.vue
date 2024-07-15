<template>
	<div>
		<div
		v-if="index_previus_sales == 0 && !budget">
			<search-component
			class="m-b-15"
			@setSelected="setSelected"
			:prop="{text: 'Cliente', key: 'client_id'}"
			:model="_vender.client"
			model_name="client"
			show_btn_create
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
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
export default {
	mixins: [vender, vender_set_total],
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
			console.log('watch client')
		},
	},
	methods: {
		setSelected(result) {
			let client = result.model 
			this.$store.commit('vender/setClient', client)
			this.setPriceType()
		},
		clearSelected() {
			this.$store.commit('vender/setClient', null)
			this.setPriceType()
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