<template>
	<b-modal
	id="whatsapp-templates"
	title="Enviar plantilla"
	hide-footer
	size="lg"
	@hidden="reset">
		<div v-if="!selected_template">
			<p
			v-if="!approved_templates.length"
			class="text-muted">
				Todavía no hay plantillas aprobadas para este negocio.
			</p>
			<b-list-group>
				<b-list-group-item
				v-for="template in approved_templates"
				:key="template.id"
				class="c-p"
				@click="selectTemplate(template)">
					<strong>{{ template.name }}</strong>
					<p class="m-b-0 text-muted">
						{{ template.body_preview }}
					</p>
				</b-list-group-item>
			</b-list-group>
		</div>

		<div v-else>
			<b-button
			size="sm"
			variant="link"
			class="p-l-0"
			@click="selected_template = null">
				<i class="bi bi-arrow-left"></i>
				Elegir otra plantilla
			</b-button>

			<b-form-group
			v-for="(label, index) in selected_template.variables"
			:key="index"
			:label="label">
				<b-form-input
				v-model="variable_values[index]"></b-form-input>
			</b-form-group>

			<div class="whatsapp-templates__preview">
				<strong>Vista previa:</strong>
				<p class="whatsapp-templates__preview-text">
					{{ preview_text }}
				</p>
			</div>

			<div class="whatsapp-templates__actions">
				<btn-loader
				text="Enviar plantilla"
				:loader="loading"
				:block="false"
				@clicked="send"></btn-loader>
			</div>
		</div>
	</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		chat: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			// Plantilla elegida (null = todavía en el paso de selección de la lista).
			selected_template: null,
			// Valores cargados por variable, en el mismo orden que `selected_template.variables`.
			variable_values: [],
			loading: false,
		}
	},
	computed: {
		templates() {
			return this.$store.state.whatsapp_template.models
		},
		/**
		 * Solo se pueden mandar plantillas `aprobada` en Meta (las demás todavía no sirven para enviar).
		 */
		approved_templates() {
			return this.templates.filter(template => template.status == 'aprobada')
		},
		/**
		 * Texto final reemplazando cada `{{n}}` por el valor cargado (o dejando el placeholder
		 * visible si todavía está vacío, para que se note qué falta completar).
		 */
		preview_text() {
			if (!this.selected_template) {
				return ''
			}
			let text = this.selected_template.body_preview
			this.variable_values.forEach((value, index) => {
				let placeholder = '{{' + (index + 1) + '}}'
				text = text.split(placeholder).join(value || placeholder)
			})
			return text
		},
	},
	methods: {
		selectTemplate(template) {
			this.selected_template = template
			this.variable_values = (template.variables || []).map(() => '')
		},
		send() {
			if (!this.selected_template || !this.chat) {
				return
			}
			this.loading = true
			this.$store.dispatch('whatsapp_chat/sendTemplate', {
				chat_id: this.chat.id,
				template_id: this.selected_template.id,
				variables: this.variable_values,
			})
			.then(() => {
				this.loading = false
				this.$bvModal.hide('whatsapp-templates')
			})
			.catch(err => {
				this.loading = false
				console.log(err)
				let message = (err.response && err.response.data && err.response.data.message) || 'No se pudo enviar la plantilla'
				this.$toast.error(message)
			})
		},
		reset() {
			this.selected_template = null
			this.variable_values = []
		},
	},
}
</script>
<style lang="sass">
.whatsapp-templates__preview
	background: #f7f9fb
	border-radius: 8px
	padding: 10px
	margin-top: 10px
	&-text
		white-space: pre-wrap
		margin-bottom: 0
.whatsapp-templates__actions
	display: flex
	justify-content: flex-end
	margin-top: 15px
</style>
