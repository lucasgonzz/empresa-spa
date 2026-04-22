<template>
	<section class="testimonial_section">
		<div class="testimonial_container">
			<h2>{{ section_data.title_text }}</h2>
			<div class="testimonial_card">
				<img :src="section_data.author_image_url" alt="testimonial_image">
				<blockquote>{{ section_data.quote_text }}</blockquote>
				<p>{{ section_data.author_name }} - {{ section_data.author_role }}</p>
			</div>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomeTestimonialSection',
	props: {
		/**
		 * Datos de prueba social (frase, autor e imagen).
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.testimonial_section
	padding: 55px 0
	background: linear-gradient(135deg, #1E3658 0%, #294F7B 100%)
	color: white

.testimonial_container
	max-width: 900px
	margin: 0 auto
	padding: 0 20px
	text-align: center
	h2
		margin-bottom: 18px

.testimonial_card
	img
		width: 82px
		height: 82px
		object-fit: cover
		border-radius: 50%
		border: 2px solid rgba(255, 255, 255, .45)
		margin-bottom: 10px
	blockquote
		font-size: 26px
		line-height: 1.2
		margin: 0 0 12px
	p
		margin: 0
		opacity: .88

@media screen and (max-width: 768px)
	.testimonial_card blockquote
		font-size: 22px
</style>
