<template>
	<div>
		<b-button
		@click.stop="show_sale"
		v-if="movimiento_caja.sale">
			Venta N° {{ movimiento_caja.sale.num }}
		</b-button>
		<span
		v-else>
			{{ concepto }}
		</span>
	</div>
</template>
<script>
export default {
	props: {
		movimiento_caja: Object,
	},
	computed: {
		concepto() {
			return this.$store.state.concepto_movimiento_caja.models.find(model => model.id == this.movimiento_caja.concepto_movimiento_caja_id).name
		},
	},
	methods: {
		show_sale() {
            this.show_model('sale', this.movimiento_caja.sale_id)
		}
	}
}
</script>