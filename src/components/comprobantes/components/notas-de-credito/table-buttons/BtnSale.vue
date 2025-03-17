<template>
	<div>
		<b-button
		variant="primary"
		@click.stop="show_sale" 
		v-if="nota_credito.sale">
			Venta N° {{ nota_credito.sale.num }}
		</b-button>
	</div> 
</template>
<script>
export default {
	props: {
		nota_credito: Object,
	},
	methods: {
		show_sale() { 
            this.show_model('sale', this.nota_credito.sale.id)
		}
	}
}
</script>