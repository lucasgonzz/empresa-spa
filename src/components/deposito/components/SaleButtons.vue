<template>
	<div>
		<b-button
		v-if="view == 'confirmadas'"
		class="m-l-15"
		variant="success"
		@click.stop="terminada(sale)">
			<i class="icon-check"></i>
			Terminada
		</b-button> 

		<b-button
		class="m-l-15"
		variant="danger"
		@click.stop="print">
			<i class="icon-print"></i>
		</b-button> 

		<b-button
		class="m-l-15"
		variant="danger"
		@click.stop="deleteSale">
			<i class="icon-trash"></i>
		</b-button>
	</div>
</template>
<script>
import marcar_como_terminada from '@/mixins/sale/marcar_como_terminada'
export default {
	mixins: [marcar_como_terminada],
	props: {
		sale: Object,
	},
	methods: {
		deleteSale() {
			this.$store.commit('sale/setDelete', this.sale)
			this.$bvModal.show('delete-sale')
		},
		print() {
			let confirmed = 0
			if (this.view == 'confirmadas') {
				confirmed = 1
			}
            let link = process.env.VUE_APP_API_URL+'/sale/pdf/'+this.sale.id+'/0/0/0/'+confirmed
            window.open(link) 
		},
	}
}
</script>