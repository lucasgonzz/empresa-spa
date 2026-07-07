<template>
	<b-button
	size="sm"
	variant="outline-secondary"
	class="btn-duplicate-pdf-profile"
	:disabled="loading"
	@click.stop="duplicate">
		Duplicar
	</b-button>
</template>

<script>
/**
 * Botón para duplicar un perfil de diseño de PDF desde la tabla del ABM.
 * Llama al endpoint de duplicación, agrega la copia al store y abre el modal
 * de edición sobre la copia para ajustarla.
 */
export default {
	props: {
		/**
		 * Perfil (pdf_column_profile) de la fila.
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		/**
		 * Duplica el perfil vía API y abre la copia para editar.
		 *
		 * @return {void}
		 */
		duplicate() {
			if (this.loading || !this.model || !this.model.id) {
				return
			}
			this.loading = true
			this.$api.post('pdf-column-profiles/' + this.model.id + '/duplicate')
				.then((res) => {
					this.loading = false
					const new_model = res && res.data ? res.data.model : null
					if (!new_model) {
						this.$toast.error('No se pudo duplicar el diseño')
						return
					}
					this.$store.commit('pdf_column_profile/add', new_model)
					this.$toast.success('Diseño duplicado')
					this.setModel(new_model, 'pdf_column_profile')
				})
				.catch(() => {
					this.loading = false
					this.$toast.error('No se pudo duplicar el diseño')
				})
		},
	},
}
</script>

<style lang="sass" scoped>
.btn-duplicate-pdf-profile
	white-space: nowrap
</style>
