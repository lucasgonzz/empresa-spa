<template>
	<!--
		Mision fecha-creacion-editable (22/9/2026): la fecha con la que queda registrada la
		venta. Por defecto el dia de hoy, asi el caso normal --que es el 99% de las ventas-- no
		cambia en nada.

		A diferencia de FechaEntrega (que es otro campo, la fecha de ENTREGA, y vive detras de la
		extension ventas_con_fecha_de_entrega), este va SIEMPRE y para todos los comercios.
	-->
	<b-input-group
	class="w-300 m-b-10"
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
