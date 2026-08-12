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
	un `select` adentro. Ese selector no existe en el template de ESTE componente, así que el select
	de acá no recibía nada: por eso se veía con la tipografía y el padding crudos de Bootstrap, con
	el texto pegado al techo, al lado de controles de 36px.

	🔴 Pero el bloque NO era inofensivo, y conviene que quede escrito porque es contraintuitivo: al
	no ser `scoped`, sus reglas se aplicaban al documento entero, y `.afip-ticket-ventas-cobradas-nav`
	SÍ existe — en el nav de Ventas. O sea que este componente le estaba pintando el nav a otro
	módulo, y solo cuando el usuario ya había pasado por Compras y bajado este chunk. Al borrarlo,
	los tres selects de Ventas pierden un `margin-left: 15px` que se sumaba a su gap (la fila se
	compacta ~45px) y dejan de depender de un empate contra el `width: auto` que la misión 32 les
	puso a propósito. Las dos cosas son mejoras, pero eran efectos reales en otro módulo.
-->
