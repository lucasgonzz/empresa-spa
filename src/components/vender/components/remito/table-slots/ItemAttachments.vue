<template>
<div
v-if="hasExtencion('adjuntar_archivos_en_vantas')"
class="item-attachments">

	<b-button
	variant="outline-secondary"
	size="sm"
	@click="openModal">
		<i class="icon-clipboard"></i>
		<b-badge
		v-if="total_count"
		variant="primary"
		class="m-l-5">{{ total_count }}</b-badge>
	</b-button>

	<b-modal
	:id="modal_id"
	:title="'Adjuntos: ' + item.name"
	size="md"
	hide-footer>

		<div
		v-if="loading"
		class="text-center p-20">
			<b-spinner></b-spinner>
		</div>

		<div v-else>

			<!-- Listado de adjuntos existentes -->
			<div
			v-if="saved_attachments.length"
			class="m-b-15">
				<h6 class="m-b-10">Archivos guardados</h6>
				<div
				v-for="att in saved_attachments"
				:key="att.id"
				class="attachment-row">

					<!-- Miniatura si es imagen -->
					<img
					v-if="isImage(att.original_name)"
					:src="file_url(att.id)"
					class="attachment-thumb"
					:alt="att.original_name" />

					<div class="attachment-info">
						<span class="attachment-name">
							<i class="icon-paper-clip m-r-5"></i>{{ att.original_name }}
						</span>
						<small
						v-if="att.observation"
						class="text-muted d-block m-t-3">{{ att.observation }}</small>
					</div>

					<div class="attachment-actions">
						<!-- Vista previa en nueva pestaña -->
						<!-- <b-button
						size="sm"
						variant="outline-primary"
						class="m-r-5"
						title="Vista previa"
						@click="previewFile(att.id)">
							<i class="icon-eye"></i>
						</b-button> -->

						<!-- Descargar -->
						<b-button
						size="sm"
						variant="outline-primary"
						class="m-r-5"
						title="Descargar"
						@click="downloadFile(att.id)">
							<i class="icon-download"></i>
						</b-button>

						<!-- Eliminar -->
						<b-button
						size="sm"
						variant="danger"
						title="Eliminar"
						@click="deleteAttachment(att)">
							<i class="icon-trash"></i>
						</b-button>
					</div>
				</div>
			</div>

			<!-- Adjuntos pendientes (solo en venta nueva) -->
			<div
			v-if="pending_for_item.length"
			class="m-b-15">
				<h6 class="m-b-10">Por subir al guardar</h6>
				<div
				v-for="att in pending_for_item"
				:key="att.temp_id"
				class="attachment-row">
					<div class="attachment-info">
						<span class="attachment-name">
							<i class="icon-paper-clip m-r-5"></i>{{ att.file.name }}
						</span>
						<small
						v-if="att.observation"
						class="text-muted d-block m-t-3">{{ att.observation }}</small>
					</div>
					<b-button
					size="sm"
					variant="danger"
					@click="removePending(att.temp_id)">
						<i class="icon-trash"></i>
					</b-button>
				</div>
			</div>

			<div
			v-if="!saved_attachments.length && !pending_for_item.length"
			class="text-muted m-b-15">
				Sin archivos adjuntos.
			</div>

			<hr>

			<!-- Formulario para agregar nuevo adjunto -->
			<h6 class="m-b-10">Agregar archivo</h6>
			<b-form-group label="Archivo">
				<b-form-file
				v-model="new_file"
				placeholder="Seleccioná un archivo..."
				browse-text="Buscar"
				accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"></b-form-file>
			</b-form-group>
			<b-form-group label="Observación (opcional)">
				<b-form-textarea
				v-model="new_observation"
				placeholder="Ej: Foto del producto dañado"
				type="text"></b-form-textarea>
			</b-form-group>
			<b-button
			:disabled="!new_file || uploading"
			variant="primary"
			@click="addAttachment">
				<b-spinner
				v-if="uploading"
				small
				class="m-r-5"></b-spinner>
				<i
				v-else
				class="icon-paper-clip m-r-5"></i>
				Adjuntar
			</b-button>

		</div>

	</b-modal>

</div>
</template>
<script>
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

