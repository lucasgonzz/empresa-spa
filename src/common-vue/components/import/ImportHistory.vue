<template>
<div>

	<!-- <articulos-creados
	:articles="articulos_creados"></articulos-creados> -->

	<chunks
	:import_history_show_lotes="import_history_show_lotes"></chunks>
	
	<b-modal
	hide-footer
	size="lg"
	title="Historial de importaciones"
	id="import-history">
	
		<div 
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<b-table
		responsive
		head-variant="dark"
		v-else
		:fields="fields"
		:items="items">

		
			<template #cell(created_models)="data">
				{{ models[data.index].created_models }}
				<!-- <b-button
				@click="modelos_creados(models[data.index])">
					{{ models[data.index].created_models }}
				</b-button> -->
			</template>
		
			<template #cell(updated_models)="data">
				{{ models[data.index].updated_models }}
				<!-- <b-button
				@click="modelos_actualizados(models[data.index])">
					{{ models[data.index].updated_models }}
				</b-button> -->
			</template>

			<template #cell(link_excel)="data">
				<b-button
				variant="success"
				@click="to_excel(models[data.index])">Excel</b-button>
			</template>

			<template #cell(chunks)="data">
				<b-button
				variant="primary"
				@click="chunks(models[data.index])">Lotes</b-button>
			</template>

			<template #cell(columnas)="data">
				<div
				class="cont-columns">
					<p
					class="m-0"
					v-if="a"
					v-for="(a, b) in JSON.parse(models[data.index].columnas)">
						{{b}}: {{ a }}
					</p>
				</div>
			</template>

			<template #cell(operaciones)="data">
				<div
				class="cont-columns">
					<p
					class="m-0"
					v-for="operacion in JSON.parse(models[data.index].operaciones)">
						{{ operacion.name }}: {{ operacion.value }}
					</p>
				</div>
			</template>

			<template #cell(observations)="data">
				<b-form-textarea
				:column="15"
				v-model="models[data.index].observations"></b-form-textarea>
			</template>


			<template #cell(rollback)="data">
				<b-button
				variant="danger"
				@click="rollback(models[data.index])">Revertir</b-button>
			</template>


		</b-table>
	</b-modal>
