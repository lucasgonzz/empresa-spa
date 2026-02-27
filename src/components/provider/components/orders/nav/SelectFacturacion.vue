<template>
	<div>
		<b-form-select
		v-model="afip_ticket_show_option"
		:options="afip_ticket_options"></b-form-select>
	</div>
</template>
<script>
export default {
	computed: {
		afip_ticket_show_option: {
			get() {
				return this.$store.state.provider_order.afip_ticket_show_option
			},
			set(value) {
				this.$store.commit('provider_order/setAfipTicketShowOption', value)
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
	},
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