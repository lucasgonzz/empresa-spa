<template>
	<b-button
	v-if="selected_payment_methods.length"
	v-b-modal="'total-info'"
	variant="outline-primary">
		<i class="icon-info"></i>
	</b-button>
</template>
<script>
export default {
	computed: {
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
	}
}
</script>