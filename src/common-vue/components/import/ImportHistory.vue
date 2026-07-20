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
	id="import-history"
	@show="getModels">
	
		<div 
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<history-empty-state
		v-else-if="!models.length"
		icon_class="icon-download"
		title="Aún no hay importaciones"
		hint="Cuando importes datos desde el menú, aparecerá aquí su historial."></history-empty-state>

		<b-table
		responsive
		head-variant="dark"
		v-else
		:fields="fields"
		:items="items">

		
			<!-- Estado de la importacion mostrado como badge de color segun status -->
			<template #cell(status)="data">
				<b-badge :variant="status_variant(items[data.index].status)">
					{{ status_label(items[data.index].status) }}
				</b-badge>
			</template>

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

			<!-- Boton para ver el detalle del error solo cuando la importacion fallo o tiene mensaje de error -->
			<template #cell(error_message)="data">
				<b-button
				v-if="es_fallida(items[data.index].status) || items[data.index].error_message"
				size="sm"
				variant="outline-danger"
				@click="ver_error(items[data.index])">
					Ver error
				</b-button>
				<span v-else>—</span>
			</template>


			<template #cell(rollback)="data">
				<b-button
				variant="danger"
				@click="rollback(models[data.index])">Revertir</b-button>
			</template>


		</b-table>
	</b-modal>

	<!-- Modal con el detalle del error de una importacion fallida: motivo humano + log tecnico completo -->
	<b-modal
	hide-footer
	size="lg"
	title="Detalle del error de importación"
	id="import-error-detail">

		<div v-if="error_seleccionado">

			<h6 class="text-danger">Motivo</h6>
			<p class="mb-3">{{ error_seleccionado.error_message || 'Sin motivo registrado.' }}</p>

			<div v-if="error_seleccionado.error_trace">
				<h6 class="d-flex justify-content-between align-items-center">
					<span>Log técnico</span>
					<b-button size="sm" variant="outline-secondary" @click="copiar_trace">Copiar</b-button>
				</h6>
				<pre class="import-error-trace">{{ error_seleccionado.error_trace }}</pre>
			</div>
			<p v-else class="text-muted">
				No hay log técnico (el proceso se interrumpió sin dejar traza).
			</p>

		</div>
	</b-modal>
</div>
</template>
<script>
import moment from 'moment'
export default {
	components: {
		// ArticulosCreados: () => import('@/common-vue/components/import/ArticulosCreados'),
		Chunks: () => import('@/common-vue/components/import/chunks/Index'),
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
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
			import_history_show_lotes: null,
			// Importacion actualmente seleccionada para ver su error en el modal "import-error-detail"
			error_seleccionado: null,
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
					error_trace: model.error_trace,
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
		/**
		 * Determina si un estado de importacion se considera fallido.
		 * Incluye el estado legado "error" para registros viejos anteriores a "fallo".
		 * @param {String} status - status crudo de la importacion
		 * @returns {Boolean} true si es un estado fallido
		 */
		es_fallida(status) {
			return status === 'fallo' || status === 'error'
		},
		/**
		 * Devuelve la variante de color del badge segun el estado de la importacion.
		 * @param {String} status - status crudo de la importacion
		 * @returns {String} variante de b-badge (success, primary, secondary, danger, light)
		 */
		status_variant(status) {
			if (status === 'terminado') return 'success'
			if (status === 'en_proceso') return 'primary'
			if (status === 'pendiente' || status === 'en_preparacion') return 'secondary'
			if (status === 'fallo' || status === 'error') return 'danger'
			return 'light'
		},
		/**
		 * Devuelve la etiqueta legible en español para el estado de la importacion.
		 * @param {String} status - status crudo de la importacion
		 * @returns {String} etiqueta legible, o el status crudo si no matchea ninguno conocido
		 */
		status_label(status) {
			if (status === 'terminado') return 'Terminado'
			if (status === 'en_proceso') return 'Procesando'
			if (status === 'pendiente' || status === 'en_preparacion') return 'En preparación'
			if (status === 'fallo' || status === 'error') return 'Fallido'
			return status
		},
		/**
		 * Abre el modal de detalle de error con la importacion seleccionada.
		 * @param {Object} item - item de la tabla (incluye error_message y error_trace)
		 */
		ver_error(item) {
			this.error_seleccionado = item
			this.$bvModal.show('import-error-detail')
		},
		/**
		 * Copia el log tecnico completo del error seleccionado al portapapeles.
		 * @returns {void}
		 */
		copiar_trace() {
			if (this.error_seleccionado && this.error_seleccionado.error_trace) {
				navigator.clipboard.writeText(this.error_seleccionado.error_trace)
				this.$toast.success('Log copiado')
			}
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

// Log tecnico del error de importacion: estilo tipo consola para facilitar la lectura
.import-error-trace
	max-height: 400px
	overflow: auto
	background: #1e1e1e
	color: #d4d4d4
	padding: 12px
	border-radius: 6px
	font-size: 12px
	white-space: pre-wrap
	word-break: break-word
</style>
