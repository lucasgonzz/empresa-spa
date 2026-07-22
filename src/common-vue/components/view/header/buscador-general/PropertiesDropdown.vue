<template>
	<!--
		Desplegable de propiedades del buscador general, dividido en dos secciones (prompt 07 del
		grupo 179):
		- "Donde buscar": lo que ya existia (botonera seleccionar todas/ninguna, filtro de texto y
		la lista de props con su toggle), sin cambios de comportamiento.
		- "Como buscar": presets de modo de busqueda (distribuida/estricta) + conector, explicados
		en criollo para que un comerciante los entienda sin saber que es un OR.
		Es un componente de presentacion: no toca el store, solo emite eventos y el padre
		(Index.vue) decide que hacer con cada uno.
	-->
	<b-dropdown
	class="buscador-general-dropdown"
	variant="link"
	no-caret
	boundary="viewport"
	:popper-opts="dropdown_popper_opts"
	toggle-class="buscador-general-dropdown__toggle"
	menu-class="buscador-general-dropdown__menu">
		<template #button-content>
			<i class="icon-filter"></i>
		</template>

		<!-- ─── Seccion 1: "Donde buscar" (sin cambios de comportamiento) ─── -->
		<div class="buscador-general-dropdown__section-title">Donde buscar</div>

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

		<!-- Filtro de texto: reduce la lista de abajo en vivo, sin afectar la seleccion ni el
			orden real de ordered_props. b-dropdown-form para no cerrar el menu al escribir. -->
		<b-dropdown-form class="buscador-general-dropdown__filter-form">
			<input
			type="text"
			class="buscador-general-dropdown__filter"
			autocomplete="off"
			placeholder="Filtrar propiedades..."
			v-model="filter_text">
		</b-dropdown-form>

		<b-dropdown-divider></b-dropdown-divider>

		<!-- Lista unica de props (propias + relaciones) en el orden de props_to_show, filtrada
			en vivo por filter_text (solo visual: no altera seleccion ni orden real) -->
		<b-dropdown-form
		v-for="item in filtered_props"
		:key="item.kind + '_' + item.key"
		class="buscador-general-dropdown__row-form">
			<div class="buscador-general-dropdown__row">
				<!--
					Nombre de la propiedad: ahora es clickeable (abre el modal de configuracion de
					filtro fijo, prompt 05 del grupo 179). Es un boton separado del toggle: el click
					acá NO debe disparar el toggle ni viceversa, por eso @click.stop (ademas de estar
					en un elemento hermano, no anidado dentro del label del toggle).
				-->
				<button
				type="button"
				class="buscador-general-dropdown__row-label"
				:class="{ 'buscador-general-dropdown__row-label--activa': es_filtro_fijo_activo(item) }"
				:title="'Configurar '+display_text(item.text)+' como filtro fijo'"
				@click.stop="$emit('configure', { key: item.key, kind: item.kind })">
					<span class="buscador-general-dropdown__row-label-text">{{ display_text(item.text) }}</span>
					<!-- Puntito/embudo lleno: indica que esta propiedad ya esta agregada como filtro fijo -->
					<i
					v-if="es_filtro_fijo_activo(item)"
					class="icon-filter buscador-general-dropdown__row-label-badge"></i>
					<!-- Icono de ajustes: discreto, solo aparece marcado al hover (ver estilos) -->
					<i class="icon-configuration buscador-general-dropdown__row-label-gear"></i>
				</button>

				<!--
					Selector de modo de busqueda por propiedad (prompt 07 del grupo 179): solo se
					muestra si la propiedad esta tildada (si no participa de la busqueda, su modo no
					importa y solo ensucia la fila). Va entre el nombre y el toggle. Dentro de
					b-dropdown-form ya envuelve toda la fila, asi que un @change ac no cierra el menu.
				-->
				<span
				v-if="is_selected(item)"
				class="buscador-general-dropdown__row-mode"
				title="Como se compara esta propiedad contra las palabras buscadas">
					<select
					class="buscador-general-dropdown__row-mode-select"
					:value="keyword_mode_de(item)"
					@click.stop
					@change="$emit('set-keyword-mode', { key: item.key, kind: item.kind, mode: $event.target.value })">
						<option value="alguna">Puede aportar una palabra</option>
						<option value="todas">Tiene que tener todas</option>
					</select>
					<!-- Icono de ayuda con tooltip: aclara el significado del modo elegido -->
					<i
					class="icon-help buscador-general-dropdown__row-mode-help"
					v-b-tooltip.hover
					:title="keyword_mode_help_de(item)"></i>
				</span>

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

		<b-dropdown-divider></b-dropdown-divider>

		<!-- ─── Seccion 2: "Como buscar" (prompt 07 del grupo 179) ─── -->
		<div class="buscador-general-dropdown__section-title">Como buscar</div>

		<!-- Presets: cubren el 99% de los casos sin tener que tocar el selector por propiedad -->
		<b-dropdown-form class="buscador-general-dropdown__presets-form">
			<div class="buscador-general-dropdown__presets">
				<button
				type="button"
				class="buscador-general-dropdown__preset"
				:class="{ 'buscador-general-dropdown__preset--active': preset_activo === 'distribuida' }"
				@click="$emit('set-preset', 'distribuida')">
					<span class="buscador-general-dropdown__preset-title">Las palabras pueden estar repartidas</span>
					<span class="buscador-general-dropdown__preset-desc">
						Cada palabra que escribis puede aparecer en un campo distinto. Si buscas "8 pinza",
						encuentra una pinza cuyo codigo de proveedor tenga el 8. Es la forma mas parecida al
						buscador de VENDER.
					</span>
				</button>
				<button
				type="button"
				class="buscador-general-dropdown__preset"
				:class="{ 'buscador-general-dropdown__preset--active': preset_activo === 'estricta' }"
				@click="$emit('set-preset', 'estricta')">
					<span class="buscador-general-dropdown__preset-title">Cada campo tiene que tener todo</span>
					<span class="buscador-general-dropdown__preset-desc">
						Un mismo campo tiene que contener todas las palabras que escribiste. Es mas exacto y
						devuelve menos resultados.
					</span>
				</button>
			</div>
		</b-dropdown-form>

		<!--
			Conector: solo tiene sentido si entre las props tildadas hay una mezcla de los dos
			modos (si son todas iguales, no hay nada que conectar).
		-->
		<b-dropdown-form v-if="mostrar_conector" class="buscador-general-dropdown__conector-form">
			<div class="buscador-general-dropdown__conector">
				<button
				type="button"
				class="buscador-general-dropdown__conector-opcion"
				:class="{ 'buscador-general-dropdown__conector-opcion--active': conector === 'or' }"
				@click="$emit('set-conector', 'or')">
					Con que coincida de una forma u otra alcanza
				</button>
				<button
				type="button"
				class="buscador-general-dropdown__conector-opcion"
				:class="{ 'buscador-general-dropdown__conector-opcion--active': conector === 'and' }"
				@click="$emit('set-conector', 'and')">
					Tiene que coincidir de las dos formas
				</button>
			</div>
			<p class="buscador-general-dropdown__conector-help">
				La segunda opcion es mas restrictiva y casi siempre devuelve menos resultados.
			</p>
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

		/**
		 * Keys de propiedades que ya estan agregadas como filtro fijo (control propio a la par del
		 * input, ver FiltroFijoModal.vue). Solo se usa para el indicador visual de la fila; el
		 * armado/persistencia de esta lista lo maneja Index.vue.
		 */
		filtros_fijos_activos: {
			type: Array,
			default: function () {
				return []
			},
		},

		/**
		 * Modo de coincidencia por propiedad (prompt 07 del grupo 179): mapa key -> 'alguna' o
		 * 'todas'. 'alguna' es el default nuevo (comportamiento tipo Vender); 'todas' es el
		 * comportamiento estricto que tenia el buscador general antes de este prompt.
		 */
		keyword_modes: {
			type: Object,
			default: function () {
				return {}
			},
		},

		/**
		 * Conector a nivel modelo ('or' / 'and') que une el grupo de props en modo 'todas' con el
		 * grupo en modo 'alguna'. Solo se usa/muestra cuando mostrar_conector es true.
		 */
		conector: {
			type: String,
			default: 'or',
		},

		/**
		 * True si entre las props tildadas hay una mezcla de los dos modos ('alguna' y 'todas'):
		 * en ese caso el conector tiene sentido y se muestra. Lo calcula Index.vue (conoce la
		 * seleccion completa).
		 */
		mostrar_conector: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			// Texto ingresado en el campo "Filtrar propiedades...": filtra la lista mostrada por
			// coincidencia case-insensitive sobre item.text, sin tocar seleccion ni orden real.
			filter_text: '',
			// Popper: separa el menu del toggle (mas espacio que el default) y lo centra bajo el
			// icono en vez de quedar pegado al borde izquierdo (toggle ~30px, menu ~320px).
			dropdown_popper_opts: {
				modifiers: {
					offset: {
						offset: '-145, 8',
					},
				},
			},
		}
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

		/**
		 * ordered_props filtrado en vivo por filter_text (coincidencia case-insensitive sobre
		 * item.text). Si filter_text esta vacio devuelve ordered_props tal cual. Es solo un
		 * filtro visual de la lista mostrada: no cambia la seleccion real ni el orden.
		 *
		 * @returns {Array}
		 */
		filtered_props() {
			if (!this.filter_text) {
				return this.ordered_props
			}
			let query = this.filter_text.toLowerCase()
			return this.ordered_props.filter(function (item) {
				// Blindaje defensivo (ultima linea de defensa): si por algun motivo llegara un item
				// sin `text`, no rompe el filtro, simplemente no matchea la busqueda.
				return (item.text || '').toLowerCase().indexOf(query) !== -1
			})
		},

		/**
		 * Preset que coincide con la configuracion actual, para resaltar el boton correspondiente
		 * (mismo criterio que all_selected/none_selected: solo se resalta cuando calza exacto).
		 * 'distribuida' = todas las props tildadas en 'alguna'; 'estricta' = todas en 'todas'.
		 * Si no hay ninguna prop tildada, o hay mezcla, no hay preset activo (null).
		 *
		 * @returns {String|null}
		 */
		preset_activo() {
			let self = this
			let modos = []
			this.ordered_props.forEach(function (item) {
				if (self.is_selected(item)) {
					modos.push(self.keyword_mode_de(item))
				}
			})
			if (!modos.length) {
				return null
			}
			// Recorre a mano (sin every/map) para mantenerse en linea con el estilo del proyecto.
			let todas_alguna = true
			let todas_todas = true
			modos.forEach(function (mode) {
				if (mode !== 'alguna') {
					todas_alguna = false
				}
				if (mode !== 'todas') {
					todas_todas = false
				}
			})
			if (todas_alguna) {
				return 'distribuida'
			}
			if (todas_todas) {
				return 'estricta'
			}
			return null
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

		/**
		 * Indica si una propiedad de la lista ya esta agregada como filtro fijo (para mostrar el
		 * indicador visual al lado del nombre).
		 *
		 * @param {Object} item { key, kind }
		 * @returns {Boolean}
		 */
		es_filtro_fijo_activo(item) {
			return this.filtros_fijos_activos.indexOf(item.key) !== -1
		},

		/**
		 * Modo de coincidencia de una propiedad ('alguna' o 'todas'). Si no hay valor guardado
		 * para esa key, cae en 'alguna' (mismo default que Index.vue: comportamiento tipo Vender).
		 *
		 * @param {Object} item { key, kind }
		 * @returns {String} 'alguna' o 'todas'
		 */
		keyword_mode_de(item) {
			return this.keyword_modes[item.key] || 'alguna'
		},

		/**
		 * Texto de ayuda (tooltip) segun el modo actual de una propiedad, en criollo, sin jerga
		 * tecnica (nada de OR/AND/operador).
		 *
		 * @param {Object} item { key, kind }
		 * @returns {String}
		 */
		keyword_mode_help_de(item) {
			if (this.keyword_mode_de(item) === 'todas') {
				return 'Este campo tiene que tener todas las palabras'
			}
			return 'Alcanza con que este campo tenga alguna de las palabras'
		},

		/**
		 * Texto a mostrar en la fila: primera letra en mayuscula y resto en minuscula. Si el texto
		 * original ya viene todo en mayusculas (siglas como SKU), se deja intacto para no romper la
		 * sigla.
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		display_text(text) {
			if (!text) {
				return ''
			}
			if (text === text.toUpperCase() && text !== text.toLowerCase()) {
				return text
			}
			return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
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

// Campo de texto para filtrar la lista de propiedades mostradas (solo visual)
.buscador-general-dropdown__filter-form
	padding-top: 0
	padding-bottom: 4px

.buscador-general-dropdown__filter
	width: 100%
	height: 30px
	border: 1px solid #e2e4e7
	border-radius: 8px
	background: #fff
	padding: 0 10px
	font-size: 0.8rem
	color: #1d1d1f
	// Sin la sombra global de _inputs.sass: input chico y sobrio, igual criterio que el pill
	box-shadow: none

	&::placeholder
		color: #9aa0a6

	&:focus
		outline: none
		border-color: #c7cacf

// Titulo discreto de cada seccion ("Donde buscar" / "Como buscar")
.buscador-general-dropdown__section-title
	padding: 6px 12px 2px
	font-size: 0.72rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.04em
	color: #9aa0a6

// Fila de una propiedad: nombre a la izquierda, toggle a la derecha
.buscador-general-dropdown__row
	display: flex
	align-items: center
	justify-content: space-between
	gap: 12px
	width: 100%

	// Nombre de la propiedad, ahora un boton (clickeable para abrir el modal de filtro fijo).
	// Estetica Apple: discreto, sin fondo de boton, solo un cambio leve al hover.
	.buscador-general-dropdown__row-label
		display: flex
		align-items: center
		gap: 4px
		flex: 1 1 auto
		min-width: 0
		border: none
		background: transparent
		padding: 2px 0
		text-align: left
		cursor: pointer
		font-size: 0.86rem
		color: #1d1d1f

		.buscador-general-dropdown__row-label-text
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		// Puntito/embudo lleno: la propiedad ya esta agregada como filtro fijo
		.buscador-general-dropdown__row-label-badge
			flex: 0 0 auto
			font-size: 0.7rem
			color: #007bff

		// Icono de ajustes: oculto salvo hover/focus, para no ensuciar la lista en reposo
		.buscador-general-dropdown__row-label-gear
			flex: 0 0 auto
			font-size: 0.75rem
			color: #86868b
			opacity: 0
			transition: opacity 0.15s ease

		&:hover, &:focus
			.buscador-general-dropdown__row-label-text
				text-decoration: underline
				text-decoration-color: #c7cacf

			.buscador-general-dropdown__row-label-gear
				opacity: 1

		&.buscador-general-dropdown__row-label--activa
			.buscador-general-dropdown__row-label-text
				color: #007bff

// Selector de modo de busqueda por propiedad + icono de ayuda, entre el nombre y el toggle
.buscador-general-dropdown__row-mode
	display: flex
	align-items: center
	gap: 4px
	flex: 0 0 auto

	.buscador-general-dropdown__row-mode-select
		border: 1px solid #e2e4e7
		border-radius: 6px
		background: #fff
		padding: 1px 4px
		font-size: 0.72rem
		color: #4b4f56
		max-width: 108px

		&:focus
			outline: none
			border-color: #c7cacf

	.buscador-general-dropdown__row-mode-help
		font-size: 0.68rem
		color: #9aa0a6
		cursor: help

// Presets de "Como buscar": dos tarjetas apiladas, estetica Apple (sobria, sin colores fuertes)
.buscador-general-dropdown__presets-form
	padding-top: 4px

.buscador-general-dropdown__presets
	display: flex
	flex-direction: column
	gap: 6px

	.buscador-general-dropdown__preset
		display: flex
		flex-direction: column
		gap: 2px
		text-align: left
		border: 1px solid #e2e4e7
		background: #fff
		border-radius: 8px
		padding: 8px 10px
		cursor: pointer
		transition: background 0.15s ease, border-color 0.15s ease

		&:hover
			background: #f7f8f9

		// Solo se resalta cuando la configuracion actual coincide exactamente con este preset
		&.buscador-general-dropdown__preset--active
			border-color: #22c55e
			background: rgba(34, 197, 94, 0.08)

		.buscador-general-dropdown__preset-title
			font-size: 0.82rem
			color: #1d1d1f

		.buscador-general-dropdown__preset-desc
			font-size: 0.72rem
			color: #86868b
			line-height: 1.3

// Conector (solo visible con mezcla de modos entre las props tildadas)
.buscador-general-dropdown__conector-form
	padding-top: 6px

.buscador-general-dropdown__conector
	display: flex
	flex-direction: column
	gap: 6px

	.buscador-general-dropdown__conector-opcion
		text-align: left
		border: 1px solid #e2e4e7
		background: #fff
		border-radius: 8px
		padding: 6px 10px
		font-size: 0.78rem
		color: #4b4f56
		cursor: pointer
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

		&:hover
			background: #f7f8f9

		&.buscador-general-dropdown__conector-opcion--active
			border-color: #22c55e
			color: #15803d
			background: rgba(34, 197, 94, 0.08)

.buscador-general-dropdown__conector-help
	margin: 4px 0 0
	font-size: 0.7rem
	color: #86868b

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
