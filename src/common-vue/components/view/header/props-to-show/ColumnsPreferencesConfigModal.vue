<template>

	<div

	class="columns-preferences-config"

	:class="root_classes">

		<!-- Barra de acciones: en tabla, botones y buscador en una sola fila -->

		<div

		class="columns-preferences-config__toolbar m-b-10"

		:class="toolbar_classes">

			<!-- Contenedor del buscador: input + icono de lupa posicionado absoluto -->

			<div

			class="columns-preferences-config__search-wrap"

			:class="search_input_classes"

			:style="search_input_style">

				<i class="icon-search columns-preferences-config__search-icon"></i>

				<b-form-input

				class="columns-preferences-config__search"

				size="sm"

				v-model.trim="search_query"

				placeholder="Buscar columna..."></b-form-input>

			</div>



			<b-button-group

			class="columns-preferences-config__btn-group"

			:class="{
				'columns-preferences-config__btn-group--stacked': is_narrow_stacked,
			}">

				<b-button

				@click="limpiar_todo"

				size="sm"

				variant="outline-secondary">

					Limpiar todo

				</b-button>

				<b-button

				@click="marcar_todo"

				size="sm"

				class="m-0"

				variant="outline-secondary">

					Marcar todo

				</b-button>

			</b-button-group>

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

					:class="{
						'columns-preferences-config__table-row--dragging': dragging_index !== null && get_config_index(row) === dragging_index,
						'columns-preferences-config__table-row--drop-before': drag_over_index === get_config_index(row) && drop_position === 'before',
						'columns-preferences-config__table-row--drop-after': drag_over_index === get_config_index(row) && drop_position === 'after',
					}"

					:draggable="row_is_draggable(row)"

					@dragstart="drag_start(row, $event)"

					@dragover.prevent="drag_over(row, $event)"

					@drop.prevent="drop_row(row)"

					@dragend="drag_end">

						<td class="columns-preferences-config__td-order">

							<div class="columns-preferences-config__order-controls">

								<span

								class="drag-handle"

								:class="{ 'drag-handle--disabled': !reorder_enabled }"

								@mousedown="enable_drag_from_handle(row)"

								:title="reorder_enabled ? 'Arrastrar para reordenar' : 'Limpiá la búsqueda para poder reordenar'">

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

							v-model="row.visible"
							:disabled="row.locked"></b-form-checkbox>

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

			:class="{
				'props-row--dragging': dragging_index !== null && get_config_index(row) === dragging_index,
				'props-row--drop-before': drag_over_index === get_config_index(row) && drop_position === 'before',
				'props-row--drop-after': drag_over_index === get_config_index(row) && drop_position === 'after',
			}"

			:draggable="row_is_draggable(row)"

			@dragstart="drag_start(row, $event)"

			@dragover.prevent="drag_over(row, $event)"

			@drop.prevent="drop_row(row)"

			@dragend="drag_end">



				<div

				class="d-flex align-items-center justify-content-between"

				:class="allow_row_wrap ? 'columns-preferences-config__row-inner' : 'flex-nowrap'">

					<div class="d-flex align-items-center">

						<span

						class="drag-handle m-r-10"

						:class="{ 'drag-handle--disabled': !reorder_enabled }"

						@mousedown="enable_drag_from_handle(row)"

						:title="reorder_enabled ? 'Arrastrar para reordenar' : 'Limpiá la búsqueda para poder reordenar'">

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

						v-model="row.visible"

						:disabled="row.locked"

						:title="row.locked ? 'Esta columna no se puede ocultar' : null">

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

						append="px">

							<b-form-input

							title="Ancho de la columna, en pixeles"

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
			 * 'before' o 'after': de que lado de la fila de destino (drag_over_index) va a
			 * caer la fila arrastrada, segun la mitad del alto donde este el mouse.
			 */
			drop_position: null,

			/**
			 * Id (get_row_unique_id) de la fila que habilito el arrastre apretando su manija.
			 * Solo esa fila es draggable="true"; asi tocar un checkbox o el input de ancho
			 * y moverse unos pixeles no dispara un drag por accidente.
			 */
			drag_handle_row_id: null,

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

		/**
		 * Habilita el reordenamiento por arrastre. Con el buscador escrito el v-for muestra
		 * un subconjunto (filtered_config_rows) y el indicador de insercion no podria
		 * representar la posicion real dentro de la lista completa (config_rows), asi que
		 * se apaga la manija hasta que se limpie la busqueda.
		 *
		 * @returns {boolean}
		 */
		reorder_enabled() {
			return !this.search_query
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

		/**
		 * Habilita el arrastre de una fila puntual: solo se dispara desde la manija, para que
		 * apretar un checkbox o el input de ancho y moverse no arranque un reordenamiento.
		 *
		 * @param {Object} row
		 * @returns {void}
		 */
		enable_drag_from_handle(row) {
			if (!this.reorder_enabled) {
				return
			}
			this.drag_handle_row_id = this.get_row_unique_id(row)
		},

		/**
		 * Indica si esta fila puede arrastrarse ahora mismo (habilitada por su manija).
		 *
		 * @param {Object} row
		 * @returns {boolean}
		 */
		row_is_draggable(row) {
			return this.reorder_enabled && this.get_row_unique_id(row) === this.drag_handle_row_id
		},

		/*

		 * Inicia el proceso de drag and drop guardando el indice de origen.

		 */

		drag_start(row, event) {

			this.dragging_index = this.get_config_index(row)

			event.dataTransfer.effectAllowed = 'move'

		},

		/*

		 * Actualiza el indice de destino mientras se arrastra una fila sobre otra, y calcula
		 * si el drop va a insertar antes o despues segun la mitad del alto donde este el mouse.

		 */

		drag_over(row, event) {

			this.drag_over_index = this.get_config_index(row)

			/* rect de la fila sobre la que se esta arrastrando, para comparar contra clientY */
			let rect = event.currentTarget.getBoundingClientRect()

			this.drop_position = (event.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after'

		},

		/*

		 * Ejecuta el reordenamiento al soltar una fila, respetando si el drop fue en la mitad
		 * de arriba ('before') o de abajo ('after') de la fila de destino.

		 */

		drop_row(row) {

			let target_index = this.get_config_index(row)

			let from_index = this.dragging_index

			if (from_index === null || from_index === target_index) {

				this.drag_end()

				return

			}

			/* Indice donde insertar la fila movida segun la mitad del alto donde se solto */
			let insert_index = this.drop_position === 'after' ? target_index + 1 : target_index

			/* Al sacar la fila de origen, todo lo que estaba despues se corre un lugar. */
			if (from_index < insert_index) {
				insert_index--
			}

			let moved = this.config_rows.splice(from_index, 1)[0]

			this.config_rows.splice(insert_index, 0, moved)

			this.drag_end()

		},

		/*

		 * Limpia el estado temporal del drag and drop al finalizar la interaccion.

		 */

		drag_end() {

			this.dragging_index = null

			this.drag_over_index = null

			this.drop_position = null

			this.drag_handle_row_id = null

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

				if (row.locked) {
					return
				}

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
		/* position: relative para poder posicionar la barra de insercion (::before/::after) */
		position: relative

	/* La manija es la unica zona que dispara el drag; el cursor "move" se movio para acá */
	.drag-handle

		display: inline-flex

		align-items: center

		justify-content: center

		width: 22px

		height: 22px

		border: 1px solid rgba(0,0,0,.15)

		border-radius: 4px

		background: rgba(0,0,0,.03)

		cursor: grab

		&:hover
			background: rgba(0,0,0,.08)

		&:active
			cursor: grabbing

	/* Manija apagada mientras hay busqueda activa: no se puede reordenar un subconjunto */
	.drag-handle--disabled

		opacity: .35

		cursor: default

		&:hover
			background: rgba(0,0,0,.03)

		&:active
			cursor: default

	/* Fila de origen atenuada mientras se arrastra */
	.props-row--dragging

		opacity: .4

	/* Barra de insercion azul: arriba de la fila cuando el drop cae en la mitad de arriba */
	.props-row--drop-before::before

		content: ''
		position: absolute
		left: 0
		right: 0
		top: 0
		height: 2px
		background: #007bff
		border-radius: 2px

	/* Barra de insercion azul: abajo de la fila cuando el drop cae en la mitad de abajo */
	.props-row--drop-after::after

		content: ''
		position: absolute
		left: 0
		right: 0
		bottom: 0
		height: 2px
		background: #007bff
		border-radius: 2px



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



/* Toolbar en una fila: buscador a la izquierda ocupando el ancho libre, botones a la derecha */

.columns-preferences-config__toolbar--inline

	display: flex

	flex-direction: row

	align-items: center

	justify-content: space-between

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



/* Contenedor del buscador (icono de lupa + input). min-width: 0 es clave para que el */
/* input pueda achicarse dentro del flex y no empuje a los botones fuera de la fila. */
.columns-preferences-config__search-wrap

	position: relative

	flex: 1 1 auto

	min-width: 0

	display: flex

	align-items: center



.columns-preferences-config__search-icon

	position: absolute

	left: 14px

	pointer-events: none

	color: #9aa0a6

	font-size: 15px



// Input del buscador (pill), pisando el estilo global de _inputs.sass.
// La altura y el radio salen de los tokens de la barra de herramientas del listado
// (src/sass/_toolbar_botones.sass): es el mismo control, no uno parecido. Pill = radio la mitad
// de la altura, que es la convencion que ese archivo explica para un campo de busqueda.
// Los colores pasaron de #fff / #e2e4e7 / #9aa0a6 fijos a tokens: este modal se monta colgando
// de <body>, fuera de #app, y con los hex el campo quedaba blanco en modo oscuro.
.columns-preferences-config .columns-preferences-config__search-wrap .columns-preferences-config__search

	height: var(--toolbar-control-h)

	border-radius: calc(var(--toolbar-control-h) / 2)

	border: 1px solid var(--color-border)

	background: var(--bg-card)

	color: var(--color-text-primary)

	padding: 0 16px 0 38px

	font-size: 14px

	width: 100%

	box-shadow: none

	transition: border-color .15s ease, box-shadow .15s ease

	&:focus

		border-color: var(--color-primary)

		box-shadow: 0 0 0 3px rgba(0, 123, 255, .12)

		outline: none

	&::placeholder

		color: var(--color-text-secondary)



// Los dos botones de la barra hablan el vocabulario de la barra de herramientas del listado
// (src/sass/_toolbar_botones.sass): la misma altura que el buscador de al lado, radio de squircle
// y no de pastilla, y neutros. Antes "Marcar todo" era azul macizo y se llevaba el unico acento
// de la pantalla, que le corresponde al boton "Listo" del footer.
// El b-button-group de bootstrap-vue pega los botones borde con borde y les come los radios
// internos: se desarma con gap y devolviendole el radio a cada uno. El !important del radio no es
// por comodidad: `.btn-group > .btn:not(:last-child)` es (0,4,0) y esta regla (0,2,0), asi que por
// especificidad no hay forma de ganarle sin encadenar selectores que despues nadie entiende.
.columns-preferences-config__btn-group

	flex: 0 0 auto

	gap: var(--toolbar-btn-gap)

	.btn

		white-space: nowrap

		min-width: 118px

		padding-left: 16px

		padding-right: 16px

		height: var(--toolbar-control-h)

		font-size: 0.875rem

		border-radius: var(--toolbar-btn-radius) !important

		background: var(--bg-card)

		border: 1px solid var(--color-border)

		color: var(--color-text-primary)

		box-shadow: none

		transition: background-color .15s ease, border-color .15s ease

		// Bootstrap pinta .btn-outline-secondary en :hover, :focus y :active por separado y con

		// mas especificidad que esta regla, asi que hay que cubrir los tres o el boton se pone

		// gris macizo con texto blanco justo al apretarlo. Es la misma trampa que ya documenta el

		// footer del modal de formulario en model/Index.vue.

		&:hover,

		&:focus,

		&:not(:disabled):not(.disabled):active,

		&:not(:disabled):not(.disabled):active:focus

			background: var(--bg-hover)

			border-color: var(--color-border)

			color: var(--color-text-primary)

			box-shadow: none

		&:focus-visible

			outline: none

			border-color: var(--color-primary)

			box-shadow: 0 0 0 3px rgba(59, 130, 246, .25)

		// El gap de arriba mide 1px menos de lo que dice: .btn-group le pone margin-left: -1px a

		// todos menos al primero, para solapar los bordes de unos botones pegados que ya no estan.

		& + .btn

			margin-left: 0



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

	/* Fila de origen atenuada mientras se arrastra (vista tabla) */
	.columns-preferences-config__table-row--dragging

		opacity: .4

	/* Barra de insercion con box-shadow inset: un ::before absoluto dentro de un <tr> no se */
	/* posiciona confiable en todos los navegadores, por eso se dibuja sobre los td */
	.columns-preferences-config__table-row--drop-before td

		box-shadow: inset 0 2px 0 #007bff

	.columns-preferences-config__table-row--drop-after td

		box-shadow: inset 0 -2px 0 #007bff



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



// ═══════════════════════════════════════════════════════════════════════════════
// La fila baja de peso (tarea 30).

// El modal se leia como una lista de bloques enormes: cada fila traia un <hr> propio, los
// controles venian en tres tamanos distintos y el campo de ancho ocupaba media fila para un
// solo numero. Nada de esto cambia el markup ni la logica -- se resuelve todo desde aca.

// Los separadores eran <hr>, que en bootstrap trae 1rem de margen ARRIBA y ABAJO: 32px de aire
// por fila, mas que el contenido de la fila. Se apagan y el separador pasa a ser un borde de la
// propia fila, que no ocupa alto.
// ═══════════════════════════════════════════════════════════════════════════════
.columns-preferences-config

	hr
		display: none

	.props-row
		padding: 6px 2px
		border-bottom: 1px solid var(--color-border-secondary)

		&:last-child
			border-bottom: none

	// Los tres controles de ordenar (asa + dos flechas) competian de igual a igual siendo la
	// misma tarea. El asa queda como el control principal --es el que se usa-- y las flechas
	// bajan a un peso claramente secundario: sin relleno, sin borde y en el color de texto
	// apagado, hasta que se las apunta.
	.props-row
		// Mismo alto que las flechas: lo que la vuelve el control principal es que es la unica
		// con fondo y borde, no que sea mas grande. Con la altura de la barra (36px) pasaba a
		// ser el elemento mas alto de la fila y le ponia piso al alto, justo en la mision que
		// viene a bajarlo.
		.drag-handle
			width: 28px
			height: 28px
			border-color: var(--color-border)
			border-radius: var(--toolbar-btn-radius)
			background: var(--bg-card)
			color: var(--color-text-primary)

			&:hover
				background: var(--bg-hover)

		.btn
			height: 28px
			min-width: 28px
			padding: 0 6px
			border-radius: 8px
			background: transparent
			border-color: transparent
			color: var(--color-text-secondary)
			box-shadow: none

			&:hover:not(:disabled)
				background: var(--bg-hover)
				border-color: var(--color-border)
				color: var(--color-text-primary)

			&:disabled
				opacity: .35

	// El campo de ancho: el label "Ancho" ya se saco del markup y queda el sufijo "px", que
	// alcanza para saber que es. Achicado, porque son tres digitos.
	.props-row
		.input-group
			width: auto

			.form-control
				max-width: 68px
				height: 32px
				font-size: 0.875rem

			.input-group-text
				height: 32px
				padding: 0 8px
				font-size: 0.8125rem
				background: var(--bg-section)
				border-color: var(--color-border)
				color: var(--color-text-secondary)

	// El separador "|" entre el toggle de salto de linea y el ancho: con la fila ya compacta,
	// los margenes de 15px de cada lado eran mas ruido que ayuda.
	.ancho-wrapper
		gap: 10px

		> .m-l-15.m-r-15
			margin-left: 0 !important
			margin-right: 0 !important
			color: var(--color-border)

		.custom-control-label
			font-size: 0.875rem
			color: var(--color-text-primary)

</style>

