<template>
	<div>
        <b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-item
		@click="pdf">
			<i class="icon-pdf"></i>
			PDF
		</b-dropdown-item>
	</div>
</template>
<script>
export default {
	computed: {
		filters() {
			return this.$store.state.client.filters 
		},
  	},
	methods: {
		pdf() {

			let jsonData = JSON.stringify(this.filters)

			let link = process.env.VUE_APP_API_URL+'/client/pdf?filters='+jsonData
			window.open(link)
		}
	}
}
</script>