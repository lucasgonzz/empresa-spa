<template>
	<div
	class="afip-ticket-ventas-cobradas-nav">

		<!-- Búsqueda en API por cbte_numero (Enter); no filtra solo las ventas ya cargadas por fecha -->
		<b-input-group
		size="sm"
		class="afip-ticket-cbte-search">
			<b-input-group-prepend is-text>
				<i
				class="bi bi-receipt afip-ticket-cbte-search__icon"
				v-b-tooltip.hover
				title="Buscar venta por N° de factura"
				aria-hidden="true"></i>
			</b-input-group-prepend>
			<b-form-input
			v-model="afip_ticket_cbte_numero_search"
			type="search"
			class="afip-ticket-cbte-search__input"
			placeholder="N° factura"
			@keyup.enter="search_by_afip_ticket_cbte_numero"
			@input="on_afip_ticket_cbte_numero_input"></b-form-input>
		</b-input-group>

		<b-form-select
		size="sm"
		class="afip-ticket-nav-select afip-ticket-nav-select--factura"
		v-model="afip_ticket_show_option"
		:options="afip_ticket_options"></b-form-select>

		<b-form-select
		size="sm"
		class="afip-ticket-nav-select afip-ticket-nav-select--cobradas"
		v-model="ventas_cobradas_show_option"
		:options="ventas_cobradas_options"></b-form-select>

		<b-form-select
		size="sm"
		class="afip-ticket-nav-select afip-ticket-nav-select--pago"
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
		/**
		 * Texto del buscador; al confirmar (Enter) dispara POST /api/search/sale.
		 */
		afip_ticket_cbte_numero_search: {
			get() {
				return this.$store.state.sale.afip_ticket_cbte_numero_search
			},
			set(value) {
				this.$store.commit('sale/set_afip_ticket_cbte_numero_search', value)
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
					text: 'Todas (factura)',
					value: 'con-y-sin-factura',
				},
				{
					text: 'Con factura',
					value: 'solo-con-factura',
				},
				{
					text: 'Sin factura',
					value: 'solo-sin-factura',
				},
			]
		},
		ventas_cobradas_options() {
			return [
				{
					text: 'Todas (cobro)',
					value: 'cobradas-y-no-cobradas',
				},
				{
					text: 'Cobradas',
					value: 'solo-cobradas',
				},
				{
					text: 'Sin cobrar',
					value: 'solo-sin-cobrar',
				},
			]
		},
		payment_methods_options() {
			let options = [
				{
					text: 'Todos los pagos',
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
	watch: {
		/**
		 * Si se limpian filtros desde el header, vacía también el buscador de factura.
		 */
		'$store.state.sale.is_filtered'(is_filtered) {
			if (!is_filtered) {
				this.$store.commit('sale/set_afip_ticket_cbte_numero_search', '')
			}
		},
	},
	methods: {
		/**
		 * Si el usuario borra el texto, vuelve al listado sin búsqueda por factura.
		 *
		 * @returns {void}
		 */
		on_afip_ticket_cbte_numero_input() {
			if (this.afip_ticket_cbte_numero_search === '') {
				this.search_by_afip_ticket_cbte_numero()
			}
		},
		/**
		 * Ejecuta búsqueda de ventas por N° de factura en el backend.
		 *
		 * @returns {void}
		 */
		search_by_afip_ticket_cbte_numero() {
			this.$store.dispatch('sale/search_by_afip_ticket_cbte_numero', this.afip_ticket_cbte_numero_search)
		},
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

	/** Selects compactos del nav (factura, cobro, medio de pago) */
	.afip-ticket-nav-select
		flex-shrink: 0
		margin-left: 8px
		font-size: 0.8125rem
		padding-left: 0.4rem
		padding-right: 1.35rem
		height: calc(1.5em + 0.5rem + 2px)

		&--factura
			width: 118px
			max-width: 118px

		&--cobradas
			width: 108px
			max-width: 108px

		&--pago
			width: 132px
			max-width: 132px

		@media screen and (max-width: 800px)
			width: 45% !important
			max-width: none
			margin-left: 0
			margin-bottom: 8px

	/** Buscador compacto por N° de comprobante AFIP */
	.afip-ticket-cbte-search
		width: 100px
		flex-shrink: 0
		margin-right: 0

		@media screen and (max-width: 800px)
			width: 45%
			margin-bottom: 8px

		&__icon
			font-size: 0.95rem
			line-height: 1
			color: #6c757d

		&__input
			min-width: 0
			font-size: 0.8125rem
</style>