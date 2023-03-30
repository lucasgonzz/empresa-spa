<template>
<b-modal
title="Importar saldos"
id="import-current-acounts"
hide-footer>
	<p>
		Seleccione el archivo con los datos de las cuentas corrientes de {{ client.name }}
	</p>
	<b-form-file
	class="m-b-15"
	browse-text="Buscar"
	v-model="file"
	variant="primary"
	:state="Boolean(file)"
	placeholder="Seleccione el archivo o arrastralo hasta aquí"
	drop-placeholder="Solta el archivo aqui..."
	></b-form-file>
	<p 
	v-for="message in messages"
	class="text-danger">
		{{ message }}
	</p>
	<b-button
	:disabled="!file"
	block
	@click="upload"
	variant="primary">
		<btn-loader
		text="Importar"
		:loader="loading"></btn-loader>
	</b-button>
</b-modal>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'

import current_acounts from '@/mixins/current_acounts'
export default {
	mixins: [current_acounts],
	components: {
		BtnLoader,
	},
	data() {
		return {
			loading: false,
			messages: [],
			file: null,
		}
	},
	methods: {
		upload() {
			this.loading = true
			let config = {headers: { 'content-type': 'multipart/form-data' }}
			let form_data = new FormData();
			form_data.append('current_acounts', this.file);
			this.$api.post('current-acounts/excel/import/'+this.client.id, form_data, config)
			.then(res => {
				this.loading = false
				this.$store.dispatch('current_acount/getModels')
				this.$store.dispatch('clients/current_acounts/updateClient')
				this.file = null
				this.$bvModal.hide('import-current-acounts')
				console.log(res)
			})
			.catch(err => {
				this.loading = false
				this.file = null
				this.$bvModal.hide('import-current-acounts')
				this.$store.dispatch('current_acount/getModels')
				this.$store.dispatch('clients/current_acounts/updateClient')
				console.log(err)
			})
		}
	}
}
</script>