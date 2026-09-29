<template>
	<!--
		Observaciones de la venta: las que salen impresas en el comprobante.

		Elemento `observaciones` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). Hasta esa mision vivia junto con las ocultas en stage-3/Observations.vue; se
		partio para que cada una se pueda ubicar, achicar o sacar por separado.

		🔴 El id del textarea (vender_observations_input) es el de siempre y no se cambia: lo usan
		el `for` del label y las pruebas.
	-->
	<div class="vender-stage__observations-field">
		<label
		class="vender-stage__observations-label"
		for="vender_observations_input">
			Observaciones
		</label>
		<textarea
		id="vender_observations_input"
		ref="textarea"
		class="form-control vender-stage__observations-textarea"
		v-model="observations"
		rows="1"
		placeholder="Notas visibles en el comprobante"
		@input="ajustar_alto_despues_del_render"></textarea>
	</div>
</template>

<script>
/* El ajuste de alto y el prop stage_open son los mismos que los de las observaciones ocultas */
import textarea_autoexpandible from '@/mixins/vender/textarea_autoexpandible'

export default {
	name: 'VenderObservacionesVisibles',
	mixins: [textarea_autoexpandible],
	computed: {
		/**
		 * Observaciones visibles enlazadas al store de vender.
		 *
		 * @returns {string}
		 */
		observations: {
			get() {
				return this.$store.state.vender.observations
			},
			set(value) {
				this.$store.commit('vender/setObservations', value)
			},
		},
	},
	watch: {
		/**
		 * Reajusta el alto cuando el valor cambia desde afuera (venta previa, limpiar, etc.).
		 *
		 * @returns {void}
		 */
		observations() {
			this.ajustar_alto_despues_del_render()
		},
	},
}
</script>
