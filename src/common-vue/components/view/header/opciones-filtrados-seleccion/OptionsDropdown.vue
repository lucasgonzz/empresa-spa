<template>
	<b-dropdown
	v-if="show"
	right
	:id="id"
	size="sm"
	:variant="variant"
	:toggle-attrs="{ title: tooltip_text, 'aria-label': tooltip_text }">
		<template #button-content>
			<i :class="icon_class" aria-hidden="true"></i>
			<b-badge :variant="badge_variant" class="m-l-5">{{ count }}</b-badge>
		</template>
		<dropdown-option-item
		v-if="puede_actualizar && show_actualizar_option"
		id="btn_actualizar"
		icon="icon-undo"
		:disabled="ocultar_actualizar_eliminar_por_filtro"
		:tooltip="ocultar_actualizar_eliminar_por_filtro ? texto_disabled_buscador_general : ''"
		@click="setUpdate">
			Actualizar
		</dropdown-option-item>
		<dropdown-option-item
		id="btn_eliminar"
		v-if="puede_eliminar"
		icon="icon-trash"
		variant="danger"
		:disabled="ocultar_actualizar_eliminar_por_filtro"
		:tooltip="ocultar_actualizar_eliminar_por_filtro ? texto_disabled_buscador_general : ''"
		@click="setDelete">
			Eliminar
		</dropdown-option-item>
		<slot
		name="options_drop_down"></slot>
		<slot
		name="options_drop_down_seleccion"></slot>
		<slot
		name="options_drop_down_filtro"></slot>
	</b-dropdown>
</template>
<script>
export default {
	components: {
		DropdownOptionItem: () => import('@/common-vue/components/view/header/opciones-filtrados-seleccion/DropdownOptionItem'),
	},
	props: {
		model_name: String,
		from_filter: Boolean,
		check_permissions: Boolean,
		show_actualizar_option: Boolean,
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	provide() {
		return {
			options_from_filter: this.from_filter,
			options_dropdown_model_name: this.model_name,
		}
	},
	computed: {
		id() {
			if (this.from_filter) {
				return 'btn_filtrados_dropdown'
			}
			return 'btn_seleccionados_dropdown'
		},
		variant() {
			if (this.from_filter) {
				return 'primary'
			}
			return 'warning'
		},
		puede_eliminar() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.delete')
			}
			return true
		},
		puede_actualizar() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.update')
			}
			return true
		},
		text_dropdown() {
			if (this.from_filter) {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].total_filter_results + ' filtrados'
				}
				return this.$store.state[this.model_name].total_filter_results + ' filtrados'
			}
			return 'Seleccion: ' + this.$store.state[this.model_name].selected.length
		},
		/** Cantidad a mostrar en el badge (seleccionados o filtrados según el modo). */
		count() {
			if (this.from_filter) {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].total_filter_results
				}
				return this.$store.state[this.model_name].total_filter_results
			}
			return this.$store.state[this.model_name].selected.length
		},
		/** Ícono descriptivo del dropdown según el modo. */
		icon_class() {
			if (this.from_filter) {
				return 'bi bi-funnel-fill'
			}
			return 'bi bi-check2-all'
		},
		/** Variante del badge para que contraste con la variante del botón. */
		badge_variant() {
			if (this.from_filter) {
				return 'light'
			}
			return 'dark'
		},
		/**
		 * True cuando lo que hay en pantalla es el listado por defecto (prompts 02/03 del grupo
		 * 221), no un filtro puesto por el usuario. El store de papelera no tiene este flag (la
		 * papelera nunca arma listado por defecto), por eso solo se lee del lado normal.
		 *
		 * @returns {Boolean}
		 */
		listado_por_defecto() {
			if (this.papelera) {
				return false
			}
			return !!this.$store.state[this.model_name].listado_por_defecto
		},
		/**
		 * Texto del tooltip/aria del toggle (reemplaza al texto visible que se sacó). Cuando lo
		 * que hay en pantalla es el listado por defecto, la palabra correcta es "todos": el
		 * usuario no filtró nada, solo entró al módulo (prompt 04 del grupo 221, tarea 06).
		 */
		tooltip_text() {
			if (this.from_filter) {
				if (this.listado_por_defecto) {
					return 'Acciones sobre todos (' + this.count + ')'
				}
				return 'Acciones sobre ' + this.count + ' filtrados'
			}
			return 'Acciones sobre ' + this.count + ' seleccionados'
		},
		show() {
			if (this.from_filter) {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].filtered.length
				}
				return this.$store.state[this.model_name].filtered.length
			}
			return this.$store.state[this.model_name].selected.length
		},
		/**
		 * Deshabilita actualizar/eliminar masivos por filtro cuando el listado se armo con el buscador
		 * general y NO hay ningun filtro de columna con criterio de valor. El motivo esta en el store
		 * (__base_store.js, runGlobalSearch): la masiva manda `filter_form: state.filters`, asi que sin
		 * filtros de columna el backend recibiria un filtro vacio y tocaria el listado entero.
		 */
		ocultar_actualizar_eliminar_por_filtro() {
			if (!this.from_filter) {
				return false
			}
			let module_state = this.papelera
				? this.$store.state.papelera[this.model_name]
				: this.$store.state[this.model_name]
			return !!module_state.filtered_without_filter_form
		},
		/**
		 * Texto del tooltip cuando Actualizar/Eliminar por filtro estan deshabilitados por venir
		 * de una busqueda del buscador general (ver ocultar_actualizar_eliminar_por_filtro). Explica
		 * el motivo en vez de ocultar los botones sin mas.
		 *
		 * @returns {String}
		 */
		texto_disabled_buscador_general() {
			return 'No disponible para resultados del buscador general. Para actualizar o eliminar varios registros a la vez, usá el filtro de columnas.'
		},
	},
	methods: {
		setUpdate() {
			this.$emit('setUpdate', this.from_filter)
		},
		setDelete() {
			this.$emit('setDelete', this.from_filter)
		},
	}
}
</script>
