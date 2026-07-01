<template>

	<div

	class="columns-preferences-config"

	:class="root_classes">

		<!-- Barra de acciones: en tabla, botones y buscador en una sola fila -->

		<div

		class="columns-preferences-config__toolbar m-b-10"

		:class="toolbar_classes">

			<b-button-group

			class="columns-preferences-config__btn-group"

			:class="{
				'columns-preferences-config__btn-group--stacked': is_narrow_stacked,
			}">

				<b-button

				@click="limpiar_todo"

				:block="!layout_table && !allow_row_wrap"

				size="sm"

				variant="outline-primary">

					Limpiar todo

				</b-button>

				<b-button

				:block="!layout_table && !allow_row_wrap"

				@click="marcar_todo"

				size="sm"

				class="m-0"

				variant="primary">

					Marcar todo

				</b-button>

			</b-button-group>



			<b-form-input

			class="columns-preferences-config__search"

			:class="search_input_classes"

			:style="search_input_style"

			size="sm"

			v-model.trim="search_query"

			placeholder="Buscar columna..."></b-form-input>

		</div>



		<!-- Vista compacta en tabla (perfiles PDF y similares) -->

		<div

		v-if="layout_table"

		class="columns-preferences-config__table-wrap">

			<table class="table table-sm table-hover columns-preferences-config__table m-b-0">

				<thead>

					<tr>

						<th class="columns-preferences-config__th-order">Orden</th>

						<th class="columns-preferences-config__th-visible text-center">Visible</th>

						<th class="columns-preferences-config__th-name">Columna</th>

						<th class="columns-preferences-config__th-wrap text-center">Salto de línea</th>

						<th
						v-if="show_typography_columns"
						class="columns-preferences-config__th-font-size text-center">
							Letra (pt)
						</th>

						<th
						v-if="show_typography_columns"
						class="columns-preferences-config__th-text-align text-center">
							Alineación
						</th>

						<th class="columns-preferences-config__th-width text-right">Ancho (px)</th>

					</tr>

				</thead>

				<tbody>

					<tr

					v-for="row in filtered_config_rows"

					:key="get_row_unique_id(row)"

					class="columns-preferences-config__table-row"

					:class="{ 'columns-preferences-config__table-row--drag-over': drag_over_index === get_config_index(row) }"

					draggable="true"

					@dragstart="drag_start(row, $event)"

					@dragover.prevent="drag_over(row)"

					@drop.prevent="drop_row(row)"

					@dragend="drag_end">

						<td class="columns-preferences-config__td-order">

							<div class="columns-preferences-config__order-controls">

								<span

								class="drag-handle"

								title="Arrastrar para reordenar">

									<i class="icon-list"></i>

								</span>

								<b-button

								size="sm"

								variant="outline-secondary"

								@click="move_to_start(row)"

								:disabled="get_config_index(row) == 0"

								title="Enviar al inicio">

									<i class="icon-up"></i>

								</b-button>

								<b-button

								size="sm"

								variant="outline-secondary"

								@click="move_to_end(row)"

								:disabled="get_config_index(row) == config_rows.length - 1"

								title="Enviar al final">

									<i class="icon-down"></i>

								</b-button>

							</div>

						</td>

						<td class="text-center columns-preferences-config__td-visible">

							<b-form-checkbox

							class="columns-preferences-config__checkbox-only"

							v-model="row.visible"></b-form-checkbox>

						</td>

						<td class="columns-preferences-config__td-name">

							<span class="columns-preferences-config__col-label">{{ row.name || row.label }}</span>

							<small

							v-if="row.label && row.name && row.label != row.name"

							class="text-muted d-block">

								{{ row.label }}

							</small>

						</td>

						<td class="text-center columns-preferences-config__td-wrap">

							<b-form-checkbox

							class="columns-preferences-config__checkbox-only"

							v-model="row.wrap_content"></b-form-checkbox>

						</td>

						<td
						v-if="show_typography_columns"
						class="text-center columns-preferences-config__td-font-size">

							<b-form-input
							v-if="!is_image_column_row(row)"
							class="columns-preferences-config__font-size-input"
							type="number"
							min="4"
							max="24"
							size="sm"
							v-model.number="row.font_size"></b-form-input>

							<span
							v-else
							class="text-muted">—</span>

						</td>

						<td
						v-if="show_typography_columns"
						class="text-center columns-preferences-config__td-text-align">

							<b-form-select
							v-if="!is_image_column_row(row)"
							class="columns-preferences-config__text-align-select"
							size="sm"
							v-model="row.text_align"
							:options="text_align_options"></b-form-select>

							<span
							v-else
							class="text-muted">—</span>

						</td>

						<td class="columns-preferences-config__td-width">

							<b-form-input

							class="columns-preferences-config__width-input"

							type="number"

							min="40"

							max="1200"

							size="sm"

							v-model.number="row.width"></b-form-input>

						</td>

					</tr>

					<tr v-if="!filtered_config_rows.length">
						<td
						:colspan="table_empty_colspan"
						class="text-center text-muted columns-preferences-config__empty">
							<span v-if="!config_rows.length">
								No hay columnas en el catálogo. Actualizá la versión del sistema o ejecutá el seeder de opciones PDF.
							</span>
							<span v-else>
								No hay columnas que coincidan con la búsqueda.
							</span>
						</td>
					</tr>

				</tbody>

			</table>

		</div>



		<!-- Vista lista original (tabla ABM, búsquedas, belongs_to_many) -->

		<template v-else>

			<hr>



			<div

			v-for="row in filtered_config_rows"

			:key="get_row_unique_id(row)"

			class="props-row"

			draggable="true"

			@dragstart="drag_start(row, $event)"

			@dragover.prevent="drag_over(row)"

			@drop.prevent="drop_row(row)"

			@dragend="drag_end">



				<div

				class="d-flex align-items-center justify-content-between"

				:class="allow_row_wrap ? 'columns-preferences-config__row-inner' : 'flex-nowrap'">

					<div class="d-flex align-items-center">

						<span

						class="drag-handle m-r-10"

						title="Arrastrar para reordenar">

							<i class="icon-list"></i>

						</span>

						<b-button

						size="sm"

						class="m-r-5"

						variant="outline-secondary"

						@click="move_to_start(row)"

						:disabled="get_config_index(row) == 0"

						title="Enviar al inicio">

							<i class="icon-up"></i>

						</b-button>

						<b-button

						size="sm"

						class="m-r-10"

						variant="outline-secondary"

						@click="move_to_end(row)"

						:disabled="get_config_index(row) == config_rows.length - 1"

						title="Enviar al final">

							<i class="icon-down"></i>

						</b-button>



						<b-form-checkbox

						v-model="row.visible">

							{{ row.name || row.label }}

						</b-form-checkbox>

					</div>



					<div class="ancho-wrapper">

						<b-form-checkbox

						class="m-l-5"

						v-model="row.wrap_content">

							Salto de linea

						</b-form-checkbox>



						<span class="m-l-15 m-r-15">|</span>



						<b-input-group

						prepend="Ancho"

						append="px">

							<b-form-input

							style="max-width: 100px"

							type="number"

							min="40"

							max="1200"

							v-model.number="row.width"></b-form-input>

						</b-input-group>



					</div>

				</div>

				<hr>

			</div>

		</template>

	</div>

