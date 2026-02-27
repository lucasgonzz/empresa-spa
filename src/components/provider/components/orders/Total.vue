<template>
	<div
	class="j-start"
	v-if="provider_order">
		<b-button
		class="m-r-10"
		@click="show"
		variant="outline-success"
		size="sm">
			?
		</b-button>
		<h4>
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