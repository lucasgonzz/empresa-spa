<template>
	<section class="features_section">
		<div class="features_container">
			<div class="heading_block">
				<h2>{{ section_data.title_text }}</h2>
				<p>{{ section_data.description_text }}</p>
			</div>
			<div class="cards_grid">
				<article
					v-for="(card, index) in section_data.cards"
					:key="'feature_card_' + index"
					class="feature_card">
					<img :src="card.image_url" :alt="'feature_image_' + index">
					<h3>{{ card.title }}</h3>
					<p>{{ card.description }}</p>
				</article>
			</div>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomeFeaturesSection',
	props: {
		/**
		 * Datos de cabecera y tarjetas de funcionalidades.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.features_section
	padding: 60px 0

.features_container
	max-width: 1200px
	margin: 0 auto
	padding: 0 20px

.heading_block
	max-width: 760px
	margin: 0 auto 24px
	text-align: center
	h2
		font-size: 34px
	p
		color: #5E708A

.cards_grid
	display: grid
	grid-template-columns: repeat(3, minmax(0, 1fr))
	gap: 14px

.feature_card
	background: white
	border-radius: 14px
	border: 1px solid #DFE7F4
	padding: 16px
	img
		width: 100%
		height: 160px
		object-fit: cover
		border-radius: 10px
		margin-bottom: 10px
	h3
		font-size: 22px
		margin-bottom: 8px
	p
		color: #5F7089
		margin: 0

@media screen and (max-width: 992px)
	.cards_grid
		grid-template-columns: 1fr 1fr

@media screen and (max-width: 768px)
	.cards_grid
		grid-template-columns: 1fr
</style>
