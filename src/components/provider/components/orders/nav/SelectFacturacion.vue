<template>
	<div>
		<b-form-select
		class="toolbar-select"
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
<!--
	Sin <style> propio desde la misión 33: la altura, el radio, la tipografía y los colores del
	control salen de `.toolbar-select`, declarada una sola vez en src/sass/_toolbar_botones.sass.

	Lo que había acá era un bloque `.afip-ticket-ventas-cobradas-nav` copiado del nav de Ventas, con
	un `select { width: 250px }` adentro. Ese selector no existe en el template de este componente,
	así que **no aplicaba a nada**: por eso el control se veía con la tipografía y el padding crudos
	de Bootstrap, con el texto pegado al techo, al lado de controles de 36px.
-->
