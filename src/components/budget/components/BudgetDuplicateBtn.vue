<template>
	<!-- Extensión `duplicar_presupuestos`: acción por fila que clona vía API (ver ExtencionDuplicarPresupuestosSeeder). -->
	<b-button
	v-if="hasExtencion('duplicar_presupuestos')"
	class="m-l-5"
	size="sm"
	variant="secondary"
	:disabled="loading"
	@click.stop="duplicate_budget"
	v-b-tooltip.hover
	title="Duplicar presupuesto">
		<i class="icon-clipboard m-r-5"></i>
		Duplicar
	</b-button>
</template>
<script>
export default {
	props: {
		/**
		 * Fila del listado de presupuestos (modelo budget con id).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/** Evita dobles POST mientras la petición está en curso. */
			loading: false,
		}
	},
	methods: {
		/**
		 * Pide confirmación, llama al API de duplicado, carga global (`auth`) y actualiza el listado en Vuex.
		 */
		duplicate_budget() {
			if (!confirm('¿Seguro que quiere duplicar este presupuesto? Se creará un presupuesto con el estado "Sin confirmar"')) {
				return
			}

			if (this.loading) {
				return
			}
			if (!this.model || !this.model.id) {
				return
			}

			this.loading = true
			/** Indicador global: texto descriptivo de la operación en curso (regla proyecto `auth` + API). */
			this.$store.commit('auth/setMessage', 'Duplicando presupuesto')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('budget/' + this.model.id + '/duplicate', {})
				.then(res => {
					this.loading = false
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$toast.success('Presupuesto duplicado')
					this.$store.commit('budget/add', res.data.model)
				})
				.catch(err => {
					this.loading = false
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					/** Mensaje del backend o texto genérico. */
					let message = 'No se pudo duplicar el presupuesto'
					if (err.response && err.response.data && err.response.data.message) {
						message = err.response.data.message
					}
					this.$toast.error(message)
				})
		},
	},
}
</script>
