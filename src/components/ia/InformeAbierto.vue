<template>
	<transition name="informe-abierto">
		<!--
			Overlay a pantalla completa (fondo difuminado y oscurecido, como el modal de
			video de la demo, TarjetaClip.vue). Cierra con el botón, con Escape (salvo con
			una pregunta a medio escribir o con un modal abierto encima, ver
			on_document_keydown) y con un click en el fondo: el click cuenta solo si el
			mousedown también fue en el fondo, para que seleccionar texto del informe y
			soltar afuera no lo cierre.
		-->
		<div
		v-if="reporte"
		class="informe-abierto"
		@mousedown.self="on_fondo_mousedown"
		@click.self="on_fondo_click">
			<div
			class="informe-abierto__panel"
			:class="{ 'informe-abierto__panel--con-sidebar': con_sidebar }"
			role="dialog"
			aria-modal="true"
			:aria-label="reporte.titulo || 'Informe'">

				<header class="informe-abierto__cabecera">
					<span class="informe-abierto__marca">
						<i class="bi bi-stars"></i>
						Tu mostrador
					</span>
					<span class="informe-abierto__espacio"></span>
					<!-- Bajo 900px el sidebar es un cajón: este botón lo abre. -->
					<b-button
					v-if="con_sidebar && es_cajon"
					size="sm"
					variant="outline-secondary"
					class="informe-abierto__btn-conversacion"
					@click="cajon_abierto = true">
						<i class="bi bi-chat-dots"></i>
						Conversación
					</b-button>
					<button
					type="button"
					class="informe-abierto__cerrar"
					title="Cerrar el informe"
					@click="cerrar">
						<i class="bi bi-x-lg"></i>
					</button>
				</header>

				<div class="informe-abierto__cuerpo">
					<!-- Columna del informe: scroll propio y el input de pregunta SIEMPRE abajo. -->
					<section class="informe-abierto__columna">
						<div
						:key="'informe-' + reporte.id"
						class="informe-abierto__scroll">
							<informe :reporte="reporte"></informe>
						</div>
						<pregunta-input
						ref="pregunta"
						:key="'pregunta-' + reporte.id"
						:reporte="reporte"
						@conversacion-creada="on_conversacion_creada"
						@enviando="on_enviando"></pregunta-input>
					</section>

					<!-- La conversación del informe, solo si existe. En escritorio es una
					columna de 380px; bajo 900px, un cajón superpuesto con botón para volver. -->
					<aside
					v-if="con_sidebar"
					class="informe-abierto__sidebar"
					:class="{ 'informe-abierto__sidebar--abierta': cajon_abierto }">
						<sidebar-conversacion
						:key="'conversacion-' + reporte.id"
						:conversation_id="reporte.conversation_id"
						:es_cajon="es_cajon"
						@volver="cajon_abierto = false"></sidebar-conversacion>
					</aside>

					<!-- Fondito que cierra el cajón al tocar el informe de atrás. -->
					<div
					v-if="con_sidebar && es_cajon && cajon_abierto"
					class="informe-abierto__telon"
					@click="cajon_abierto = false"></div>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
import Informe from '@/components/ia/Informe'
import PreguntaInput from '@/components/ia/PreguntaInput'
import SidebarConversacion from '@/components/ia/SidebarConversacion'

/**
 * El informe abierto (§2.2). Se monta UNA vez desde Index.vue y abre por estado:
 * mostrador.reporte_abierto (lo setea mostrador/abrirReporte, desde una carpeta o
 * desde /ia/:id).
 *
 * Anchos (§2.4): panel de 92% × 92% con radio 20 y tope de 1440px de ancho; dos
 * columnas (informe + sidebar de 380px) desde 900px; bajo 900 el sidebar es un
 * cajón; bajo 768 el panel ocupa toda la pantalla, sin radio.
 */
