<template>
	<!--
		Observaciones ocultas de la venta: de uso interno, no se imprimen para el cliente.

		Elemento `observaciones_ocultas` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). Hasta esa mision vivia junto con las visibles en stage-3/Observations.vue; se
		partio para que cada una se pueda ubicar, achicar o sacar por separado.

		🔴 El id del textarea (vender_observations_ocultas_input) es el de siempre y no se cambia:
		lo usan el `for` del label y las pruebas.
	-->
	<div class="vender-stage__observations-field">
		<label
		class="vender-stage__observations-label"
		for="vender_observations_ocultas_input">
			Observaciones ocultas
		</label>
		<textarea
		id="vender_observations_ocultas_input"
		ref="textarea"
		class="form-control vender-stage__observations-textarea"
		v-model="observations_ocultas"
		rows="1"
		placeholder="Solo uso interno, no se imprimen"
		@input="ajustar_alto_despues_del_render"></textarea>
	</div>
</template>

<script>
/* El ajuste de alto y el prop stage_open son los mismos que los de las observaciones visibles */
import textarea_autoexpandible from '@/mixins/vender/textarea_autoexpandible'

export default {
	name: 'VenderObservacionesOcultas',
	mixins: [textarea_autoexpandible],
	computed: {
		/**
		 * Observaciones ocultas enlazadas al store de vender.
		 *
		 * @returns {string}
		 */
		observations_ocultas: {
			get() {
				return this.$store.state.vender.observations_ocultas
			},
			set(value) {
				this.$store.commit('vender/setObservationsOcultas', value)
			},
		},
	},
	watch: {
		/**
		 * Reajusta el alto cuando el valor cambia desde afuera (venta previa, limpiar, etc.).
		 *
		 * @returns {void}
		 */
		observations_ocultas() {
			this.ajustar_alto_despues_del_render()
		},
	},
}
</script>
