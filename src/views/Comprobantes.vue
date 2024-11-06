<template>
	<div>

		<horizontal-nav
		@setSelected="setSelectedView"
		set_view
		emitir_setSelected_al_inicio
		:show_display="false"
		:items="nav_items"></horizontal-nav>

		<notas-de-credito></notas-de-credito>
		
		<pagos-de-clientes></pagos-de-clientes>
	</div>
</template>
<script>
import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	components: {
		NotasDeCredito: () => import('@/components/comprobantes/components/notas-de-credito/Index'),
		PagosDeClientes: () => import('@/components/comprobantes/components/pagos-de-clientes/Index'),
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		nav_items() {

			let items = [
				{
					name: 'Notas de Credito',
				},
				{
					name: 'Pagos de Clientes',
				},
			]

			return items
		},
		
	},
	methods: {
		setSelectedView(item) {
			console.log('setSelectedView')
			console.log(this.view)
			console.log(item)
			if (this.view == this.routeString(item.name)) {
				
				this.$store.commit('auth/setMessage', 'Cargando informacion')
				this.$store.commit('auth/setLoading', true)

				if (this.view == 'notas-de-credito') {
					this.$store.dispatch('nota_credito/getModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}
			}
		}
	}
}
</script>