<template>
	<!--
		Solo venta y con venta cargada: deja registradas en los renglones de la venta las unidades
		que se devolvieron (para que la próxima devolución arranque desde ahí).
	-->
	<vender-toggle
	v-if="sale"
	input_id="devolucion-actualizar-unidades"
	v-model="update_unidades_devueltas">
		Actualizar unidades devueltas en la venta
		<span class="dev-toggle__ayuda">
			Los renglones de la venta guardan cuánto se devolvió.
		</span>
	</vender-toggle>
</template>
<script>
export default {
	components: {
		VenderToggle: () => import('@/components/vender/components/VenderToggle'),
	},
	computed: {
		/**
		 * @returns {Object|null} Venta cargada.
		 */
		sale() {
			return this.$store.state.devoluciones.sale
		},
		/**
		 * 1/0: actualizar `returned_amount` en los renglones de la venta.
		 */
		update_unidades_devueltas: {
			get() {
				return this.$store.state.devoluciones.update_unidades_devueltas
			},
			set(value) {
				this.$store.commit('devoluciones/set_update_unidades_devueltas', value)
			},
		},
	},
}
</script>
