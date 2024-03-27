<template>
	<div
	class="afip-ticket-ventas-cobradas-nav">
		<b-form-select
		v-model="afip_ticket_show_option"
		:options="afip_ticket_options"></b-form-select>

		<b-form-select
		class="m-l-15"
		v-model="ventas_cobradas_show_option"
		:options="ventas_cobradas_options"></b-form-select>
	</div>
</template>
<script>
export default {
	computed: {
		afip_ticket_show_option: {
			get() {
				return this.$store.state.sale.afip_ticket_show_option
			},
			set(value) {
				this.$store.commit('sale/setAfipTicketShowOption', value)
			}
		},
		ventas_cobradas_show_option: {
			get() {
				return this.$store.state.sale.ventas_cobradas_show_option
			},
			set(value) {
				this.$store.commit('sale/setVentasCobradasShowOption', value)
			}
		},
		afip_ticket_options() {
			return [
				{
					text: 'Con y sin factura',
					value: 'con-y-sin-factura',
				},
				{
					text: 'Solo CON FACTURA',
					value: 'solo-con-factura',
				},
				{
					text: 'Solo SIN FACTURA',
					value: 'solo-sin-factura',
				},
			]
		},
		ventas_cobradas_options() {
			return [
				{
					text: 'Cobradas y no cobradas',
					value: 'cobradas-y-no-cobradas',
				},
				{
					text: 'Solo COBRADAS',
					value: 'solo-cobradas',
				},
				{
					text: 'Solo SIN COBRAR',
					value: 'solo-sin-cobrar',
				},
			]
		},
	},
	methods: {
	}
}
</script>
<style lang="sass">
.afip-ticket-ventas-cobradas-nav
	display: flex
	flex-direction: row
	justify-content: flex-end
	select 
		width: 250px
</style>