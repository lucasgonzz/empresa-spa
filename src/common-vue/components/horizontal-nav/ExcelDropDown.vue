<template>
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
		v-if="can_import"
		id="btn_import"
		v-b-modal="'import-'+model_name">
			<i class="icon-download"></i>
			Importar {{ plural(model_name) }}
		</b-dropdown-item>
		<slot name="excel_drop_down_options"></slot>
	</b-dropdown>
</template>
<script>
export default {
	props: {
		model_name: String,
		check_permissions: Boolean,
		can_create: Boolean,
		has_permission_create_dropdown: Boolean,
	},
	methods: {
		exportModels() {
			/* URL base del endpoint que ahora dispara la exportacion en cola. */
			let url = process.env.VUE_APP_API_URL+'/'+this.model_name+'/excel/export'

			/* Se solicita la exportacion asincrona al backend sin abrir descarga inmediata. */
			this.$api.get(this.model_name+'/excel/export')
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
		call_set_model() {
			if (this.can_create) {
				this.setModel(null, this.model_name)
			}
		},
	},
	computed: {
		can_export() {
			if (!this.check_permissions || this.can(this.model_name+'.excel.export')) {
				return true
			} 
			return false 
		},
		can_import() {
			if (!this.check_permissions || this.can(this.model_name+'.excel.import')) {
				return true
			} 
			return false 
		},
	}
}
</script>