<template>
	<section class="modules_section">
		<div class="modules_container">
			<article
				v-for="(module_item, index) in section_data.sections"
				:key="'module_item_' + index"
				:class="['module_row', index % 2 !== 0 ? 'reverse' : '']">
				<div class="copy_block">
					<span>{{ module_item.label }}</span>
					<h3>{{ module_item.title }}</h3>
					<p>{{ module_item.description }}</p>
				</div>
				<div class="visual_block">
					<img :src="module_item.image_url" :alt="'module_image_' + index">
				</div>
			</article>
		</div>
	</section>
</template>

<script>
export default {
	name: 'HomeModulesSection',
	props: {
		/**
		 * Datos de listado de módulos y sus imágenes.
		 */
		section_data: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.modules_section
	padding: 10px 0 50px

.modules_container
	max-width: 1200px
	margin: 0 auto
	padding: 0 20px

.module_row
	display: grid
	grid-template-columns: 1fr 1fr
	align-items: center
	gap: 22px
	margin-top: 20px

.module_row.reverse
	.copy_block
		order: 2
	.visual_block
		order: 1

.copy_block
	span
		color: #266CFD
		font-weight: 700
		text-transform: uppercase
		font-size: 12px
	h3
		font-size: 30px
		margin: 8px 0
	p
		color: #60728C
		margin: 0

.visual_block
	img
		width: 100%
		border-radius: 14px
		border: 1px solid #DEE8F4

@media screen and (max-width: 992px)
	.module_row
		grid-template-columns: 1fr
	.module_row.reverse
		.copy_block,
		.visual_block
			order: initial
</style>
