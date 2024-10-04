<template>
	<b-button
	v-if="model && model.id"
	@click="print"
	block
	variant="outline-danger">
		<i class="icon-print"></i>
		Generar PDF
	</b-button>
</template>
<script>
export default {
	computed: {
		model() {
			return this.$store.state.deposit_movement.model 
		},
	},
	methods: {
		print() {
            var link = process.env.VUE_APP_API_URL+'/deposit-movement/pdf/'+this.model.id
            window.open(link) 
		}
	}
}
</script>