<template>
	<horizontal-nav
	@setSelected="setSelected"
	set_view
	:show_display="false"
	:items="items"></horizontal-nav>
</template>
<script>
export default {
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []

			items.push({
				name: 'Del articulo',
			})
			
			items.push({
				name: 'Mercado libre',
			})

			return items 
		},
	},
	watch: {
		loading() {
			console.log('watch loading: '+this.loading)
			if (!this.loading) {
				this.setProvidersFormated()
			}
		},
	},
	methods: {
		setSelected(item) {
			console.log(item.name)
			if (item.name == 'Del articulo') {
				this.$emit('get_article_attributes')
			}
			// if (item.name == 'proveedores') {
			// 	this.$store.dispatch('panel_control/getModels', 12)
			// }
			// if (item.name == 'cheques') {
			// 	this.$store.dispatch('cheque/getModels')
			// 	this.$router.push({params: {sub_view: 'recibido', sub_sub_view: 'pendientes'}})
			// }
		},
	}
}
</script>