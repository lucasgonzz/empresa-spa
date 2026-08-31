<template>
	<b-dropdown
	v-if="show"
	right
	:id="id"
	:data-tour="ancla_tour"
	size="sm"
	:variant="variant"
	:toggle-attrs="{ title: tooltip_text, 'aria-label': tooltip_text, 'data-testid': 'masiva-dropdown-'+sufijo_testid }">
		<template #button-content>
			<i :class="icon_class" aria-hidden="true"></i>
			<b-badge :variant="badge_variant" class="m-l-5">{{ count }}</b-badge>
		</template>
		<!--
			🔴 El sufijo (`filtrados` / `seleccion`) no sobra: este componente se dibuja DOS VECES en
			la misma pantalla --una para el conjunto filtrado y otra para la seleccion manual-- y los
			`id` de los items (`btn_actualizar`, `btn_eliminar`) quedan duplicados en el documento.
			El testid es lo unico que distingue por cual de los dos dropdowns se entro.
		-->
		<dropdown-option-item
		v-if="puede_actualizar && show_actualizar_option"
		:testid="'masiva-opcion-actualizar-'+sufijo_testid"
		id="btn_actualizar"
		icon="icon-undo"
		:disabled="ocultar_actualizar_eliminar_por_filtro"
		:tooltip="ocultar_actualizar_eliminar_por_filtro ? texto_disabled_buscador_general : ''"
		@click="setUpdate">
			Actualizar
		</dropdown-option-item>
		<dropdown-option-item
		:testid="'masiva-opcion-eliminar-'+sufijo_testid"
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
		/**
		 * Ancla `data-tour` del desplegable de acciones.
		 *
		 * 🔴 `from_filter` no es un detalle: este componente **se monta dos veces en la misma
		 * vista** —una para los seleccionados y otra para los filtrados
		 * (`opciones-filtrados-seleccion/Index.vue`)—, así que sin discriminar por esa prop el
		 * mismo valor aparecería duplicado en pantalla y el tour agarraría el que le tocara
		 * primero. El clip 1.6 (actualización masiva) entra por el de filtrados y el 1.7
		 * (imágenes inteligentes) por el de seleccionados.
		 *
		 * @returns {String|null}
		 */
		ancla_tour() {
			if (this.model_name === 'article') {
				return this.from_filter ? 'listado.dropdown_filtrados' : 'listado.dropdown_seleccionados'
			}

			if (this.model_name === 'sale' && !this.from_filter) {
				return 'ventas.dropdown_seleccion'
			}

			return null
		},
		id() {
			if (this.from_filter) {
				return 'btn_filtrados_dropdown'
			}
			return 'btn_seleccionados_dropdown'
		},
		/**
		 * Sufijo que distingue las dos instancias de este dropdown en los `data-testid`.
		 *
		 * @returns {String}
		 */
		sufijo_testid() {
			return this.from_filter ? 'filtrados' : 'seleccion'
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
