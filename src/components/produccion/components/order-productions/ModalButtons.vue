<template>
	<div
	v-if="model.id">
		<b-button
		block
		@click="printTickets"
		variant="outline-primary">
			<i class="icon-print"></i>
			Imprimir etiquetas
		</b-button>
		<b-button-group
		class="m-t-15 w-100">
			<b-button
			@click="printWithoutPrices"
			variant="outline-danger">
				<i class="icon-print"></i>
				Sin precios
			</b-button>
			<b-button
			@click="printWithPrices"
			variant="danger">
				<i class="icon-print"></i>
				Con precios
			</b-button>
		</b-button-group>
		<hr>
	</div>
</template>
<script>
export default {
	computed: {
		model_name() {
			return 'order_production'
		},
		model() {
			return this.$store.state[this.model_name].model
		},
	},
	methods: {
		printTickets() {
			let link = process.env.VUE_APP_API_URL+'/order-production/articles-pdf/'+this.model.id
			window.open(link)
		},
		printWithoutPrices() {
            var link = process.env.VUE_APP_API_URL+'/order-production/pdf/'+this.model.id+'/0'
            window.open(link)
		},
		printWithPrices() {
            var link = process.env.VUE_APP_API_URL+'/order-production/pdf/'+this.model.id+'/1'
            window.open(link)
		},
	}
}
</script>