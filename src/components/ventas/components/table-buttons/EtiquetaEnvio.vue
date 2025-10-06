<template>
	<div>
		<b-button
		v-if="sale.client"
		size="sm"
		class="m-l-5"
		variant="outline-primary"
		@click.stop="ver">
			<i class="icon-tag"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		ver() {
            var link = process.env.VUE_APP_API_URL+'/sale/etiqueta-envio/pdf/'+this.sale.id
            window.open(link)
		},
	},
}
</script>