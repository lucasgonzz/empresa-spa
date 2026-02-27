<template>
	<price-description
	:price_descriptions="final_price_description"></price-description>
</template>
<script>
export default {
	components: {
		PriceDescription: () => import('@/components/common/PriceDescription'),
	},
	computed: {
		final_price_description() {
			return this.$store.state.article.final_price_description
		},
	},
}
</script>