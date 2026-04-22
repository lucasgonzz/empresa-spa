<template>
	<header class="home_nav">
		<div class="home_nav_container">
			<div class="brand_block">
				<img :src="section_data.brand_logo_url" alt="brand_logo" class="brand_logo">
				<div class="brand_text">
					<strong>{{ section_data.brand_name }}</strong>
					<span>{{ section_data.brand_tagline }}</span>
				</div>
			</div>
			<div class="actions_block">
				<router-link :to="{ name: section_data.login_route_name }" class="btn_link">
					{{ section_data.login_label }}
				</router-link>
				<a :href="section_data.primary_cta_url" target="_blank" rel="noopener" class="btn_primary">
					{{ section_data.primary_cta_label }}
				</a>
			</div>
		</div>
	</header>
</template>

<script>
export default {
	name: 'HomeNavSection',
	props: {
		/**
		 * Datos de navegación superior del home.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.home_nav
	position: sticky
	top: 0
	z-index: 50
	background: rgba(255, 255, 255, .94)
	border-bottom: 1px solid #E5EBF5

.home_nav_container
	max-width: 1200px
	margin: 0 auto
	padding: 14px 20px
	display: flex
	align-items: center
	justify-content: space-between

.brand_block
	display: flex
	align-items: center
	gap: 12px

.brand_logo
	width: 36px
	height: 36px
	border-radius: 8px

.brand_text
	display: flex
	flex-direction: column
	strong
		font-size: 16px
	span
		font-size: 12px
		color: #5F708A

.actions_block
	display: flex
	gap: 10px
	align-items: center

.btn_link
	color: #283A56
	text-decoration: none
	font-weight: 600

.btn_primary
	background: linear-gradient(135deg, #256BFD 0%, #0FA4E8 100%)
	color: white
	padding: 10px 16px
	border-radius: 10px
	text-decoration: none
	font-weight: 600

@media screen and (max-width: 768px)
	.home_nav_container
		flex-direction: column
		gap: 12px
		align-items: flex-start
</style>
