<template>
	<div class="ofertas-filtros j-start align-end m-b-15">

		<b-form-group
		class="m-r-25 m-b-0"
		label="Cliente">
			<b-form-select
			v-model="client_id"
			:options="opciones_cliente"></b-form-select>
		</b-form-group>

		<b-form-group
		class="m-r-25 m-b-0"
		label="Por que se sugiere">
			<b-form-select
			v-model="criterio"
			:options="opciones_criterio"></b-form-select>
		</b-form-group>

		<b-form-group
		class="m-r-25 m-b-0"
		label="Ordenar por">
			<b-form-select
			v-model="order"
			:options="opciones_orden"></b-form-select>
		</b-form-group>

		<b-form-checkbox
		v-model="solo_sin_activar"
		class="ofertas-filtros__checkbox">
			Solo las que todavia no active
		</b-form-checkbox>

	</div>
</template>
<script>
/*
	Filtros de la tabla de ofertas sugeridas: cliente, criterio por el que el
	motor la propuso, orden, y un check para esconder las que ya se activaron.
	Cada cambio comitea el filtro al store y vuelve a pedir la pagina 1 al
	backend (el filtrado es server-side, nunca sobre la pagina cargada). Molde de
	sugerencias-de-compra/Filtros.vue.
*/
export default {
	computed: {
		/**
		 * Opciones del select de cliente, con el 0 como "todos". Se arma desde
		 * client/options (lista liviana id+name), pedida por Index.vue al entrar al
		 * modulo.
		 */
		opciones_cliente() {
			let options = [{value: 0, text: 'Todos los clientes'}]
			this.$store.state.client.options.forEach(client => {
				options.push({
					value: client.id,
					text: client.name,
				})
			})
			return options
		},
		/*
			Los value son los mismos strings que guarda offer_suggestion_lines.criterio
			y que espera el filtro del endpoint: si se tocan aca, se tocan alla.
		*/
		opciones_criterio() {
			return [
				{value: '', text: 'Todos'},
				{value: 'afinidad', text: 'Ya lo compro antes'},
				{value: 'carrito_abandonado', text: 'Lo dejo en el carrito'},
				{value: 'reactivacion', text: 'Hace rato que no compra'},
			]
		},
		opciones_orden() {
			return [
				{value: 'prioridad', text: 'Prioridad'},
				{value: 'descuento', text: 'Descuento sugerido'},
				{value: 'score', text: 'Puntaje del motor'},
			]
		},
		client_id: {
			get() {
				return this.$store.state.offer_suggestion_line.filtros.client_id
			},
			set(value) {
				this.aplicar_filtro({client_id: value})
			},
		},
		criterio: {
			get() {
				return this.$store.state.offer_suggestion_line.filtros.criterio
			},
			set(value) {
				this.aplicar_filtro({criterio: value})
			},
		},
		order: {
			get() {
				return this.$store.state.offer_suggestion_line.filtros.order
			},
			set(value) {
				this.aplicar_filtro({order: value})
			},
		},
		solo_sin_activar: {
			get() {
				return this.$store.state.offer_suggestion_line.filtros.solo_sin_activar
			},
			set(value) {
				this.aplicar_filtro({solo_sin_activar: value})
			},
		},
	},
	methods: {
		/**
		 * Comitea el filtro cambiado y recarga la tabla desde la pagina 1: cambiar
		 * un filtro invalida la pagina en la que se estaba parado.
		 */
		aplicar_filtro(filtro) {
			this.$store.commit('offer_suggestion_line/set_filtros', filtro)
			this.$store.dispatch('offer_suggestion_line/getLines', {page: 1})
		},
	}
}
</script>
<style lang="sass">
.ofertas-filtros
	flex-wrap: wrap
	row-gap: 10px
	&__checkbox
		margin-bottom: .5rem
</style>
