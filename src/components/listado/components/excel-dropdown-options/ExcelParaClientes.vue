<template>
	<b-dropdown-item
	v-if="show"
	@click="exportModels">
		<i class="icon-download"></i>
		Excel Clientes
	</b-dropdown-item>
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
		exportModels() {
			let url = process.env.VUE_APP_API_URL+'/article-clients/excel/export'
			window.open(url)		
		}
	},
}
</script>