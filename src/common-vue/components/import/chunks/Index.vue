<template>
	<div>

		<articulos-creados
		:articles="articulos_creados"></articulos-creados>

		<chunk-fila
		:chunk_for_filas="chunk_for_filas"></chunk-fila>

		<article-import-observations
		:article_import_observations="article_import_observations"></article-import-observations>

		<b-modal
		hide-footer
		size="lg"
		title="Lotes"
		@shown="get_chunks"
		id="chunks">
			<b-table
			responsive
			head-variant="dark"
			:fields="fields"
			:items="items">
				
				<template #cell(creados)="data">
					<b-button
					@click="modelos_creados(chunks[data.index])">
					 	{{ chunks[data.index].created_count }}
					</b-button>
				</template>
				
				<template #cell(actualizados)="data">
					<b-button
					@click="modelos_actualizados(chunks[data.index])">
					 	{{ chunks[data.index].updated_count }}
					</b-button>
				</template>
				
				<template #cell(filas)="data">
					<b-button
					@click="show_filas(chunks[data.index])">
					 	Filas
					</b-button>
				</template>

				<template #cell(proceso)="data">
					<b-button
					@click="show_article_import_duration(chunks[data.index])">
					 	Proceso
					</b-button>
				</template>
			</b-table>
		</b-modal>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		import_history_show_lotes: Object
	},
	components: {
		ArticulosCreados: () => import('@/common-vue/components/import/ArticulosCreados'),
		ChunkFila: () => import('@/common-vue/components/import/chunks/ChunkFila'),
		ArticleImportObservations: () => import('@/common-vue/components/import/chunks/ArticleImportObservations'),
	},
	data() {
		return {
			chunks: [],
			chunk_for_filas: null,
			article_import_observations: null,
			articulos_creados: [],
		}
	},
	computed: {
		fields() {
			return [
				{
					label: 'N° Lote',
					key: 'chunk_number',
				},
				{
					label: 'Inicio',
					key: 'created_at',
				},
				{
					label: 'Fin',
					key: 'terminado_at',
				},
				{
					label: 'Duracion',
					key: 'duration',
				},
				{
					key: 'filas_procesadas',
				},
				{
					key: 'creados',
				},
				{
					key: 'actualizados',
				},
				{
					key: 'filas',
				},
				{
					key: 'proceso',
				},
			]
		},
		items() {
			let items = []
			this.chunks.forEach(chunk => {

				let fecha_inicio = moment(chunk.created_at)
				let fecha_fin = moment(chunk.terminado_at)

				let diferencia_segundos = fecha_fin.diff(fecha_inicio, 'seconds')

				items.push({
					created_at: this.date(chunk.created_at, true),
					terminado_at: this.date(chunk.terminado_at, true),
					duration: diferencia_segundos+' segundos',

					chunk_number: chunk.chunk_number,
					filas_procesadas: chunk.filas_procesadas,
				})
			})
			return items
		},
	},
	methods: {
		show_filas(chunk) {
			this.chunk_for_filas = chunk.article_import_result_observations 
			this.$bvModal.show('chunk-filas')
		},
		show_article_import_duration(chunk) {
			this.article_import_observations = chunk.article_import_observations 
			this.$bvModal.show('article-import-observations')
		},
		get_chunks() {
			this.$store.commit('auth/setMessage', 'Cargando')
			this.$store.commit('auth/setLoading', true)
			this.$api.get('import-history/chunks/'+this.import_history_show_lotes.id)
			.then(res => {
				console.log(res.data.models)
				this.$store.commit('auth/setLoading', false)
				this.chunks = res.data.models
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
			})
		},

		modelos_creados(model) {
			this.$store.commit('auth/setLoading', true)
			this.$api.get('import-history/created-models/'+model.id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.articulos_creados = res.data.model.articulos_creados
				this.$bvModal.show('articulos-creados')
			})
			this.$bvModal.show('articulos-creados')
		},
		modelos_actualizados(model) {
			this.$store.commit('auth/setLoading', true)
			this.$api.get('import-history/updated-models/'+model.id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.articulos_creados = res.data.model.articulos_actualizados
				this.$bvModal.show('articulos-creados')
			})
		},
	}
}
</script>