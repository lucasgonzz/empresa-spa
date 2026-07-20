<template>
	<!--
		Desplegable de propiedades del buscador general: una sola lista (sin titulos de seccion) con
		las props propias + relaciones, en el mismo orden que props_to_show, cada una con un toggle
		tipo iPhone. Arriba, una botonera para tildar o destildar todas. Es un componente de
		presentacion: no toca el store, solo emite toggle / select-all / deselect-all y el padre
		(Index.vue) decide que hacer con la seleccion.
	-->
	<b-dropdown
	class="buscador-general-dropdown"
	variant="link"
	no-caret
	toggle-class="buscador-general-dropdown__toggle"
	menu-class="buscador-general-dropdown__menu">
		<template #button-content>
			<i class="icon-filter"></i>
		</template>

		<!-- Botonera: seleccionar / deseleccionar todas. b-dropdown-form para no cerrar el menu. -->
		<b-dropdown-form class="buscador-general-dropdown__actions-form">
			<div class="buscador-general-dropdown__actions">
				<button
				type="button"
				class="buscador-general-dropdown__action"
				:class="{ 'buscador-general-dropdown__action--active': all_selected }"
				@click="$emit('select-all')">
					Seleccionar todas
				</button>
				<button
				type="button"
				class="buscador-general-dropdown__action"
				:class="{ 'buscador-general-dropdown__action--active': none_selected }"
				@click="$emit('deselect-all')">
					Ninguna
				</button>
			</div>
		</b-dropdown-form>

		<b-dropdown-divider></b-dropdown-divider>

		<!-- Lista unica de props (propias + relaciones) en el orden de props_to_show -->
		<b-dropdown-form
		v-for="item in ordered_props"
		:key="item.kind + '_' + item.key"
		class="buscador-general-dropdown__row-form">
			<div class="buscador-general-dropdown__row">
				<span class="buscador-general-dropdown__row-label">{{ item.text }}</span>

				<!-- Toggle tipo iPhone (mismo diseno que los checkbox del ModelForm) -->
				<label class="bg-toggle">
					<input
					type="checkbox"
					:checked="is_selected(item)"
					@change="$emit('toggle', { key: item.key, kind: item.kind })">
					<span class="bg-toggle-track">
						<span class="bg-toggle-thumb"></span>
					</span>
				</label>
			</div>
		</b-dropdown-form>
	</b-dropdown>
</template>
<script>
export default {
	/**
	 * PropertiesDropdown — lista unica de props buscables (propias + relaciones) con toggles
	 * iPhone y botonera de seleccionar/deseleccionar todas. Presentacional: recibe la lista ya
	 * ordenada (ordered_props) y la seleccion actual, y emite eventos; no conoce el store.
	 */
	props: {
		/**
		 * Lista de props buscables ya ordenada (segun props_to_show): [{ key, text, kind }],
		 * donde kind es 'own' (prop propia) o 'relation' (relacion).
		 */
		ordered_props: {
			type: Array,
			required: true,
		},

		/**
		 * Keys de props propias actualmente tildadas.
		 */
		selected_props: {
			type: Array,
			required: true,
		},

		/**
		 * Keys de relaciones actualmente tildadas.
		 */
		selected_relations: {
			type: Array,
			required: true,
		},
	},
	computed: {
		/**
		 * Cantidad de props actualmente tildadas (propias + relaciones) sobre el total de la lista.
		 *
		 * @returns {Number}
		 */
		selected_count() {
			let count = 0
			let self = this
			this.ordered_props.forEach(function (item) {
				if (self.is_selected(item)) {
					count++
				}
			})
			return count
		},

		/**
		 * True si TODAS las props de la lista estan tildadas (resalta el boton "Seleccionar todas").
		 *
		 * @returns {Boolean}
		 */
		all_selected() {
			return this.ordered_props.length > 0 && this.selected_count === this.ordered_props.length
		},

		/**
		 * True si NINGUNA prop esta tildada (resalta el boton "Ninguna").
		 *
		 * @returns {Boolean}
		 */
		none_selected() {
			return this.selected_count === 0
		},
	},
	methods: {
		/**
		 * Indica si una prop de la lista esta tildada, mirando la seleccion correcta segun su tipo.
		 *
		 * @param {Object} item { key, kind }
		 * @returns {Boolean}
		 */
		is_selected(item) {
			if (item.kind === 'own') {
				return this.selected_props.indexOf(item.key) !== -1
			}
			return this.selected_relations.indexOf(item.key) !== -1
		},
	},
}
</script>
<style lang="sass">
// Toggle del dropdown (solo icono de embudo): plano, se integra al pill del buscador.
.buscador-general-dropdown
	.buscador-general-dropdown__toggle
		display: flex
		align-items: center
		justify-content: center
		width: 30px
		height: 30px
		padding: 0
		border: none
		background: transparent
		border-radius: 50%
		color: #86868b
		box-shadow: none
		text-decoration: none

		&:hover, &:focus
			background: #f2f3f4
			color: #1d1d1f
			box-shadow: none
			text-decoration: none

		i
			font-size: 0.95rem

// Menu mas ancho para que se lean bien los nombres de las propiedades
.buscador-general-dropdown__menu
	min-width: 320px
	max-height: 60vh
	overflow-y: auto
	padding-top: 6px
	padding-bottom: 6px

	// b-dropdown-form trae padding propio; lo achicamos para filas compactas
	.b-dropdown-form
		padding: 2px 12px

	.buscador-general-dropdown__actions-form
		padding: 4px 12px

// Botonera de seleccionar / deseleccionar todas
.buscador-general-dropdown__actions
	display: flex
	gap: 8px

	.buscador-general-dropdown__action
		flex: 1 1 0
		border: 1px solid #e2e4e7
		background: #fff
		border-radius: 8px
		padding: 5px 8px
		font-size: 0.78rem
		color: #4b4f56
		cursor: pointer
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

		&:hover
			background: #f7f8f9

		// Estado activo: refleja que la seleccion actual ya es "todas" o "ninguna"
		&.buscador-general-dropdown__action--active
			border-color: #22c55e
			color: #15803d
			background: rgba(34, 197, 94, 0.08)

// Fila de una propiedad: nombre a la izquierda, toggle a la derecha
.buscador-general-dropdown__row
	display: flex
	align-items: center
	justify-content: space-between
	gap: 12px
	width: 100%

	.buscador-general-dropdown__row-label
		font-size: 0.86rem
		color: #1d1d1f
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

// ─── Toggle tipo iPhone (mismo diseno que los checkbox del ModelForm) ───
.bg-toggle
	position: relative
	display: inline-block
	flex: 0 0 auto
	width: 44px
	height: 26px
	cursor: pointer
	margin-bottom: 0

	input
		opacity: 0
		width: 0
		height: 0
		position: absolute

	.bg-toggle-track
		position: absolute
		inset: 0
		background: #d1d5db
		border-radius: 9999px
		transition: background 0.2s ease

	.bg-toggle-thumb
		position: absolute
		height: 20px
		width: 20px
		left: 3px
		bottom: 3px
		background: #fff
		border-radius: 50%
		transition: transform 0.2s ease
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25)

	input:checked ~ .bg-toggle-track
		background: #22c55e

	input:checked ~ .bg-toggle-track .bg-toggle-thumb
		transform: translateX(18px)
</style>
