<template>
	<div
	class="j-start"
	v-if="provider_order">
		<b-button
		class="btn-explicacion m-r-10"
		@click="show"
		variant="outline-secondary"
		title="Ver cómo se calculó este total"
		size="sm">
			<i class="bi bi-question-lg"></i>
		</b-button>
		<h4 data-testid="compra-total">
			{{ price(provider_order.total) }}
		</h4>
	</div>
</template>
<script>
export default {
	computed: {
		provider_order() {
			return this.$store.state.provider_order.model 
		},
	},
	methods: {
		show() {
			this.$bvModal.show('final-price-description')
		}
	}
}
</script>