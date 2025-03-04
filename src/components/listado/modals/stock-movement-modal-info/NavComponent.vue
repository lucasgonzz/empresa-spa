<template>
	<div 
	class="nav-stock-movements m-b-15 j-start">
		<div
		class="j-start align-center w-100">
			Mostrar los ultimos 
			<b-form-input
			type="number"
			min="1"
			v-model="ultimos_movimientos"></b-form-input>
			movimientos
		</div>

		<b-form-select
		v-model="concepto_id"
		:options="options"></b-form-select>

		<b-button
		@click="search"
		variant="primary">
			<i class="icon-search"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	computed: {
		ultimos_movimientos: {
			get() {
				return this.$store.state.article.stock_movement.ultimos_movimientos
			},
			set(value) {
				this.$store.commit('article/stock_movement/set_ultimos_movimientos', value)
			},
		},
		concepto_id: {
			get() {
				return this.$store.state.article.stock_movement.concepto_id
			},
			set(value) {
				this.$store.commit('article/stock_movement/set_concepto_id', value)
			},
		},
		options() {
			let options = [
				{
					value: 0,
					text: 'Todos'
				}
			]

			this.concepto_stock_movement.forEach(concepto => {
				options.push({
					value: concepto.id,
					text: concepto.name 
				})
			})

			return options
		},
		concepto_stock_movement() {
			return this.$store.state.concepto_stock_movement.models
		},
		article() {
			return this.$store.state.article.model
		},
	},
	methods: {
		search() {
			this.$store.dispatch('article/stock_movement/getModels', this.article)
		}
	}
}
</script>
<style lang="sass">
.nav-stock-movements
	input  
		width: 80px
		margin: 0 10px

	select  
		width: 250px
		margin-right: 15px
</style>