<template>
	<b-button
	v-if="prueba_con_semilla"
	v-b-tooltip.hover
	title="Subí el Excel de tus artículos: se cargan con IA y se eliminan los datos de ejemplo"
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
 * Botón «Importar mi información» del Listado (misión prueba-experiencia-empresa, 3/11/2026): queda a la
 * vista mientras el negocio en prueba todavía tenga los datos de ejemplo (eligió «Más adelante» en el modal
 * de primer ingreso, o cerró el modal). Abre el mismo modal de Importar con IA del menú de Excel. Para un
 * cliente real no se monta.
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
		 * Cuando termina una importación, el aviso de resultado abre su modal: se vuelve a pedir el estado
		 * de la prueba, que ya no tiene semilla, y este botón desaparece solo.
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