export default {
	components: {
		Informe,
		PreguntaInput,
		SidebarConversacion,
	},
	data() {
		return {
			// true cuando el cajón de conversación está abierto (solo bajo 900px).
			cajon_abierto: false,
			// Ancho del viewport, para decidir columna vs cajón.
			viewport_width: typeof window !== 'undefined' ? window.innerWidth : 1200,
			// true si el último mousedown cayó en el fondo (ver el comentario del template).
			mousedown_en_el_fondo: false,
		}
	},
	computed: {
		reporte() {
			return this.$store.state.mostrador.reporte_abierto
		},
		con_sidebar() {
			return !!(this.reporte && this.reporte.conversation_id)
		},
		es_cajon() {
			return this.viewport_width < 900
		},
	},
	mounted() {
		const self = this
		window.addEventListener('resize', self.on_window_resize)
		document.addEventListener('keydown', self.on_document_keydown)
		if (this.reporte) {
			this.al_abrir()
		}
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize)
		document.removeEventListener('keydown', self.on_document_keydown)
		this.destrabar_scroll_del_fondo()
	},
	watch: {
		reporte(nuevo, viejo) {
			if (nuevo && !viejo) {
				this.al_abrir()
			} else if (!nuevo && viejo) {
				this.al_cerrar()
			}
		},
		/**
		 * Si el ancho pasa de cajón a columna con el cajón abierto, el sidebar ya se
		 * ve como columna: el flag se limpia para que al volver a angostar no
		 * aparezca tapando el informe sin que nadie lo haya pedido.
		 */
		es_cajon(es) {
			if (!es) {
				this.cajon_abierto = false
			}
		},
	},
	methods: {
		al_abrir() {
			let self = this
			this.cajon_abierto = false
			this.trabar_scroll_del_fondo()
			// En escritorio el cursor queda listo en la pregunta; en el teléfono no,
			// para que no salte el teclado tapando el informe. Va en nextTick porque el
			// watch corre antes de que el panel exista en el DOM.
			this.$nextTick(function () {
				if (!self.es_cajon && self.$refs.pregunta) {
					self.$refs.pregunta.enfocar()
				}
			})
		},
		al_cerrar() {
			this.cajon_abierto = false
			this.destrabar_scroll_del_fondo()
		},
		/**
		 * Mientras el informe está abierto la página de atrás no scrollea: sin esto la
		 * rueda del mouse sobre el fondo movía el escritorio.
		 */
		trabar_scroll_del_fondo() {
			document.body.classList.add('informe-abierto-activo')
		},
		destrabar_scroll_del_fondo() {
			document.body.classList.remove('informe-abierto-activo')
		},
		on_window_resize() {
			this.viewport_width = window.innerWidth
		},
		/**
		 * Escape cierra el informe, salvo en dos casos:
		 * - El cursor está en el input de pregunta CON texto escrito: ahí cerrar tiraría
		 *   lo que la persona estaba redactando (Escape es un reflejo para salir del
		 *   campo, no del informe). Con el textarea vacío o sin foco, cierra como siempre.
		 * - 🔴 Hay un modal de BootstrapVue abierto encima (el recordatorio de cobro de la
		 *   acción `cobrar`, RecordatorioDesdeInforme.vue): ese Escape es del modal. Su
		 *   keydown (onEsc, puesto en el .modal) lo cierra pero no frena la propagación,
		 *   así que el mismo tecleo llegaba hasta acá y cerraba también el informe de
		 *   atrás. BootstrapVue marca el body con `modal-open` mientras haya un modal
		 *   abierto y la saca recién después de la transición de salida, así que en este
		 *   tecleo todavía está. Mismo corte que whatsapp/sidebar/Index.vue.
		 * El botón y el click en el fondo no cambian.
		 */
		on_document_keydown(event) {
			if (event.key !== 'Escape' || !this.reporte) {
				return
			}
			if (document.body.classList.contains('modal-open')) {
				return
			}
			if (this.$refs.pregunta && this.$refs.pregunta.retiene_escape(event)) {
				return
			}
			this.cerrar()
		},
		on_fondo_mousedown() {
			this.mousedown_en_el_fondo = true
		},
		on_fondo_click() {
			if (this.mousedown_en_el_fondo) {
				this.cerrar()
			}
			this.mousedown_en_el_fondo = false
		},
		/**
		 * Primera pregunta: apareció el sidebar. En modo cajón se abre solo, para que
		 * la respuesta se vea llegar.
		 */
		on_conversacion_creada() {
			if (this.es_cajon) {
				this.cajon_abierto = true
			}
		},
		/**
		 * Pregunta sobre un informe que ya tiene conversación: en modo cajón se abre en
		 * el acto (con el globo optimista adentro), sin esperar a que el POST confirme.
		 */
		on_enviando() {
			if (this.es_cajon) {
				this.cajon_abierto = true
			}
		},
		cerrar() {
			this.$store.dispatch('mostrador/cerrarReporte')
		},
	},
}
</script>

