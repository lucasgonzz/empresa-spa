export default {
	methods: {
		terminada(sale) {
			if (confirm('¿Esta seguro que quiere marcar la venta '+sale.num+' como terminada?')) {
				this.$store.commit('auth/setMessage', 'Finalizando venta')
				this.$store.commit('auth/setLoading', true)

				return this.$api.put('sale-set-terminada/'+sale.id)
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