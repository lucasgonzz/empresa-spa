<template>
	<div class="support-message-input-bar">
		<!-- Editor de anotaciones sobre imagen (pegado o adjunto) antes de enviar -->
		<image-annotation-editor
			:show.sync="image_editor_visible"
			:source_file="image_editor_source_file"
			@confirm="on_image_annotation_confirm"
			@cancel="on_image_annotation_cancel" />

		<!-- Indicador de adjunto pendiente: nombre del archivo y botón para cancelarlo -->
		<div v-if="attachment" class="support-input-attachment-preview">
			<span class="support-input-attachment-icon">
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
				title="Quitar adjunto"
				@click="remove_attachment">
				✕
			</button>
		</div>
		<!-- Aviso: contexto no seguro (empresa.local), permiso denegado u API no disponible -->
		<div v-if="mic_error" class="support-input-mic-error">
			{{ mic_error_message }}
		</div>
		<div class="d-flex align-items-center w-100">
			<input
				ref="text_input"
				class="form-control mr-2"
				type="text"
				placeholder="Escribí un mensaje..."
				:disabled="!can_send"
				v-model="body"
				@paste="on_paste"
				@keydown.enter.prevent="emit_send" />
			<input
				ref="file_input"
				class="d-none"
				type="file"
				accept="audio/*,image/*"
				@change="on_file_change" />
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
</template>

<script>
import ImageAnnotationEditor from '@/common-vue/components/support-chat/ImageAnnotationEditor.vue'

export default {
	components: {
		ImageAnnotationEditor,
	},
	props: {
		can_send: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			/** Texto pendiente de envío. */
			body: '',
			/** Archivo multimedia adjunto pendiente (File). */
			attachment: null,
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
		}
	},
	computed: {
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
	methods: {
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
			this.attachment = annotated_file
			this.image_editor_source_file = null
		},

		/**
		 * Cierra el editor sin adjuntar (descarta borrador).
		 */
		on_image_annotation_cancel() {
			this.image_editor_source_file = null
		},
		/**
		 * Abre selector nativo para adjuntar audio o imagen.
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
			/* Solo las imágenes pasan por el editor; audio y otros van directo al adjunto. */
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
			navigator.mediaDevices.getUserMedia({ audio: true })
			.then(function (stream) {
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
					self.attachment = new File([audio_blob], 'audio_' + Date.now() + '.webm', { type: 'audio/webm' })
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
			})
		},
		/**
		 * Emite payload al componente padre y resetea campos locales.
		 */
		emit_send() {
			if (!this.body && !this.attachment) {
				return
			}
			let kind = 'text'
			if (this.attachment && this.attachment.type.indexOf('audio') == 0) {
				kind = 'audio'
			}
			if (this.attachment && this.attachment.type.indexOf('image') == 0) {
				kind = 'image'
			}
			this.$emit('send', {
				body: this.body,
				kind: kind,
				attachment: this.attachment,
			})
			this.body = ''
			this.attachment = null
			this.$refs.file_input.value = ''
		},
	},
}
</script>

<style scoped>
.support-message-input-bar {
	border-top: 1px solid #e6e6e6;
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
	color: #888;
	font-size: 12px;
	line-height: 1;
	text-decoration: none;
}

.support-input-attachment-remove:hover {
	color: #c53030;
}

/* Aviso de permiso de micrófono denegado */
.support-input-mic-error {
	padding: 4px 8px;
	margin-bottom: 6px;
	background: #fff5f5;
	border: 1px solid #fca5a5;
	border-radius: 6px;
	font-size: 12px;
	color: #c53030;
}
</style>

