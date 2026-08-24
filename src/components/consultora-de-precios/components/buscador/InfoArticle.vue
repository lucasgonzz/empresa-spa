<template>
	<div class="info-article">
		<div
		v-if="article">
			<p 
			class="name">
				{{ article.name }}	
				<span
				v-if="variant">
					{{ variant.variant_description }}
				</span>
			</p>

			<p 
			class="price">
				{{ price(article.final_price) }}	
			</p>
			
			<div
			v-if="current_acount_payment_method_discounts.length">

				<div
				v-for="payment_method in current_acount_payment_method_discounts"
				class="price-with-discount">

					<span>
						{{ payment_method.current_acount_payment_method.name }}
					</span> 
					<strong>
						{{ get_price_with_discount(payment_method) }}
					</strong>
				</div>
				
			</div>

		</div>
	</div>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.consultora_de_precio.article 
		},
		variant() {
			return this.$store.state.consultora_de_precio.variant 
		},
	},
	methods: {
		get_price_with_discount(payment_discount) {

			let price = this.aplicar_monto_descuento(this.article.final_price, payment_discount.current_acount_payment_method.id)

			// 🔴 Sin redondear, y es a proposito: mismo caso que get_price_with_discount_in_vender()
			// de src/mixins/model_functions.js. El precio ya tiene el descuento por forma de pago
			// aplicado, y el backend no redondea despues de un descuento. La consultora de precios
			// tiene que cotizar el mismo numero que la venta va a cobrar.
			return this.price(price)
		}
	}
}
</script>
<style lang="sass">
.consultora-de-precios
	.info-article
		p 
			margin: 0
			font-size: 40px

		.price 
			font-weight: bold

		.price-with-discount
			margin: 10px auto
			font-size: 30px 
			width: 500px
			display: flex  
			flex-direction: row  
			justify-content: space-between
</style>