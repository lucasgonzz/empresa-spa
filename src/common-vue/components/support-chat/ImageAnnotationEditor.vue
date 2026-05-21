<template>
	<b-modal
		v-model="modal_visible"
		title="Marcar imagen"
		size="xl"
		modal-class="support-image-annotation-modal"
		@shown="on_modal_shown"
		@hidden="on_modal_hidden">
		<div class="image-annotation-editor">
			<!-- Barra de herramientas: trazo, rectángulo, flecha, colores y deshacer -->
			<div class="image-annotation-toolbar d-flex flex-wrap align-items-center mb-2">
				<div class="btn-group btn-group-sm mr-2 mb-1" role="group" aria-label="Herramientas de dibujo">
					<button
						type="button"
						:class="['btn', active_tool === 'pen' ? 'btn-primary' : 'btn-outline-secondary']"
						title="Dibujar a mano alzada"
						@click="set_tool('pen')">
						<i class="bi bi-pencil"></i>
					</button>
					<button
						type="button"
						:class="['btn', active_tool === 'rect' ? 'btn-primary' : 'btn-outline-secondary']"
						title="Enmarcar un área"
						@click="set_tool('rect')">
						<i class="bi bi-square"></i>
					</button>
					<button
						type="button"
						:class="['btn', active_tool === 'arrow' ? 'btn-primary' : 'btn-outline-secondary']"
						title="Señalar con flecha"
						@click="set_tool('arrow')">
						<i class="bi bi-arrow-up-right"></i>
					</button>
				</div>
				<div class="btn-group btn-group-sm mr-2 mb-1" role="group" aria-label="Color del trazo">
					<button
						v-for="color_option in color_options"
						:key="color_option.value"
						type="button"
						:class="['btn image-annotation-color-btn', stroke_color === color_option.value ? 'active' : '']"
						:title="color_option.label"
						:style="{ backgroundColor: color_option.value }"
						@click="stroke_color = color_option.value" />
				</div>
				<button
					type="button"
					class="btn btn-sm btn-outline-secondary mb-1"
					title="Deshacer último trazo"
					:disabled="strokes.length === 0"
					@click="undo_stroke">
					<i class="bi bi-arrow-counterclockwise"></i> Deshacer
				</button>
			</div>

			<!-- Área de dibujo: imagen de fondo + anotaciones en canvas -->
			<div
				ref="canvas_wrap"
				class="image-annotation-canvas-wrap"
				:class="{ 'image-annotation-canvas-wrap--drawing': is_drawing }">
				<canvas
					ref="annotation_canvas"
					class="image-annotation-canvas"
					@mousedown.prevent="on_pointer_down"
					@mousemove.prevent="on_pointer_move"
					@mouseup.prevent="on_pointer_up"
					@mouseleave.prevent="on_pointer_leave"
					@touchstart.prevent="on_touch_start"
					@touchmove.prevent="on_touch_move"
					@touchend.prevent="on_touch_end" />
				<div v-if="image_loading" class="image-annotation-loading">
					Cargando imagen…
				</div>
				<div v-if="image_error" class="image-annotation-error">
					{{ image_error }}
				</div>
			</div>
			<p class="text-muted small mb-0 mt-2">
				Dibujá sobre la captura para señalar el problema. Al usar la imagen, se enviará con las marcas incluidas.
			</p>
		</div>

		<template v-slot:modal-footer>
			<b-button variant="secondary" @click="on_cancel">Cancelar</b-button>
			<b-button
				variant="success"
				:disabled="image_loading || !!image_error || exporting"
				@click="on_confirm">
				{{ exporting ? 'Procesando…' : 'Usar imagen' }}
			</b-button>
		</template>
	</b-modal>
</template>

<script>
/** Ancho máximo del canvas en píxeles (evita imágenes enormes en memoria). */
const MAX_CANVAS_WIDTH = 1200

