<template>
	<div
	class="m-l-10">
		<btn-loader
		v-if="caja.abierta"
		:loader="loading"
		variant="danger"
		@clicked="cerrar"
		text="Cerrar"></btn-loader>

		<btn-loader
		v-else
		:loader="loading"
		variant="success"
		@clicked="abrir"
		text="Abrir"></btn-loader>
	</div>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		abrir() {
			this.loading = true

			this.$api.put('abrir-caja/'+this.caja.id)
			.then(res => {

				this.$toast.success('Caja abierta')
				this.$store.commit('caja/add', res.data.model)
				this.loading = false
			})
			.catch(err => {
				this.$toast.error('Error al abrir caja')
				console.log(err)
				this.loading = false
			})
		},
		cerrar() {
			this.loading = true

			this.$api.put('cerrar-caja/'+this.caja.id)
			.then(res => {
				this.$toast.success('Caja cerrada')
				this.$store.commit('caja/add', res.data.model)
				this.loading = false
			})
			.catch(err => {
				this.$toast.error('Error al cerrar caja')
				console.log(err)
				this.loading = false
			})
		},
	}
}
</script>