<template>
	<div v-if="should_show">
		<button
		class="asistente-ia-fab"
		:class="{ 'asistente-ia-fab--arrastrando': drag_session_active }"
		type="button"
		:style="floating_button_inline_style"
		:title="texto_alternativo"
		@click="toggle_panel"
		@mousedown="on_floating_pointer_down"
		@touchstart="on_floating_pointer_down">
			<!-- Identidad: el cerebro de IA del NEGOCIO, no uno de ComercioCity (D37). -->
			<img
			v-if="logo_url"
			class="asistente-ia-fab__logo"
			:src="logo_url"
			:alt="texto_alternativo">
			<i
			v-else
			class="bi bi-robot"></i>
			<span class="asistente-ia-fab__distintivo">
				<i class="bi bi-stars"></i>
			</span>
		</button>
		<!-- El panel vive en el store (panel_abierto) para que abrir_chat_ia()
		pueda abrirlo desde cualquier lado, ej: la notificación de sugerencias. -->
		<asistente-ia-panel
		v-if="panel_abierto"></asistente-ia-panel>
	</div>
</template>

<script>
import AsistenteIaPanel from '@/components/asistente-ia/Panel'

export default {
	components: {
		AsistenteIaPanel,
	},
	data() {
		return {
			// Posición horizontal guardada del botón (px desde la izquierda del viewport); null hasta hidratar.
			button_left_px: null,
			// Posición vertical guardada del botón (px desde arriba del viewport); null hasta hidratar.
			button_top_px: null,
			// Ancho del botón flotante en px (coincide con CSS width).
			button_size_px: 60,
			// Margen mínimo respecto a los bordes del viewport al arrastrar.
			button_edge_margin_px: 8,
			// Umbral en px para considerar movimiento como arrastre (evita abrir el panel en micro-movimientos).
			drag_threshold_px: 6,
			// Si hubo arrastre real en la última interacción, se suprime el siguiente click.
			suppress_next_click_after_drag: false,
			// Estado interno mientras el usuario arrastra.
			drag_session_active: false,
			// Coordenada inicial del puntero al iniciar arrastre.
			drag_start_client_x: 0,
			drag_start_client_y: 0,
			// Posición inicial del botón al iniciar arrastre.
			drag_start_button_left: 0,
			drag_start_button_top: 0,
			// Distancia máxima acumulada desde el inicio del gesto (para detectar arrastre).
			drag_max_delta_px: 0,
			// Tras touch, muchos navegadores disparan mouse sintético; ignorar ese mousedown hasta cierta marca de tiempo.
			suppress_primary_mouse_down_until_ms: 0,
			// True si la sesión de arrastre actual comenzó con touchstart (para coordinar suppress de mouse sintético).
			drag_started_with_touch: false,
		}
	},
	computed: {
		/**
		 * Muestra el asistente sólo con sesión autenticada y la extensión habilitada (D28).
		 */
		should_show() {
			return this.authenticated && this.hasExtencion('asistente_ia')
		},
		panel_abierto() {
			return this.$store.state.ai_chat.panel_abierto
		},
		/**
		 * Logo del negocio: el de la tienda online si existe, si no la imagen de la
		 * cuenta. Las dos ya viajan en GET api/user: cero requests nuevos (D37).
		 */
		logo_url() {
			if (!this.user) {
				return null
			}
			if (this.user.online_configuration && this.user.online_configuration.logo_url) {
				return this.user.online_configuration.logo_url
			}
			return this.user.image_url || null
		},
		/**
		 * Nombre del negocio para el texto alternativo del botón.
		 */
		nombre_negocio() {
			if (this.owner && this.owner.company_name) {
				return this.owner.company_name
			}
			if (this.user && this.user.company_name) {
				return this.user.company_name
			}
			return 'tu negocio'
		},
		texto_alternativo() {
			return 'Asistente IA de ' + this.nombre_negocio
		},
		/**
		 * Estilo inline de posición fija usando left/top para permitir arrastre.
		 */
		floating_button_inline_style() {
			const pos = this.get_resolved_button_position()
			return {
				left: pos.left + 'px',
				top: pos.top + 'px',
			}
		},
	},
	mounted() {
		this.hydrate_floating_button_position()
		const self = this
		window.addEventListener('resize', self.on_window_resize_for_floating_button)
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize_for_floating_button)
		this.detach_drag_listeners()
	},
	watch: {
		/**
		 * Tras auth/me (o al cambiar de persona en la misma pestaña) re-hidrata la
		 * posición desde la fila del usuario: la base es la fuente de verdad (D3).
		 */
		'user.id'() {
			this.hydrate_floating_button_position()
		},
	},
	methods: {
		/**
		 * Clave en localStorage para cachear la posición del FAB (distinta de la del
		 * botón de soporte, que usa empresa_spa_support_chat_fab_position).
		 */
		get_floating_position_storage_key() {
			return 'empresa_spa_asistente_ia_fab_position'
		},
		/**
		 * Posición por defecto: esquina inferior derecha. Si el botón de soporte
		 * también está activo, el de IA se apila justo encima (76 = 60 del botón de
		 * soporte + 16 de aire) para que no nazcan superpuestos (D35).
		 */
		get_default_button_position() {
			const w = typeof window !== 'undefined' ? window.innerWidth : 0
			const h = typeof window !== 'undefined' ? window.innerHeight : 0
			const size = this.button_size_px
			const inset = 20
			let top_offset = 0
			if (this.hasExtencion('support_chat')) {
				top_offset = 76
			}
			return {
				left: Math.max(0, w - size - inset),
				top: Math.max(0, h - size - inset - top_offset),
			}
		},
		/**
		 * Devuelve la posición efectiva del botón (guardada o por defecto) ya acotada al viewport.
		 */
		get_resolved_button_position() {
			let left = this.button_left_px
			let top = this.button_top_px
			if (left == null || top == null) {
				const d = this.get_default_button_position()
				left = d.left
				top = d.top
			}
			return this.clamp_button_position(left, top)
		},
		/**
		 * Mantiene el botón dentro del viewport visible.
		 */
		clamp_button_position(left, top) {
			const w = typeof window !== 'undefined' ? window.innerWidth : 0
			const h = typeof window !== 'undefined' ? window.innerHeight : 0
			const size = this.button_size_px
			const m = this.button_edge_margin_px
			const max_left = Math.max(m, w - size - m)
			const max_top = Math.max(m, h - size - m)
			const clamped_left = Math.min(Math.max(m, left), max_left)
			const clamped_top = Math.min(Math.max(m, top), max_top)
			return {
				left: clamped_left,
				top: clamped_top,
			}
		},
		/**
		 * Restaura posición: localStorage pinta el primer cuadro y la columna
		 * `chat_ia_fab_position` del usuario (que ya viajó en GET api/user) pisa
		 * después, porque la fuente de verdad es la base (D1/D3).
		 */
		hydrate_floating_button_position() {
			let raw = null
			try {
				raw = window.localStorage.getItem(this.get_floating_position_storage_key())
			} catch (e) {
				raw = null
			}
			if (raw) {
				let parsed = null
				try {
					parsed = JSON.parse(raw)
				} catch (e) {
					parsed = null
				}
				if (parsed && typeof parsed.left === 'number' && typeof parsed.top === 'number') {
					const clamped = this.clamp_button_position(parsed.left, parsed.top)
					this.button_left_px = clamped.left
					this.button_top_px = clamped.top
				}
			}
			this.apply_position_from_user()
		},
		/**
		 * Aplica la posición persistida en la fila de la PERSONA, formato "left,top"
		 * en px (D3). Dos enteros entre 0 y 20000 o no se toma en cuenta.
		 */
		apply_position_from_user() {
			if (!this.user || !this.user.chat_ia_fab_position) {
				return
			}
			const partes = String(this.user.chat_ia_fab_position).split(',')
			if (partes.length !== 2) {
				return
			}
			const left = parseInt(partes[0], 10)
			const top = parseInt(partes[1], 10)
			if (isNaN(left) || isNaN(top)) {
				return
			}
			if (left < 0 || left > 20000 || top < 0 || top > 20000) {
				return
			}
			const clamped = this.clamp_button_position(left, top)
			this.button_left_px = clamped.left
			this.button_top_px = clamped.top
		},
		/**
		 * Persistencia doble (D36): localStorage como caché de primer cuadro y la
		 * base por persona vía savePreferences (que ya trae el debounce de 500 ms:
		 * una sola escritura por gesto).
		 */
		persist_floating_button_position(left, top) {
			const payload = JSON.stringify({
				left: left,
				top: top,
			})
			try {
				window.localStorage.setItem(this.get_floating_position_storage_key(), payload)
			} catch (e) {
				// Sin caché local si storage no disponible; la base se escribe igual.
			}
			this.$store.dispatch('ai_chat/savePreferences', {
				chat_ia_fab_position: left + ',' + top,
			})
		},
		/**
		 * Al redimensionar la ventana, vuelve a acotar la posición guardada.
		 */
		on_window_resize_for_floating_button() {
			if (this.button_left_px == null || this.button_top_px == null) {
				return
			}
			const clamped = this.clamp_button_position(this.button_left_px, this.button_top_px)
			this.button_left_px = clamped.left
			this.button_top_px = clamped.top
			this.persist_floating_button_position(clamped.left, clamped.top)
		},
		/**
		 * Inicia posible arrastre del botón (mouse o touch).
		 */
		on_floating_pointer_down(event) {
			if (!this.should_show) {
				return
			}
			let client_x = null
			let client_y = null
			if (event.type === 'touchstart' && event.touches && event.touches.length) {
				client_x = event.touches[0].clientX
				client_y = event.touches[0].clientY
				this.drag_started_with_touch = true
			} else if (event.type === 'mousedown') {
				if (event.button !== 0) {
					return
				}
				const now_ms = typeof Date !== 'undefined' ? Date.now() : 0
				if (now_ms < this.suppress_primary_mouse_down_until_ms) {
					return
				}
				client_x = event.clientX
				client_y = event.clientY
				this.drag_started_with_touch = false
			} else {
				return
			}
			const resolved = this.get_resolved_button_position()
			this.drag_session_active = true
			this.drag_max_delta_px = 0
			this.drag_start_client_x = client_x
			this.drag_start_client_y = client_y
			this.drag_start_button_left = resolved.left
			this.drag_start_button_top = resolved.top
			const self = this
			document.addEventListener('mousemove', self.on_floating_pointer_move)
			document.addEventListener('mouseup', self.on_floating_pointer_up)
			document.addEventListener('touchmove', self.on_floating_touch_move, {
				passive: false,
			})
			document.addEventListener('touchend', self.on_floating_pointer_up)
			document.addEventListener('touchcancel', self.on_floating_pointer_up)
		},
		/**
		 * Actualiza posición durante el arrastre con el mouse.
		 */
		on_floating_pointer_move(event) {
			if (!this.drag_session_active) {
				return
			}
			this.apply_floating_drag_delta(event.clientX, event.clientY)
		},
		/**
		 * Actualiza posición durante el arrastre táctil e impide scroll si hay movimiento.
		 */
		on_floating_touch_move(event) {
			if (!this.drag_session_active) {
				return
			}
			if (!event.touches || !event.touches.length) {
				return
			}
			if (this.drag_max_delta_px > this.drag_threshold_px) {
				event.preventDefault()
			}
			this.apply_floating_drag_delta(event.touches[0].clientX, event.touches[0].clientY)
		},
		/**
		 * Calcula delta desde el inicio y mueve el botón acotado al viewport.
		 */
		apply_floating_drag_delta(client_x, client_y) {
			const dx = client_x - this.drag_start_client_x
			const dy = client_y - this.drag_start_client_y
			const dist = Math.sqrt(dx * dx + dy * dy)
			if (dist > this.drag_max_delta_px) {
				this.drag_max_delta_px = dist
			}
			const next_left = this.drag_start_button_left + dx
			const next_top = this.drag_start_button_top + dy
			const clamped = this.clamp_button_position(next_left, next_top)
			this.button_left_px = clamped.left
			this.button_top_px = clamped.top
		},
		/**
		 * Finaliza el arrastre, persiste y marca si debe ignorarse el click.
		 */
		on_floating_pointer_up() {
			if (!this.drag_session_active) {
				return
			}
			const did_drag = this.drag_max_delta_px > this.drag_threshold_px
			this.drag_session_active = false
			this.detach_drag_listeners()
			if (did_drag) {
				this.suppress_next_click_after_drag = true
				const pos = this.get_resolved_button_position()
				this.persist_floating_button_position(pos.left, pos.top)
			}
			if (this.drag_started_with_touch) {
				const now_ms = typeof Date !== 'undefined' ? Date.now() : 0
				this.suppress_primary_mouse_down_until_ms = now_ms + 800
			}
			this.drag_started_with_touch = false
		},
		/**
		 * Quita listeners globales de arrastre.
		 */
		detach_drag_listeners() {
			const self = this
			document.removeEventListener('mousemove', self.on_floating_pointer_move)
			document.removeEventListener('mouseup', self.on_floating_pointer_up)
			document.removeEventListener('touchmove', self.on_floating_touch_move)
			document.removeEventListener('touchend', self.on_floating_pointer_up)
			document.removeEventListener('touchcancel', self.on_floating_pointer_up)
		},
		/**
		 * Alterna la visibilidad del panel del asistente (el estado vive en el store
		 * para que abrir_chat_ia() del mixin global pueda abrirlo desde cualquier lado).
		 */
		toggle_panel() {
			if (this.suppress_next_click_after_drag) {
				this.suppress_next_click_after_drag = false
				return
			}
			this.$store.commit('ai_chat/setPanelAbierto', !this.$store.state.ai_chat.panel_abierto)
		},
	},
}
</script>

