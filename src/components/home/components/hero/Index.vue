<template>
	<section class="hero_section">
		<div class="hero_container">
			<div class="hero_copy">
				<span class="hero_badge">{{ section_data.badge_text }}</span>
				<h1>{{ section_data.title_text }}</h1>
				<p>{{ section_data.description_text }}</p>
				<div class="cta_block">
					<a :href="section_data.primary_cta_url" target="_blank" rel="noopener" class="btn_primary">
						{{ section_data.primary_cta_label }}
					</a>
					<a :href="section_data.secondary_cta_url" target="_blank" rel="noopener" class="btn_secondary">
						{{ section_data.secondary_cta_label }}
					</a>
				</div>
			</div>
			<div class="hero_visual">
				<img :src="section_data.hero_image_url" alt="hero_image" class="hero_image">
				<div class="hero_panel">
					<strong>{{ section_data.panel_title }}</strong>
					<ul>
						<li
							v-for="(item, index) in section_data.panel_items"
							:key="'hero_panel_item_' + index">
							{{ item }}
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomeHeroSection',
	props: {
		/**
		 * Datos para título, CTAs, imagen principal y lista de panel.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.hero_section
	padding: 56px 0
	background: radial-gradient(circle at 80% 0, #E2F0FF 0%, #F6F8FC 45%)

.hero_container
	max-width: 1200px
	margin: 0 auto
	padding: 0 20px
	display: grid
	grid-template-columns: 1.1fr 1fr
	gap: 24px
	align-items: center

.hero_copy
	h1
		font-size: 44px
		line-height: 1.1
		margin: 12px 0
	p
		color: #5D6F89
		margin-bottom: 20px

.hero_badge
	display: inline-block
	background: #EAF2FF
	color: #256BFD
	padding: 7px 12px
	border-radius: 999px
	font-weight: 600
	font-size: 13px

.cta_block
	display: flex
	gap: 10px
	flex-wrap: wrap

.btn_primary
	background: linear-gradient(135deg, #256BFD 0%, #0FA4E8 100%)
	color: white
	padding: 12px 18px
	border-radius: 10px
	text-decoration: none
	font-weight: 600

.btn_secondary
	background: white
	color: #256BFD
	padding: 12px 18px
	border-radius: 10px
	text-decoration: none
	font-weight: 600
	border: 1px solid #D8E2F0

.hero_visual
	position: relative

.hero_image
	width: 100%
	border-radius: 16px
	border: 1px solid #DCE7F5

.hero_panel
	background: white
	border: 1px solid #DDE7F5
	border-radius: 12px
	padding: 14px
	max-width: 320px
	position: absolute
	right: -10px
	bottom: -18px
	strong
		display: block
		margin-bottom: 8px
	ul
		padding-left: 18px
		margin: 0
	li
		color: #586B86
		margin-bottom: 5px

@media screen and (max-width: 992px)
	.hero_container
		grid-template-columns: 1fr
	.hero_copy h1
		font-size: 34px
	.hero_panel
		position: static
		margin-top: 12px
		max-width: 100%
</style>
