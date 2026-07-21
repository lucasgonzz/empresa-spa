<template>
	<!--
		View-header en 3 zonas con CSS Grid (NO el grid de 12 columnas de Bootstrap, que era lo que
		wrappeaba feo en pantallas chicas).
		Izquierda (acciones): grupo primario (ojo + crear) + grupo de estado (grupo-estado), separados por margen.
		Centro: buscador general, centrado y con ancho acotado en desktop.
		Derecha (módulo): botones propios del módulo (slot horizontal_nav_center) + display-nav de fechas.

		Regla crítica: la zona derecha NUNCA se oculta con CSS en ningún breakpoint. Los botones de
		módulo (Inventario/Depósitos) se auto-ocultan en teléfono por sus propias clases d-none d-md-block;
		el display-nav de fechas de Ventas (change_from_dates_option) se ve SIEMPRE, en todos los tamaños.
	-->
	<div class="view-header-toolbar view-header p-t-15">

		<!-- ZONA IZQUIERDA — acciones: dos grupos semánticos separados por margen -->
		<div class="view-header__left">

			<!-- Grupo 1 (siempre visible): props-to-show (ojo) + crear (excel-drop-down o btn-create) -->
			<div class="view-header__group">

				<props-to-show
				v-if="show_btn_props_to_show"
				:model_name="model_name"></props-to-show>

				<slot name="btn_create">
					<excel-drop-down
					class="m-l-10"
					v-if="show_excel_drop_down"
					:check_permissions="check_permissions"
					:can_create="can_create"
					:has_permission_create_dropdown="has_permission_create_dropdown"
					:model_name="model_name">
						<template #excel_drop_down_options>
							<slot name="excel_drop_down_options"></slot>
						</template>
					</excel-drop-down>

					<btn-create
					v-else-if="show_btn_create && can_create"
					class="m-l-10"
					:with_margin="false"
					:block="false"
					button_size="sm"
					:model_name="model_name"></btn-create>
				</slot>
			</div>

			<!-- Grupo 2 (estado): seleccionar / filtrados-selección / limpiar filtros / restaurar papelera. -->
			<!-- En teléfono colapsa dentro de un dropdown de overflow (⋯); lógica encapsulada en grupo-estado. -->
			<div class="view-header__group">
				<grupo-estado
				:model_name="model_name"
				:papelera="papelera"
				:ask_selectable="ask_selectable"
				:check_permissions="check_permissions"
				:show_actualizar_option="show_actualizar_option">
					<template #options_drop_down>
						<slot name="options_drop_down"></slot>
					</template>

					<template #options_drop_down_seleccion>
						<slot name="options_drop_down_seleccion"></slot>
					</template>

					<template #options_drop_down_filtro>
						<slot name="options_drop_down_filtro"></slot>
					</template>
				</grupo-estado>
			</div>
		</div>

		<!-- ZONA CENTRO — buscador general (montado por default; se puede apagar con show_buscador_general) -->
		<div
		v-if="show_buscador_general"
		class="view-header__center">
			<buscador-general
			:model_name="model_name"
			:extra_filters="extra_filters"
			:default_extra_props="default_extra_props">
				<!-- Slot para que cada módulo inyecte filtros propios (ej: categoría/stock del listado) -->
				<template #search_extra>
					<slot name="search_extra"></slot>
				</template>
			</buscador-general>
		</div>

		<!-- ZONA DERECHA — módulo. ⚠️ NUNCA se oculta con CSS (ver comentario del template). -->
		<!-- Los botones de módulo se auto-ocultan en teléfono por sus clases d-none d-md-block. -->
		<!-- El display-nav de fechas es visible en todos los breakpoints; en teléfono baja a fila propia. -->
		<div
		class="view-header__right"
		:class="{ 'view-header__right--fechas': change_from_dates_option }">

			<slot name="horizontal_nav_center"></slot>

			<display-nav
			v-if="change_from_dates_option"
			:change_from_dates_option="change_from_dates_option"
			:model_name="model_name"></display-nav>
		</div>
	</div>
