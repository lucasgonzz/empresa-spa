<template>
	<div
	class="afip-ticket-ventas-cobradas-nav">

		<!-- Búsqueda en API por cbte_numero (Enter); no filtra solo las ventas ya cargadas por fecha -->
		<b-input-group
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
		class="afip-ticket-nav-select afip-ticket-nav-select--factura"
		v-model="afip_ticket_show_option"
		:options="afip_ticket_options"></b-form-select>

		<b-form-select
		class="afip-ticket-nav-select afip-ticket-nav-select--cobradas"
		v-model="ventas_cobradas_show_option"
		:options="ventas_cobradas_options"></b-form-select>

		<b-form-select
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
// Los cuatro controles toman la altura y el radio de la barra (--toolbar-control-h,
// --toolbar-btn-radius) desde la misión 32. Antes iban con `size="sm"` y una altura calculada a
// mano, que es la métrica de ~31px que la misión 13 vino a jubilar: al lado del pill del buscador
// general se veían de otro sistema.
.afip-ticket-ventas-cobradas-nav
	display: flex
	justify-content: flex-end
	align-items: center
	flex-direction: row
	flex-wrap: nowrap
	gap: var(--toolbar-btn-gap)
	// 🔴 `width: auto` y no el `width: 100%` que tenía: desde que este bloque comparte fila con el
	// nav de empleados, un ancho del 100% lo convierte en la base flex del ítem y se lleva la fila
	// entera --medido: el nav quedaba en 0px de ancho--. El ancho lo dan los cuatro controles.
	width: auto
	max-width: 100%

	// 🔴 Los tres selectores llevan `.custom-select` ademas de su clase propia, y no es ruido: son
	// dos reglas del sistema que le ganan a una sola clase y dejan estos tres controles distintos de
	// todos los demas de la barra.
	//
	// 1. `_ui_sizes.sass` declara `.ui-small select.custom-select { height: auto }` con (0,2,1), y
	//    b-form-select renderiza justamente un `select.custom-select`. Con la interfaz en tamaño
	//    chico los tres selects caian a 30,8px mientras el pill, el buscador y los botones median 32.
	//    Es EXACTAMENTE la trampa que provider/components/orders/nav/Index.vue ya documento y
	//    resolvio el 11/8/2026 en el modulo de al lado.
	// 2. `html.dark-mode .custom-select { background: var(--bg-section) }` es (0,2,1) y le ganaba al
	//    fondo de aca: en oscuro el buscador quedaba #2e333a y los tres selects #272b31, o sea el
	//    grupo que tiene que leerse como una sola pieza partido en dos tonos.
	//
	// Con la clase de bootstrap sumada esto queda en (0,3,0) --tres clases contra dos clases y un
	// elemento-- y gana las dos comparaciones sin recurrir a !important. El buscador zafaba de
	// casualidad porque se escribio `&__input.form-control`, que ya era (0,3,0).
	.afip-ticket-nav-select.custom-select
		flex-shrink: 0
		font-size: 0.8125rem
		padding-left: 0.6rem
		padding-right: 1.35rem
		height: var(--toolbar-control-h)
		border-radius: var(--toolbar-btn-radius)
		border: 1px solid var(--color-border)
		background-color: var(--bg-card)
		color: var(--color-text-primary)

	// Los anchos van en selectores propios y no anidados con `&--`: adentro del bloque de arriba el
	// `&` expande al selector padre ENTERO, o sea que `&--factura` daria
	// `.afip-ticket-nav-select.custom-select--factura`, que no existe en ningun lado.
	.afip-ticket-nav-select--factura.custom-select
		width: 118px
		max-width: 118px

	.afip-ticket-nav-select--cobradas.custom-select
		width: 108px
		max-width: 108px

	.afip-ticket-nav-select--pago.custom-select
		width: 132px
		max-width: 132px

	/** Buscador por N° de comprobante AFIP */
	.afip-ticket-cbte-search
		width: 128px
		flex-shrink: 0
		height: var(--toolbar-control-h)

		// El grupo es una sola pieza: el prepend redondea a la izquierda y el input a la derecha.
		.input-group-text
			height: var(--toolbar-control-h)
			border: 1px solid var(--color-border)
			border-right: none
			border-top-left-radius: var(--toolbar-btn-radius)
			border-bottom-left-radius: var(--toolbar-btn-radius)
			background-color: var(--bg-card)
			padding: 0 0.5rem

		&__icon
			font-size: 0.95rem
			line-height: 1
			color: var(--color-text-secondary)

		&__input.form-control
			min-width: 0
			font-size: 0.8125rem
			height: var(--toolbar-control-h)
			border: 1px solid var(--color-border)
			border-left: none
			border-top-right-radius: var(--toolbar-btn-radius)
			border-bottom-right-radius: var(--toolbar-btn-radius)
			background-color: var(--bg-card)
			color: var(--color-text-primary)

	// En teléfono los cuatro se reparten en dos filas de a dos, ocupando el ancho que les deja la
	// fila que ya bajó completa (ver ventas-cabecera__filtros). Siguen todos alcanzables.
	@media screen and (max-width: 800px)
		flex-wrap: wrap
		justify-content: flex-start
		width: 100%

		.afip-ticket-nav-select.custom-select
			flex: 1 1 calc(50% - var(--toolbar-btn-gap))
			width: auto
			max-width: none

		.afip-ticket-cbte-search
			flex: 1 1 calc(50% - var(--toolbar-btn-gap))
			width: auto
</style>