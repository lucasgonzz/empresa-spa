<template>
	<!--
		Mision fecha-creacion-editable (22/9/2026): la fecha con la que queda registrada la
		venta. Por defecto el dia de hoy, asi el caso normal --que es el 99% de las ventas-- no
		cambia en nada.

		A diferencia de FechaEntrega (que es otro campo, la fecha de ENTREGA, y vive detras de la
		extension ventas_con_fecha_de_entrega), este va SIEMPRE y para todos los comercios.

		Sin clases de ancho ni de margen, a diferencia de FechaEntrega: aquel vive suelto en el
		layout viejo y se las pone el mismo. Aca el ancho y el gap los pone el wrapper
		.vender-stage__field (flex + max-width + min-width 220px, ver _vender-stages.sass), igual
		que para Seller y SaleType, que tampoco las llevan. Un w-300 fijo adentro pelearia contra
		ese max-width y desbordaria en la fila angosta.
	-->
	<b-input-group
	prepend="Fecha">
		<b-form-input
		type="date"
		v-model="created_at"></b-form-input>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		created_at: {
			set(value) {
				this.$store.commit('vender/set_created_at', value)
			},
			get() {
				return this.$store.state.vender.created_at
			}
		},
	},
}
</script>
