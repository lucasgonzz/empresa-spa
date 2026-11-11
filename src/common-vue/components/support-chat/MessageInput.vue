<template>
	<div class="support-message-input-bar"
	:class="{ 'support-message-input-bar--agentes asistente-ia-composer': en_agentes }"
	:data-robotito-borrador="tiene_borrador_en_curso ? 'true' : null">
		<!-- Editor de anotaciones sobre imagen (pegado o adjunto) antes de enviar -->
		<image-annotation-editor
			:show.sync="image_editor_visible"
			:source_file="image_editor_source_file"
			@confirm="on_image_annotation_confirm"
			@cancel="on_image_annotation_cancel" />

		<div :class="{ 'asistente-ia-composer__columna': en_agentes }">
			<!-- Indicador de adjunto pendiente: nombre del archivo y botón para cancelarlo -->
			<div v-if="attachment" class="support-input-attachment-preview">
				<i v-if="en_agentes" :class="attachment_is_audio ? 'bi bi-mic' : 'bi bi-paperclip'" aria-hidden="true"></i>
				<span v-else class="support-input-attachment-icon" aria-hidden="true">
					{{ attachment_is_audio ? '🎤' : attachment_is_image ? '🖼' : '📎' }}
				</span>
				<span class="support-input-attachment-name text-truncate">{{ attachment.name }}</span>
				<button
					v-if="attachment_is_image"
					type="button"
					class="btn btn-sm btn-link support-input-attachment-edit"
					title="Volver a marcar la imagen"
					@click="open_image_editor_for_attachment">
					Editar
				</button>
				<button
					type="button"
					class="btn btn-sm btn-link support-input-attachment-remove"
					aria-label="Quitar adjunto"
					title="Quitar adjunto"
					@click="remove_attachment">
					✕
				</button>
			</div>
			<!-- Aviso: contexto no seguro (empresa.local), permiso denegado u API no disponible -->
			<div v-if="mic_error" class="support-input-mic-error">
				{{ mic_error_message }}
			</div>
			<!-- Aviso: el archivo elegido no se puede adjuntar (un documento de más de 10 MB) -->
			<div v-if="attachment_error" class="support-input-mic-error" role="alert">
				{{ attachment_error }}
			</div>
			<!-- Audios, imágenes y, desde la misión prueba-e2e-campana-imperio, Excel, CSV y PDF -->
			<input
				ref="file_input"
				class="d-none"
				type="file"
				:accept="acepta"
				@change="on_file_change" />
			<p v-if="en_agentes && recording" class="support-input-recording" role="status">
				Grabando audio <span aria-hidden="true">{{ recording_time_label }}</span>
			</p>
			<form
				v-if="en_agentes"
				class="asistente-ia-composer__caja"
				data-tour="soporte.escribir"
				aria-label="Escribir a Soporte"
				@submit.prevent="enviar_desde_agentes">
				<textarea
					ref="text_input"
					v-model="body"
					class="asistente-ia-composer__texto"
					rows="1"
					placeholder="Escribí tu consulta"
					aria-label="Mensaje para Soporte"
					enterkeyhint="send"
					:disabled="!can_send"
					@paste="on_paste"
					@keydown.enter="enviar_con_enter"></textarea>
				<button
					type="button"
					class="support-input-composer-action"
					aria-label="Adjuntar archivo"
					title="Adjuntar archivo"
					:disabled="!can_send || recording || solicitando_microfono || confirmando"
					@click="open_file_input">
					<i class="bi bi-paperclip" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="support-input-composer-action"
					:class="{ 'support-input-composer-action--recording': recording }"
					:aria-label="recording ? 'Detener grabación' : 'Grabar audio'"
					:title="recording ? 'Detener grabación' : 'Grabar audio'"
					:disabled="!recording && (!can_send || solicitando_microfono || confirmando)"
					@click="toggle_recording">
					<icono v-if="recording" nombre="detener" :tamano="20"></icono>
					<i v-else class="bi bi-mic" aria-hidden="true"></i>
				</button>
				<button type="submit" class="asistente-ia-composer__enviar" aria-label="Enviar" title="Enviar" :disabled="!puede_enviar_desde_agentes">
					<icono nombre="enviar" :tamano="20"></icono>
				</button>
			</form>
			<div v-else class="d-flex align-items-center w-100" data-tour="soporte.escribir">
				<input
					ref="text_input"
					class="form-control mr-2"
					type="text"
					placeholder="Escribí un mensaje..."
					:disabled="!can_send"
					v-model="body"
					@paste="on_paste"
					@keydown.enter.prevent="emit_send" />
				<!-- Botón de grabación: rojo mientras graba con texto de duración -->
				<button
					:class="['btn mr-2', recording ? 'btn-danger' : 'btn-outline-secondary']"
					type="button"
					:disabled="!can_send"
					:title="recording ? 'Detener grabación' : 'Grabar audio'"
					@click="toggle_recording">
					{{ recording ? ('⏹ ' + recording_time_label) : '🎤' }}
				</button>
				<button
					class="btn btn-outline-secondary mr-2"
					type="button"
					:disabled="!can_send || recording"
					@click="open_file_input">
					Adjuntar
				</button>
				<button
					class="btn btn-success"
					type="button"
					:disabled="!can_send || recording"
					@click="emit_send">
					Enviar
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import ImageAnnotationEditor from '@/common-vue/components/support-chat/ImageAnnotationEditor.vue'
import Icono from '@/components/asistente-ia/Icono'
import { ACEPTA, rechazo_del_adjunto } from '@/common-vue/components/support-chat/adjuntos'

