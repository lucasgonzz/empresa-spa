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
export default {
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			if (this.can('order.index')) {
				items.push({
					name: 'pedidos', 
					call_models: 'order',
				})
			}
			if (this.can('buyer.index')) {
				items.push({
					name: 'clientes',
					call_models: 'buyer',
				})
			}
			if (this.can('buyer.messages')) {
				items.push({
					name: 'mensajes',
					// Refresca compradores al entrar/reingresar a Mensajes (igual que 'clientes'
					// arriba). Necesario desde que se saco el polling de 20s de
					// start_methods.js (9/9/2026): addBuyerMessage() no agrega un comprador
					// nuevo que todavia no este en buyer.models, asi que sin esto su primer
					// mensaje podia quedar invisible toda la sesion.
					call_models: 'buyer',
				})
			}
			if (this.can('cupon.index')) {
				items.push({
					name: 'cupones',
					call_models: 'cupon',
				})
			}
			return items 
		},
	},
	methods: {
		setSelected(item) {
			if (item.name == 'mensajes') {
				this.$store.dispatch('message/setChatsToShow')
			}
		}
	}
}
</script>