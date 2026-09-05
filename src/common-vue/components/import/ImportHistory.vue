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

		<!--
			🔴 Estado de error PROPIO, y va ANTES del estado vacío. Hasta acá el .catch de
			getModels apagaba el loading y no hacía nada más, así que con `models` vacío la
			pantalla caía en el "Aún no hay importaciones" de abajo: la pantalla MENTÍA. El
			usuario que acababa de importar leía que no había importado nada.
		-->
		<div
		v-else-if="error_al_cargar && !models.length"
		class="import-history-error">
			<b-alert
			show
			variant="danger"
			class="m-b-15">
				{{ error_al_cargar }}
			</b-alert>
			<b-button
			variant="primary"
			:disabled="loading"
			@click="getModels">
				<i class="bi bi-arrow-repeat m-r-5"></i>
				Reintentar
			</b-button>
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
				{{ numero_es(models[data.index].created_models) }}
				<!-- <b-button
				@click="modelos_creados(models[data.index])">
					{{ models[data.index].created_models }}
				</b-button> -->
			</template>
		
			<template #cell(updated_models)="data">
				{{ numero_es(models[data.index].updated_models) }}
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
					{{ numero_es(models[data.index].conflicts_count) }}
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
				<b-badge
				v-if="models[data.index].rollback_status === 'revertida'"
				variant="success">
					Revertida
					<br>
					{{ date(models[data.index].rolled_back_at, true) }}
				</b-badge>
				<span
				v-else-if="models[data.index].rollback_status === 'encolado'">
					<b-spinner small variant="secondary"></b-spinner>
					Revirtiendo…
				</span>
				<b-button
				v-else-if="models[data.index].rollback_status === 'fallido' && puede_revertir(models[data.index])"
				size="sm"
				variant="outline-danger"
				:title="models[data.index].rollback_error"
				@click="pedir_confirmacion_rollback(models[data.index])">
					Reintentar
				</b-button>
				<b-button
				v-else-if="puede_revertir(models[data.index])"
				variant="danger"
				@click="pedir_confirmacion_rollback(models[data.index])">
					Revertir
				</b-button>
				<span
				v-else
				class="text-muted"
				title="No se puede revertir una importacion que todavia esta en curso">—</span>
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
				— {{ numero_es(total_conflictos) }} problema<span v-if="total_conflictos != 1">s</span> detectado<span v-if="total_conflictos != 1">s</span>
			</p>

			<!-- Resumen por tipo de problema, como chips -->
			<div
			v-if="resumen_conflictos.length"
			class="conflictos-resumen m-b-15">
				<span
				v-for="(item, index) in resumen_conflictos"
				:key="'resumen-'+index"
				class="badge badge-warning conflictos-resumen__chip">
					{{ tipo_conflicto_label(item.tipo) }} ({{ campo_conflicto_label(item.campo) }}): {{ numero_es(item.total) }}
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
							({{ numero_es(data.item.article_ids.length) }} artículos)
						</span>
						<span v-if="data.item.tipo === 'fila_sobrescrita' && data.item.fila_ganadora">
							(sobrescrita por la fila {{ data.item.fila_ganadora }})
						</span>
						<span v-if="data.item.tipo === 'identificador_sin_asignar' && data.item.article_ids">
							({{ numero_es(data.item.article_ids.length) }} artículos)
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
					Se muestran las primeras {{ numero_es(conflictos_a_mostrar.length) }} filas de {{ numero_es(total_conflictos) }}. Corregí estas y volvé a importar para ver el resto.
				</p>

			</div>

			<!--
				Mision 44: el aviso de abajo NO vale para todos los tipos. 'fila_sobrescrita' y
				'columna_de_precio_ignorada' son filas que SI se procesaron (se resolvieron
				bien, o se aplico todo menos una columna de precio), asi que decirles al
				usuario que corrija codigos en el Excel lo manda a arreglar algo que no esta
				roto. Se muestra solo si hay algun tipo que de verdad no se pudo procesar.
			-->
			<p
			v-if="hay_filas_no_procesadas"
			class="text-muted small m-t-15">
				Estas filas no se procesaron para no sobrescribir articulos existentes con
				datos equivocados. Corregi los codigos en el Excel y volve a importar solo
				esas filas.
			</p>

			<p
			v-if="hay_columnas_de_precio_ignoradas"
			class="text-muted small m-t-15">
				Las filas marcadas como "Columna de precio no aplicada" si se importaron: se
				aplico todo menos esa columna, porque el articulo se maneja por la otra. Para
				cambiarle el criterio hay que hacerlo desde la ficha del articulo.
			</p>

		</div>
	</b-modal>

	<!-- Confirmacion antes de revertir una importacion (grupo 305, prompt 03) -->
	<confirm
	id="confirm-rollback-import"
	:text="texto_confirmacion_rollback"
	not_show_delete_text
	btn_text="Revertir importación"
	variant="danger"
	emit="rollback_confirmado"
	@rollback_confirmado="ejecutar_rollback"></confirm>