<style lang="sass">
// Con un informe abierto, el fondo no scrollea (clase puesta en <body>).
body.informe-abierto-activo
	overflow: hidden

	// 🔴 El recordatorio de cobro (acción `cobrar`, RecordatorioDesdeInforme.vue) y los
	// tres puentes de la misión mostrador-fotos-y-modales (imagen ampliada, modal de
	// artículo, modal de cliente — AbrirArticuloDesdeInforme.vue,
	// AbrirClienteDesdeInforme.vue, ImagenAmpliadaDesdeInforme.vue) se abren ENCIMA del
	// informe. BootstrapVue cuelga cada b-modal de <body> en un div externo con id
	// safeId('__BV_modal_outer_') y z-index INLINE (modalOuterStyle y computedAttrs en
	// bootstrap-vue/esm/components/modal/modal.js). Ese z-index lo mide una sola vez sobre
	// un div.modal-backdrop de prueba (getBaseZIndex, modal/helpers/modal-manager.js): con
	// el CSS de Bootstrap da 1040 y el modal queda DETRÁS de este overlay (1062). Hoy da más
	// (1095/1105) solo porque el CSS global de common-vue/components/support-chat pisa
	// `body > .modal-backdrop:last-of-type`, que también le matchea al div de prueba: un
	// efecto lateral ajeno en el que no hay que apoyarse. Por eso el escalón va fijo:
	//
	//      overlay del informe 1062 < ficha del hover (chat IA) 1063
	//      < imagen ampliada / modal de artículo / modal de cliente (mostrador) 1064
	//      < recordatorio de cobro 1065 < cuenta corriente (chat IA) 1066 < toasts 1067
	//
	// Los tres de 1064 comparten escalón A PROPÓSITO y no es un descuido: los tres los abre
	// un click DENTRO del informe (nunca dos a la vez — el que dispara al segundo queda
	// detrás del backdrop del primero, que bloquea el click), así que no hace falta
	// distinguirlos entre sí; sí hace falta que los tres le ganen a la ficha del hover
	// (1063, agregada el 16/9/2026 en asistente-ia/FichaArticuloPopover.vue) y pierdan
	// contra el recordatorio y la cuenta corriente (que si pueden convivir con uno de
	// estos tres abierto detrás, cuando el dueño abre el chat de la conversación del
	// informe con un artículo o un cliente propio ya con su modal abierto).
	//
	// Que en la práctica lo baje de ~1105 no deja nada encima: el botón y el overlay del
	// chat de soporte van en 1052/1053, detrás del informe. El !important le gana al
	// inline; sin la clase en <body> (informe cerrado) el modal vuelve a su escalón de
	// siempre.
	#recordatorio-cobro___BV_modal_outer_
		z-index: 1065 !important

	#mostrador-imagen-ampliada___BV_modal_outer_,
	#mostrador-article___BV_modal_outer_,
	#mostrador-client___BV_modal_outer_
		z-index: 1064 !important

	// Los toasts (vue-toast-notification, .v-toast en 1052 en theme-sugar.css) también
	// quedaban detrás del overlay: el "Recordatorio encolado" o el motivo por el que no
	// salió no se veían. Van arriba de todo lo de acá, así el aviso se lee aunque algo
	// siga abierto.
	.v-toast
		z-index: 1067

