<template>
	<div class="resumen-ia-compra">

		<!-- Escribiendose: la corrida termino y el job del resumen esta en la cola -->
		<b-card
		v-if="estado == 'pendiente'"
		class="card-modulo resumen-ia-compra__card m-b-15">
			<div class="j-start align-center">
				<b-spinner
				small
				class="m-r-10"></b-spinner>
				<span class="text-muted">
					Lo estamos escribiendo: en un momento vas a tener un resumen de esta sugerencia.
				</span>
			</div>
		</b-card>

		<!-- Listo: el texto en criollo que escribio la IA sobre el resultado ya calculado -->
		<b-card
		v-else-if="estado == 'listo' && sugerencia.resumen_ia"
		class="card-modulo resumen-ia-compra__card m-b-15">
			<h6 class="resumen-ia-compra__titulo">
				<i class="bi bi-stars m-r-5"></i>
				Resumen
			</h6>
			<p class="resumen-ia-compra__texto m-b-0">
				{{ sugerencia.resumen_ia }}
			</p>
		</b-card>

		<!--
			Error: aviso discreto mas el boton de reintento (el job no reintenta solo
			a proposito, para no tapar la cola compartida: este boton es el camino de
			vuelta tras un 529). El estado null (sin IA contratada) no muestra nada:
			no tener el resumen no es una falla y no se presenta como tal.
		-->
		<div
		v-else-if="estado == 'error'"
		class="j-start align-center m-b-15">
			<p class="text-muted small m-b-0">
				<i class="bi bi-info-circle m-r-5"></i>
				No se pudo generar el resumen de esta sugerencia.
			</p>
			<b-button
			variant="outline-secondary"
			class="btn-modulo m-l-10"
			:disabled="enviando_reintento"
			@click="reintentar">
				<b-spinner
				v-if="enviando_reintento"
				small
				class="m-r-5"></b-spinner>
				Reintentar
			</b-button>
		</div>

	</div>
</template>
<script>
/*
	Resumen escrito por IA sobre la sugerencia de compra ya calculada. Mismo
	molde que sugerencias-de-stock/ResumenIa.vue: tres estados visibles
	(pendiente / listo / error) y uno invisible (null: la cuenta no tiene IA
	contratada, el bloque no existe). En error, el boton Reintentar vuelve a pedir
	el resumen al backend y deja el ciclo en manos del polling del Detalle.
*/
export default {
	props: {
		sugerencia: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// true mientras viaja el POST del reintento, para no dispararlo doble.
			enviando_reintento: false,
		}
	},
	computed: {
		estado() {
			return this.sugerencia.resumen_ia_estado
		},
	},
	methods: {
		/**
		 * Vuelve a pedir el resumen. El backend resetea el estado a pendiente y
		 * despacha el job de nuevo; aca solo se refleja ese pendiente en el objeto
		 * compartido (la carta pasa al spinner al toque) y se avisa al padre con
		 * @reintentado para que re-arme su polling, que es quien va a traer el
		 * texto cuando este listo. Si el backend rechaza (422: sugerencia no
		 * terminada o sin credenciales), se avisa con un toast y no se toca nada.
		 */
		reintentar() {
			let self = this
			this.enviando_reintento = true
			this.$api.post('purchase-suggestion/' + this.sugerencia.id + '/resumen')
			.then(function(res) {
				self.enviando_reintento = false
				self.sugerencia.resumen_ia = null
				self.sugerencia.resumen_ia_error = null
				self.sugerencia.resumen_ia_estado = 'pendiente'
				self.$emit('reintentado')
			})
			.catch(function(err) {
				console.log(err)
				self.enviando_reintento = false
				let mensaje = err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'No se pudo pedir el resumen de nuevo.'
				self.$bvToast.toast(mensaje, {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	},
}
</script>
<style lang="sass">
.resumen-ia-compra
	&__titulo
		font-weight: 600
	&__texto
		white-space: pre-line
</style>
