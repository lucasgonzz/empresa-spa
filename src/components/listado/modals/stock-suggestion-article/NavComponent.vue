<template>
	<div
	class="j-start align-end m-b-20">
		<b-form-group
		class="m-r-25 m-b-0"
		label="Modo de agrupacion">
			<b-form-select
			v-model="modo_agrupacion"
			:options="agrupar_options"></b-form-select>
		</b-form-group>
		<b-form-group
		class="m-r-25 m-b-0"
		label="Deposito">
			<b-form-select
			v-model="address_id"
			:options="get_options_simple('address', 'street')"></b-form-select>
		</b-form-group>
		<b-button
		@click="buscar">
			Buscar
		</b-button>
	</div>
</template>
<script>
export default {
	data() {
		return {
			modo_agrupacion: 'origen',
			address_id: 0,
		}
	},
	computed: {
		agrupar_options() {
			return [
				{
					value: 'origen',
					text: 'Desde el deposito ORIGEN'
				},
				{
					value: 'destino',
					text: 'Hacia el deposito DESTINO'
				},
			]
		},
		stock_suggestion() {
			return this.$store.state.stock_suggestion.model
		}
	},
	methods: {
		buscar() {
			this.$api.post('stock-suggestion-article', {
				stock_suggestion_id: this.stock_suggestion.id,
				modo_agrupacion: this.modo_agrupacion,
				address_id: this.address_id,
			})
			.then(res => {
				this.$store.commit('stock_suggestion_article/set_stock_suggestion_articles', res.data.models)
			})
		}
	}
}
</script>