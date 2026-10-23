<template>
	<!--
		Depósitos del lote: desde la segunda sucursal (misión sucursal-siempre, 23/10/2026, D1).
		Con una sola no hay entre qué elegir y los selects no se ven, pero el movimiento lleva el id de
		esa sucursal (la principal, ver `usar_la_principal`) y no un 0. Antes se veían también sin
		sucursales, como dos selects vacíos.
	-->
	<div
	v-if="muestra_sucursales">
		<b-form-group
		:disabled="disabled"
		label="Deposito insumos">
			<b-form-select
			:options="get_options_simple('address', 'street')"
			v-model="model.address_id"></b-form-select>	
		</b-form-group>

		<b-form-group
		v-if="show_to"
		:disabled="disabled"
		label="Deposito producido">
			<b-form-select
			:options="get_options_simple('address', 'street')"
			v-model="model.to_address_id"></b-form-select>	
		</b-form-group>
	</div>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.production_batch_movement.model 
		},
		disabled() {
			if (this.model.id) {
				return true
			}
			return false
		},	
		show_to() {
			
			let estados = this.$store.state.order_production_status.models
			let ultimo_estado = estados[estados.length - 1]

			if (this.model.to_order_production_status_id == ultimo_estado.id) {
				return true
			}
			return false
		},
		order_production_statuses() {
			return this.$store.state.order_production_status.models 
		},
 	},
	watch: {
		model: {
			handler() {
				this.usar_la_principal()
			},
			immediate: true,
		},
		sucursal_principal() {
			this.usar_la_principal()
		},
	},
	methods: {
		/**
		 * Misión sucursal-siempre (23/10/2026, D1): con UNA sola sucursal los selects no se ven, y el
		 * movimiento NUEVO lleva el id de esa sucursal (la principal) en los dos depósitos en vez de un
		 * 0. Así anda también si esta SPA habla con una API vieja durante un despliegue: la API vieja
		 * no tiene la red que lleva a la principal lo que llega sin sucursal, y un 0 sobre un artículo
		 * que reparte se perdería en silencio. Un movimiento ya guardado no se toca, y con dos o más
		 * sucursales se elige como siempre.
		 *
		 * @returns {void}
		 */
		usar_la_principal() {
			let model = this.model
			let principal = this.sucursal_principal
			if (!model || model.id || this.muestra_sucursales || !principal) {
				return
			}
			if (!model.address_id) {
				this.$set(model, 'address_id', principal.id)
			}
			if (!model.to_address_id) {
				this.$set(model, 'to_address_id', principal.id)
			}
		},
	},
}
</script>