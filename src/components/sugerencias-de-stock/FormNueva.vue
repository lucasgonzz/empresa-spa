<template>
	<b-modal
	id="sugerencia-form-nueva"
	title="Nueva sugerencia de stock"
	hide-footer
	@show="cargar_defaults">

		<b-form-group
		label="Objetivo"
		description="¿Hasta donde queres completar el stock en cada deposito?">
			<b-form-select
			v-model="modo"
			:options="modo_options"></b-form-select>
		</b-form-group>
		<p class="text-muted small">
			{{ descripcion_modo }}
		</p>

		<b-form-group
		label="Origen"
		description="¿Como elegir el deposito desde el cual mover stock?">
			<b-form-select
			v-model="origen"
			:options="origen_options"></b-form-select>
		</b-form-group>
		<p class="text-muted small">
			{{ descripcion_origen }}
		</p>

		<b-form-group
		label="Limite origen"
		description="¿Hasta donde permitir vaciar el deposito origen?">
			<b-form-select
			v-model="limite_origen"
			:options="limite_origen_options"></b-form-select>
		</b-form-group>
		<p class="text-muted small">
			{{ descripcion_limite_origen }}
		</p>

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
	Modal de creacion de una sugerencia desde la vista propia. Los tres parametros
	arrancan precargados con los defaults que el dueño configuro en Configuracion
	general (columnas sugerencias_* de users); si nunca configuro nada, caen a los
	valores historicos del modulo.
*/
export default {
	data() {
		return {
			modo: 'minimo',
			origen: 'absoluto',
			limite_origen: 'minimo',
			loading: false,
		}
	},
	computed: {
		modo_options() {
			return [
				{value: 'minimo', text: 'Minimo'},
				{value: 'ideal', text: 'Ideal'},
				{value: 'maximo', text: 'Maximo'},
			]
		},
		origen_options() {
			return [
				{value: 'absoluto', text: 'Absoluto'},
				{value: 'relativo', text: 'Relativo'},
			]
		},
		limite_origen_options() {
			return [
				{value: 'minimo', text: 'Minimo'},
				{value: 'ideal', text: 'Ideal'},
				{value: 'sin_limite', text: 'Sin limite'},
			]
		},
		/**
		 * Explicacion de la opcion de objetivo elegida, para que el usuario no tenga
		 * que adivinar que hace cada valor (mismos textos que el modulo viejo, mas
		 * el objetivo maximo nuevo de la v2).
		 */
		descripcion_modo() {
			if (this.modo == 'ideal') {
				return 'Se sugiere stock para llevar cada deposito a su valor ideal, calculado como (minimo + maximo) / 2.'
			}
			if (this.modo == 'maximo') {
				return 'Se sugiere stock para llevar cada deposito hasta su stock maximo definido.'
			}
			return 'Se sugiere stock solo si el deposito esta por debajo del stock minimo definido.'
		},
		descripcion_origen() {
			if (this.origen == 'relativo') {
				return 'El sistema elige el deposito con el porcentaje mas alto respecto a su stock maximo.'
			}
			return 'El sistema elige el deposito con mayor cantidad absoluta de stock.'
		},
		descripcion_limite_origen() {
			if (this.limite_origen == 'ideal') {
				return 'Se puede mover stock incluso si eso baja el deposito origen hasta su nivel ideal.'
			}
			if (this.limite_origen == 'sin_limite') {
				return 'Se puede mover todo el stock necesario, aunque deje vacio el deposito origen.'
			}
			return 'No se mueve stock si eso deja al deposito origen por debajo de su stock minimo.'
		},
	},
	methods: {
		/**
		 * Precarga los tres selects con los defaults del dueño cada vez que se abre
		 * el modal. Se hace en @show (y no en data) para tomar el valor vigente si
		 * el usuario acaba de cambiar la configuracion sin recargar la pagina.
		 */
		cargar_defaults() {
			if (this.owner && this.owner.sugerencias_modo) {
				this.modo = this.owner.sugerencias_modo
			}
			if (this.owner && this.owner.sugerencias_origen) {
				this.origen = this.owner.sugerencias_origen
			}
			if (this.owner && this.owner.sugerencias_limite_origen) {
				this.limite_origen = this.owner.sugerencias_limite_origen
			}
		},
		cerrar() {
			this.$bvModal.hide('sugerencia-form-nueva')
		},
		/**
		 * Crea la sugerencia y navega directo a su detalle. El calculo corre en cola
		 * (o inline con catalogos chicos), asi que el detalle puede llegar todavia
		 * en estado "pendiente" y refrescarse solo.
		 */
		guardar() {
			let self = this
			this.loading = true
			this.$api.post('stock-suggestion', {
				modo: this.modo,
				origen: this.origen,
				limite_origen: this.limite_origen,
			})
			.then(function(res) {
				self.loading = false
				self.$bvModal.hide('sugerencia-form-nueva')
				// Refresca el listado para que la nueva aparezca al volver atras.
				self.$store.dispatch('stock_suggestion/getModels')
				self.$bvToast.toast('La sugerencia se esta generando.', {
					title: 'Sugerencia creada',
					variant: 'success',
					solid: true,
				})
				if (res.data.model && res.data.model.id) {
					self.$router.push({name: 'sugerencias_stock', params: {id: '' + res.data.model.id}})
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
