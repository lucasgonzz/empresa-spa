<template>
	<b-modal
	title="Calculo del precio"
	hide-footer
	size="md"
	id="final-price-description">
		<div
		v-for="des in price_descriptions">
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
	props: {
		price_descriptions: Array,
	}
}
</script>