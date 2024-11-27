<template>
	<btn-loader
	v-if="se_puede_reabrir"
	@clicked="reabirir_caja"
	variant="success"
	class="m-l-10"
	text="Re abrir"
	:loader="loading">
	</btn-loader>
</template>
<script>
export default {
	props: {
		apertura_caja: Object,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			loading: false,
		}
	},
	computed: {
		se_puede_reabrir() {
			if (this.es_la_ultima_apertura && this.la_caja_esta_cerrada) {
				return true 
			}
			return false
		},
		la_caja_esta_cerrada() {
			let caja = this.$store.state.caja.models.find(caja => caja.id == this.apertura_caja.caja_id)

			if (typeof caja != 'undefined') {

				return !caja.abierta
			}
			return false
		},
		es_la_ultima_apertura() {
			return this.aperturas_caja[0].id == this.apertura_caja.id
		},
		aperturas_caja() {
			return this.$store.state.apertura_caja.models 
		},
	},
	methods: {
		reabirir_caja() {
			this.loading = true 
			this.$api.post('apertura-caja/reabrir/'+this.apertura_caja.id)
			.then(res => {
				this.loading = false 
				this.$bvModal.hide('aperturas-caja')
				this.$store.dispatch('caja/getModels')
				this.$toast.success('Caja reabierta')
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error('Error al reabrir Caja')				
			})
		}
	}
}
</script>