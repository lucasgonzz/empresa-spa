<template>
	<div class="columns-preferences-config">
		<div class="d-flex align-items-center justify-content-between m-b-10">
			<b-button-group class="w-50">
				<b-button
				@click="limpiar_todo"
				block
				size="sm"
				variant="outline-primary">
					Limpiar todo
				</b-button>
				<b-button
				block
				@click="marcar_todo"
				size="sm"
				class="m-0"
				variant="primary">
					Marcar todo
				</b-button>
			</b-button-group>

			<b-form-input
			class="m-l-10"
			style="max-width: 320px"
			size="sm"
			v-model.trim="search_query"
			placeholder="Buscar propiedad..."></b-form-input>
		</div>

		<hr>

		<div
		v-for="row in filtered_config_rows"
		:key="row.key"
		class="props-row"
		draggable="true"
		@dragstart="drag_start(row, $event)"
		@dragover.prevent="drag_over(row)"
		@drop.prevent="drop_row(row)"
		@dragend="drag_end">

			<div class="d-flex align-items-center justify-content-between flex-nowrap">
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
	},
	data() {
		return {
			search_query: '',
			dragging_index: null,
			drag_over_index: null,
		}
	},
	computed: {
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
			const query = this.search_query.toLowerCase()
			return this.config_rows.filter(row => {
				const text = `${row.name || ''} ${row.label || ''}`.toLowerCase()
				return text.includes(query)
			})
		},
	},
	methods: {
		/*
		 * Obtiene el indice real de una fila dentro del arreglo principal de configuracion.
		 * Parametros:
		 * - row (Object): fila de configuracion de columna.
		 * Retorno: Number con la posicion encontrada en this.config_rows o -1 si no existe.
		 * Nota: se usa para operar sobre el arreglo original, aun cuando la vista este filtrada.
		 */
		get_config_index(row) {
			return this.config_rows.findIndex(item => item.key == row.key)
		},
		/*
		 * Inicia el proceso de drag and drop guardando el indice de origen.
		 * Parametros:
		 * - row (Object): fila que comienza a arrastrarse.
		 * - event (DragEvent): evento nativo del navegador para DnD.
		 * Retorno: void.
		 * Nota: effectAllowed en "move" informa que la interaccion es de reordenamiento.
		 */
		drag_start(row, event) {
			this.dragging_index = this.get_config_index(row)
			event.dataTransfer.effectAllowed = 'move'
		},
		/*
		 * Actualiza el indice de destino mientras se arrastra una fila sobre otra.
		 * Parametros:
		 * - row (Object): fila actualmente sobrevolada.
		 * Retorno: void.
		 * Nota: se guarda solo referencia de indice para resolver el drop final.
		 */
		drag_over(row) {
			this.drag_over_index = this.get_config_index(row)
		},
		/*
		 * Ejecuta el reordenamiento al soltar una fila en una nueva posicion.
		 * Parametros:
		 * - row (Object): fila sobre la que se realiza el drop.
		 * Retorno: void.
		 * Nota: evita reordenar si no hay origen valido o si origen y destino son iguales.
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
		 * Parametros: no recibe parametros.
		 * Retorno: void.
		 * Nota: reinicia indices para evitar efectos colaterales entre arrastres.
		 */
		drag_end() {
			this.dragging_index = null
			this.drag_over_index = null
		},
		/*
		 * Mueve una fila seleccionada al inicio de la configuracion.
		 * Parametros:
		 * - row (Object): fila a mover.
		 * Retorno: void.
		 * Nota: si ya esta en primera posicion, no realiza cambios.
		 */
		move_to_start(row) {
			const index = this.get_config_index(row)
			if (index <= 0) return
			const moved = this.config_rows.splice(index, 1)[0]
			this.config_rows.unshift(moved)
		},
		/*
		 * Mueve una fila seleccionada al final de la configuracion.
		 * Parametros:
		 * - row (Object): fila a mover.
		 * Retorno: void.
		 * Nota: si ya esta al final, no realiza cambios.
		 */
		move_to_end(row) {
			const index = this.get_config_index(row)
			if (index >= this.config_rows.length - 1) return
			const moved = this.config_rows.splice(index, 1)[0]
			this.config_rows.push(moved)
		},
		/*
		 * Desmarca la visibilidad de todas las filas actualmente visibles en el filtro.
		 * Parametros: no recibe parametros.
		 * Retorno: void.
		 * Nota: actua sobre filtered_config_rows para respetar la busqueda activa.
		 */
		limpiar_todo() {
			this.filtered_config_rows.forEach(row => {
				row.visible = false
			})
		},
		/*
		 * Marca la visibilidad de todas las filas actualmente visibles en el filtro.
		 * Parametros: no recibe parametros.
		 * Retorno: void.
		 * Nota: actua sobre filtered_config_rows para respetar la busqueda activa.
		 */
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
	/* No forzar un ancho fijo para evitar que los controles se vayan a una segunda linea */
	width: auto
	flex: 0 0 auto
	flex-wrap: nowrap
	white-space: nowrap

	/* Evita que el contenido interno (b-input-group/labels) fuerce wrap */
	> *
		white-space: nowrap

.columns-preferences-config
	/* Override: impedir envoltura de la fila (evita controles "amontonados" en 2 lineas) */
	.props-row
		& > .d-flex
			flex-wrap: nowrap !important
			white-space: nowrap
</style>