export default {
	components: {
		ImageAnnotationEditor,
		Icono,
	},
	props: {
		can_send: {
			type: Boolean,
			default: true,
		},
		preparar_envio: Function,
		clave_borrador: { type: String, default: 'nuevo' },
		en_agentes: Boolean,
	},
	data() {
		return {
			borradores: {},
			confirmando: false,
			solicitando_microfono: false,
			/** Modal de marcas sobre imagen visible. */
			image_editor_visible: false,
			/** Imagen en edición antes de confirmar adjunto. */
			image_editor_source_file: null,
			/** true mientras MediaRecorder está activo. */
			recording: false,
			/** Instancia activa de MediaRecorder; null si no hay grabación. */
			media_recorder: null,
			/** Chunks binarios acumulados durante la grabación. */
			audio_chunks: [],
			/** true si no se puede grabar (contexto inseguro, permiso o API ausente). */
			mic_error: false,
			/** Texto del aviso rojo según el motivo del fallo. */
			mic_error_message: '',
			/** Segundos transcurridos desde que inició la grabación actual. */
			recording_seconds: 0,
			/** ID del interval que incrementa recording_seconds cada 1 s. */
			recording_timer_id: null,
			/** Por qué no se adjuntó el último archivo elegido ('' si no hay nada que avisar). */
			attachment_error: '',
		}
	},
	computed: {
		tiene_borrador_en_curso() {
			return this.confirmando || this.recording || this.solicitando_microfono || this.image_editor_visible
				|| this.$store?.state.support_message?.sending
				|| Object.values(this.borradores).some(borrador => (borrador.body || '').trim() || borrador.attachment)
		},
		/** El `accept` del selector de archivos. */
		acepta() { return ACEPTA },
		borrador() { return this.borradores[this.clave_borrador] || {} },
		body: {
			get() { return this.borrador.body || '' },
			set(valor) { this.editar_borrador(this.clave_borrador, { body: valor }) },
		},
		attachment: {
			get() { return this.borrador.attachment || null },
			set(valor) { this.editar_borrador(this.clave_borrador, { attachment: valor }) },
		},
		puede_enviar_desde_agentes() {
			return this.can_send && !this.confirmando && !this.recording && !this.solicitando_microfono
				&& Boolean(this.body.trim() || this.attachment)
		},
		/**
		 * Indica si el adjunto pendiente es audio (para el ícono del preview).
		 * @returns {boolean}
		 */
		attachment_is_audio() {
			return this.attachment && this.attachment.type.indexOf('audio') === 0
		},
		/**
		 * Indica si el adjunto pendiente es imagen.
		 * @returns {boolean}
		 */
		attachment_is_image() {
			return this.attachment && this.attachment.type.indexOf('image') === 0
		},
		/**
		 * Duración de grabación formateada como MM:SS para mostrar junto al botón.
		 * @returns {string}
		 */
		recording_time_label() {
			const s = this.recording_seconds
			const minutes = Math.floor(s / 60)
			const seconds = s % 60
			return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds
		},
		/**
		 * getUserMedia solo existe en contexto seguro (HTTPS, localhost, 127.0.0.1).
		 * http://empresa.local no califica → mediaDevices queda undefined.
		 * @returns {boolean}
		 */
		microphone_available() {
			return !!(
				typeof navigator !== 'undefined' &&
				navigator.mediaDevices &&
				typeof navigator.mediaDevices.getUserMedia === 'function'
			)
		},
	},
	watch: {
		body() {
			if (this.en_agentes) this.$nextTick(this.ajustar_altura)
		},
	},
	mounted() {
		if (!this.en_agentes) return
		this.ajustar_altura()
		if (typeof ResizeObserver === 'undefined') return
		this._observador_ancho = new ResizeObserver(([entrada]) => {
			const ancho = entrada.contentRect.width
			if (ancho === this._ancho_texto) return
			this._ancho_texto = ancho
			this.ajustar_altura()
		})
		this._observador_ancho.observe(this.$refs.text_input)
	},
	beforeDestroy() {
		if (this._observador_ancho) this._observador_ancho.disconnect()
		clearInterval(this.recording_timer_id)
		if (this.media_recorder && this.media_recorder.state !== 'inactive') this.media_recorder.stop()
	},
	methods: {
		ajustar_altura() {
			const campo = this.$refs.text_input
			if (!campo) return
			campo.style.height = 'auto'
			campo.style.height = campo.scrollHeight + 'px'
		},
		enviar_con_enter(evento) {
			if (evento.shiftKey || evento.isComposing) return
			evento.preventDefault()
			this.enviar_desde_agentes()
		},
		enviar_desde_agentes() {
			if (this.puede_enviar_desde_agentes) this.emit_send()
		},
		editar_borrador(clave, cambios) {
			const borrador = Object.assign({}, this.borradores[clave], cambios)
			if (borrador.body || borrador.attachment) this.$set(this.borradores, clave, borrador)
			else this.$delete(this.borradores, clave)
		},
		/**
		 * Enfoca el campo de texto del mensaje si existe y no está deshabilitado.
		 * Lo usa el panel de soporte al abrirse para que el usuario pueda escribir al instante.
		 */
		focus_text_input() {
			const input_el = this.$refs.text_input
			if (!input_el || input_el.disabled) {
				return
			}
			input_el.focus()
		},
		/**
		 * Toma imagen pegada (Ctrl+V) y abre el editor de anotaciones.
		 *
		 * @param {ClipboardEvent} event
		 */
		on_paste(event) {
			let items = event.clipboardData ? event.clipboardData.items : []
			for (let i = 0; i < items.length; i++) {
				let item = items[i]
				if (item.kind == 'file' && item.type.indexOf('image/') == 0) {
					let file = item.getAsFile()
					if (file) {
						this.open_image_editor(file)
					}
					return
				}
			}
		},

		/**
		 * Abre el modal para dibujar sobre la imagen antes de adjuntarla.
		 *
		 * @param {File} file
		 */
		open_image_editor(file) {
			if (!file || file.type.indexOf('image/') !== 0) {
				return
			}
			this.image_editor_source_file = file
			this._borrador_de_imagen = this.clave_borrador
			this.image_editor_visible = true
		},

		/**
		 * Reabre el editor con el adjunto de imagen ya confirmado.
		 */
		open_image_editor_for_attachment() {
			if (this.attachment && this.attachment_is_image) {
				this.open_image_editor(this.attachment)
			}
		},

		/**
		 * Recibe la imagen anotada exportada desde el modal.
		 *
		 * @param {File} annotated_file
		 */
		on_image_annotation_confirm(annotated_file) {
			this.editar_borrador(this._borrador_de_imagen, { attachment: annotated_file })
			this.image_editor_source_file = null
		},

		/**
		 * Cierra el editor sin adjuntar (descarta borrador).
		 */
		on_image_annotation_cancel() {
			this.image_editor_source_file = null
		},
		/**
		 * Abre selector nativo para adjuntar un audio, una imagen o un documento (Excel, CSV, PDF).
		 */
		open_file_input() {
			this.$refs.file_input.click()
		},
		/**
		 * Guarda archivo seleccionado para enviarlo junto al mensaje.
		 */
		on_file_change(event) {
			let files = event.target.files || []
			if (!files.length) {
				return
			}
			let file = files[0]
			/* Un documento demasiado pesado no se adjunta: se avisa acá, antes de intentar mandarlo. */
			this.attachment_error = rechazo_del_adjunto(file) || ''
			if (this.attachment_error) {
				event.target.value = ''
				return
			}
			/* Solo las imágenes pasan por el editor; audio, documentos y otros van directo al adjunto. */
			if (file.type.indexOf('image/') === 0) {
				this.open_image_editor(file)
			} else {
				this.attachment = file
			}
			event.target.value = ''
		},
		/**
		 * Elimina el adjunto pendiente y resetea el input de archivo.
		 */
		remove_attachment() {
			this.attachment_error = ''
			this.attachment = null
			this.$refs.file_input.value = ''
		},
		/**
		 * Mensaje cuando el micrófono no está disponible (p. ej. desarrollo en empresa.local sin HTTPS).
		 * @returns {string}
		 */
		build_mic_unavailable_message() {
			if (typeof window !== 'undefined' && window.isSecureContext === false) {
				return (
					'La grabación requiere HTTPS o abrir la app en http://localhost. ' +
					'Podés usar Adjuntar para subir un audio.'
				)
			}
			return 'No se puede acceder al micrófono en este navegador. Usá Adjuntar para subir un archivo de audio.'
		},
		/**
		 * Inicia o detiene grabación de audio con MediaRecorder.
		 * Si el navegador rechaza el permiso, muestra aviso en lugar de fallar silenciosamente.
		 */
		toggle_recording() {
			const self = this
			if (this.solicitando_microfono) return
			if (this.recording) {
				this.media_recorder.stop()
				return
			}
			/* Limpiar error previo antes de intentar de nuevo. */
			this.mic_error = false
			this.mic_error_message = ''
			if (!this.microphone_available) {
				this.mic_error = true
				this.mic_error_message = this.build_mic_unavailable_message()
				return
			}
			const clave = this.clave_borrador
			this.solicitando_microfono = true
			navigator.mediaDevices.getUserMedia({ audio: true })
			.then(function (stream) {
				if (self._isDestroyed) {
					stream.getTracks().forEach(track => track.stop())
					return
				}
				self.audio_chunks = []
				self.media_recorder = new MediaRecorder(stream)
				self.media_recorder.ondataavailable = function (audio_event) {
					if (audio_event.data && audio_event.data.size > 0) {
						self.audio_chunks.push(audio_event.data)
					}
				}
				self.media_recorder.onstop = function () {
					/* Detener timer de duración. */
					clearInterval(self.recording_timer_id)
					self.recording_timer_id = null
					self.recording_seconds = 0

					let audio_blob = new Blob(self.audio_chunks, { type: 'audio/webm' })
					if (!self._isDestroyed) self.editar_borrador(clave, {
						attachment: new File([audio_blob], 'audio_' + Date.now() + '.webm', { type: 'audio/webm' }),
					})
					self.recording = false
					stream.getTracks().forEach(function (track) {
						track.stop()
					})
				}
				/* Iniciar timer de duración visible en el botón. */
				self.recording_seconds = 0
				self.recording_timer_id = setInterval(function () {
					self.recording_seconds++
				}, 1000)

				self.recording = true
				self.media_recorder.start()
			})
			.catch(function (error) {
				/* Permiso denegado u otro error de acceso al dispositivo. */
				console.warn('[SupportChat] getUserMedia error:', error)
				self.mic_error = true
				self.mic_error_message =
					'Sin acceso al micrófono. Verificá los permisos del navegador o usá Adjuntar.'
			}).finally(() => { self.solicitando_microfono = false })
		},
		/**
		 * Emite payload al componente padre y resetea campos locales.
		 */
		emit_send() {
			if (!this.can_send || this.confirmando || this.recording || (!this.body.trim() && !this.attachment)) {
				return
			}
			let kind = 'text'
			if (this.attachment && this.attachment.type.indexOf('audio') == 0) {
				kind = 'audio'
			}
			if (this.attachment && this.attachment.type.indexOf('image') == 0) {
				kind = 'image'
			}
			const payload = {
				body: this.body,
				kind: kind,
				attachment: this.attachment,
			}
			const clave = this.clave_borrador
			this.confirmando = true
			const preparar = this.preparar_envio ? this.preparar_envio() : Promise.resolve({})
			preparar.then(opciones => {
				if (!opciones || this._isDestroyed || this.clave_borrador !== clave) return
				this.$emit('send', Object.assign(payload, opciones))
				this.editar_borrador(clave, {
					body: this.body === payload.body ? '' : this.body,
					attachment: this.attachment === payload.attachment ? null : this.attachment,
				})
			}).catch(() => {
				this.$toast.error('No pudimos preparar el envío. Volvé a intentar.')
			}).finally(() => {
				this.confirmando = false
			})
		},
	},
}
</script>