</template>

<script>

export default {

	name: 'ColumnsPreferencesConfigModal',

	props: {

		config_rows: {

			type: Array,

			required: true,

		},

		/**

		 * Layout adaptable para modales ABM (evita solapamiento en columnas estrechas).

		 */

		allow_row_wrap: {

			type: Boolean,

			default: false,

		},

		/**

		 * Muestra columnas en tabla compacta (editor PDF de perfiles).

		 */

		layout_table: {

			type: Boolean,

			default: false,

		},

		/**

		 * Muestra tamaño de letra y alineación horizontal (perfiles PDF de artículos).

		 */

		show_typography_columns: {

			type: Boolean,

			default: false,

		},

	},

	data() {

		return {

			search_query: '',

			dragging_index: null,

			drag_over_index: null,

			/**

			 * Opciones de alineación horizontal para columnas PDF de artículos.

			 */

			text_align_options: [

				{ value: '', text: 'Automática' },

				{ value: 'left', text: 'Izquierda' },

				{ value: 'center', text: 'Centro' },

				{ value: 'right', text: 'Derecha' },

			],

		}

	},

	computed: {

		/**

		 * Clases del contenedor raíz según modo de visualización.

		 *

		 * @returns {Object}

		 */

		root_classes() {

			return {

				'columns-preferences-config--wrap-rows': this.allow_row_wrap && !this.layout_table,

				'columns-preferences-config--table': this.layout_table,

			}

		},

		/**

		 * Layout angosto apilado (pensado para modales ABM angostos vía allow_row_wrap).
		 * Hoy ningun lugar del sistema pasa allow_row_wrap=true — todo lo demas (incluido
		 * el caso "sin props" que usan Vender/Articulos/etc.) usa el layout en fila.

		 *

		 * @returns {boolean}

		 */

		is_narrow_stacked() {

			return this.allow_row_wrap && !this.layout_table

		},

		/**

		 * Clases de la barra superior (toolbar).

		 *

		 * @returns {Object}

		 */

		toolbar_classes() {

			return {

				'columns-preferences-config__toolbar--stacked': this.is_narrow_stacked,

				'columns-preferences-config__toolbar--inline': !this.is_narrow_stacked,

			}

		},

		/**

		 * Clases del input de búsqueda.

		 *

		 * @returns {Object}

		 */

		search_input_classes() {

			return {

				'columns-preferences-config__search--inline': !this.is_narrow_stacked,

			}

		},

		/**

		 * Estilo inline del buscador en modo lista sin wrap.

		 *

		 * @returns {Object|null}

		 */

		search_input_style() {

			if (!this.is_narrow_stacked) {

				return null

			}

			return { maxWidth: '320px' }

		},

		/*

		 * Filtra las filas configurables de columnas segun el texto de busqueda ingresado.

		 * Parametros: no recibe parametros directos (usa this.search_query y this.config_rows).

		 * Retorno: Array con filas coincidentes por nombre o etiqueta; si no hay busqueda, retorna todas.

		 * Nota: la comparacion es case-insensitive para mejorar la experiencia de uso.

		 */

		filtered_config_rows() {
			if (!this.search_query) {
				return this.config_rows
			}
			const query = this.normalize_search_text(this.search_query)
			return this.config_rows.filter(row => {
				const text = this.normalize_search_text(
					`${row.name || ''} ${row.label || ''} ${row.value_resolver || ''}`
				)
				return text.includes(query)
			})
		},

		/**

		 * Colspan de la fila vacía según columnas visibles en la tabla.

		 *

		 * @returns {number}

		 */

		table_empty_colspan() {
			return this.show_typography_columns ? 7 : 5
		},

	},

	methods: {

		/**

		 * Indica si la fila corresponde a la columna de imagen del artículo (sin tipografía).

		 *

		 * @param {Object} row

		 * @returns {boolean}

		 */

		is_image_column_row(row) {
			return row && row.value_resolver === 'article_first_image'
		},

		/*

		 * Identificador estable de fila para v-for y drag-and-drop.

		 * Si existe row_id (belongs_to_many con colisión model/pivot), lo usa; si no, key.

		 */

		/**
		 * Normaliza texto para búsqueda sin distinguir mayúsculas ni tildes (p. ej. "ima" → Imágenes).
		 *
		 * @param {string} value
		 * @return {string}
		 */
		normalize_search_text(value) {
			return (value || '')
				.toString()
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
		},
		get_row_unique_id(row) {
			if (row && row.row_id) {
				return row.row_id
			}
			return row.key
		},

		get_config_index(row) {

			const row_id = this.get_row_unique_id(row)

			return this.config_rows.findIndex(item => this.get_row_unique_id(item) == row_id)

		},

		/*

		 * Inicia el proceso de drag and drop guardando el indice de origen.

		 */

		drag_start(row, event) {

			this.dragging_index = this.get_config_index(row)

			event.dataTransfer.effectAllowed = 'move'

		},

		/*

		 * Actualiza el indice de destino mientras se arrastra una fila sobre otra.

		 */

		drag_over(row) {

			this.drag_over_index = this.get_config_index(row)

		},

		/*

		 * Ejecuta el reordenamiento al soltar una fila en una nueva posicion.

		 */

		drop_row(row) {

			const index = this.get_config_index(row)

			if (this.dragging_index === null || this.dragging_index === index) {

				this.drag_end()

				return

			}

			const moved = this.config_rows.splice(this.dragging_index, 1)[0]

			this.config_rows.splice(index, 0, moved)

			this.drag_end()

		},

		/*

		 * Limpia el estado temporal del drag and drop al finalizar la interaccion.

		 */

		drag_end() {

			this.dragging_index = null

			this.drag_over_index = null

		},

		move_to_start(row) {

			const index = this.get_config_index(row)

			if (index <= 0) return

			const moved = this.config_rows.splice(index, 1)[0]

			this.config_rows.unshift(moved)

		},

		move_to_end(row) {

			const index = this.get_config_index(row)

			if (index >= this.config_rows.length - 1) return

			const moved = this.config_rows.splice(index, 1)[0]

			this.config_rows.push(moved)

		},

		limpiar_todo() {

			this.filtered_config_rows.forEach(row => {

				row.visible = false

			})

		},

		marcar_todo() {

			this.filtered_config_rows.forEach(row => {

				row.visible = true

			})

		},

	},

}

