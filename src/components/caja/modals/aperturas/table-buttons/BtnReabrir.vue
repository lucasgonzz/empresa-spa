<template>
	<btn-accion
	v-if="se_puede_reabrir"
	icono="bi bi-arrow-counterclockwise"
	texto="Reabrir"
	tono="abrir"
	:loader="loading"
	@clicked="reabirir_caja"></btn-accion>
</template>
<script>
export default {
	props: {
		apertura_caja: Object,
	},
	components: {
		BtnAccion: () => import('@/components/caja/components/table-buttons/BtnAccion'),
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
		/**
		 * La ultima apertura es la primera fila de la PRIMERA pagina (vienen de la mas nueva a la
		 * mas vieja). En la pagina 2 en adelante, models[0] es una apertura vieja: reabrirla
		 * dejaria la caja apuntando a una apertura que no es la actual.
		 *
		 * @returns {Boolean}
		 */
		es_la_ultima_apertura() {
			if (this.$store.state.apertura_caja.pagina_aperturas != 1) {
				return false
			}
			if (!this.aperturas_caja.length) {
				return false
			}
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
