<template>
	<b-button
	class="m-l-15"
	size="sm"
	variant="success"
	@click.stop="exportarExcel"
	v-b-modal="">
		<i class="icon-upload"></i>
		Ex excel
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		exportarExcel() {
            var link = process.env.VUE_APP_API_URL+'/provider-orders/export/'+this.model.id
            window.open(link)
		}
	}
}
</script>