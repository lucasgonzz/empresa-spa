<template>
	<div>
		<p
		v-for="category in categories_predictor">
			{{ category.domain_name }}
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		categories_predictor() {
			return this.$store.state.meli.categories_predictor
		}
	}
}
</script>