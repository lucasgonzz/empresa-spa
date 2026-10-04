<template>
	<div v-if="should_show">
		<button
			class="support-chat-floating-button"
			type="button"
			:style="floating_button_inline_style"
			@click="toggle_chat"
			@mousedown="on_floating_pointer_down"
			@touchstart="on_floating_pointer_down">
			<!-- <i class="fab fa-whatsapp"></i> -->
			<img src="@/assets/whastapp.png" alt="Soporte">
			<span
				v-if="unread_badge_count > 0"
				class="support-chat-unread-badge"
				:title="'Mensajes de soporte sin leer: ' + unread_badge_count">
				{{ unread_badge_text }}
			</span>
		</button>
		<support-chat-modal
			v-if="show_chat"
			@close="show_chat = false" />
	</div>
</template>

<script>
import SupportChatModal from '@/common-vue/components/support-chat/Modal'

export default {
	components: {
		SupportChatModal,
	},
	data() {
		return {
			// Estado local para abrir/cerrar el panel de chat.
			show_chat: false,
			// Posición horizontal guardada del botón (px desde la izquierda del viewport); null hasta hidratar.
			button_left_px: null,
			// Posición vertical guardada del botón (px desde arriba del viewport); null hasta hidratar.
			button_top_px: null,
			// Ancho del botón flotante en px (coincide con CSS width).
			button_size_px: 60,
			// Margen mínimo respecto a los bordes del viewport al arrastrar.
			button_edge_margin_px: 8,
			// Umbral en px para considerar movimiento como arrastre (evita abrir chat en micro-movimientos).
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
			// Copia REACTIVA del tamaño de la ventana, que actualiza el resize. window.innerWidth /
			// innerHeight no son reactivos: sin esto el estilo del botón quedaba cacheado con el
			// tamaño viejo (la posición por defecto no se movía al achicar la ventana, y en Vender
			// el botón podía quedar sobre la barra de acciones después de un resize).
			viewport_width_px: typeof window !== 'undefined' ? window.innerWidth : 0,
			viewport_height_px: typeof window !== 'undefined' ? window.innerHeight : 0,
			// True si la sesión de arrastre actual comenzó con touchstart (para coordinar suppress de mouse sintético).
			drag_started_with_touch: false,
		}
	},
	computed: {
		/**
		 * Muestra chat sólo con sesión autenticada y extensión habilitada.
		 */
		should_show() {
			return this.authenticated && this.hasExtencion('support_chat')
		},
		/**
		 * Suma unread_messages_count de todos los tickets (mensajes del operador aún no leídos en cliente).
		 */
		unread_badge_count() {
			const models = this.$store.state.support_ticket.models
			if (!models || !models.length) {
				return 0
			}
			let total = 0
			for (let i = 0; i < models.length; i = i + 1) {
				const n = models[i].unread_messages_count
				if (n != null && n !== '') {
					const p = parseInt(n, 10)
					if (!isNaN(p) && p > 0) {
						total = total + p
					}
				}
			}
			return total
		},
		/**
		 * Muestra número acotado para no desbordar el badge visual.
		 */
		unread_badge_text() {
			const c = this.unread_badge_count
			if (c > 99) {
				return '99+'
			}
			return String(c)
		},
		/**
		 * Alto en px de la franja de abajo que ocupa una barra fija de la pantalla actual
		 * (hoy, la barra de acciones de Vender; 0 en cualquier otra pantalla). El botón se
		 * acomoda por encima de esa franja: con la barra a lo ancho de toda la pantalla, en
		 * la esquina derecha tapaba el botón de WhatsApp y la punta de "Guardar venta".
		 * Misma cuenta que el botón del asistente IA (components/asistente-ia/FloatingButton.vue).
		 */
		bottom_reserved_px() {
			const vender_state = this.$store.state.vender
			return (vender_state && vender_state.actions_bar_height_px) || 0
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
	/**
	 * Carga bandeja para contadores; al loguear o activar el botón se pide de nuevo.
	 */
	mounted() {
		this.hydrate_floating_button_position()
		this.load_support_tickets_for_badge()
		const self = this
		window.addEventListener('resize', self.on_window_resize_for_floating_button)
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize_for_floating_button)
		this.detach_drag_listeners()
	},
	watch: {
		should_show: {
			immediate: false,
			handler(value) {
				if (value) {
					this.load_support_tickets_for_badge()
				}
			},
		},
		authenticated: {
			immediate: false,
			handler(value) {
				const self = this
				if (value) {
					this.$nextTick(function () {
						if (self.should_show) {
							self.load_support_tickets_for_badge()
						}
					})
				}
			},
		},
	},
	methods: {
		/**
		 * Clave en localStorage para persistir la posición del FAB.
		 */
		get_floating_position_storage_key() {
			return 'empresa_spa_support_chat_fab_position'
		},
		/**
		 * Lee left/top por defecto equivalentes a right/bottom 20px del diseño original.
		 * El "abajo" es el borde de la pantalla menos la franja reservada por una barra fija
		 * (bottom_reserved_px): en Vender nace 20 px arriba de la barra de acciones, y el
		 * botón del asistente IA —que hace la misma cuenta— se sigue apilando encima.
		 */
		get_default_button_position() {
			// Del dato reactivo y no de window: así la posición por defecto sigue al resize.
			const w = this.viewport_width_px
			const h = this.viewport_height_px
			const size = this.button_size_px
			const inset = 20
			return {
				left: Math.max(0, w - size - inset),
				top: Math.max(0, h - this.bottom_reserved_px - size - inset),
			}
		},
		/**
		 * Devuelve la posición efectiva del botón (guardada o por defecto) ya acotada al
		 * viewport y por encima de la franja reservada por una barra fija.
		 */
		get_resolved_button_position() {
			let left = this.button_left_px
			let top = this.button_top_px
			if (left == null || top == null) {
				const d = this.get_default_button_position()
				left = d.left
				top = d.top
			}
			return this.keep_above_bottom_reserved(this.clamp_button_position(left, top))
		},
		/**
		 * Sube el botón lo justo para que no pise la franja de abajo reservada por una
		 * barra fija (bottom_reserved_px). La barra ocupa todo el ancho, así que vale para
		 * cualquier posición horizontal, también para la que el usuario eligió arrastrando.
		 *
		 * 🔴 Va APARTE de clamp_button_position a propósito: el clamp lo usan la hidratación
		 * y el resize, que escriben button_left_px / button_top_px. Si la reserva entrara ahí,
		 * quedaría "horneada" en la posición elegida y al salir de Vender el botón no volvería
		 * a donde el usuario lo dejó.
		 *
		 * @param {Object} pos { left, top } ya acotada al viewport
		 * @returns {Object} { left, top }
		 */
		keep_above_bottom_reserved(pos) {
			const reserved = this.bottom_reserved_px
			if (!reserved) {
				return pos
			}
			// Del dato reactivo y no de window: un resize con la barra puesta vuelve a acomodar el botón.
			const h = this.viewport_height_px
			const m = this.button_edge_margin_px
			// Tope de arriba del botón para que su borde inferior quede `m` px sobre la barra.
			const max_top = Math.max(m, h - reserved - this.button_size_px - m)
			return {
				left: pos.left,
				top: Math.min(pos.top, max_top),
			}
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
		 * Restaura posición desde localStorage o deja null para usar defaults.
		 */
		hydrate_floating_button_position() {
			let raw = null
			try {
				raw = window.localStorage.getItem(this.get_floating_position_storage_key())
			} catch (e) {
				raw = null
			}
			if (!raw) {
				return
			}
			let parsed = null
			try {
				parsed = JSON.parse(raw)
			} catch (e) {
				parsed = null
			}
			if (!parsed || typeof parsed.left !== 'number' || typeof parsed.top !== 'number') {
				return
			}
			const clamped = this.clamp_button_position(parsed.left, parsed.top)
			this.button_left_px = clamped.left
			this.button_top_px = clamped.top
		},
		/**
		 * Persiste left/top del FAB para próximas visitas.
		 */
		persist_floating_button_position(left, top) {
			const payload = JSON.stringify({
				left: left,
				top: top,
			})
			try {
				window.localStorage.setItem(this.get_floating_position_storage_key(), payload)
			} catch (e) {
				// Sin persistencia si storage no disponible.
			}
		},
		/**
		 * Al redimensionar la ventana, vuelve a acotar la posición guardada.
		 */
		on_window_resize_for_floating_button() {
			// Primero el tamaño reactivo, ANTES del return de abajo: sin posición guardada (botón
			// en su lugar por defecto) también hay que recalcular dónde va.
			this.viewport_width_px = window.innerWidth
			this.viewport_height_px = window.innerHeight
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
			// Tampoco puede bajar a la franja de una barra fija mientras se arrastra (ver keep_above_bottom_reserved).
			const clamped = this.keep_above_bottom_reserved(this.clamp_button_position(next_left, next_top))
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
		 * Lista tickets con unread_messages_count desde la API; idempotente.
		 */
		load_support_tickets_for_badge() {
			if (!this.should_show) {
				return
			}
			this.$store.dispatch('support_ticket/getModels')
		},
		/**
		 * Alterna la visibilidad del panel de soporte.
		 */
		toggle_chat() {
			if (this.suppress_next_click_after_drag) {
				this.suppress_next_click_after_drag = false
				return
			}
			this.show_chat = !this.show_chat
		},
	},
}
</script>

<style scoped>
.support-chat-floating-button {
	position: fixed;
	right: auto;
	bottom: auto;
	width: 60px;
	height: 60px;
	border: none;
	border-radius: 999px;
	background: #25d366;
	color: #fff;
	font-size: 28px;
	z-index: 1052;
	box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: grab;
	touch-action: none;
	user-select: none;
	/* ancla al badge (mensajes de admin sin leer) */
}

.support-chat-floating-button:active {
	cursor: grabbing;
}

.support-chat-floating-button > img {
	display: block;
	width: 34px;
	height: auto;
}

/* Badge rojo: total de burbujas del operador con read_at nulo, sumando tickets. */
.support-chat-unread-badge {
	position: absolute;
	top: -2px;
	right: -2px;
	min-width: 1.15rem;
	padding: 0.2em 0.42em;
	background: #dc3545;
	color: #fff;
	font-size: 0.7rem;
	font-weight: 700;
	line-height: 1.1;
	border-radius: 999px;
	text-align: center;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>

