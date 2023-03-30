<template>
	<b-button
	v-if="model.id"
	block
	@click="print"
	variant="outline-danger">
		<i class="icon-print"></i>
		Imprimir
	</b-button>
</template>
<script>
export default {
	props: {
		model_name: String,
		model: Object,
	},
	methods: {
		print() {
            var link = process.env.VUE_APP_API_URL+'/'+this.routeString(this.model_name)+'/pdf/'+this.model.id
            window.open(link)
		},
	}
}
</script>