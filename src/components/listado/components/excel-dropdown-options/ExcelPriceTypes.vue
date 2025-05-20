<template>
	<div
	v-if="show">
		<b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-text>
			
			<h5>
				<i class="icon-down"></i>
				Excel para Clientes
			</h5>
		</b-dropdown-text>
		<b-dropdown-divider></b-dropdown-divider>

		<b-dropdown-item
		@click="exportModels(null)">
			<i class="icon-check"></i>
			Todas las listas de precio
		</b-dropdown-item>


		<b-dropdown-item
		v-for="price_type in price_types"
		@click="exportModels(price_type)">
			<i class="icon-right"></i>
			Solo lista {{ price_type.name }}
		</b-dropdown-item>
	</div>
</template>
<script>
export default {
	computed: {
		price_types() {
			return this.$store.state.price_type.models 
		},
		show() {
			return this.price_types.length
		},
	},
	methods: {
		exportModels(price_type = null) {

			let url = process.env.VUE_APP_API_URL+'/article-clients/excel/export'

			if (price_type) {
				url += '/'+price_type.id
			}
			console.log(url)
			window.open(url)		
		}
	},
}
</script>