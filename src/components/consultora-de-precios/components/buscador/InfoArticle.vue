<template>
	<div class="info-article">
		<div
		v-if="article">
			<p 
			class="name">
				{{ article.name }}	
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
		}
	},
	methods: {
		get_price_with_discount(payment_discount) {

			let price = this.aplicar_monto_descuento(this.article.final_price, payment_discount.current_acount_payment_method.id)

			return this.price(this.redondear(price))
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