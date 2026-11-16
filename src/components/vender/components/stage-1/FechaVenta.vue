<template>
	<!--
		Mision fecha-creacion-editable (22/9/2026): la fecha con la que queda registrada la
		venta. Por defecto el dia de hoy, asi el caso normal --que es el 99% de las ventas-- no
		cambia en nada.

		A diferencia de FechaEntrega (que es otro campo, la fecha de ENTREGA, y vive detras de la
		extension ventas_con_fecha_de_entrega), este va SIEMPRE y para todos los comercios.

		Sin clases de ancho ni de margen: es el elemento `fecha_de_venta` del diseño de Vender
		(mision diseno-vender-configurable, 28/9/2026), y el ancho y el aire entre campos los pone
		layout/GrillaDeEtapa.vue segun el diseño en uso, igual que para todos los campos de las
		etapas. Un w-300 fijo adentro pelearia contra la columna elegida y desbordaria en una
		angosta.
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
		// El setter marca una elección explícita, incluso si el usuario elige el día de hoy.
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
