<template>
	<b-button
	@click.stop="excel"
	variant="success">
		<i class="icon-download"></i>
		Excel
	</b-button>
</template>
<script>
export default {
	props: {
		apertura_caja: Object,
	},
	methods: {
		excel() {
            let link = process.env.VUE_APP_API_URL+'/apertura-caja/excel/export/'+this.apertura_caja.id
            window.open(link)
		}
	}
}
</script>