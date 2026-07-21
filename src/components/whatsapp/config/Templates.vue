<template>
	<div class="whatsapp-templates-abm">
		<div class="whatsapp-templates-abm__header">
			<b-button
			size="sm"
			variant="success"
			@click="openCreate">
				<i class="bi bi-plus-lg"></i>
				Nueva plantilla
			</b-button>
		</div>

		<small class="text-muted whatsapp-templates-abm__reminder">
			Las plantillas no pueden empezar ni terminar con una variable (<code>{{ placeholder_syntax_example }}</code>).
		</small>

		<b-table
		:items="templates"
		:fields="fields"
		small
		responsive
		class="whatsapp-templates-abm__table">
			<template #cell(name)="row">
				<i
				v-if="row.item.is_system"
				title="Plantilla estándar de ComercioCity"
				class="bi bi-lock-fill whatsapp-templates-abm__lock"></i>
				{{ row.item.name }}
			</template>
			<template #cell(category)="row">
				{{ row.item.category == 'marketing' ? 'Marketing' : 'Utilidad' }}
			</template>
			<template #cell(status)="row">
				<b-badge :variant="status_variant(row.item.status)">
					{{ status_label(row.item.status) }}
				</b-badge>
			</template>
			<template #cell(body_preview)="row">
				<span class="whatsapp-templates-abm__preview">
					{{ row.item.body_preview }}
				</span>
			</template>
			<template #cell(actions)="row">
				<div class="whatsapp-templates-abm__actions">
					<b-button
					v-if="row.item.status == 'borrador' && !row.item.is_system"
					size="sm"
					variant="outline-primary"
					title="El equipo de ComercioCity la carga en Meta y te avisa cuando esté aprobada (Meta puede demorar y rechazar plantillas promocionales)"
					@click="solicitarAlta(row.item)">
						Solicitar alta en Meta
					</b-button>

					<template v-if="!row.item.is_system">
						<b-button
						size="sm"
						variant="outline-secondary"
						@click="openEdit(row.item)">
							<i class="bi bi-pencil"></i>
						</b-button>
						<b-button
						size="sm"
						variant="outline-danger"
						@click="confirmDelete(row.item)">
							<i class="bi bi-trash"></i>
						</b-button>
					</template>
					<i
					v-else
					title="Plantilla estándar de ComercioCity"
					class="bi bi-lock-fill text-muted"></i>
				</div>
			</template>
		</b-table>

		<template-form-modal
		:template="editing_template"></template-form-modal>
	</div>
</template>
<script>
import TemplateFormModal from '@/components/whatsapp/config/TemplateFormModal'
export default {
	components: {
		TemplateFormModal,
	},
	data() {
		return {
			// Plantilla que se está editando (null = el modal abre en modo "nueva plantilla").
			editing_template: null,
			// Texto de ejemplo del recordatorio visual (armado fuera del template para que el
			// compilador de Vue no confunda las llaves literales con interpolación mustache).
			placeholder_syntax_example: '{{n}}',
			fields: [
				{ key: 'name', label: 'Nombre' },
				{ key: 'category', label: 'Categoría' },
				{ key: 'status', label: 'Estado' },
				{ key: 'body_preview', label: 'Cuerpo' },
				{ key: 'actions', label: '' },
			],
		}
	},
	computed: {
		templates() {
			return this.$store.state.whatsapp_template.models
		},
	},
	methods: {
		/**
		 * Devuelve el variant de b-badge según el estado del ciclo de vida de la plantilla.
		 *
		 * @param {string} status
		 * @returns {string}
		 */
		status_variant(status) {
			if (status == 'aprobada') {
				return 'success'
			}
			if (status == 'pendiente_meta') {
				return 'warning'
			}
			if (status == 'rechazada') {
				return 'danger'
			}
			return 'secondary'
		},
		status_label(status) {
			if (status == 'aprobada') {
				return 'Aprobada'
			}
			if (status == 'pendiente_meta') {
				return 'Pendiente Meta'
			}
			if (status == 'rechazada') {
				return 'Rechazada'
			}
			return 'Borrador'
		},
		openCreate() {
			this.editing_template = null
			this.$bvModal.show('whatsapp-template-form')
		},
		openEdit(template) {
			this.editing_template = template
			this.$bvModal.show('whatsapp-template-form')
		},
		/**
		 * Pasa la plantilla de `borrador` a `pendiente_meta`. El equipo de ComercioCity la
		 * carga a mano en Meta a partir de ahí.
		 *
		 * @param {Object} template
		 */
		solicitarAlta(template) {
			this.$store.commit('auth/setMessage', 'Solicitando alta en Meta')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('whatsapp_template/solicitarAlta', template.id)
			.then(() => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Alta solicitada, el equipo de ComercioCity la va a cargar en Meta')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo solicitar el alta')
			})
		},
		confirmDelete(template) {
			this.$bvModal.msgBoxConfirm('¿Eliminar la plantilla "' + template.name + '"?', {
				okTitle: 'Eliminar',
				cancelTitle: 'Cancelar',
				okVariant: 'danger',
			})
			.then(confirmed => {
				if (confirmed) {
					this.deleteTemplate(template)
				}
			})
		},
		deleteTemplate(template) {
			this.$store.commit('auth/setMessage', 'Eliminando plantilla')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('whatsapp_template/deleteModel', template.id)
			.then(() => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Plantilla eliminada')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo eliminar la plantilla')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-templates-abm
	&__header
		display: flex
		justify-content: flex-end
		margin-bottom: 8px
	&__reminder
		display: block
		margin-bottom: 10px
	&__lock
		margin-right: 4px
		color: rgba(0, 0, 0, .45)
	&__preview
		display: -webkit-box
		-webkit-line-clamp: 2
		-webkit-box-orient: vertical
		overflow: hidden
		max-width: 260px
	&__actions
		display: flex
		flex-direction: row
		gap: 6px
</style>
