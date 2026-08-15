<template>
	<div class="sugerencia-compra-filtros j-start align-end m-b-15">

		<b-form-group
		class="m-r-25 m-b-0"
		label="Proveedor">
			<b-form-select
			v-model="provider_id"
			:options="opciones_proveedor"></b-form-select>
		</b-form-group>

		<b-form-group
		class="m-r-25 m-b-0"
		label="Ordenar por">
			<b-form-select
			v-model="order"
			:options="opciones_orden"></b-form-select>
		</b-form-group>

		<b-form-checkbox
		v-model="solo_cambio_de_proveedor"
		class="sugerencia-compra-filtros__checkbox">
			Solo cambios de proveedor
		</b-form-checkbox>

	</div>
</template>
<script>
/*
	Filtros de la tabla priorizada de compras: proveedor elegido, orden y un
	check para ver solo las lineas donde conviene comprarle a un proveedor
	distinto del habitual. Cada cambio comitea el filtro al store y vuelve a
	pedir la pagina 1 al backend (el filtrado es server-side, nunca sobre la
	pagina cargada). Molde de sugerencias-de-stock/Filtros.vue.
*/
export default {
	computed: {
		/**
		 * Opciones del select de proveedor, con el 0 como "todos". Se arma desde
		 * provider/options (lista liviana id+name), pedida por Index.vue al entrar
		 * al modulo.
		 */
		opciones_proveedor() {
			let options = [{value: 0, text: 'Todos los proveedores'}]
			this.$store.state.provider.options.forEach(provider => {
				options.push({
					value: provider.id,
					text: provider.name,
				})
			})
			return options
		},
		opciones_orden() {
			return [
				{value: 'prioridad', text: 'Prioridad (dias hasta quiebre)'},
				{value: 'cantidad', text: 'Cantidad sugerida'},
				{value: 'ahorro', text: 'Ahorro estimado'},
			]
		},
		provider_id: {
			get() {
				return this.$store.state.purchase_suggestion_article.filtros.provider_id
			},
			set(value) {
				this.aplicar_filtro({provider_id: value})
			},
		},
		order: {
			get() {
				return this.$store.state.purchase_suggestion_article.filtros.order
			},
			set(value) {
				this.aplicar_filtro({order: value})
			},
		},
		solo_cambio_de_proveedor: {
			get() {
				return this.$store.state.purchase_suggestion_article.filtros.solo_cambio_de_proveedor
			},
			set(value) {
				this.aplicar_filtro({solo_cambio_de_proveedor: value})
			},
		},
	},
	methods: {
		/**
		 * Comitea el filtro cambiado y recarga la tabla desde la pagina 1: cambiar
		 * un filtro invalida la pagina en la que se estaba parado.
		 */
		aplicar_filtro(filtro) {
			this.$store.commit('purchase_suggestion_article/set_filtros', filtro)
			this.$store.dispatch('purchase_suggestion_article/getArticles', {page: 1})
		},
	}
}
</script>
<style lang="sass">
.sugerencia-compra-filtros
	flex-wrap: wrap
	row-gap: 10px
	&__checkbox
		margin-bottom: .5rem
</style>
