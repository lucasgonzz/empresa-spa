<template>
	<!--
		Una descripción: texto, importe, IVA y quitar. En escritorio y tablet van en una fila; en
		teléfono el texto ocupa todo el ancho y debajo van importe e IVA lado a lado.
	-->
	<div class="dev-descripcion">
		<b-form-textarea
		class="dev-descripcion__texto"
		placeholder="Descripción"
		rows="1"
		max-rows="4"
		v-model="description.notes"></b-form-textarea>

		<input
		type="number"
		step="any"
		class="form-control dev-descripcion__importe"
		placeholder="Importe"
		@input="call_set_total_devolucion"
		@change="call_set_total_devolucion"
		v-model="description.price">

		<b-form-select
		class="dev-descripcion__iva"
		:options="getOptions({key: 'iva_id', text: 'Iva'})"
		v-model="description.iva_id"></b-form-select>

		<b-button
		class="dev-btn-icono dev-descripcion__quitar"
		variant="link"
		title="Quitar descripción"
		@click="del">
			<i class="bi bi-trash"></i>
		</b-button>
	</div>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	props: {
		// Fila de `devoluciones.descriptions` ({notes, price, iva_id}); se edita en el lugar.
		description: Object,
	},
	methods: {
		/**
		 * Quita la descripción y recalcula el total (su importe deja de sumar).
		 */
		del() {
			this.$store.commit('devoluciones/delete_description', this.description)
			this.set_total_devolucion()
		},
		/**
		 * Recalcula el total al cambiar el importe.
		 */
		call_set_total_devolucion() {
			this.set_total_devolucion()
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-descripcion
		display: grid
		grid-template-columns: minmax(0, 1fr) 140px 150px 34px
		grid-template-areas: "texto importe iva quitar"
		gap: 10px
		align-items: start

		@media screen and (max-width: 576px)
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 34px
			grid-template-areas: "texto texto texto" "importe iva quitar"

	.dev-descripcion__texto
		grid-area: texto

	.dev-descripcion__importe
		grid-area: importe
		text-align: right

	.dev-descripcion__iva
		grid-area: iva

	.dev-descripcion__quitar
		grid-area: quitar
		margin-top: 2px
</style>