</div>
</template>
<script>
import moment from 'moment'
export default {
	components: {
		// ArticulosCreados: () => import('@/common-vue/components/import/ArticulosCreados'),
		Chunks: () => import('@/common-vue/components/import/chunks/Index'),
	},
	props: {
		show_history: Boolean,
		model_name: String,
	},
	watch: {
		show_history() {
			this.getModels()
		}
	},
	data() {
		return {
			loading: false,
			models: [],
			articulos_creados: [],
			import_history_show_lotes: null
		}
	},
	computed: {
		items() {
			let items = []
			this.models.forEach(model => {

				let diferencia_minutos = ''
				if (model.terminado_at) {

					let fecha_inicio = moment(model.created_at)
					let fecha_fin = moment(model.terminado_at)

					diferencia_minutos = fecha_fin.diff(fecha_inicio, 'minutes')+' minutos'
				}

				items.push({
					created_at: this.date(model.created_at, true),
					status: model.status,
					created_models: model.created_models,
					updated_models: model.updated_models,
					articulos_creados: model.articulos_creados,
					articulos_actualizados: model.articulos_actualizados,
					articles_match: model.articles_match,
					filas_procesadas: model.filas_procesadas,
					articles_repetidos: model.articles_repetidos,
					error_message: model.error_message,
					operacion: model.operacion_a_realizar,
					actualizar_otro_proveedor: model.no_actualizar_otro_proveedor ? 'No' : 'Si',
					provider_id: model.provider_id ? this.getProvider(model) : null,
					employee_id: model.user_id == model.employee_id ? this.user.name : this.getModelFromId('employee', model.employee_id).name,
					columnas: model.columnas,
					link_excel: null,
					total_chunks: model.total_chunks,
					processed_chunks: model.processed_chunks,
					terminado_at: this.date(model.terminado_at, true),
					operaciones: model.operaciones,
					duration: diferencia_minutos
				})
			})
			return items 
		},
		fields() {
			return [
				{
					key: 'created_at',
					label: 'Fecha',
				},
				{
					key: 'terminado_at',
					label: 'Finalizado',
				},
				{
					key: 'status',
					label: 'Estado',
				},
				{
					key: 'employee_id',
					label: 'Realizado por',
				},
				{
					key: 'filas_procesadas',
					label: 'Filas procesadas',
				},
				{
					key: 'created_models',
					label: 'Creados',
				},
				{
					key: 'articles_match',
					label: 'Macheados',
				},
				{
					key: 'updated_models',
					label: 'Actualizados',
				},
				// {
				// 	key: 'articles_repetidos',
				// 	label: 'Repetidos',
				// },
				{
					key: 'provider_id',
					label: 'Proveedor',
				},
				// {
				// 	key: 'operacion',
				// },
				// {
				// 	key: 'Act. art. de otro proveedor',
				// 	key: 'actualizar_otro_proveedor',
				// },
				{
					key: 'link_excel',
					label: 'Archivo',
				},
				{
					key: 'total_chunks',
					label: 'Total lotes',
				},
				{
					key: 'processed_chunks',
					label: 'Lotes procesados',
				},
				{
					key: 'duration',
					label: 'Duracion',
				},
				{
					key: 'operaciones',
					label: 'Operaciones',
				},
				{
					key: 'chunks',
					label: 'Lotes',
				},
				{
					key: 'columnas',
				},
				{
					key: 'observations',
					label: 'Observaciones',
				},
				{
					key: 'error_message',
					label: 'Errores',
				},
				{
					key: 'rollback',
					label: 'Revertir importacion',
				},
			]
		}
	},
	methods: {
		chunks(model) {
			this.import_history_show_lotes = model
			this.$bvModal.show('chunks')
		},
		rollback(model) {

			if (confirm('¿Seguro que quiere revertir esta importacion?')) {
				
				this.$store.commit('auth/setMessage', 'Cargando')
				this.$store.commit('auth/setMessage', true)
				this.$api.post('import-history/rollback/'+model.id)
				.then(res => {
					this.$store.commit('auth/setMessage', false)
					this.$toast.success('Enviado, te avisaremos cuando termine')
				})
				.catch(err => {
					this.$store.commit('auth/setMessage', false)
				})
			}
		},
		to_excel(model) {
			let link = process.env.VUE_APP_API_URL+'/imported-files/'+model.excel_url.split('/')[1]
			window.open(link)
		},
		// modelos_creados(model) {
		// 	this.$store.commit('auth/setLoading', true)
		// 	this.$api.get('import-history/created-models/'+model.id)
		// 	.then(res => {
		// 		this.$store.commit('auth/setLoading', false)
		// 		this.articulos_creados = res.data.model.articulos_creados
		// 		this.$bvModal.show('articulos-creados')
		// 	})
		// 	this.$bvModal.show('articulos-creados')
		// },
		// modelos_actualizados(model) {
		// 	this.$store.commit('auth/setLoading', true)
		// 	this.$api.get('import-history/updated-models/'+model.id)
		// 	.then(res => {
		// 		this.$store.commit('auth/setLoading', false)
		// 		this.articulos_creados = res.data.model.articulos_actualizados
		// 		this.$bvModal.show('articulos-creados')
		// 	})
		// },
		getProvider(model) {
			let provider = this.getModelFromId('provider', model.provider_id)
			if (typeof provider != 'undefined' && provider !== null && provider.name) {
				return provider.name
			} 
			return null
		},
		getModels() {
			this.loading = true 
			this.$api.get('import-history/'+this.model_name)
			.then(res => {
				console.log(res)
				this.loading = false
				this.models = res.data.models 
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
.cont-columns
	max-height: 100px
	overflow-y: scroll
</style>