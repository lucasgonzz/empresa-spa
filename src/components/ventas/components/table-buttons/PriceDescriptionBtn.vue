<template>
	<!-- Botón visible solo si la venta tiene price_description guardado -->
	<b-button
	v-if="sale.price_description"
	class="m-l-5"
	@click.stop="show"
	variant="outline-info"
	size="sm">
		?
	</b-button>
</template>
<script>
export default {
	props: {
		// Objeto venta del listado; se usa su propiedad price_description (JSON string)
		sale: {
			type: Object,
			required: true,
		},
	},
	methods: {
		/**
		 * Parsea el JSON de price_description, lo guarda en el store y abre el modal.
		 * Si el JSON es inválido lo informa en consola y no abre el modal.
		 */
		show() {
			let descriptions = []

			try {
				// price_description llega como JSON string desde el backend
				descriptions = JSON.parse(this.sale.price_description)
			} catch (e) {
				console.error('PriceDescriptionBtn: no se pudo parsear price_description', e)
				return
			}

			// Guarda el array en el store para que el modal lo lea
			this.$store.commit('sale/set_sale_price_description', descriptions)

			// Abre el modal compartido de descripción de precios (id definido en common/PriceDescription.vue)
			this.$bvModal.show('final-price-description')
		},
	},
}
</script>
