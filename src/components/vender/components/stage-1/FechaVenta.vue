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
		/*
			El valor sale del store y nada mas: este componente NO calcula la fecha.

			🔴 Y no es que falte hacerlo aca: si el getter devolviera moment() por su cuenta,
			mostraria un dia y el POST mandaria otro --el que tiene el store-- porque el payload
			lee state.vender.created_at derecho (previus_sale/index.js y el action vender de
			store/vender/vender.js). Eso es peor que el bug: la pantalla diria una cosa y la venta
			se guardaria con otra.

			Quien garantiza que el valor sea el dia de HOY de verdad son los dos lugares que lo
			commitean fresco al arrancar una venta nueva: el created() de views/Vender.vue y
			limpiar_vender(). El default del state esta congelado desde que se cargo la pestaña
			(es un objeto literal, se evalua al importar el modulo) y por eso no alcanza solo.
		*/
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
