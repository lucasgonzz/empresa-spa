<template>

	<div>

		<export-history
		:model_name="model_name"></export-history>

		<masive-update-history
		v-if="show_masive_update_history"
		:model_name="model_name"></masive-update-history>


		<b-dropdown

		right

		split 

		:id="'dropdown_'+model_name"

		variant="primary"

		v-if="can_create || has_permission_create_dropdown"

		@click="call_set_model">

			<template 

			#button-content>

				<span

				:dusk="'btn_create_'+model_name">

					<i class="icon-plus"></i>

					Crear

				</span>

			</template>

			<b-dropdown-item

			v-if="can_create"

			@click="setModel(null, model_name)">

				<i class="icon-plus"></i>

				{{ create_spanish(model_name) }}

			</b-dropdown-item>

			<b-dropdown-item

			v-if="can_export"

			@click="exportModels">

				<i class="icon-upload"></i>

				Exportar {{ plural(model_name) }}

			</b-dropdown-item>

			<b-dropdown-item

			v-if="can_export"

			@click="open_export_history">

				<i class="icon-list"></i>

				Historial de exportaciones

			</b-dropdown-item>

		<b-dropdown-item
		v-if="can_import"
		id="btn_import"
		v-b-modal="'import-'+model_name">
			<i class="icon-download"></i>
			Importar {{ plural(model_name) }}
		</b-dropdown-item>

		<!-- Opción de importación asistida por IA para artículos -->
		<b-dropdown-item
		v-if="model_name === 'article' && hasExtencion('ai_excel_import')"
		@click="$bvModal.show('ai-excel-import-modal')">
			<i class="icon-cpu"></i>
			Importar con IA
		</b-dropdown-item>

		<!-- Opción de importación asistida por IA para clientes -->
		<b-dropdown-item
		v-if="model_name === 'client' && hasExtencion('ai_excel_import')"
		@click="$bvModal.show('ai-client-excel-import-modal')">
			<i class="icon-cpu"></i>
			Importar con IA
		</b-dropdown-item>

		<!-- Opción de importación asistida por IA para proveedores -->
		<b-dropdown-item
		v-if="model_name === 'provider' && hasExtencion('ai_excel_import')"
		@click="$bvModal.show('ai-provider-excel-import-modal')">
			<i class="icon-cpu"></i>
			Importar con IA
		</b-dropdown-item>

			<b-dropdown-item
			v-if="show_masive_update_history"
			@click="open_masive_update_history">
				<i class="icon-history"></i>
				Historial de actualizaciones masivas
			</b-dropdown-item>

			<slot name="excel_drop_down_options"></slot>
		</b-dropdown>

	</div>

</template>

<script>

export default {

	components: {
		ExportHistory: () => import('@/common-vue/components/horizontal-nav/ExportHistory'),
		MasiveUpdateHistory: () => import('@/common-vue/components/horizontal-nav/MasiveUpdateHistory'),
	},
	props: {

		model_name: String,

		check_permissions: Boolean,

		can_create: Boolean,

		has_permission_create_dropdown: Boolean,

	},

	methods: {

		exportModels() {

			this.$api.get(this.model_name + '/excel/export')

			.then(() => {

				this.$toast.success('La exportacion se esta procesando. Te avisaremos cuando el excel este listo.', {

					duration: 4000,

				})

			})

			.catch(() => {

				this.$toast.error('No se pudo iniciar la exportacion de excel', {

					duration: 4000,

				})

			})

		},

		open_export_history() {
			this.$bvModal.show('export-history')
		},
		open_masive_update_history() {
			this.$bvModal.show('masive-update-history')
		},
		call_set_model() {
			if (this.can_create) {

				this.setModel(null, this.model_name)

			}

		},

	},

	computed: {

		can_export() {

			if (!this.check_permissions || this.can(this.model_name + '.excel.export')) {

				return true

			} 

			return false 

		},

		can_import() {
			if (!this.check_permissions || this.can(this.model_name + '.excel.import')) {
				return true
			}
			return false
		},
		show_masive_update_history() {
			return this.model_name === 'article'
		},
	}
}
</script>

