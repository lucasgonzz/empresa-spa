<template>
	<section class="pricing_section">
		<div class="pricing_container">
			<h2>{{ section_data.title_text }}</h2>
			<p>{{ section_data.description_text }}</p>
			<div class="cards_grid">
				<article
					v-for="(card, index) in section_data.cards"
					:key="'pricing_card_' + index"
					class="pricing_card">
					<h3>{{ card.name }}</h3>
					<strong>{{ card.price }}</strong>
					<span>{{ card.detail }}</span>
				</article>
			</div>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomePricingSection',
	props: {
		/**
		 * Datos de sección de planes y precios.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.pricing_section
	padding: 55px 0

.pricing_container
	max-width: 1200px
	margin: 0 auto
	padding: 0 20px
	text-align: center
	h2
		font-size: 34px
	p
		color: #5E708A
		margin: 8px 0 20px

.cards_grid
	display: grid
	grid-template-columns: repeat(3, minmax(0, 1fr))
	gap: 12px

.pricing_card
	background: white
	border: 1px solid #DFE8F4
	border-radius: 12px
	padding: 18px
	h3
		margin: 0 0 8px
	strong
		display: block
		font-size: 30px
		margin-bottom: 6px
	span
		color: #60728C

@media screen and (max-width: 992px)
	.cards_grid
		grid-template-columns: 1fr
</style>
