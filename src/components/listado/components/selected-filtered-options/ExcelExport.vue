<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-text>
			Documentos Excel 
		</b-dropdown-text>

		<b-dropdown-item
		@click="export_excel">
			<i class="icon-share"></i>
			Exportar Excel
		</b-dropdown-item>
	</div>
</template>
<script>
export default {
	computed: {
		selected() {
			return this.$store.state.article.selected 
		},
		filtered() {
			return this.$store.state.article.filtered 
		},
		filters() {
			return this.$store.state.article.filters 
		},
	},
	methods: {
		getIds() {
			/* Acumula ids seleccionados para exportacion puntual. */
			let ids = []
			/* Fuente de articulos seleccionados en la grilla. */
			let articles
			if (this.selected.length) {
				articles = this.selected
			} 
			articles.forEach(article => {
				ids.push(article.id)
			})
			return ids.join('-')
		},
		export_excel() {
			/* Endpoint que ahora encola la exportacion en backend. */
			let link = '/article/excel/export'
			
			/* Querystring final según exportación por seleccion o filtros. */
			let query = ''

			if (this.selected.length) {
				/* IDs seleccionados manualmente en la tabla. */
				let ids = this.getIds() 
				query = '?articles_id='+ids
			} else {
				/* Filtros activos del listado para exportación masiva. */
				let jsonData = JSON.stringify(this.filters)
				query = '?filters='+encodeURIComponent(jsonData)
			}

			/* URL definitiva que dispara el job de exportacion. */
			let export_url = link + query
			
			/* Se inicia proceso asincrono y la descarga llegará por notificación global. */
			this.$api.get(export_url)
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
	}
}
</script>