</script>

<style lang="sass">

.columns-preferences-config

	.props-row

		cursor: move

	.drag-handle

		display: inline-flex

		align-items: center

		justify-content: center

		width: 22px

		height: 22px

		border: 1px solid rgba(0,0,0,.15)

		border-radius: 4px

		background: rgba(0,0,0,.03)



.ancho-wrapper

	display: flex

	flex-direction: row

	align-items: center

	justify-content: flex-end

	width: auto

	flex: 0 0 auto

	flex-wrap: nowrap

	white-space: nowrap

	> *

		white-space: nowrap



.columns-preferences-config

	.props-row

		& > .d-flex

			flex-wrap: nowrap !important

			white-space: nowrap



.columns-preferences-config--wrap-rows

	.props-row

		& > .d-flex,

		& > .columns-preferences-config__row-inner

			flex-wrap: wrap !important

			white-space: normal

	.ancho-wrapper

		flex-wrap: wrap

		justify-content: flex-start

		width: 100%

		margin-top: 8px

		white-space: normal

		> *

			white-space: normal



.columns-preferences-config__toolbar--stacked

	flex-direction: column

	align-items: stretch !important

	gap: 10px



.columns-preferences-config__btn-group--stacked

	width: 100%

	max-width: 280px



.columns-preferences-config__search

	width: 100%

	max-width: 100%



