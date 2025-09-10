<template>
	<div>
		<b-button
		size="sm"
		class="m-l-5"
		variant="outline-primary"
		@click.stop="ver">
			<i class="icon-dolar"></i>
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