<template>
	<div>
		<b-button
		size="sm"
		class="m-l-5"
		variant="outline-primary"
		title="Plan de pago"
		@click.stop="ver">
			<i class="bi bi-credit-card"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		ver() {
			this.setModel(this.sale, 'sale', [], false)
			this.$bvModal.show('payment_plan')
		},
	},
}
</script>