<style lang="sass">
// Botón flotante del asistente IA. Convive con el de soporte (1052/1053):
// va un escalón arriba (1054, panel 1055) para que con los dos activos el
// de arriba siempre sea agarrable (R6).
.asistente-ia-fab
	position: fixed
	right: auto
	bottom: auto
	width: 60px
	height: 60px
	border: none
	border-radius: 999px
	background: var(--bg-card, #fff)
	color: #fff
	font-size: 26px
	z-index: 1054
	box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25)
	display: flex
	align-items: center
	justify-content: center
	cursor: grab
	touch-action: none
	user-select: none
	padding: 0
	overflow: visible
	// Manito abierta en reposo, un respiro de escala al pasar por encima; la
	// transición se apaga durante el arrastre para que el botón no vaya atrás
	// del dedo (D36).
	transition: transform .15s ease

	&:hover
		transform: scale(1.06)

	&:active
		cursor: grabbing

	&--arrastrando
		cursor: grabbing
		transition: none

		&:hover
			transform: none

	// Sin logo: robotito sobre el color de marca.
	> .bi-robot
		width: 100%
		height: 100%
		border-radius: 999px
		background: var(--color-primary, #007bff)
		display: flex
		align-items: center
		justify-content: center

	&__logo
		display: block
		width: 100%
		height: 100%
		border-radius: 999px
		object-fit: cover

	// Distintivo de IA: chispitas sobre color de marca, abajo a la derecha,
	// con un aro del color del fondo para despegarse del logo (D37).
	&__distintivo
		position: absolute
		right: -3px
		bottom: -3px
		width: 22px
		height: 22px
		border-radius: 999px
		background: var(--color-primary, #007bff)
		border: 2px solid var(--bg-card, #fff)
		color: #fff
		font-size: 11px
		line-height: 1
		display: flex
		align-items: center
		justify-content: center

@media (prefers-reduced-motion: reduce)
	.asistente-ia-fab
		transition: none

		&:hover
			transform: none
</style>
