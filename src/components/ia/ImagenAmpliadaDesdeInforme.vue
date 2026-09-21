<template>
	<b-modal
	:id="MODAL_ID"
	modal-class="informe-imagen-ampliada-modal"
	body-class="informe-imagen-ampliada-body p-0"
	hide-header
	hide-footer
	centered
	size="xl"
	@hidden="on_hidden">
		<img
		v-if="url"
		:src="url"
		:alt="alt"
		class="informe-imagen-ampliada-img">
	</b-modal>
</template>

<script>
/**
 * Id fijo del modal: montado UNA VEZ por Informe.vue (ver el comentario de
 * RecordatorioDesdeInforme.vue sobre por qué uno solo y no uno por bloque).
 */
const MODAL_ID = 'mostrador-imagen-ampliada'

/**
 * Lightbox del mostrador (misión mostrador-fotos-y-modales, 21/9/2026): amplía la foto
 * de un artículo, sea que el click haya salido de una tarjeta de "Lo más vendido"
 * (bloques/Articulos.vue), de la miniatura de un renglón de lista (bloques/Lista.vue) o
 * de cualquier bloque futuro que emita `ampliar-imagen`. Mismo molde que
 * common-vue/components/support-chat/ImageLightbox.vue.
 */
export default {
	data() {
		return {
			MODAL_ID,
			// URL y alt de la imagen abierta. null = nada que mostrar (antes del primer
			// click, o después de cerrar: on_hidden los limpia para no dejar la imagen
			// vieja pegada un instante la próxima vez que se abra otra).
			url: null,
			alt: '',
		}
	},
	methods: {
		/**
		 * @param {String} url
		 * @param {String} alt
		 * @returns {void}
		 */
		abrir(url, alt) {
			if (!url) {
				return
			}
			this.url = url
			this.alt = alt || ''
			let self = this
			this.$nextTick(function () {
				self.$bvModal.show(MODAL_ID)
			})
		},
		on_hidden() {
			this.url = null
			this.alt = ''
		},
	},
}
</script>

<style lang="sass">
// El z-index se fija en InformeAbierto.vue (#mostrador-imagen-ampliada___BV_modal_outer_),
// junto con el resto del escalón del módulo IA: acá no hace falta nada.

.informe-imagen-ampliada-body
	background: #1a1a1a
	text-align: center

.informe-imagen-ampliada-img
	display: block
	max-width: 100%
	max-height: 85vh
	width: auto
	height: auto
	margin: 0 auto
	object-fit: contain
</style>
