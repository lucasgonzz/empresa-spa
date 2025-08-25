<template>
	<div>

		<horizontal-nav
		class="m-b-40"
		@setSelected="setSelectedView"
		set_view
		emitir_setSelected_al_inicio
		:show_display="false"
		:items="nav_items"></horizontal-nav>

		<lista-de-alertas-table></lista-de-alertas-table>

	</div>
</template>
<script>
import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	components: {
		ListaDeAlertasTable: () => import('@/components/alertas/components/lista-de-alertas-table/Index'),
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		nav_items() {

			let items = [
				{
					name: 'Cobros',
					alert: this.ventas_sin_cobrar.length	
				},
				{
					name: 'Stock minimo',
					alert: this.articles_stock_minimo.length	
				},
			]

			if (this.can('alerts.provider_orders')) {
				items.push({
					name: 'Pedidos Proveedor',	
					alert: this.provider_order_days_to_advise.length	
				})
			}

			if (this.can('alerts.orders')) {
				items.push({
					name: 'Pedidos Online',	
					alert: this.unconfirmed_orders.length	
				})
			}

			if (this.can('alerts.messages')) {
				items.push({
					name: 'Mensajes',	
					alert: this.messages_not_read		
				})
			}

			if (this.hasExtencion('deposit_movements')) {
				items.push({
					name: 'Movimientos de depositos',	
					alert: this.deposit_movements_en_curso.length		
				})
			}

			if (this.can('alerts.problemas_al_facturar')) {
				items.push({
					name: 'Facturacion',	
					alert: this.problemas_al_facturar.length		
				})
			}

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

				if (this.view == 'cobros') {
					this.$store.dispatch('sale/ventas_sin_cobrar/getModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'pedidos-proveedor') {
					this.$store.dispatch('provider_order/getDaysToAdvise')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'pedidos-online'){
					this.$store.dispatch('order/getUnconfirmedModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				} 

				if (this.view == 'mensajes') {
					this.$store.dispatch('buyer/getModels')
					.then(() => {
						this.$store.commit('message/setChatsToShow')
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'movimientos-de-depositos') {
					this.$store.dispatch('deposit_movement/en_curso/getModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'facturacion') {
					this.$store.dispatch('afip_ticket/get_problemas_al_facturar')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

			}
		}
	}
}
</script>