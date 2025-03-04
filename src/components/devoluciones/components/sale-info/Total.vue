<template>
	<div
	class="j-between info-total">

		<div class="j-start">
			
			<b-button
			size="lg"
			variant="success">
				Total devolucion: <strong>{{ price(total_devolucion) }}</strong>
			</b-button>
		</div>

		<div 
		v-if="sale"
		class="j-end align-center">
			<p>
				Total venta: {{ price(sale.total) }}
			</p>
			<p
			class="m-l-25">
				Fecha: {{ date(sale.created_at, true) }}
			</p>
		</div>

	</div>
</template>
<script>
export default {
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale
		},
		total_devolucion() {
			return this.$store.state.devoluciones.total_devolucion
		},
	}
}
</script>