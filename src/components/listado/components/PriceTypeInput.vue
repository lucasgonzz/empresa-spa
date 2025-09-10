<template>
	<div
	class="cont-inputs card p-10 j-start"
	v-if="article_price_type">

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

			<div>
				<b-form-checkbox
				variant="success"
				:value="1"
				:unchecked-value="0"
				v-model="article_price_type.pivot.setear_precio_final"
				size="sm">
					Setear precio final
				</b-form-checkbox>

				<div
				v-if="price_type_store.price_type_surchages.length">
					<div class="cont-price price m-b-5">
						Con recargos: {{ price(article_price_type.pivot.precio_luego_de_recargos) }}
					</div>

					<div class="cont-price cont-iva">
						Monto ganancia: {{ price(article_price_type.pivot.monto_ganancia) }}
					</div>
				</div>
			</div>
			
			<!-- <div
			class="j-start">
				<div class="cont-price price">
					{{ price(article_price_type.pivot.price) }}
				</div>

				<div class="cont-price cont-iva">
					{{ price(article_price_type.pivot.final_price) }}
				</div>

				<div class="cont-price">
					{{ price(article_price_type.pivot.previus_final_price) }}
				</div>
			</div> -->
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
			return this.local_article_price_type
		},
		price_type_store() {
			return this.$store.state.price_type.models.find(p => p.id == this.price_type.id)
		},
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
	data() {
		return {
			local_article_price_type: null
		}
	},
	watch: {
		article: {
			handler: 'init_article_price_type',
			immediate: true
		},
		local_article_price_type: {
			handler(new_val) {
				if (!this.article.id) {
					const index = this.article.price_types.findIndex(pt => pt.id == this.price_type.id)

					if (index !== -1) {
						this.article.price_types.splice(index, 1, JSON.parse(JSON.stringify(new_val)))
					} else {
						this.article.price_types.push(JSON.parse(JSON.stringify(new_val)))
					}
				}
			},
			deep: true
		}
	},
	methods: {
		init_article_price_type() {
			if (this.article.id) {
				this.local_article_price_type = this.article.price_types.find(price_type => price_type.id == this.price_type.id)
			} else {
				this.local_article_price_type = {
					id: this.price_type.id,
					pivot: {
						price_type_id: this.price_type.id,
						percentage: '',
						final_price: '',
						setear_precio_final: this.price_type_store.setear_precio_final,
						incluir_en_excel_para_clientes: 1
					}
				}
			}
		}
	},
}
</script>
<style lang="sass">
.cont-inputs
	display: flex 
	flex-direction: column 
	align-items: flex-start
	justify-content: flex-start  
	
	input 
		width: 140px

	.cont-price-types
		display: flex  
		flex-direction: column

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