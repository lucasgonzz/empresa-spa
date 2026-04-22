<template>
	<section class="final_cta_section">
		<div class="final_cta_container">
			<div class="copy_block">
				<h2>{{ section_data.title_text }}</h2>
				<p>{{ section_data.description_text }}</p>
			</div>
			<div class="actions_block">
				<a :href="section_data.primary_cta_url" target="_blank" rel="noopener" class="btn_primary">
					{{ section_data.primary_cta_label }}
				</a>
				<a :href="section_data.secondary_cta_url" target="_blank" rel="noopener" class="btn_secondary">
					{{ section_data.secondary_cta_label }}
				</a>
			</div>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomeFinalCtaSection',
	props: {
		/**
		 * Datos de bloque de conversión final.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.final_cta_section
	padding: 0 0 70px

.final_cta_container
	max-width: 1200px
	margin: 0 auto
	padding: 26px 20px
	border-radius: 16px
	background: linear-gradient(135deg, #256BFD 0%, #0FA4E8 100%)
	color: white
	display: flex
	align-items: center
	justify-content: space-between
	gap: 16px

.copy_block
	h2
		margin: 0 0 6px
	p
		margin: 0
		opacity: .92

.actions_block
	display: flex
	gap: 10px
	flex-wrap: wrap

.btn_primary
	background: white
	color: #256BFD
	padding: 10px 16px
	border-radius: 10px
	text-decoration: none
	font-weight: 600

.btn_secondary
	background: transparent
	color: white
	padding: 10px 16px
	border-radius: 10px
	text-decoration: none
	font-weight: 600
	border: 1px solid rgba(255, 255, 255, .55)

@media screen and (max-width: 768px)
	.final_cta_container
		flex-direction: column
		align-items: flex-start
</style>
