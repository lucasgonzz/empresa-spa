<template>
	<div
	class="cont-inputs"
	v-if="article_price_type">
	
		<b-input-group
		prepend="%">
			<b-form-input
			type="number"
			v-model="article_price_type.pivot.percentage"
			placeholder="Porcentaje"></b-form-input>
		</b-input-group>

		<div
		class="cont-prices m-t-10">

			<div 
			v-if="hasExtencion('elegir_si_incluir_lista_de_precios_de_excel')">
				<b-form-checkbox
				variant="success"
				:value="1"
				:unchecked-value="0"
				v-model="article_price_type.pivot.incluir_en_excel_para_clientes"
				size="sm">
					Incluir en Excel
				</b-form-checkbox>
			</div>
			
			<div class="cont-price price">
				{{ price(article_price_type.pivot.price) }}
			</div>

			<div class="cont-price cont-iva">
				{{ price(article_price_type.pivot.final_price) }}
			</div>

			<div class="cont-price">
				{{ price(article_price_type.pivot.previus_final_price) }}
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		price_type: Object,
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		article_price_type() {
			return this.article.price_types.find(price_type => price_type.id == this.price_type.id)
		}
	}
}
</script>
<style lang="sass">
.cont-inputs
	display: flex 
	flex-direction: column 
	align-items: center 
	justify-content: flex-start  
	
	input 
		width: 140px

	.cont-prices
		width: 100%
		display: flex 
		flex-direction: row 
		justify-content: flex-start
		align-items: center

		.cont-price 
			border: 1px solid rgba(0,0,0,.6)
			border-radius: 7px
			margin: 0 5px
			padding: 2px 5px
			color: rgba(0,0,0,.8)

		.price
			background: rgba(0,0,0,.6)
			color: #FFF

		.cont-iva
			background: lighten(green, 10)
			color: #FFF
			font-weight: bold

</style>