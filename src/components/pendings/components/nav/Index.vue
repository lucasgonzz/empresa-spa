<template>
	<b-row>
		<b-col
		cols="12">
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
		pendings() {
			return this.$store.state.pending.models 
		},
		items() {
			let items = [
				{
					'name': 'Por realizar',
					'alert': this.pendings.length,
					'action': 'pending/getModels',
				},
				{
					'name': 'Realizados',
					'action': 'pending_completed/getModels',
				},
			]
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
