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

			<!-- Boton para ver los problemas (conflictos) de la importacion, solo si tuvo al menos uno -->
			<template #cell(conflicts)="data">
				<b-button
				v-if="tiene_conflictos(models[data.index])"
				size="sm"
				variant="warning"
				@click="ver_conflictos(models[data.index])">
					{{ models[data.index].conflicts_count }}
				</b-button>
				<span v-else class="text-muted">-</span>
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

	<!-- Modal con el detalle de los problemas (conflictos) de una importacion -->
	<b-modal
	hide-footer
	size="lg"
	title="Problemas de la importación"
	id="modal-conflictos-importacion">

		<div
		v-if="cargando_conflictos"
		class="all-center-md">
			<b-spinner variant="warning"></b-spinner>
		</div>

		<div v-else>

			<!-- Encabezado: fecha de la importacion y total de problemas detectados -->
			<p class="mb-3">
				<strong>Importación del {{ date((import_history_conflictos || {}).created_at, true) }}</strong>
				— {{ total_conflictos }} problema<span v-if="total_conflictos != 1">s</span> detectado<span v-if="total_conflictos != 1">s</span>
			</p>

			<!-- Resumen por tipo de problema, como chips -->
			<div
			v-if="resumen_conflictos.length"
			class="conflictos-resumen m-b-15">
				<span
				v-for="(item, index) in resumen_conflictos"
				:key="'resumen-'+index"
				class="badge badge-warning conflictos-resumen__chip">
					{{ tipo_conflicto_label(item.tipo) }} ({{ campo_conflicto_label(item.campo) }}): {{ item.total }}
				</span>
			</div>

			<history-empty-state
			v-if="!conflictos.length"
			icon_class="icon-check-circle"
			title="No hay problemas para mostrar"
			hint="Esta importación no tiene filas con conflictos."></history-empty-state>

			<div v-else>

				<b-table
				responsive
				small
				head-variant="dark"
				:items="conflictos_a_mostrar"
				:fields="conflictos_fields">

					<!-- Traduce el tipo de problema a lenguaje de usuario, sumando cuantos articulos competian cuando es ambiguo -->
					<template #cell(tipo)="data">
						{{ tipo_conflicto_label(data.item.tipo) }}
						<span v-if="data.item.tipo === 'ambiguo' && data.item.article_ids">
							({{ data.item.article_ids.length }} artículos)
						</span>
						<span v-if="data.item.tipo === 'fila_sobrescrita' && data.item.fila_ganadora">
							(sobrescrita por la fila {{ data.item.fila_ganadora }})
						</span>
					</template>

					<!-- Traduce el campo tecnico (bar_code, sku, etc.) a su nombre visible -->
					<template #cell(campo)="data">
						{{ campo_conflicto_label(data.item.campo) }}
					</template>

				</b-table>

				<!-- Aviso cuando se recorta la lista a las primeras 200 filas para no renderizar tablas gigantes -->
				<p
				v-if="hay_mas_conflictos"
				class="text-muted small">
					Se muestran las primeras 200 filas de {{ conflictos_ordenados.length }}. Corregí estas y volvé a importar para ver el resto.
				</p>

			</div>

			<p class="text-muted small m-t-15">
				Estas filas no se procesaron para no sobrescribir articulos existentes con
				datos equivocados. Corregi los codigos en el Excel y volve a importar solo
				esas filas.
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
			// Importacion actualmente seleccionada para ver sus problemas (conflictos) en el modal "modal-conflictos-importacion"
			import_history_conflictos: null,
			// Filas con problemas de la importacion seleccionada (conflicts del endpoint)
			conflictos: [],
			// Resumen por tipo/campo de los problemas de la importacion seleccionada
			resumen_conflictos: [],
			// Total de problemas de la importacion seleccionada (total del endpoint)
			total_conflictos: 0,
			// True mientras se cargan los problemas desde la API
			cargando_conflictos: false,
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
					key: 'conflicts',
					label: 'Problemas',
				},
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
		},
		/**
		 * Columnas de la tabla de detalle del modal de problemas.
		 * @returns {Array} definicion de fields para b-table
		 */
		conflictos_fields() {
			return [
				{
					key: 'fila',
					label: 'Fila',
				},
				{
					key: 'tipo',
					label: 'Problema',
				},
				{
					key: 'campo',
					label: 'Campo',
				},
				{
					key: 'valor',
					label: 'Valor',
				},
				{
					key: 'nombre_excel',
					label: 'Producto en el Excel',
				},
			]
		},
		/**
		 * Copia de "conflictos" ordenada por numero de fila ascendente, para que el usuario
		 * pueda ir corrigiendo el Excel en el mismo orden en que aparecen las filas.
		 * @returns {Array} conflictos ordenados, sin mutar el array original
		 */
		conflictos_ordenados() {
			return this.conflictos.slice().sort(function(a, b) {
				return (a.fila || 0) - (b.fila || 0)
			})
		},
		/**
		 * Recorta la lista ordenada a las primeras 200 filas, para no renderizar
		 * tablas gigantes cuando una importacion tiene miles de problemas.
		 * @returns {Array} primeras 200 filas de conflictos_ordenados
		 */
		conflictos_a_mostrar() {
			return this.conflictos_ordenados.slice(0, 200)
		},
		/**
		 * True cuando hay mas de 200 filas de problemas, para mostrar el aviso de recorte.
		 * @returns {Boolean}
		 */
		hay_mas_conflictos() {
			return this.conflictos_ordenados.length > 200
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
		/**
		 * Determina si una importacion tuvo al menos un problema (conflicto) durante el matching.
		 * @param {Object} import_history - registro de import_histories (tabla o crudo)
		 * @returns {Boolean} true si conflicts_count es mayor a 0
		 */
		tiene_conflictos(import_history) {
			if (!import_history) return false
			return Number(import_history.conflicts_count) > 0
		},
		/**
		 * Abre el modal de problemas y carga desde la API el detalle de conflictos
		 * de la importacion seleccionada.
		 * @param {Object} import_history - registro de import_histories cuyos problemas se quieren ver
		 * @returns {void}
		 */
		ver_conflictos(import_history) {
			// Importacion seleccionada, para mostrar su fecha en el encabezado del modal
			this.import_history_conflictos = import_history
			this.conflictos = []
			this.resumen_conflictos = []
			this.total_conflictos = 0
			this.cargando_conflictos = true

			this.$bvModal.show('modal-conflictos-importacion')

			this.$api.get('import-history/' + import_history.id + '/conflicts')
			.then(res => {
				this.conflictos = res.data.conflicts
				this.resumen_conflictos = res.data.resumen
				this.total_conflictos = res.data.total
				this.cargando_conflictos = false
			})
			.catch(err => {
				this.cargando_conflictos = false
				this.$toast.error('No se pudieron cargar los problemas de la importacion')
			})
		},
		/**
		 * Traduce el "tipo" tecnico de un conflicto a un texto entendible por el usuario.
		 * @param {String} tipo - tipo crudo devuelto por el backend (ambiguo, placeholder_descartado, sin_identificador)
		 * @returns {String} texto traducido, o el tipo crudo si no matchea ninguno conocido
		 */
		tipo_conflicto_label(tipo) {
			let labels = {
				ambiguo: 'Codigo repetido: la fila coincidia con mas de un articulo',
				placeholder_descartado: "Codigo invalido: se ignoro un valor como '-' o 'S/N'",
				sin_identificador: 'Fila sin ningun codigo utilizable',
				// Nuevos (grupo 229, prompt 07): parseo robusto de columnas numericas.
				numero_invalido: 'Valor numerico invalido: no se pudo interpretar',
				numero_fuera_de_rango: 'Valor numerico demasiado grande para la columna',
				// Nuevo (grupo 265, prompt 03): repetido dentro del propio archivo, resuelto.
				fila_sobrescrita: 'Fila sobrescrita',
			}
			return labels[tipo] || tipo
		},
		/**
		 * Traduce el nombre tecnico de un campo (bar_code, sku, etc.) a su nombre visible.
		 * @param {String} campo - campo crudo devuelto por el backend
		 * @returns {String} nombre traducido, o el campo crudo si no matchea ninguno conocido
		 */
		campo_conflicto_label(campo) {
			let labels = {
				bar_code: 'Codigo de barras',
				sku: 'SKU',
				provider_code: 'Codigo de proveedor',
				name: 'Nombre',
				// Nuevos (grupo 229, prompt 07): campos numericos que puede reportar
				// registrar_conflicto_numerico() en ProcessRow.
				cost: 'Costo',
				price: 'Precio',
				percentage_gain: 'Margen de ganancia',
				stock_min: 'Stock minimo',
				unidades_individuales: 'Unidades individuales',
				medida: 'Medida',
			}
			return labels[campo] || campo
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

// Resumen de problemas de una importacion, mostrado como chips en el modal de conflictos
.conflictos-resumen
	display: flex
	flex-wrap: wrap
	gap: 8px

	&__chip
		font-size: 12px
		font-weight: 500
		padding: 6px 10px
		white-space: normal
		text-align: left
</style>
