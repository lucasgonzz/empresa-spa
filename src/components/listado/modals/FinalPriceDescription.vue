<template>
	<price-description
	:price_descriptions="final_price_description"
	:detalle="final_price_detalle"
	:cargando="cargando"
	:error="error"></price-description>
</template>
<script>
export default {
	components: {
		PriceDescription: () => import('@/components/common/PriceDescription'),
	},
	computed: {
		/**
		 * El desglose en texto plano. Es el fallback: si el backend mandó `detalle`, el modal usa
		 * aquel y este ni se mira.
		 */
		final_price_description() {
			return this.$store.state.article.final_price_description
		},
		/**
		 * El desglose estructurado (clave `detalle` de la respuesta), con el tipo de cada renglón.
		 */
		final_price_detalle() {
			return this.$store.state.article.final_price_detalle
		},
		cargando() {
			return this.$store.state.article.final_price_description_cargando
		},
		error() {
			return this.$store.state.article.final_price_description_error
		},
	},
}
</script>
