<template>
	<b-modal
	id="oferta-form-nueva"
	title="Buscar ofertas nuevas"
	hide-footer
	@show="cargar_defaults">

		<b-form-group
		label="Dias de historial de compras"
		description="Cuanto para atras se mira lo que compro cada cliente para saber que le interesa.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_historial_afinidad"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Dias sin comprar para considerar dormido a un cliente"
		description="A partir de aca el motor propone una oferta de reactivacion.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_inactividad_reactivacion"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Dias de carritos abandonados"
		description="Ventana de carritos armados en la tienda y no comprados.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_carrito_abandonado"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Maximo de ofertas por cliente"
		description="Un cliente con cuarenta ofertas no es una campaña, es spam.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="max_ofertas_por_cliente"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Dias de vigencia sugeridos"
		description="Cuanto propone que dure cada oferta. Se puede cambiar despues, oferta por oferta.">
			<b-form-input
			type="number"
			min="1"
			step="1"
			v-model.number="dias_vigencia_sugerida"></b-form-input>
		</b-form-group>

		<div
		v-if="form_invalido"
		class="text-muted small m-t-10">
			Completa los cinco campos con numeros enteros validos (minimo 1) para continuar.
		</div>

		<div class="j-end m-t-15">
			<b-button
			class="btn-modulo m-r-10"
			variant="outline-secondary"
			:disabled="loading"
			@click="cerrar">
				Cancelar
			</b-button>
			<b-button
			class="btn-modulo"
			variant="primary"
			:disabled="loading || form_invalido"
			@click="guardar">
				<b-spinner
				v-if="loading"
				small
				class="m-r-5"></b-spinner>
				Buscar ofertas
			</b-button>
		</div>

	</b-modal>
</template>
<script>
/*
	Modal de creacion de una corrida del motor de ofertas. Los cinco parametros
	arrancan en los defaults del motor (los mismos que la migracion pone como
	default de la cabecera). Molde de sugerencias-de-compra/FormNueva.vue,
	incluida la leccion que dejo esa mision: con v-model.number, borrar el input
	manda "" y del otro lado el (int) lo convierte en 0, asi que el boton se
	deshabilita antes de dejar mandar algo vacio.
*/
export default {
	data() {
		return {
			dias_historial_afinidad: 180,
			dias_inactividad_reactivacion: 60,
			dias_carrito_abandonado: 7,
			max_ofertas_por_cliente: 3,
			dias_vigencia_sugerida: 15,
			loading: false,
		}
	},
	computed: {
		/**
		 * true si falta completar o hay algo no numerico en alguno de los cinco
		 * campos: el boton queda deshabilitado en vez de dejar mandar un "" que el
		 * back convertiria en 0.
		 */
		form_invalido() {
			return !this.es_valido(this.dias_historial_afinidad)
				|| !this.es_valido(this.dias_inactividad_reactivacion)
				|| !this.es_valido(this.dias_carrito_abandonado)
				|| !this.es_valido(this.max_ofertas_por_cliente)
				|| !this.es_valido(this.dias_vigencia_sugerida)
		},
	},
	methods: {
		/**
		 * Entero valido (no "", no null, no decimal suelto) y no menor a 1: mismo
		 * minimo que declara cada b-form-input y que exige el back.
		 */
		es_valido(valor) {
			return Number.isInteger(valor) && valor >= 1
		},
		/**
		 * Reinicia los parametros a los defaults del motor cada vez que se abre el
		 * modal, para no arrastrar una edicion cancelada de la vez anterior.
		 */
		cargar_defaults() {
			this.dias_historial_afinidad = 180
			this.dias_inactividad_reactivacion = 60
			this.dias_carrito_abandonado = 7
			this.max_ofertas_por_cliente = 3
			this.dias_vigencia_sugerida = 15
		},
		cerrar() {
			this.$bvModal.hide('oferta-form-nueva')
		},
		/**
		 * Crea la corrida y navega directo a su detalle. El calculo corre en cola,
		 * asi que el detalle puede llegar todavia "pendiente" y refrescarse solo.
		 */
		guardar() {
			// Defensivo: el boton ya queda deshabilitado con form_invalido, pero
			// esto cubre un Enter dentro del modal u otro disparador que no pase por
			// el click del boton.
			if (this.form_invalido) {
				return
			}
			let self = this
			this.loading = true
			this.$api.post('offer-suggestion', {
				dias_historial_afinidad: this.dias_historial_afinidad,
				dias_inactividad_reactivacion: this.dias_inactividad_reactivacion,
				dias_carrito_abandonado: this.dias_carrito_abandonado,
				max_ofertas_por_cliente: this.max_ofertas_por_cliente,
				dias_vigencia_sugerida: this.dias_vigencia_sugerida,
			})
			.then(function(res) {
				self.loading = false
				self.$bvModal.hide('oferta-form-nueva')
				// Refresca el listado para que la nueva aparezca al volver atras.
				self.$store.dispatch('offer_suggestion/getModels')
				self.$bvToast.toast('El motor esta buscando ofertas.', {
					title: 'Busqueda creada',
					variant: 'success',
					solid: true,
				})
				if (res.data.model && res.data.model.id) {
					self.$router.push({name: 'ofertas', params: {id: '' + res.data.model.id}})
				}
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
				// Si igual llega un 422 del back se muestra tal cual: el mensaje ya
				// explica que corregir.
				let mensaje = err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'No se pudo crear la busqueda de ofertas.'
				self.$bvToast.toast(mensaje, {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	}
}
</script>