<style scoped>
.support-message-input-bar:not(.support-message-input-bar--agentes) {
	border-top: 1px solid var(--color-border, #e6e6e6);
	padding: 10px;
}

/* Fila compacta que muestra el archivo adjunto pendiente antes de enviar */
.support-input-attachment-preview {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 6px;
	margin-bottom: 6px;
	background: #f0f4ff;
	border: 1px solid #c3d0f5;
	border-radius: 6px;
	font-size: 12px;
	color: #3a3a5c;
	max-width: 100%;
}

.support-input-attachment-icon {
	flex-shrink: 0;
}

.support-input-attachment-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.support-input-attachment-edit {
	flex-shrink: 0;
	padding: 0 4px;
	font-size: 12px;
	line-height: 1;
	text-decoration: none;
}

.support-input-attachment-remove {
	flex-shrink: 0;
	padding: 0 4px;
	color: var(--color-text-secondary, #888);
	font-size: 12px;
	line-height: 1;
	text-decoration: none;
}

.support-input-attachment-remove:hover {
	color: var(--btn-peligro-texto, #c53030);
}

/* Aviso de permiso de micrófono denegado */
.support-input-mic-error {
	padding: 4px 8px;
	margin-bottom: 6px;
	background: var(--btn-peligro-fondo, #fff5f5);
	border: 1px solid var(--btn-peligro-borde, #fca5a5);
	border-radius: 6px;
	font-size: 12px;
	color: var(--btn-peligro-texto, #c53030);
}
</style>

<style lang="sass" scoped>
@import '@/components/asistente-ia/_mixins'

.support-message-input-bar--agentes
	.asistente-ia-composer__caja:focus-within
		outline: 2px solid var(--ia-foco)
		outline-offset: 2px
	.asistente-ia-composer__texto
		max-height: min(12rem, 35vh)
		overflow-y: auto
	.support-input-attachment-preview
		background: var(--ia-bg-compositor)
		color: var(--ia-texto)
		border-color: var(--ia-borde)
		border-radius: 10px
	.support-input-attachment-edit, .support-input-attachment-remove
		color: var(--ia-primario)
	.support-input-composer-action
		+asistente-ia-boton-icono(36px, 11px)
		font-size: 18px
		&:disabled
			opacity: .45
			cursor: default
		&--recording, &--recording:hover:not(:disabled)
			background: var(--ia-peligro-tinte)
			color: var(--ia-peligro)
	.support-input-recording
		margin: 0 0 6px
		color: var(--ia-peligro)
		font-size: .8rem
		text-align: right
		font-variant-numeric: tabular-nums
</style>