</div>
</template>
<script>
import moment from 'moment'
export default {
	components: {
		// ArticulosCreados: () => import('@/common-vue/components/import/ArticulosCreados'),
		Chunks: () => import('@/common-vue/components/import/chunks/Index'),
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
		Confirm: () => import('@/common-vue/components/Confirm'),
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
			// Texto del error de carga del historial. Vacio = no hubo error (ver el template).
			error_al_cargar: '',
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
			// Importacion seleccionada para revertir, pendiente de confirmar en el modal "confirm-rollback-import"
			import_history_a_revertir: null,
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
					created_models: this.numero_es(model.created_models),
					updated_models: this.numero_es(model.updated_models),
					articulos_creados: this.numero_es(model.articulos_creados),
					articulos_actualizados: this.numero_es(model.articulos_actualizados),
					articles_match: this.numero_es(model.articles_match),
					filas_procesadas: this.numero_es(model.filas_procesadas),
					articles_repetidos: this.numero_es(model.articles_repetidos),
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
		 * True cuando la importacion tiene mas filas de problemas que las que se trajeron,
		 * para mostrar el aviso de recorte.
		 *
		 * Mision 44: se compara contra el total REAL que devuelve el endpoint (agregado SQL)
		 * y no contra la longitud del array traido, que ya viene cortado por el limit y por
		 * lo tanto nunca podia superar el umbral. Asi el recorte deja de ser silencioso.
		 *
		 * @returns {Boolean}
		 */
		hay_mas_conflictos() {
			return this.total_conflictos > this.conflictos_a_mostrar.length
		},
		/**
		 * Tipos que NO representan una fila que no se pudo procesar (mision 44). Es el mismo
		 * criterio con el que ActualizarBBDD::persistir_conflictos() los excluye de
		 * conflicts_count del lado del back: si se agrega un tipo alla, va tambien aca.
		 * @returns {Array}
		 */
		tipos_informativos() {
			return ['fila_sobrescrita', 'columna_de_precio_ignorada']
		},
		/**
		 * True si entre los conflictos traidos hay alguno que de verdad no se pudo procesar.
		 * @returns {Boolean}
		 */
		hay_filas_no_procesadas() {
			let informativos = this.tipos_informativos

			return this.conflictos.some(function(conflicto) {
				return informativos.indexOf(conflicto.tipo) === -1
			})
		},
		/**
		 * True si hay filas donde se ignoro una columna de precio (mision 44).
		 * @returns {Boolean}
		 */
		hay_columnas_de_precio_ignoradas() {
			return this.conflictos.some(function(conflicto) {
				return conflicto.tipo === 'columna_de_precio_ignorada'
			})
		},
		/**
		 * Texto del modal de confirmacion antes de revertir, con la fecha y las
		 * cantidades reales de la importacion seleccionada (grupo 305, prompt 03).
		 * Generico si todavia no se eligio ninguna: el computed se evalua antes
		 * de que el usuario apriete "Revertir" por primera vez.
		 * @returns {String}
		 */
		texto_confirmacion_rollback() {
			let model = this.import_history_a_revertir
			if (!model) {
				return 'Vas a revertir esta importación. Esta acción no se puede deshacer.'
			}
			let fecha = this.date(model.created_at, true)
			let creados = model.created_models || 0
			let actualizados = model.updated_models || 0
			return 'Vas a revertir la importación del ' + fecha + '. Se van a eliminar los ' + this.numero_es(creados) +
				' artículos que creó y los ' + this.numero_es(actualizados) + ' que actualizó van a volver a los valores ' +
				'que tenían antes. Esta acción no se puede deshacer.'
		},
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

			/*
			 * Mision 44: se pide el tope que admite el endpoint (200) en vez de dejar el
			 * default de 50. La tabla ya recortaba a 200 y el aviso de recorte comparaba
			 * contra 200, asi que con el default de 50 ese aviso NO SE MOSTRABA NUNCA: el
			 * usuario veia 50 de N sin que nada se lo dijera. Y con el tipo nuevo
			 * 'columna_de_precio_ignorada', que se registra una vez por fila salteada, las
			 * primeras 50 filas pueden ser todas de ese tipo y tapar los conflictos que si
			 * son problemas de verdad.
			 */
			this.$api.get('import-history/' + import_history.id + '/conflicts?limit=200')
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
				// Nuevo (grupo 265, prompt 08): identificador unico que no se pudo asignar por match multiple.
				identificador_sin_asignar: 'No se pudo asignar un codigo unico: coincidian varios articulos',
				// Nuevo (mision 44): el articulo se maneja por la otra columna de precio, asi
				// que la del Excel no se aplico. La fila se proceso bien: no es un error.
				// La etiqueta es corta a proposito: el detalle esta en el pie del modal, y en
				// un telefono de 360px una etiqueta larga se sale de la pantalla (los chips
				// del resumen son nowrap). Medido en la aplicacion, no supuesto.
				columna_de_precio_ignorada: 'Columna de precio no aplicada',
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
		/**
		 * El backend manda can_revert en cada fila del historial (ImportHistoryController::index).
		 * Se compara contra false explicitamente y no por valor de verdad: si una API todavia sin
		 * actualizar no manda el campo, llega undefined, y en ese caso conviene mostrar el boton
		 * (comportamiento de siempre) en vez de esconderlo y dejar al usuario sin la opcion.
		 */
		puede_revertir(model) {
			if (!model) return false
			return model.can_revert !== false
		},
		/**
		 * Guarda la importacion elegida y abre el modal de confirmacion. No dispara
		 * ningun request todavia (grupo 305, prompt 03).
		 * @param {Object} model - registro crudo del historial a revertir
		 */
		pedir_confirmacion_rollback(model) {
			this.import_history_a_revertir = model
			this.$bvModal.show('confirm-rollback-import')
		},
		/**
		 * Dispara el rollback tras la confirmacion del modal. Limpia la seleccion
		 * antes del POST para que dos confirmaciones seguidas no lo manden dos veces,
		 * y marca la fila localmente para que el boton desaparezca sin esperar a
		 * reabrir el modal (grupo 305, prompt 03).
		 */
		ejecutar_rollback() {
			if (!this.import_history_a_revertir) return

			let model = this.import_history_a_revertir
			this.import_history_a_revertir = null

			let self = this
			/*
			 * 🔴 Bug de tipeo, arreglado. Las tres lineas de abajo decian `setMessage`: la
			 * segunda tenia que ser `setLoading`. Costaba dos cosas a la vez:
			 *   1. el overlay NUNCA se prendia, asi que apretar "Revertir" no daba ninguna senal
			 *      y se podia apretar de nuevo mientras el POST estaba en vuelo;
			 *   2. `auth.message` quedaba en el booleano `true` (y despues en `false`), que es el
			 *      texto que se dibuja DEBAJO del spinner del loading global. La proxima vez que
			 *      cualquier otra cosa prendia el overlay, el usuario leia "false" ahi abajo.
			 * Las dos salidas limpian el mensaje con '' y no con un booleano.
			 */
			this.$store.commit('auth/setMessage', 'Revirtiendo la importación...')
			this.$store.commit('auth/setLoading', true)
			this.$api.post('import-history/rollback/'+model.id)
			.then(function(res) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Enviado, te avisaremos cuando termine')
				self.$set(model, 'rollback_status', 'encolado')
				self.$set(model, 'can_revert', false)
			})
			.catch(function(err) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				let mensaje = 'No se pudo revertir la importacion'
				if (err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				self.$toast.error(mensaje)
				self.getModels()
			})
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
		/**
		 * Nombre del proveedor de una importacion.
		 *
		 * 🔴 Busca primero en el catalogo liviano (`options`) y despues en `models`, y ese orden
		 * importa: desde la mision 43 (12/8/2026) el catalogo de proveedores ya no se descarga al
		 * iniciar sesion, asi que `models` esta vacio salvo que la pantalla que abrio este historial
		 * lo haya pedido. Antes esta columna se veia por el arranque; sin este cambio quedaba en
		 * blanco, sin ningun error, para cualquiera que entrara desde el Listado.
		 *
		 * `options` (id + name, grupo 332) es exactamente lo que hace falta aca: un nombre.
		 *
		 * @param {object} model
		 * @returns {string|null}
		 */
		getProvider(model) {
			let provider = this.$store.state.provider.options.find(item => {
				return item.id == model.provider_id
			})
			if (typeof provider == 'undefined') {
				provider = this.getModelFromId('provider', model.provider_id)
			}
			if (typeof provider != 'undefined' && provider !== null && provider.name) {
				return provider.name
			}
			return null
		},
		getModels() {
			// El catalogo liviano de proveedores, que es lo que resuelve la columna Proveedor de la
			// tabla (ver getProvider). getOptions tiene su propia guarda: si ya se pidio en esta
			// sesion no repite la descarga.
			this.$store.dispatch('provider/getOptions')

			this.loading = true
			this.error_al_cargar = ''
			this.$api.get('import-history/'+this.model_name)
			.then(res => {
				console.log(res)
				this.loading = false
				this.error_al_cargar = ''
				this.models = res.data.models
			})
			.catch(err => {
				this.loading = false
				console.log(err)
				/*
				 * 🔴 Sin esto la pantalla mentía: el .catch apagaba el loading y se callaba, y
				 * como `models` quedaba vacío se dibujaba "Aún no hay importaciones". El usuario
				 * que acababa de importar leía que no había importado nada.
				 *
				 * Los `models` viejos NO se limpian a propósito: si esta es una recarga y ya
				 * había un historial en pantalla, sigue siendo información buena. El estado de
				 * error solo se dibuja cuando además la lista está vacía.
				 */
				this.error_al_cargar = 'No pudimos cargar el historial. Volvé a abrir esta ventana o tocá Reintentar.'

				/*
				 * Si ya había un historial dibujado (esto es una recarga), la tabla se queda: sigue
				 * siendo información buena y borrarla sería peor. Pero el fallo tiene que decirse
				 * igual, porque si no el usuario cree que está mirando lo último.
				 */
				if (this.models.length) {
					this.$toast.error('No pudimos actualizar el historial. Lo que ves puede no estar al día.', {
						duration: 8000
					})
				}
			})
		}
	}
}
</script>
<style lang="sass">
// Estado de error del historial: alerta + boton de reintento, centrados.
// Mismo aire que el estado vacio (HistoryEmptyState) para que no se sienta otra pantalla.
.import-history-error
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	padding: 2rem 1.5rem
	text-align: center

	.alert
		max-width: 420px
		margin-bottom: 15px

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

	// El selector va doblado (.badge.conflictos-resumen__chip) a proposito: con una sola
	// clase empata en especificidad con .badge de bootstrap, que define white-space: nowrap
	// y se carga despues, asi que ganaba bootstrap y el chip NO envolvia. Medido en la
	// aplicacion a 360px (mision 44): los chips se salian de la pantalla, con el texto
	// cortado y sin scroll que permitiera llegar a el.
	&__chip.badge
		font-size: 12px
		font-weight: 500
		padding: 6px 10px
		white-space: normal
		text-align: left
		max-width: 100%
</style>
