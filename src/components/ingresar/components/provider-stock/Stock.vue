<template>
	<b-col 
	md="6">
		<b-form-group
		label="Stock">
			<b-input-group
			class="m-b-10"
			prepend="Actual">
				<b-form-input
				type="number"
				min="0"
				@keydown.enter="changeToStockMin"
				placeholder="Ingresa el stock del producto"
				v-model="article.stock"
				autocomplete="off"></b-form-input>
			</b-input-group>
			<b-input-group
			prepend="Minimo">
				<b-form-input
				type="number"
				id="article-stock-min"
				min="0"
				@keydown.enter="changeToCategory"
				placeholder="Ingresa el stock minimo del producto"
				v-model="article.stock_min"
				autocomplete="off"></b-form-input>
			</b-input-group>
		</b-form-group>
		<deposits
		:article="article"></deposits>	
		<div
		v-if="show_checkboxs && article.stock != null">
			<b-form-group
			label="Cantidad para agregar">
				<b-form-input
				placeholder="Cantidad para sumar al stock"
				min="0"
				type="number"
				v-model="article.new_stock"></b-form-input>
			</b-form-group>
			<b-form-group>
				<b-form-checkbox
				v-model="article.stock_null"
				id="article-stock-null">
					Dejar de controlar stock
				</b-form-checkbox>
			</b-form-group>
		</div>
	</b-col>
</template>
<script>
import Deposits from '@/components/ingresar/components/provider-stock/Deposits'
export default {
	name: 'Stock',
	props: ['article', 'show_checkboxs'],
	components: {
		Deposits,
	},
	methods: {
		changeToStockMin() {
			document.getElementById('article-stock-min').focus()
		},
		changeToCategory() {
			document.getElementById('article-category').focus()
		},
	},
}
</script>