/* Toolbar en una fila: botones a la izquierda, buscador ocupa el resto */

.columns-preferences-config__toolbar--inline

	display: flex

	flex-direction: row

	align-items: center

	justify-content: flex-start

	gap: 12px

	flex-wrap: nowrap



.columns-preferences-config__toolbar--inline .columns-preferences-config__btn-group

	flex: 0 0 auto

	flex-shrink: 0



.columns-preferences-config__search--inline

	flex: 1 1 auto

	min-width: 160px

	max-width: none

	margin-left: 0 !important



/* Tabla de columnas PDF */

.columns-preferences-config--table

	.columns-preferences-config__table-wrap

		max-height: 420px

		overflow-y: auto

		border: 1px solid rgba(0, 0, 0, 0.08)

		border-radius: 4px



	.columns-preferences-config__table

		background: #fff

		margin-bottom: 0



		thead th

			position: sticky

			top: 0

			z-index: 1

			background: #f8f9fa

			font-size: 12px

			font-weight: 600

			white-space: nowrap

			vertical-align: middle

			border-bottom-width: 2px



		tbody td

			vertical-align: middle

			font-size: 13px



	.columns-preferences-config__th-order

		width: 110px



	.columns-preferences-config__th-visible,

	.columns-preferences-config__th-wrap

		width: 72px



	.columns-preferences-config__th-width

		width: 100px



	.columns-preferences-config__table-row

		cursor: move



	.columns-preferences-config__table-row--drag-over td

		background: rgba(0, 123, 255, 0.06)



	.columns-preferences-config__order-controls

		display: flex

		align-items: center

		gap: 4px

		flex-wrap: nowrap



	.columns-preferences-config__order-controls .drag-handle

		margin-right: 2px



	/* Evita que el label del checkbox invada la celda de ancho (clic fantasma) */

	.columns-preferences-config__td-visible,

	.columns-preferences-config__td-wrap

		overflow: hidden

		position: relative



	.columns-preferences-config__checkbox-only

		position: relative

		width: 1.25rem

		height: 1.25rem

		min-height: 1.25rem

		padding-left: 0

		margin: 0 auto

		display: inline-flex

		align-items: center

		justify-content: center



	.columns-preferences-config__checkbox-only .custom-control-input

		position: absolute

		left: 0

		top: 0

		z-index: 2

		width: 1.25rem

		height: 1.25rem



	.columns-preferences-config__checkbox-only .custom-control-label

		position: relative

		width: 1.25rem

		height: 1.25rem

		padding-left: 0

		margin-bottom: 0

		cursor: pointer



	.columns-preferences-config__checkbox-only .custom-control-label::before,

	.columns-preferences-config__checkbox-only .custom-control-label::after

		left: 0

		top: 0

		width: 1.25rem

		height: 1.25rem



	.columns-preferences-config__col-label

		font-weight: 500



	.columns-preferences-config__width-input

		max-width: 88px

		margin-left: auto

		text-align: right



	.columns-preferences-config__font-size-input

		max-width: 72px

		margin: 0 auto

		text-align: center



	.columns-preferences-config__text-align-select

		max-width: 120px

		margin: 0 auto



	.columns-preferences-config__td-width

		position: relative

		z-index: 2

		text-align: right



	.columns-preferences-config__empty

		padding: 24px 12px

		font-size: 13px

</style>

