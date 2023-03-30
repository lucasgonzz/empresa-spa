<template>
	<b-row>
		<b-col
		class="col-header-22"
		cols="12"
		lg="7">
			<payment-method-afip-information></payment-method-afip-information>
		</b-col>
		<b-col
		lg="5"
		cols="12">
			<buttons></buttons>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		PaymentMethodAfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Index'),
		Buttons: () => import('@/components/vender/components/remito/header-2/Buttons'),
	}
}
</script>
<style lang="sass">