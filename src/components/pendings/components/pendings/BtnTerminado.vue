<template>
	<div
	class="cont-btn-terminado"
	v-if="model.id && !modal_recurrente_abierto">
		
		<btn-loader
		@clicked="terminar"
		:loader="loading"
		class="m-b-50"
		icon="check"
		text="Terminado"
		variant="success"></btn-loader>
	</div>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		model() {
			return this.$store.state.pending.model 
		},
		modal_recurrente_abierto() {
			return this.$store.state.pending.modal_recurrente_abierto
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		terminar() {
			if (confirm('¿Seguro quiere marcar este pendiente como finalizado?')) {

				this.loading = true
				this.$api.post('pending-completed', {
					...this.model,
				})
				.then(res => {

					this.$store.dispatch('pending/getModels')
					this.loading = false
					this.$toast.success('Pendiente finalizado')
					this.$bvModal.hide('pending')
				})
				.catch(err => {
					this.loading = false
					this.$toast.success('Error al marcar como finalizado')
					console.log(err)
				})
			}
		}
	}
}
</script>
<style lang="sass">
.cont-btn-terminado
	display: flex 
	align-items: center
	justify-content: center 

	.btn 
		width: 300px !important
		height: 100px !important
		font-size: 30px
</style>