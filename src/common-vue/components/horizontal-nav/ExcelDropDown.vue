<template>
	<b-dropdown
	right
	split 
	variant="primary"
	v-if="can_create"
	@click="setModel(null, model_name)"
	text="Crear">
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
		v-b-modal="'import-'+model_name">
			<i class="icon-download"></i>
			Importar {{ plural(model_name) }}
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
export default {
	props: {
		model_name: String,
		check_permissions: Boolean,
		can_create: Boolean,
	},
	methods: {
		exportModels() {
			let url = process.env.VUE_APP_API_URL+'/'+this.model_name+'/excel/export'
			window.open(url)		
		}
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