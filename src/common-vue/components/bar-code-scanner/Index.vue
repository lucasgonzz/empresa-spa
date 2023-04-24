<template>
	<div>
		<scanner-modal
		:start="start"
		@setBarCode="setBarCode"></scanner-modal>
		<b-button
		@click="showModal"
		variant="primary">
			<i class="icon-camera"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	components: {
		ScannerModal: () => import('@/common-vue/components/bar-code-scanner/ScannerModal'),
	},
	data() {
		return {
			start: false,
		}
	},
	methods: {
		setBarCode(bar_code) {
			this.$emit('setBarCode', bar_code)
		},
		showModal() {
			this.start = !this.start
			this.$bvModal.show('scanner-modal')
		}
	}
}
</script>