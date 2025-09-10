<template>
	<div
	class="cont-price-types">

		<b-input-group
		prepend="%">
			<b-form-input
			type="number"
			:disabled="!indicar_percentage"
			v-model="article_price_type.pivot.percentage"
			placeholder="Porcentaje"></b-form-input>
		</b-input-group>
	
		<b-input-group
		class="m-t-10"
		prepend="$">
			<b-form-input
			:disabled="!indicar_final_price"
			type="number"
			v-model="article_price_type.pivot.final_price"
			placeholder="Precio final"></b-form-input>
		</b-input-group>
	</div>
</template>
<script>
export default {
	props: {
		article_price_type: Object,
	},
	computed: {
		indicar_percentage() {
			if (this.article_price_type.pivot.setear_precio_final) {
				return false
			}
			return true
		},
		indicar_final_price() {
			if (this.article_price_type.pivot.setear_precio_final) {
				return true
			}
			return false
		},
		
	},
}
</script>