<template>
	<b-modal
	title="Calculo del precio"
	hide-footer
	size="md"
	id="final-price-description">
		<div
		v-for="des in final_price_description">
			<div
			v-if="des === des.toUpperCase()">
				<hr>
				<h4>
					{{ des }}
				</h4>
				<hr>
			</div>
			<p
			v-else>
				{{ des }}
			</p>
		</div>
	</b-modal>
</template>
<script>
export default {
	computed: {
		final_price_description() {
			return this.$store.state.article.final_price_description
		},
	},
}
</script>