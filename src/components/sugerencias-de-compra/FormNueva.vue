<template>
	<b-modal
	id="sugerencia-compra-form-nueva"
	title="Nueva sugerencia de compra"
	hide-footer
	@show="cargar_defaults">

		<b-form-group
		label="Dias de punto de pedido"
		description="Con cuantos dias de cobertura restante ya conviene generar el pedido.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_punto_pedido"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Dias de cobertura objetivo"
		description="A cuantos dias de venta futura se quiere llegar con la cantidad sugerida.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_cobertura_objetivo"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Dias de lead time"
		description="Cuanto tarda en llegar el pedido una vez hecho; se suma a la cobertura objetivo.">
			<b-form-input
			type="number"
			min="0"
			step="1"
			v-model.number="dias_lead_time"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Vigencia de la oferta (dias)"
		description="Hasta cuantos dias atras se toma como vigente el precio ofertado por un proveedor.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_vigencia_oferta"></b-form-input>
		</b-form-group>

		<div class="j-end m-t-15">
			<b-button
			class="m-r-10"
			variant="outline-secondary"
			:disabled="loading"
			@click="cerrar">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			:disabled="loading"
			@click="guardar">
				<b-spinner
				v-if="loading"
				small
				class="m-r-5"></b-spinner>
				Generar sugerencia
			</b-button>
		</div>

	</b-modal>
</template>
<script>
/*
	Modal de creacion de una sugerencia de compra desde la vista propia. Los
	cuatro parametros arrancan en los defaults del motor (PLAN §5.1): a
	diferencia de sugerencias de stock, aca no hay configuracion por dueño que
	precargar (la migracion de users solo agrega la periodicidad de la
	generacion automatica, no estos cuatro dias).
*/
export default {
	data() {
		return {
			dias_punto_pedido: 15,
			dias_cobertura_objetivo: 30,
			dias_lead_time: 7,
			dias_vigencia_oferta: 120,
			loading: false,
		}
	},
	methods: {
		/**
		 * Reinicia los cuatro parametros a los defaults del motor cada vez que se
		 * abre el modal, para no arrastrar una edicion cancelada de la vez
		 * anterior (mismo criterio de FormNueva.vue de sugerencias de stock,
		 * aunque aca los defaults son fijos y no vienen de la configuracion del
		 * dueño).
		 */
		cargar_defaults() {
			this.dias_punto_pedido = 15
			this.dias_cobertura_objetivo = 30
			this.dias_lead_time = 7
			this.dias_vigencia_oferta = 120
		},
		cerrar() {
			this.$bvModal.hide('sugerencia-compra-form-nueva')
		},
		/**
		 * Crea la sugerencia y navega directo a su detalle. El calculo corre en
		 * cola, asi que el detalle puede llegar todavia en estado "pendiente" y
		 * refrescarse solo.
		 */
		guardar() {
			let self = this
			this.loading = true
			this.$api.post('purchase-suggestion', {
				dias_punto_pedido: this.dias_punto_pedido,
				dias_cobertura_objetivo: this.dias_cobertura_objetivo,
				dias_lead_time: this.dias_lead_time,
				dias_vigencia_oferta: this.dias_vigencia_oferta,
			})
			.then(function(res) {
				self.loading = false
				self.$bvModal.hide('sugerencia-compra-form-nueva')
				// Refresca el listado para que la nueva aparezca al volver atras.
				self.$store.dispatch('purchase_suggestion/getModels')
				self.$bvToast.toast('La sugerencia se esta generando.', {
					title: 'Sugerencia creada',
					variant: 'success',
					solid: true,
				})
				if (res.data.model && res.data.model.id) {
					self.$router.push({name: 'sugerencias_compra', params: {id: '' + res.data.model.id}})
				}
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
				self.$bvToast.toast('No se pudo crear la sugerencia.', {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	}
}
</script>
