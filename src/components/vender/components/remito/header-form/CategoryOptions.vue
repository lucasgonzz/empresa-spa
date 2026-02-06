<template>
	<div
	class="j-center"
	v-if="hasExtencion('buscar_por_categoria_en_vender')">
		
		<b-form-select
		class="select-category"
		:value="category_id"
		@input="$emit('update:category_id', $event)"
		:options="get_options_simple('category')"></b-form-select>
		
		<b-form-select
		class="select-category"
		:value="stock_option"
		@input="$emit('update:stock_option', $event)"
		:options="stock_options"></b-form-select>
	</div>
</template>
<script>
export default {
	props: {
		category_id: Number,
		stock_option: String,
	},
	computed: {
		stock_options() {
			return [
				{
					text: 'Con o sin Stock',
					value: 'con_o_sin_stock',
				},
				{
					text: 'Con Stock',
					value: 'con_stock',
				},
				{
					text: 'Que hayan tenido Stock',
					value: 'hayan_tenido_stock',
				},
			]
		}
	}
}
</script>
<style lang="sass">
.select-category
	width: 250px !important
	margin: 0 15px
</style>