.informe-abierto
	position: fixed
	inset: 0
	// Arriba del botón flotante del chat (1054), del panel del chat (1055) y del
	// modal de video de la demo (1060); abajo del LogoLoading (10000). Arriba de este
	// overlay, y solo mientras está abierto, el escalón completo de
	// body.informe-abierto-activo de acá arriba.
	z-index: 1062
	background: rgba(15, 18, 24, .45)
	backdrop-filter: blur(6px)
	-webkit-backdrop-filter: blur(6px)
	display: flex
	align-items: center
	justify-content: center
	text-align: left

	// El panel: 92% del viewport (= min(92vw, 1440px) × 92vh, sin min() porque el
	// SASS de este repo lo toma como función propia y revienta con vw y px juntos).
	&__panel
		width: 92%
		max-width: 1440px
		height: 92%
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		border-radius: 20px
		box-shadow: 0 24px 80px rgba(0, 0, 0, .35)
		display: flex
		flex-direction: column
		overflow: hidden
		position: relative
		animation: informe-abierto-panel-entrada .2s ease-out

	&__cabecera
		height: 54px
		flex-shrink: 0
		display: flex
		align-items: center
		gap: 10px
		padding: 0 12px 0 22px
		border-bottom: 1px solid var(--color-border, #dee2e6)

	&__marca
		display: inline-flex
		align-items: center
		gap: 8px
		font-weight: 600
		font-size: .92rem
		color: var(--color-text-secondary, #6c757d)

	&__espacio
		flex: 1

	&__cerrar
		flex-shrink: 0
		width: 36px
		height: 36px
		border: none
		border-radius: 10px
		// common-vue/sass/_inputs.sass le pone sombra a TODO <button> del sistema; este es un ícono pelado.
		box-shadow: none
		background: transparent
		color: var(--color-text-secondary, #6c757d)
		display: flex
		align-items: center
		justify-content: center
		font-size: 16px
		transition: background .15s ease
		cursor: pointer

		&:hover
			background: var(--bg-hover, #f1f3f5)
			color: var(--color-text-primary, #212529)

	&__cuerpo
		flex: 1
		min-height: 0
		display: flex
		position: relative

	&__columna
		flex: 1
		min-width: 0
		display: flex
		flex-direction: column

	&__scroll
		flex: 1
		min-height: 0
		overflow-y: auto
		padding: 26px 34px 20px 34px

	// Columna de conversación (desde 900px).
	&__sidebar
		width: 380px
		flex-shrink: 0
		min-height: 0
		display: flex
		flex-direction: column
		border-left: 1px solid var(--color-border, #dee2e6)
		background: var(--bg-section, #f8f9fa)

	&__telon
		position: absolute
		inset: 0
		background: rgba(0, 0, 0, .25)
		z-index: 2

// Bajo 900px el sidebar es un cajón absoluto adentro del panel, que entra desde la
// derecha con el botón "Conversación" de la cabecera (o solo, al mandar la primera
// pregunta) y vuelve con "Volver al informe".
@media screen and (max-width: 899px)
	.informe-abierto__sidebar
		position: absolute
		top: 0
		bottom: 0
		right: 0
		width: 100%
		max-width: 380px
		z-index: 3
		border-left: none
		transform: translateX(100%)
		transition: transform .2s ease
		box-shadow: -6px 0 24px rgba(0, 0, 0, .12)

		&--abierta
			transform: translateX(0)

// Bajo 768px el panel ocupa toda la pantalla, sin radio (§2.4). El alto es el del
// overlay (position fixed), que el teclado del teléfono achica: el input de
// pregunta queda a la vista.
@media screen and (max-width: 767px)
	.informe-abierto__panel
		width: 100%
		max-width: none
		height: 100%
		border-radius: 0

	.informe-abierto__cabecera
		padding: 0 8px 0 16px

	.informe-abierto__scroll
		padding: 18px 16px 14px 16px

	.informe-abierto__sidebar
		max-width: none

@keyframes informe-abierto-panel-entrada
	from
		opacity: 0
		transform: translateY(10px) scale(.985)
	to
		opacity: 1
		transform: translateY(0) scale(1)

// Fundido del overlay al abrir y cerrar (transition name="informe-abierto").
.informe-abierto-enter-active,
.informe-abierto-leave-active
	transition: opacity .18s ease

.informe-abierto-enter,
.informe-abierto-leave-to
	opacity: 0

@media (prefers-reduced-motion: reduce)
	.informe-abierto__panel
		animation: none

	.informe-abierto__sidebar
		transition: none

	.informe-abierto-enter-active,
	.informe-abierto-leave-active
		transition: none
</style>
