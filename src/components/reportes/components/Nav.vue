<template>
	<b-row
	v-if="user">
		<b-col 
		cols="12"
		class="col-nav">
			<horizontal-nav
			@setSelected="setSelected"
			set_view
			:show_display="false"
			:items="items"></horizontal-nav>
		</b-col>
	</b-row>
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

			if (this.can('reportes.ingresos')) {

				items.push({
					name: 'ingresos',
				})
			}

			if (this.can('reportes.sucursales.index')) {

				items.push({
					name: 'sucursales',
				})
			}

			if (this.can('reportes.empleados.index')) {

				items.push({
					name: 'empleados',
				})
			}

			if (this.can('reportes.gastos')) {

				items.push({
					name: 'gastos',
				})
			}

			if (this.can('reportes.clientes')) {

				items.push({
					name: 'clientes',
				})
			}

			if (this.can('reportes.cheques')) {

				items.push({
					name: 'cheques',
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