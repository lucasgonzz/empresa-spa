<template>
	<b-row
	v-if="user">
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
			if (this.hasExtencion('production.production_movement') && this.can('production_movement.index') || this.can('production_movement.create')) {
				items.push({name: 'Movimientos', call_models: 'production_movement'})
				items.push({name: 'Cantidades actuales'})
			}
			if (this.hasExtencion('production.order_production') && (this.can('order_production.index') || this.can('order_production.create'))) {
				items.push({name: 'Ordenes', call_models: 'order_production'})
			} 
			if (this.can('recipe.index') || this.can('recipe.create')) {
				items.push({name: 'Recetas', call_models: 'recipe'})
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