export default {
	props: {
		item: {
			type: Object,
			required: true,
		},
		saleId: {
			type: Number,
			default: null,
		},
		// Cuando el padre maneja la lista completa (ej: SaleModal).
		// Se filtra por article_id y el componente emite eventos al padre.
		allSaleAttachments: {
			type: Array,
			default: null,
		},
	},
	data() {
		return {
			// Copia local para el contexto de vender (precargada desde Vuex o vacía para venta nueva).
			local_attachments: [],
			new_file: null,
			new_observation: '',
			loading: false,
			uploading: false,
		}
	},
	computed: {
		modal_id() {
			return 'item-attachments-' + this.item.id
		},
		// En modo SaleModal (allSaleAttachments !== null), muestra del prop del padre.
		// En todos los demás casos usa local_attachments (más simple y siempre reactivo).
		saved_attachments() {
			if (this.allSaleAttachments !== null) {
				return this.allSaleAttachments.filter(a => a.article_id === this.item.id)
			}
			return this.local_attachments
		},
		pending_for_item() {
			if (!this.$store || !this.$store.state.vender) return []
			return this.$store.state.vender.pending_attachments.filter(a => a.article_id === this.item.id)
		},
		total_count() {
			return this.saved_attachments.length + this.pending_for_item.length
		},
		vuex_sale_attachments() {
			if (this.$store && this.$store.state.vender) {
				return this.$store.state.vender.sale_attachments
			}
			return []
		},
	},
	watch: {
		// Cuando Vuex termina de precargar los adjuntos de la venta, sincronizar la copia local.
		vuex_sale_attachments(attachments) {
			if (this.allSaleAttachments === null && this.saleId) {
				this.local_attachments = attachments.filter(a => a.article_id === this.item.id)
			}
		},
	},
	mounted() {
		if (this.allSaleAttachments !== null) {
			// Modo SaleModal: la precarga la maneja el padre, nada que hacer aquí.
			return
		}
		if (this.saleId) {
			// Contexto vender editando: copiar desde Vuex si ya están cargados.
			const vuex = this.$store && this.$store.state.vender
				? this.$store.state.vender.sale_attachments
				: []
			this.local_attachments = vuex.filter(a => a.article_id === this.item.id)
		}
		// Para venta nueva (saleId null), local_attachments permanece vacío.
	},
	methods: {
		file_url(attachment_id) {
			return process.env.VUE_APP_API_URL + '/api/sale-article-attachment/file/' + attachment_id
		},
		isImage(filename) {
			const ext = (filename || '').split('.').pop().toLowerCase()
			return IMAGE_EXTENSIONS.includes(ext)
		},
		previewFile(attachment_id) {
			window.open(this.file_url(attachment_id), '_blank')
		},
		downloadFile(attachment_id) {
			window.open(this.file_url(attachment_id) + '?download=1', '_blank')
		},
		openModal() {
			this.$bvModal.show(this.modal_id)
		},
		addAttachment() {
			if (!this.new_file) return
			if (this.saleId) {
				this.uploadNow()
			} else {
				this.addPending()
			}
		},
		uploadNow() {
			this.uploading = true
			const form = new FormData()
			form.append('sale_id', this.saleId)
			form.append('article_id', this.item.id)
			form.append('file', this.new_file)
			form.append('observation', this.new_observation)

			axios.post('/api/sale-article-attachment', form, {
				headers: { 'Content-Type': 'multipart/form-data' },
			})
				.then(res => {
					const att = res.data.model
					if (this.allSaleAttachments !== null) {
						// Modo SaleModal: notificar al padre para que actualice su lista.
						this.$emit('attachment-added', att)
					} else {
						// Contexto vender: actualizar la copia local directamente.
						this.local_attachments.push(att)
					}
					this.new_file = null
					this.new_observation = ''
					this.uploading = false
					this.$toast.success('Archivo adjuntado')
				})
				.catch(() => {
					this.uploading = false
					this.$toast.error('Error al subir el archivo')
				})
		},
		addPending() {
			const attachment = {
				article_id: this.item.id,
				file: this.new_file,
				observation: this.new_observation,
				temp_id: Date.now() + Math.random(),
			}
			this.$store.commit('vender/addPendingAttachment', attachment)
			this.new_file = null
			this.new_observation = ''
		},
		removePending(temp_id) {
			this.$store.commit('vender/removePendingAttachment', temp_id)
		},
		deleteAttachment(att) {
			if (!confirm('¿Eliminar este archivo?')) return

			axios.delete('/api/sale-article-attachment/' + att.id)
				.then(() => {
					if (this.allSaleAttachments !== null) {
						// Modo SaleModal: notificar al padre.
						this.$emit('attachment-removed', att.id)
					} else {
						// Contexto vender: actualizar la copia local directamente.
						this.local_attachments = this.local_attachments.filter(a => a.id !== att.id)
					}
					this.$toast.success('Archivo eliminado')
				})
				.catch(() => {
					this.$toast.error('Error al eliminar el archivo')
				})
		},
	},
}
</script>
<style lang="sass">
.item-attachments
	display: flex
	align-items: center
	justify-content: center

.attachment-row
	display: flex
	align-items: center
	justify-content: space-between
	padding: 8px 0
	border-bottom: 1px solid #eee
	gap: 8px

	&:last-child
		border-bottom: none

	.attachment-thumb
		width: 50px
		height: 50px
		object-fit: cover
		border-radius: 4px
		flex-shrink: 0
		border: 1px solid #dee2e6

	.attachment-info
		flex: 1
		overflow: hidden
		min-width: 0

	.attachment-name
		font-size: 0.875rem
		word-break: break-all
		display: block

	.attachment-actions
		display: flex
		align-items: center
		flex-shrink: 0

	.text-muted
		font-size: 0.8rem
</style>
