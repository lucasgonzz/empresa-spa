<template>
	<b-row>
		<b-col
		class="col-header-22"
		cols="12"
		lg="6">
			<payment-method-afip-information></payment-method-afip-information>
		</b-col>
		<b-col
		lg="6"
		cols="12">
			<buttons></buttons>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		PaymentMethodAfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Index'),
		Buttons: () => import('@/components/vender/components/remito/header-2/buttons/Index'),
	}
}
</script>
<style lang="sass">