/** Grosor del trazo libre y de contornos de figuras. */
const STROKE_LINE_WIDTH = 3

/**
 * Modal para anotar una imagen antes de adjuntarla al chat de soporte (estilo WhatsApp).
 * Exporta un PNG con imagen + dibujos aplastados en un File.
 */
export default {
	name: 'ImageAnnotationEditor',
	props: {
		/** Controla visibilidad del modal (.sync / update:show). */
		show: {
			type: Boolean,
			default: false,
		},
		/** Archivo de imagen a editar (File del portapapeles o del input file). */
		source_file: {
			type: File,
			default: null,
		},
	},
	data() {
		return {
			/** Herramienta activa: pen | rect | arrow. */
			active_tool: 'pen',
			/** Color hexadecimal del trazo actual. */
			stroke_color: '#e53935',
			/** Lista de trazos confirmados para redibujar y deshacer. */
			strokes: [],
			/** Trazo en curso mientras el usuario arrastra el mouse. */
			current_stroke: null,
			/** true entre pointer down y up. */
			is_drawing: false,
			/** Imagen cargada en memoria para pintar de fondo. */
			background_image: null,
			/** URL temporal del object URL del source_file. */
			object_url: null,
			/** Spinner mientras decodifica la imagen. */
			image_loading: false,
			/** Mensaje si falla la carga. */
			image_error: null,
			/** Evita doble clic en Usar imagen. */
			exporting: false,
			/** true al cerrar tras confirmar (no emitir cancel en hidden). */
			close_from_confirm: false,
			/** Paleta de colores tipo WhatsApp. */
			color_options: [
				{ value: '#e53935', label: 'Rojo' },
				{ value: '#fdd835', label: 'Amarillo' },
				{ value: '#1e88e5', label: 'Azul' },
				{ value: '#ffffff', label: 'Blanco' },
			],
		}
	},
	computed: {
		/**
		 * Puente v-model con b-modal (prop show del padre).
		 * @returns {boolean}
		 */
		modal_visible: {
			get() {
				return this.show
			},
			set(value) {
				this.$emit('update:show', value)
			},
		},
	},
	watch: {
		/**
		 * Si cambia el archivo mientras el modal está abierto, recarga.
		 */
		source_file(file) {
			if (this.show && file) {
				this.load_source_image()
			}
		},
	},
	beforeDestroy() {
		this.revoke_object_url()
	},
	methods: {
		/**
		 * Al mostrarse el modal, carga la imagen en el canvas.
		 */
		on_modal_shown() {
			if (this.source_file) {
				this.load_source_image()
			}
		},

		/**
		 * Al ocultarse: limpia estado y notifica cancel si no fue confirmación.
		 */
		on_modal_hidden() {
			if (!this.close_from_confirm) {
				this.$emit('cancel')
			}
			this.close_from_confirm = false
			this.reset_editor_state()
		},

		/**
		 * Cierra sin confirmar.
		 */
		on_cancel() {
			this.modal_visible = false
		},

		/**
		 * Cambia la herramienta de dibujo activa.
		 *
		 * @param {string} tool pen | rect | arrow
		 */
		set_tool(tool) {
			this.active_tool = tool
		},

		/**
		 * Elimina el último trazo confirmado.
		 */
		undo_stroke() {
			if (this.strokes.length === 0) {
				return
			}
			this.strokes.pop()
			this.redraw_canvas()
		},

		/**
		 * Libera object URL si existía.
		 */
		revoke_object_url() {
			if (this.object_url) {
				URL.revokeObjectURL(this.object_url)
				this.object_url = null
			}
		},

		/**
		 * Limpia estado al cerrar el modal.
		 */
		reset_editor_state() {
			this.strokes = []
			this.current_stroke = null
			this.is_drawing = false
			this.background_image = null
			this.image_loading = false
			this.image_error = null
			this.exporting = false
			this.revoke_object_url()
		},

		/**
		 * Decodifica source_file, calcula tamaño del canvas y dibuja fondo.
		 */
		load_source_image() {
			const self = this
			this.strokes = []
			this.current_stroke = null
			this.is_drawing = false
			this.background_image = null
			this.image_loading = true
			this.image_error = null
			this.exporting = false

			if (!this.source_file || this.source_file.type.indexOf('image/') !== 0) {
				this.image_loading = false
				this.image_error = 'El archivo no es una imagen válida.'
				return
			}

			this.revoke_object_url()
			this.object_url = URL.createObjectURL(this.source_file)

			const img = new Image()
			img.onload = function () {
				self.background_image = img
				self.fit_canvas_to_image(img.naturalWidth, img.naturalHeight)
				self.image_loading = false
				self.$nextTick(function () {
					self.redraw_canvas()
				})
			}
			img.onerror = function () {
				self.image_loading = false
				self.image_error = 'No se pudo cargar la imagen.'
			}
			img.src = this.object_url
		},

		/**
		 * Ajusta dimensiones del canvas manteniendo proporción y tope de ancho.
		 *
		 * @param {number} natural_width
		 * @param {number} natural_height
		 */
		fit_canvas_to_image(natural_width, natural_height) {
			let target_width = natural_width
			let target_height = natural_height
			if (target_width > MAX_CANVAS_WIDTH) {
				const ratio = MAX_CANVAS_WIDTH / target_width
				target_width = MAX_CANVAS_WIDTH
				target_height = Math.round(natural_height * ratio)
			}
			const canvas_el = this.$refs.annotation_canvas
			if (canvas_el) {
				canvas_el.width = target_width
				canvas_el.height = target_height
			}
		},

		/**
		 * Obtiene el contexto 2D del canvas o null.
		 *
		 * @returns {CanvasRenderingContext2D|null}
		 */
		get_context() {
			const canvas_el = this.$refs.annotation_canvas
			if (!canvas_el) {
				return null
			}
			return canvas_el.getContext('2d')
		},

		/**
		 * Convierte coordenadas del puntero a espacio del canvas (respeta escala CSS).
		 *
		 * @param {MouseEvent|Touch} event_or_touch
		 * @returns {{ x: number, y: number }}
		 */
		pointer_to_canvas_coords(event_or_touch) {
			const canvas_el = this.$refs.annotation_canvas
			const rect = canvas_el.getBoundingClientRect()
			const scale_x = canvas_el.width / rect.width
			const scale_y = canvas_el.height / rect.height
			const client_x = event_or_touch.clientX
			const client_y = event_or_touch.clientY
			return {
				x: (client_x - rect.left) * scale_x,
				y: (client_y - rect.top) * scale_y,
			}
		},

		/**
		 * Inicia un trazo según la herramienta activa.
		 *
		 * @param {number} x
		 * @param {number} y
		 */
		begin_stroke(x, y) {
			this.is_drawing = true
			const base = {
				type: this.active_tool,
				color: this.stroke_color,
				line_width: STROKE_LINE_WIDTH,
			}
			if (this.active_tool === 'pen') {
				this.current_stroke = Object.assign({}, base, {
					points: [{ x: x, y: y }],
				})
			} else if (this.active_tool === 'rect') {
				this.current_stroke = Object.assign({}, base, {
					start_x: x,
					start_y: y,
					end_x: x,
					end_y: y,
				})
			} else if (this.active_tool === 'arrow') {
				this.current_stroke = Object.assign({}, base, {
					start_x: x,
					start_y: y,
					end_x: x,
					end_y: y,
				})
			}
			this.redraw_canvas()
		},

		/**
		 * Actualiza el trazo en curso mientras se arrastra.
		 *
		 * @param {number} x
		 * @param {number} y
		 */
		update_stroke(x, y) {
			if (!this.is_drawing || !this.current_stroke) {
				return
			}
			if (this.current_stroke.type === 'pen') {
				this.current_stroke.points.push({ x: x, y: y })
			} else {
				this.current_stroke.end_x = x
				this.current_stroke.end_y = y
			}
			this.redraw_canvas()
		},

		/**
		 * Confirma el trazo actual y lo agrega al historial.
		 */
		finish_stroke() {
			if (!this.is_drawing || !this.current_stroke) {
				return
			}
			this.is_drawing = false
			const stroke = this.current_stroke
			let has_content = true
			if (stroke.type === 'pen' && stroke.points.length < 2) {
				has_content = false
			}
			if (stroke.type === 'rect' || stroke.type === 'arrow') {
				const dx = stroke.end_x - stroke.start_x
				const dy = stroke.end_y - stroke.start_y
				if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
					has_content = false
				}
			}
			if (has_content) {
				this.strokes.push(stroke)
			}
			this.current_stroke = null
			this.redraw_canvas()
		},

		/**
		 * @param {MouseEvent} event
		 */
		on_pointer_down(event) {
			const coords = this.pointer_to_canvas_coords(event)
			this.begin_stroke(coords.x, coords.y)
		},

		/**
		 * @param {MouseEvent} event
		 */
		on_pointer_move(event) {
			if (!this.is_drawing) {
				return
			}
			const coords = this.pointer_to_canvas_coords(event)
			this.update_stroke(coords.x, coords.y)
		},

		/**
		 * @param {MouseEvent} event
		 */
		on_pointer_up(event) {
			if (!this.is_drawing) {
				return
			}
			const coords = this.pointer_to_canvas_coords(event)
			this.update_stroke(coords.x, coords.y)
			this.finish_stroke()
		},

		/**
		 * Corta el trazo si el puntero sale del canvas.
		 */
		on_pointer_leave() {
			if (this.is_drawing) {
				this.finish_stroke()
			}
		},

		/**
		 * @param {TouchEvent} event
		 */
		on_touch_start(event) {
			if (!event.touches || event.touches.length === 0) {
				return
			}
			const coords = this.pointer_to_canvas_coords(event.touches[0])
			this.begin_stroke(coords.x, coords.y)
		},

		/**
		 * @param {TouchEvent} event
		 */
		on_touch_move(event) {
			if (!this.is_drawing || !event.touches || event.touches.length === 0) {
				return
			}
			const coords = this.pointer_to_canvas_coords(event.touches[0])
			this.update_stroke(coords.x, coords.y)
		},

		/**
		 * @param {TouchEvent} event
		 */
		on_touch_end() {
			this.finish_stroke()
		},

		/**
		 * Pinta imagen de fondo y todos los trazos (confirmados + el actual).
		 */
		redraw_canvas() {
			const ctx = this.get_context()
			const canvas_el = this.$refs.annotation_canvas
			if (!ctx || !canvas_el) {
				return
			}
			ctx.clearRect(0, 0, canvas_el.width, canvas_el.height)
			if (this.background_image) {
				ctx.drawImage(this.background_image, 0, 0, canvas_el.width, canvas_el.height)
			}
			let i = 0
			for (i = 0; i < this.strokes.length; i++) {
				this.draw_stroke(ctx, this.strokes[i])
			}
			if (this.current_stroke) {
				this.draw_stroke(ctx, this.current_stroke)
			}
		},

		/**
		 * Dibuja un trazo individual en el contexto.
		 *
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {Object} stroke
		 */
		draw_stroke(ctx, stroke) {
			ctx.save()
			ctx.strokeStyle = stroke.color
			ctx.fillStyle = stroke.color
			ctx.lineWidth = stroke.line_width
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'

			if (stroke.type === 'pen') {
				const points = stroke.points || []
				if (points.length < 2) {
					ctx.restore()
					return
				}
				ctx.beginPath()
				ctx.moveTo(points[0].x, points[0].y)
				let p = 1
				for (p = 1; p < points.length; p++) {
					ctx.lineTo(points[p].x, points[p].y)
				}
				ctx.stroke()
			} else if (stroke.type === 'rect') {
				const x = Math.min(stroke.start_x, stroke.end_x)
				const y = Math.min(stroke.start_y, stroke.end_y)
				const w = Math.abs(stroke.end_x - stroke.start_x)
				const h = Math.abs(stroke.end_y - stroke.start_y)
				ctx.strokeRect(x, y, w, h)
			} else if (stroke.type === 'arrow') {
				this.draw_arrow(ctx, stroke.start_x, stroke.start_y, stroke.end_x, stroke.end_y)
			}
			ctx.restore()
		},

		/**
		 * Segmento con punta de flecha en el extremo final.
		 *
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {number} x1
		 * @param {number} y1
		 * @param {number} x2
		 * @param {number} y2
		 */
		draw_arrow(ctx, x1, y1, x2, y2) {
			const head_len = 14
			const angle = Math.atan2(y2 - y1, x2 - x1)
			ctx.beginPath()
			ctx.moveTo(x1, y1)
			ctx.lineTo(x2, y2)
			ctx.stroke()
			ctx.beginPath()
			ctx.moveTo(x2, y2)
			ctx.lineTo(
				x2 - head_len * Math.cos(angle - Math.PI / 6),
				y2 - head_len * Math.sin(angle - Math.PI / 6),
			)
			ctx.lineTo(
				x2 - head_len * Math.cos(angle + Math.PI / 6),
				y2 - head_len * Math.sin(angle + Math.PI / 6),
			)
			ctx.closePath()
			ctx.fill()
		},

		/**
		 * Exporta el canvas a PNG y emite confirm al padre.
		 */
		on_confirm() {
			const self = this
			const canvas_el = this.$refs.annotation_canvas
			if (!canvas_el || this.image_error) {
				return
			}
			this.exporting = true
			canvas_el.toBlob(
				function (blob) {
					self.exporting = false
					if (!blob) {
						self.image_error = 'No se pudo generar la imagen.'
						return
					}
					const base_name = self.source_file && self.source_file.name
						? self.source_file.name.replace(/\.[^.]+$/, '')
						: 'screenshot'
					const annotated_file = new File([blob], base_name + '_marked.png', {
						type: 'image/png',
					})
					self.close_from_confirm = true
					self.$emit('confirm', annotated_file)
					self.modal_visible = false
				},
				'image/png',
				0.92,
			)
		},
	},
}
</script>

