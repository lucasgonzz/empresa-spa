<template>
	<div
	v-if="show">
		<b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-item
		@click="exportModels">
			<i class="icon-users"></i>
			Excel para Clientes
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
		exportModels() {
			let url = process.env.VUE_APP_API_URL+'/article-clients/excel/export'
			window.open(url)		
		}
	},
}
</script>