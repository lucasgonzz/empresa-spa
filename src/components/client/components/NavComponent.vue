<template>
	<b-row
	v-if="user">
		<b-col>
			<horizontal-nav
			:items="items"
			set_view
			:show_display="false"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			if (this.can('client.index')) {
				items.push({name: 'clientes', call_models: 'client'})
				items.push({name: 'vendedores', call_models: 'seller'})
			}
			return items
		}
	},
}
</script>
