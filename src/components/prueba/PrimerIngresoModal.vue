<template>
	<b-modal
	id="prueba-primer-ingreso"
	title="¡Bienvenido a tu sistema!"
	size="lg"
	dialog-class="prueba-primer-ingreso__dialog"
	centered
	hide-footer
	no-close-on-backdrop
	@hidden="marcar_visto">
		<!--
			Modal de primer ingreso de la prueba gratuita (misión prueba-experiencia-empresa, 3/11/2026). Se
			muestra UNA sola vez por negocio (el flag `modal_visto` vive en la API, no en el navegador: un F5
			o entrar desde otro equipo no lo repiten). Trae el video de bienvenida que mandó el admin y la
			pregunta de la decisión de Lucas: importar la información ahora (abre Importar con IA) o más
			adelante (queda el botón «Importar mi información» en el Listado mientras haya datos de ejemplo).
		-->
		<div class="prueba-primer-ingreso">
			<div
			v-if="video_url"
			class="prueba-primer-ingreso__video">
				<iframe
				v-if="url_embed"
				:src="url_embed"
				title="Video de bienvenida"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen></iframe>
				<video
				v-else
				:src="video_url"
				controls
				playsinline
				preload="metadata"></video>
			</div>

			<p class="prueba-primer-ingreso__texto">
				Tu sistema ya viene con <strong>artículos, clientes, proveedores y ventas de ejemplo</strong> para que
				lo recorras con datos cargados. Cuando importes tu información, esos datos de ejemplo se eliminan y
				queda lo tuyo.
			</p>

			<p class="prueba-primer-ingreso__pregunta">
				¿Querés importar tu información ahora?
			</p>
			<p class="prueba-primer-ingreso__detalle">
				Subís el Excel de tus artículos y lo cargamos con inteligencia artificial, en minutos.
			</p>

			<div class="prueba-primer-ingreso__botones">
				<b-button
				variant="primary"
				size="lg"
				class="prueba-primer-ingreso__boton"
				@click="importar_ahora">
					<i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
					Importar mi información ahora
				</b-button>
				<b-button
				variant="outline-secondary"
				size="lg"
				class="prueba-primer-ingreso__boton"
				@click="mas_adelante">
					Más adelante
				</b-button>
			</div>
		</div>
	</b-modal>
</template>
<script>
import prueba from '@/mixins/prueba'
export default {
	name: 'PruebaPrimerIngresoModal',
	mixins: [prueba],
	data() {
		return {
			/* Se marca una sola vez por montaje: @hidden también dispara después de cualquiera de los botones. */
			marcado: false,
		}
	},
	computed: {
		video_url() {
			return this.prueba_del_usuario ? this.prueba_del_usuario.video_url : null
		},
		/**
		 * URL para un iframe cuando el video es de YouTube o Vimeo; null para un archivo (mp4, R2) que va
		 * en un <video>.
		 *
		 * @returns {string|null}
		 */
		url_embed() {
			let url = this.video_url
			if (!url) {
				return null
			}
			let youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
			if (youtube) {
				return 'https://www.youtube.com/embed/' + youtube[1]
			}
			let vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
			if (vimeo) {
				return 'https://player.vimeo.com/video/' + vimeo[1]
			}
			return null
		},
		/**
		 * Solo la primera vez: modo prueba, el modal todavía no visto y datos de ejemplo presentes (si ya
		 * importó, la pregunta no tiene sentido).
		 *
		 * @returns {boolean}
		 */
		debe_mostrarse() {
			return this.prueba_con_semilla && !this.prueba_del_usuario.modal_visto && !this.llego_por_un_link_de_importacion
		},
		/**
		 * Llegó por `?importacion=<uuid>` (el aviso de soporte): ya decidió importar, la pregunta sobra. Se
		 * marca visto igual, así tampoco aparece la próxima vez.
		 *
		 * @returns {boolean}
		 */
		llego_por_un_link_de_importacion() {
			return !!this.$store.state.prueba.importacion_por_link
		},
		/** @returns {boolean} */
		hay_que_marcar_por_el_link() {
			return this.llego_por_un_link_de_importacion && this.prueba_con_semilla && !this.prueba_del_usuario.modal_visto
		},
	},
	watch: {
		/* El usuario puede resolverse después de que el Listado montó (arranque con F5). */
		debe_mostrarse(valor) {
			if (valor) {
				this.mostrar()
			}
		},
		/* Mismo motivo: el usuario (y su `prueba`) puede llegar después del montaje. */
		hay_que_marcar_por_el_link: {
			immediate: true,
			handler(valor) {
				if (valor) {
					this.marcar_visto()
				}
			},
		},
	},
	methods: {
		mostrar() {
			let self = this
			this.$nextTick(() => {
				self.$bvModal.show('prueba-primer-ingreso')
			})
		},
		/**
		 * Deja marcado en la API que el negocio ya vio el modal, una sola vez.
		 *
		 * @returns {Promise<void>}
		 */
		marcar_visto() {
			if (this.marcado || !this.prueba_activa) {
				return Promise.resolve()
			}
			this.marcado = true
			let self = this
			return this.$api.post('prueba/modal-visto', {}, { skip_global_error_event: true })
			.then(res => {
				self.$store.commit('auth/setPrueba', res.data.prueba)
			})
			.catch(err => {
				console.log('prueba/modal-visto', err)
			})
		},
		importar_ahora() {
			let self = this
			this.marcar_visto()
			this.$bvModal.hide('prueba-primer-ingreso')
			/* El modal de Importar con IA del Listado (id fijo de ExcelDropDown.vue para artículos). */
			this.$nextTick(() => {
				self.$bvModal.show('ai-excel-import-modal')
			})
		},
		mas_adelante() {
			this.marcar_visto()
			this.$bvModal.hide('prueba-primer-ingreso')
		},
	},
	mounted() {
		if (this.debe_mostrarse) {
			this.mostrar()
		}
	},
}
</script>
<style lang="sass">
// El modal "lg" de este sistema ocupa casi toda la pantalla (`.modal-dialog.modal-lg { max-width: 90% !important }`,
// medido: 1229px a 1366): acá se acota con un selector más específico, porque un video a ese ancho mide 672px de
// alto y deja los dos botones abajo del borde en una pantalla de 768.
.modal-dialog.modal-lg.prueba-primer-ingreso__dialog
	max-width: 820px !important
	margin-left: auto
	margin-right: auto

.prueba-primer-ingreso
	display: flex
	flex-direction: column
	align-items: center
	text-align: center

.prueba-primer-ingreso__video
	position: relative
	width: 100%
	aspect-ratio: 16 / 9
	background: #000
	border-radius: 8px
	overflow: hidden
	margin-bottom: 1.25rem
	iframe, video
		position: absolute
		inset: 0
		width: 100%
		height: 100%

.prueba-primer-ingreso__texto
	font-size: 1rem
	color: var(--color-text-primary, #111827)
	margin-bottom: 1rem

.prueba-primer-ingreso__pregunta
	font-size: 1.25rem
	font-weight: 700
	color: var(--color-text-primary, #111827)
	margin-bottom: 0.25rem

.prueba-primer-ingreso__detalle
	font-size: 0.9375rem
	color: var(--color-text-secondary, #6b7280)
	margin-bottom: 1.25rem

.prueba-primer-ingreso__botones
	display: flex
	flex-wrap: wrap
	justify-content: center
	gap: 0.75rem
	width: 100%

.prueba-primer-ingreso__boton
	display: inline-flex
	align-items: center
	gap: 0.5rem
	flex: 1 1 220px
	justify-content: center
</style>
