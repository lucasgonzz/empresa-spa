<template>
	<div>
		<b-button
		@click.stop="ver">Plan de pagos</b-button>
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