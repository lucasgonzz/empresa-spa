<template>
	<div class="support-message-input-bar">
		<div class="d-flex align-items-center w-100">
			<input
				ref="text_input"
				class="form-control mr-2"
				type="text"
				placeholder="Escribí un mensaje..."
				:disabled="!can_send || sending"
				v-model="body"
				@paste="on_paste"
				@input="send_typing"
				@keydown.enter.prevent="emit_send" />
			<input
				ref="file_input"
				class="d-none"
				type="file"
				accept="audio/*,image/*"
				@change="on_file_change" />
			<button
				class="btn btn-outline-secondary mr-2"
				type="button"
				:disabled="!can_send || sending || recording"
				@click="toggle_recording">
				{{ recording ? 'Grabando...' : 'Audio' }}
			</button>
			<button
				class="btn btn-outline-secondary mr-2"
				type="button"
				:disabled="!can_send || sending"
				@click="open_file_input">
				Adjuntar
			</button>
			<button
				class="btn btn-success"
				type="button"
				:disabled="!can_send || sending"
				@click="emit_send">
				Enviar
			</button>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		can_send: {
			type: Boolean,
			default: true,
		},
		sending: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			// Texto pendiente de envío.
			body: '',
			// Archivo multimedia adjunto pendiente.
			attachment: null,
			// Flag de estado de grabación de audio.
			recording: false,
			// Instancia de MediaRecorder en ejecución.
			media_recorder: null,
			// Chunks temporales del audio grabado.
			audio_chunks: [],
		}
	},
	methods: {
		/**
		 * Toma imagen pegada (Ctrl+V) desde portapapeles y la adjunta.
		 */
		on_paste(event) {
			let items = event.clipboardData ? event.clipboardData.items : []
			for (let i = 0; i < items.length; i++) {
				let item = items[i]
				if (item.kind == 'file' && item.type.indexOf('image/') == 0) {
					this.attachment = item.getAsFile()
					return
				}
			}
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
			if (files.length) {
				this.attachment = files[0]
			}
		},
		/**
		 * Inicia o detiene grabación de audio con MediaRecorder.
		 */
		toggle_recording() {
			if (this.recording) {
				this.media_recorder.stop()
				return
			}
			navigator.mediaDevices.getUserMedia({ audio: true })
			.then(stream => {
				this.audio_chunks = []
				this.media_recorder = new MediaRecorder(stream)
				this.media_recorder.ondataavailable = audio_event => {
					if (audio_event.data && audio_event.data.size > 0) {
						this.audio_chunks.push(audio_event.data)
					}
				}
				this.media_recorder.onstop = () => {
					let audio_blob = new Blob(this.audio_chunks, { type: 'audio/webm' })
					this.attachment = new File([audio_blob], 'audio_' + Date.now() + '.webm', { type: 'audio/webm' })
					this.recording = false
					stream.getTracks().forEach(track => track.stop())
				}
				this.recording = true
				this.media_recorder.start()
			})
			.catch(error => {
				console.log(error)
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
		/**
		 * Notifica typing al backend de forma ligera.
		 */
		send_typing() {
			this.$store.dispatch('support_message/sendTyping')
		},
	},
}
</script>

<style scoped>
.support-message-input-bar {
	border-top: 1px solid #e6e6e6;
	padding: 10px;
}
</style>

