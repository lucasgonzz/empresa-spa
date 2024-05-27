<template>
	<div>
		<b-button
		v-if="view == 'confirmadas'"
		class="m-l-15"
		variant="success"
		@click.stop="terminada">
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
export default {
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
		terminada() {
			if (confirm('¿Esta seguro que quiere marcar la venta como terminada?')) {
				this.$store.commit('auth/setMessage', 'Finalizando venta')
				this.$store.commit('auth/setLoading', true)

				this.$api.put('sale-set-terminada/'+this.sale.id)
				.then(res => {
					this.$toast.success('Venta actualizada')
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('sale/add', res.data.sale)
				})
				.catch(err => {
					console.log(err)
					this.$store.commit('auth/setLoading', false)
					this.$toast.error('Error al actualizar venta')
				})

			} 
		}
	}
}
</script>