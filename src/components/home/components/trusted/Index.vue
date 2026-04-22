<template>
	<section class="trusted_section">
		<div class="trusted_container">
			<h2>{{ section_data.title_text }}</h2>
			<div class="logos_grid">
				<img
					v-for="(logo, index) in section_data.logos"
					:key="'trusted_logo_' + index"
					:src="logo"
					:alt="'trusted_logo_' + index">
			</div>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomeTrustedSection',
	props: {
		/**
		 * Datos de logos y título de empresas que confían.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.trusted_section
	background: white
	border-top: 1px solid #E6ECF6
	border-bottom: 1px solid #E6ECF6
	padding: 30px 0

.trusted_container
	max-width: 1200px
	margin: 0 auto
	padding: 0 20px
	h2
		font-size: 24px
		text-align: center
		margin-bottom: 16px

.logos_grid
	display: grid
	grid-template-columns: repeat(5, minmax(0, 1fr))
	gap: 10px
	img
		width: 100%
		height: 64px
		object-fit: contain
		border: 1px solid #E6ECF6
		border-radius: 10px
		background: #FAFCFF

@media screen and (max-width: 992px)
	.logos_grid
		grid-template-columns: repeat(3, minmax(0, 1fr))

@media screen and (max-width: 768px)
	.logos_grid
		grid-template-columns: repeat(2, minmax(0, 1fr))
</style>
