<template>
	<horizontal-nav
	@setSelected="setSelected"
	set_view
	:show_display="false"
	:items="items"></horizontal-nav>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []

			if (this.can('reportes.cards')) {

				items.push({
					name: 'Generales',
				})
			}

			if (this.can('reportes.graficos')) {

				items.push({
					name: 'graficos',
				})
			}

			if (this.can('reportes.articulos')) {

				items.push({
					name: 'articulos',
				})
			}
			
			return items 
		},
		loading() {
			return this.$store.state.panel_control.loading
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
			if (item.name == 'graficos') {
				console.log('sobree escibiendo sub_view con ingresos')
				this.$router.push({params: {sub_view: 'ingresos'}})
			}
			if (item.name == 'proveedores') {
				this.$store.dispatch('panel_control/getModels', 12)
			}
			if (item.name == 'cheques') {
				this.$store.dispatch('cheque/getModels')
			}
		},
	}
}
</script>