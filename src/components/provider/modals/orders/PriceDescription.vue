<template>
	<price-description
	:price_descriptions="price_description"></price-description>
</template>
<script>
export default {
	components: {
		PriceDescription: () => import('@/components/common/PriceDescription'),
	},
	computed: {
		price_description() {
			return this.$store.state.provider_order.model ? JSON.parse(this.$store.state.provider_order.model.price_description) : []
		},
	},
}
</script>