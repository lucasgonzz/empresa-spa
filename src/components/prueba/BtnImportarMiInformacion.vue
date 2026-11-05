<template>
	<b-button
	v-if="prueba_activa && prueba_del_usuario.vence_at"
	v-b-tooltip.hover
	:title="prueba_permite_pdf ? 'Importá tus artículos desde Excel o PDF' : 'Importá tus artículos desde Excel'"
	aria-label="Importar mi información"
	variant="primary"
	size="sm"
	class="prueba-btn-importar"
	@click="abrir">
		<i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
		<span class="prueba-btn-importar__texto">Importar mi información</span>
	</b-button>
</template>
<script>
import prueba from '@/mixins/prueba'
/**
 * Acceso al importador de artículos durante toda la prueba, aunque ya no queden datos de ejemplo.
 */
export default {
	name: 'PruebaBtnImportarMiInformacion',
	mixins: [prueba],
	watch: {
		/* La orden del modal de bienvenida («Importar ahora»), desde cualquier pantalla. */
		'$store.state.prueba.abrir_importador': {
			immediate: true,
			handler(valor) {
				if (valor) {
					this.$store.commit('prueba/set_abrir_importador', false)
					this.abrir_cuando_exista(0)
				}
			},
		},
	},
	methods: {
		abrir() {
			this.$bvModal.show('ai-excel-import-modal')
		},
		/**
		 * El modal de Importar con IA es lazy (vive en el menú de Excel del Listado): si todavía no montó,
		 * `$bvModal.show` se pierde. Se reintenta cada 300 ms hasta verlo abierto, con un techo de 5 segundos.
		 *
		 * @param {Number} intento
		 * @returns {void}
		 */
		abrir_cuando_exista(intento) {
			let self = this
			this.abrir()
			setTimeout(() => {
				let abierto = document.querySelector('#ai-excel-import-modal.show')
				if (!abierto && intento < 16) {
					self.abrir_cuando_exista(intento + 1)
				}
			}, 300)
		},
		/**
		 * Al terminar una importación, actualiza si todavía hay datos de ejemplo para que el
		 * próximo archivo no vuelva a pedir confirmación de borrado.
		 *
		 * @param {Object} evento Evento de bootstrap-vue.
		 * @param {String} modal_id Id del modal que se mostró.
		 * @returns {void}
		 */
		refrescar_si_termino_una_importacion(evento, modal_id) {
			if (modal_id == 'article-import-result-notification' && this.prueba_activa) {
				this.$store.dispatch('prueba/refrescar')
			}
		},
	},
	created() {
		this.$root.$on('bv::modal::shown', this.refrescar_si_termino_una_importacion)
	},
	beforeDestroy() {
		this.$root.$off('bv::modal::shown', this.refrescar_si_termino_una_importacion)
	},
}
</script>
<style lang="sass">
.prueba-btn-importar
	display: inline-flex
	align-items: center
	gap: 0.35rem
	white-space: nowrap

@media (max-width: 767.98px)
	.prueba-btn-importar__texto
		display: none
</style>
