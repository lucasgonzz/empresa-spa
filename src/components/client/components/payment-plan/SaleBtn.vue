<template>
	<b-button
	class="m-l-10"
	@click.stop="show_sale">
		Venta
	</b-button>
</template>
<script>
export default {
	props: {
		payment_plan_cuota: Object,
	},
	methods: {
		show_sale() {
            this.show_model('sale', this.payment_plan_cuota.sale_id)
		}
	}
}
</script>