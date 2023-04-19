<template>
	<StreamBarcodeReader 
	class="d-lg-none"
	@decode="onDecode" @loaded="onLoaded"></StreamBarcodeReader>
</template>
<script>
import { StreamBarcodeReader } from "vue-barcode-reader"
export default {
	components: {
		StreamBarcodeReader,
	},
	methods: {
		onDecode(result) {
			alert(result)
			this.$emit('setBarCode', result)
		},
		onLoaded() {
			console.log('cargo Streamer')
		}
	}
}
</script>