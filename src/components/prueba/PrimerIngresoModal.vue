<template>
	<b-modal
	id="prueba-primer-ingreso"
	title="¡Bienvenido a tu sistema!"
	size="lg"
	dialog-class="prueba-primer-ingreso__dialog"
	content-class="prueba-modal"
	centered
	scrollable
	hide-footer
	no-close-on-backdrop
	@hidden="marcar_visto">
		<template #modal-title>
			<span class="prueba-modal__encabezado">
				<i class="bi bi-stars prueba-modal__insignia" aria-hidden="true"></i>
				<span>
					<span class="prueba-modal__etiqueta">Prueba gratuita</span>
					¡Bienvenido a tu sistema!
				</span>
			</span>
		</template>
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

			<h6 class="prueba-primer-ingreso__pregunta">
				¿Querés importar tu información ahora?
			</h6>
			<div class="prueba-primer-ingreso__opciones">
				<div class="prueba-modal__bloque">
					<i class="bi bi-file-earmark-spreadsheet prueba-modal__icono" aria-hidden="true"></i>
					<div>
						<strong>Empezá con tus artículos</strong>
						<p>Subí {{ prueba_permite_pdf ? 'tu Excel o PDF' : 'tu Excel' }} y cargá los artículos con ayuda de la IA. Al importar se eliminan los datos de ejemplo.</p>
					</div>
				</div>
				<div class="prueba-modal__bloque">
					<i class="bi bi-box-seam prueba-modal__icono" aria-hidden="true"></i>
					<div>
						<strong>Recorré el sistema primero</strong>
						<p>Probalo con artículos, clientes, proveedores y ventas de ejemplo. Podés importar más adelante.</p>
					</div>
				</div>
			</div>

			<div class="prueba-primer-ingreso__botones">
				<b-button
				variant="primary"
				class="prueba-primer-ingreso__boton"
				@click="importar_ahora">
					<i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
					Importar mi información ahora
				</b-button>
				<b-button
				variant="outline-secondary"
				class="prueba-primer-ingreso__boton"
				@click="mas_adelante">
					<i class="bi bi-clock" aria-hidden="true"></i>
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
			let query = this.$route && this.$route.query ? this.$route.query : {}
			return !!this.$store.state.prueba.importacion_por_link || !!query.importacion
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
			/* Nunca encima de «Tu prueba terminó» ni del login. */
			if (this.$route && (this.$route.name == 'pruebaTerminada' || this.$route.name == 'login')) {
				return
			}
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
			/*
				`skip_navigation_cancel`: «Importar ahora» navega al Listado en el mismo tick, y el interceptor de
				main.js cancela los pedidos de la pantalla que se abandona; sin la bandera, este POST moría y el
				modal volvía a aparecer en el próximo ingreso (medido el 3/11/2026).
			*/
			return this.$api.post('prueba/modal-visto', {}, { skip_global_error_event: true, skip_navigation_cancel: true })
			.then(res => {
				self.$store.commit('auth/setPrueba', res.data.prueba)
			})
			.catch(err => {
				console.log('prueba/modal-visto', err)
			})
		},
		/**
		 * Este modal vive en App.vue y el de Importar con IA en el menú del Listado: se deja la orden en el
		 * store y se navega al Listado si hace falta; el botón «Importar mi información» (montado en la barra
		 * del Listado) la consume y abre el modal apenas existe (ver BtnImportarMiInformacion.vue).
		 *
		 * @returns {void}
		 */
		importar_ahora() {
			this.marcar_visto()
			this.$bvModal.hide('prueba-primer-ingreso')
			this.$store.commit('prueba/set_abrir_importador', true)
			if (this.$route.name != 'article') {
				this.$router.push({ name: 'article' }).catch(() => {})
			}
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
	max-width: min(820px, calc(100% - 1rem)) !important
	margin-left: auto
	margin-right: auto

.prueba-primer-ingreso
	display: flex
	flex-direction: column
	gap: 1rem

.prueba-primer-ingreso__video
	position: relative
	width: min(100%, 550px)
	align-self: center
	aspect-ratio: 16 / 9
	background: #000
	border-radius: 12px
	overflow: hidden
	iframe, video
		position: absolute
		inset: 0
		width: 100%
		height: 100%

.prueba-primer-ingreso__pregunta
	font-size: 1.0625rem
	font-weight: 700
	color: var(--color-text-primary, #111827)
	margin: 0

.prueba-primer-ingreso__opciones
	display: grid
	grid-template-columns: repeat(2, minmax(0, 1fr))
	gap: 0.75rem

.prueba-primer-ingreso__botones
	display: flex
	flex-wrap: wrap
	gap: 0.5rem

.prueba-primer-ingreso__boton
	display: inline-flex
	align-items: center
	gap: 0.5rem
	justify-content: center

@media (max-width: 575.98px)
	.prueba-primer-ingreso__opciones
		grid-template-columns: minmax(0, 1fr)

	.prueba-primer-ingreso__boton
		width: 100%
</style>