</template>
<script>
export default {
	/**
	 * ViewHeader — orquestador del encabezado de las vistas de listado (view-component).
	 * Solo compone las 3 zonas (acciones / buscador / módulo) y reparte props y slots hacia
	 * los sub-componentes (grupo-estado, buscador-general). La lógica de estado (selección,
	 * filtrados, papelera) vive en grupo-estado; la de búsqueda en buscador-general.
	 */
	components: {
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
		BtnCreate: () => import('@/common-vue/components/BtnCreate'),
		GrupoEstado: () => import('@/common-vue/components/view/header/grupo-estado/Index'),
		BuscadorGeneral: () => import('@/common-vue/components/view/header/buscador-general/Index'),

		// De horizontal-nav original
		ExcelDropDown: () => import('@/common-vue/components/horizontal-nav/ExcelDropDown'),
		DisplayNav: () => import('@/common-vue/components/horizontal-nav/DisplayNav'),
	},
	props: {
		model_name: String,
		papelera: {
			type: Boolean,
			default: false,
		},
		ask_selectable: Boolean,
		show_excel_drop_down: {
			type: Boolean,
			default: false,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_create: {
			type: Boolean,
			default: false,
		},
		has_permission_create_dropdown: {
			type: Boolean,
			default: false,
		},
		change_from_dates_option: {
			type: Boolean,
			default: false,
		},
		show_btn_props_to_show: {
			type: Boolean,
			default: true,
		},
		show_actualizar_option: Boolean,
		/**
		 * Muestra el buscador general en la zona centro. Se puede apagar en un módulo puntual
		 * donde no aplique. Default true.
		 */
		show_buscador_general: {
			type: Boolean,
			default: true,
		},
		/**
		 * Filtros extra propios del módulo que el header le pasa al buscador general
		 * (ej: categoría/stock del listado). Formato: [{ key, operator, value }].
		 */
		extra_filters: {
			type: Array,
			default: function () {
				return []
			},
		},
		/**
		 * Keys extra que se suman a 'name' en el default del buscador general (ver buscador-general).
		 */
		default_extra_props: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	computed: {
		/**
		 * Indica si el usuario puede crear registros del modelo (según permisos, si se chequean).
		 *
		 * @returns {boolean}
		 */
		can_create() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.store')
			}
			return true
		},
	},
}
</script>

<style lang="sass">

/* Layout de 3 zonas con CSS Grid. Máx. 2 filas (+ fila fechas en teléfono) */
.view-header
	display: grid
	align-items: center
	column-gap: 12px
	row-gap: 10px
	/* Desktop (≥1200px): una sola fila — izquierda | buscador centrado | derecha */
	grid-template-columns: 1fr auto 1fr
	grid-template-areas: "left center right"

.view-header__left
	grid-area: left
	display: flex
	align-items: center
	flex-wrap: wrap
	justify-self: start
	/* Separación entre el grupo primario y el grupo de estado: solo margen, sin línea divisoria */
	gap: 10px

/* Grupo semántico de botones (primario o de estado) */
.view-header__group
	display: flex
	align-items: center
	flex-wrap: wrap

/* Zona centro: buscador centrado (1fr auto 1fr) y de ancho acotado */
.view-header__center
	grid-area: center
	justify-self: center
	width: 100%
	max-width: 520px

/* Zona derecha (módulo). NUNCA se oculta con CSS. Vacía colapsa sin hueco */
.view-header__right
	grid-area: right
	display: flex
	align-items: center
	flex-wrap: wrap
	justify-content: flex-end
	justify-self: end

/* Intermedio (≤1199px): buscador a fila propia; arriba acciones | módulo */
@media (max-width: 1199px)
	.view-header
		grid-template-columns: 1fr auto
		grid-template-areas: "left right" "center center"

	.view-header__center
		justify-self: stretch
		max-width: none

/* Teléfono (<768px): columna única. Zona derecha NO se oculta */
@media (max-width: 767px)
	.view-header
		grid-template-columns: 1fr
		grid-template-areas: "left" "center" "right"
		/* Sin row-gap: separación con margin para no reservar espacio en zonas vacías */
		row-gap: 0

	.view-header__left
		justify-self: stretch
		justify-content: flex-start

	.view-header__center
		margin-top: 10px

	/* Zona derecha centrada; NO se oculta. Sin display-nav colapsa sin hueco */
	.view-header__right
		justify-self: stretch
		justify-content: center

	/* Con display-nav de fechas (Ventas): separación de su fila propia */
	.view-header__right--fechas
		margin-top: 10px

/* Altura unificada de botones/dropdowns (misma que btn-sm) */
.view-header-toolbar
	::v-deep .btn:not(.btn-link):not(.dropdown-item)
		padding: 0.25rem 0.5rem
		font-size: 0.875rem
		line-height: 1.5

	::v-deep .dropdown > .btn
		padding: 0.25rem 0.5rem
		font-size: 0.875rem
		line-height: 1.5

	/* Buscador listado en horizontal_nav_center: input alineado con btn-sm */
	::v-deep .buscador-listado
		.cont-search
			align-items: stretch

		.icon
			font-size: 0.875rem
			width: 32px

		.input-search
			height: auto !important
			padding: 0.25rem 0.5rem
			font-size: 0.875rem
			line-height: 1.5

	/* Buscador general zona centro: input alineado con altura de btn-sm */
	::v-deep .buscador-general
		input.form-control
			height: auto !important
			padding: 0.25rem 0.5rem
			font-size: 0.875rem
			line-height: 1.5

</style>
