<template>
	<b-modal
	id="whatsapp-template-form"
	:title="is_edit ? 'Editar plantilla' : 'Nueva plantilla'"
	hide-footer
	size="lg"
	@shown="resetForm">
		<b-form-group
		label="Nombre">
			<b-form-input
			v-model="form.name"
			placeholder="Recordatorio de deuda"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Categoría">
			<b-form-select
			v-model="form.category"
			:options="category_options"></b-form-select>
		</b-form-group>

		<b-form-group
		label="Cuerpo">
			<b-form-textarea
			v-model="form.body_preview"
			rows="4"
			max-rows="8"
			:placeholder="'Hola ' + placeholder(1) + ', tenés un saldo pendiente de ' + placeholder(2) + '. ¿Podemos ayudarte con el pago?'"></b-form-textarea>
			<small class="text-muted whatsapp-template-form__hint">
				Usá <code>{{ placeholder(1) }}</code>, <code>{{ placeholder(2) }}</code>… para las
				variables, en el mismo orden que las cargues abajo. No puede empezar ni terminar
				con una variable.
			</small>
		</b-form-group>

		<b-form-group
		label="Variables">
			<div
			v-for="(label, index) in form.variables"
			:key="index"
			class="whatsapp-template-form__variable">
				<span class="whatsapp-template-form__variable-tag">{{ placeholder(index + 1) }}</span>
				<b-form-input
				v-model="form.variables[index]"
				placeholder="Ej: nombre del cliente"></b-form-input>
				<b-button
				size="sm"
				variant="outline-danger"
				@click="removeVariable(index)">
					<i class="bi bi-x-lg"></i>
				</b-button>
			</div>
			<b-button
			size="sm"
			variant="outline-secondary"
			@click="addVariable">
				<i class="bi bi-plus-lg"></i>
				Agregar variable
			</b-button>
		</b-form-group>

		<div class="whatsapp-template-form__actions">
			<btn-loader
			text="Guardar"
			:loader="loading"
			:block="false"
			@clicked="save"></btn-loader>
		</div>
	</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		// Plantilla a editar; null si el modal se abrió en modo "nueva plantilla".
		template: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			form: {
				name: '',
				category: 'utility',
				body_preview: '',
				variables: [],
			},
			loading: false,
			category_options: [
				{ value: 'utility', text: 'Utilidad' },
				{ value: 'marketing', text: 'Marketing' },
			],
		}
	},
	computed: {
		is_edit() {
			return !!(this.template && this.template.id)
		},
	},
	methods: {
		/**
		 * Arma el texto del placeholder Meta (ej: "{{1}}") para el número de variable dado.
		 * Se arma acá (fuera del template) para que el compilador de Vue no confunda las
		 * llaves literales con interpolación mustache.
		 *
		 * @param {number} n
		 * @returns {string}
		 */
		placeholder(n) {
			return '{{' + n + '}}'
		},
		/**
		 * Carga el formulario con la plantilla a editar, o lo deja limpio para una nueva.
		 * Se dispara en `shown` (no en el `watch` del prop) para que el formulario no se
		 * vacíe mientras el modal todavía está visible cerrándose.
		 */
		resetForm() {
			if (this.is_edit) {
				this.form.name = this.template.name
				this.form.category = this.template.category
				this.form.body_preview = this.template.body_preview
				// Copia (no referencia) para no mutar el store mientras se edita.
				this.form.variables = (this.template.variables || []).slice()
			} else {
				this.form.name = ''
				this.form.category = 'utility'
				this.form.body_preview = ''
				this.form.variables = []
			}
		},
		addVariable() {
			this.form.variables.push('')
		},
		removeVariable(index) {
			this.form.variables.splice(index, 1)
		},
		/**
		 * Validación mínima en el front (según convención del proyecto: validar acá, no en
		 * el backend). No bloquea el guardado con un modal invasivo, solo avisa por toast.
		 *
		 * @returns {boolean}
		 */
		is_valid() {
			if (!this.form.name || !this.form.name.trim()) {
				this.$toast.error('Falta el nombre de la plantilla')
				return false
			}
			if (!this.form.body_preview || !this.form.body_preview.trim()) {
				this.$toast.error('Falta el cuerpo de la plantilla')
				return false
			}
			let trimmed = this.form.body_preview.trim()
			if (trimmed.indexOf('{{1}}') === 0 || trimmed.slice(-6) === '{{' + this.form.variables.length + '}}') {
				this.$toast.error('La plantilla no puede empezar ni terminar con una variable')
				return false
			}
			return true
		},
		save() {
			if (!this.is_valid()) {
				return
			}

			this.loading = true
			this.$store.commit('auth/setMessage', 'Guardando plantilla')
			this.$store.commit('auth/setLoading', true)

			let action = this.is_edit ? 'whatsapp_template/updateModel' : 'whatsapp_template/createModel'
			let payload = {
				name: this.form.name,
				category: this.form.category,
				body_preview: this.form.body_preview,
				variables: this.form.variables,
			}
			if (this.is_edit) {
				payload.id = this.template.id
			}

			this.$store.dispatch(action, payload)
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Plantilla guardada')
				this.$bvModal.hide('whatsapp-template-form')
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				let message = (err.response && err.response.data && err.response.data.message) || 'No se pudo guardar la plantilla'
				this.$toast.error(message)
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-template-form
	&__hint
		display: block
		margin-top: 6px
	&__variable
		display: flex
		flex-direction: row
		align-items: center
		gap: 8px
		margin-bottom: 8px
		&-tag
			font-family: monospace
			color: rgba(0, 0, 0, .5)
			flex-shrink: 0
	&__actions
		display: flex
		justify-content: flex-end
		margin-top: 15px
</style>
