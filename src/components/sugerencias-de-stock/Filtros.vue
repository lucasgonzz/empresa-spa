<template>
	<div class="sugerencia-filtros j-start align-end m-b-15">

		<b-form-group
		class="m-r-25 m-b-0"
		label="Deposito origen">
			<b-form-select
			class="toolbar-select"
			v-model="from_address_id"
			:options="opciones_origen"></b-form-select>
		</b-form-group>

		<b-form-group
		class="m-r-25 m-b-0"
		label="Deposito destino">
			<b-form-select
			class="toolbar-select"
			v-model="to_address_id"
			:options="opciones_destino"></b-form-select>
		</b-form-group>

		<b-form-group
		class="m-b-0"
		label="Ordenar por">
			<b-form-select
			class="toolbar-select"
			v-model="order"
			:options="opciones_orden"></b-form-select>
		</b-form-group>

	</div>
</template>
<script>
/*
	Filtros de la tabla priorizada: origen, destino y orden. Cada cambio comitea el
	filtro al store y vuelve a pedir la pagina 1 al backend (el filtrado es
	server-side, nunca sobre la pagina cargada).
*/
export default {
	computed: {
		opciones_origen() {
			return this.opciones_de_sucursal('Todos los origenes')
		},
		opciones_destino() {
			return this.opciones_de_sucursal('Todos los destinos')
		},
		opciones_orden() {
			return [
				{value: 'prioridad', text: 'Prioridad (dias hasta quiebre)'},
				{value: 'cantidad', text: 'Cantidad sugerida'},
			]
		},
		from_address_id: {
			get() {
				return this.$store.state.stock_suggestion_article.filtros.from_address_id
			},
			set(value) {
				this.aplicar_filtro({from_address_id: value})
			},
		},
		to_address_id: {
			get() {
				return this.$store.state.stock_suggestion_article.filtros.to_address_id
			},
			set(value) {
				this.aplicar_filtro({to_address_id: value})
			},
		},
		order: {
			get() {
				return this.$store.state.stock_suggestion_article.filtros.order
			},
			set(value) {
				this.aplicar_filtro({order: value})
			},
		},
	},
	methods: {
		/**
		 * Arma las opciones de un select de sucursal, con el 0 como "todas".
		 * El nombre de la sucursal vive en street (asi se llama en todo el sistema).
		 */
		opciones_de_sucursal(texto_todas) {
			let options = [{value: 0, text: texto_todas}]
			this.$store.state.address.models.forEach(address => {
				options.push({
					value: address.id,
					text: address.street,
				})
			})
			return options
		},
		/**
		 * Comitea el filtro cambiado y recarga la tabla desde la pagina 1: cambiar
		 * un filtro invalida la pagina en la que se estaba parado.
		 */
		aplicar_filtro(filtro) {
			this.$store.commit('stock_suggestion_article/set_filtros', filtro)
			this.$store.dispatch('stock_suggestion_article/getArticles', {page: 1})
		},
	}
}
</script>
<style lang="sass">
.sugerencia-filtros
	flex-wrap: wrap
	row-gap: 10px
</style>