<style scoped>
.image-annotation-editor {
	user-select: none;
}

.image-annotation-toolbar {
	border-bottom: 1px solid #e9ecef;
	padding-bottom: 8px;
}

.image-annotation-color-btn {
	width: 28px;
	height: 28px;
	padding: 0;
	border: 2px solid #dee2e6;
	border-radius: 50%;
}

.image-annotation-color-btn.active {
	border-color: #007bff;
	box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.35);
}

.image-annotation-canvas-wrap {
	position: relative;
	max-height: 65vh;
	overflow: auto;
	background: #1a1a1a;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 120px;
}

.image-annotation-canvas-wrap--drawing {
	cursor: crosshair;
}

.image-annotation-canvas {
	display: block;
	max-width: 100%;
	height: auto;
	touch-action: none;
}

.image-annotation-loading,
.image-annotation-error {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	text-align: center;
	font-size: 14px;
}

.image-annotation-loading {
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
}

.image-annotation-error {
	background: #fff5f5;
	color: #c53030;
}
</style>

<!-- Por encima del overlay de soporte (z-index 1053 en Modal.vue) -->
<style>
body > .modal.support-image-annotation-modal {
	z-index: 1100 !important;
}
body > .modal-backdrop:last-of-type {
	z-index: 1095 !important;
}
</style>
