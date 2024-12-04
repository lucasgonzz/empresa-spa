<template>
	<div
	class="afip-ticket-ventas-cobradas-nav">
		<b-form-select
		v-model="afip_ticket_show_option"
		:options="afip_ticket_options"></b-form-select>

		<b-form-select
		v-model="ventas_cobradas_show_option"
		:options="ventas_cobradas_options"></b-form-select>

		<b-form-select
		v-model="payment_method_show_option"
		:options="payment_methods_options"></b-form-select>
	</div>
</template>
<script>
export default {
	computed: {
		payment_method_show_option: {
			get() {
				return this.$store.state.sale.payment_method_show_option
			},
			set(value) {
				this.$store.commit('sale/set_payment_method_show_option', value)
			}
		},
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
		payment_methods_options() {
			let options = [
				{
					text: 'Todos los Metodos de Pago',
					value: 'todos',
				},
			]

			this.$store.state.current_acount_payment_method.models.forEach(payment_method => {

				options.push({
					text: payment_method.name,
					value: payment_method.id
				})
			})

			return options
		},
	},
	methods: {
	}
}
</script>
<style lang="sass">
.afip-ticket-ventas-cobradas-nav
	display: flex
	justify-content: flex-end

	@media screen and (max-width: 800px)
		// flex-direction: column
		flex-wrap: wrap
		justify-content: space-around

	align-items: center 
	flex-direction: row
	width: 100%

	select 
		width: 250px
		margin-left: 15px
		&:first-child
			margin-left: 0

		@media screen and (max-width: 800px)
			width: 45%
			margin-left: 0
			margin-bottom: 10px
</style>