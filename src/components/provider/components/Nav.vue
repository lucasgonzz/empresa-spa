<template>
	<b-row>
		<b-col>
			<horizontal-nav
			:items="items"
			set_view
			:show_display="false"
			@setSelected="setSelected"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
export default {
	components: {
		HorizontalNav,
	},
	computed: {
		items() {
			let items = []
			if (this.can('provider.index') || this.can('provider.create')) {
				items.push({name: 'proveedores', action: 'provider/getModels'})
			}
			if (this.can('provider_order.index') || this.can('provider_order.create')) {
				items.push({name: 'pedidos', action: 'provider_order/getModels'})
			} 
			return items
		}
	},
	methods: {
		setSelected(item) {
			// if (item.name == 'lista') {
			// 	this.$store.dispatch('providers/getModels')
			// }
			// if (item.name == 'pedidos') {
			// 	this.$store.dispatch('providers/orders/getModels')
			// }
		},
	}
}
</script>
