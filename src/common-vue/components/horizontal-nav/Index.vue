<template>
	<div
	class="cont-navs">
		<div
		class="cont-left">
			<div 
			v-if="items"
			ref="horizontal_nav"
			class="horizontal-nav"
			:class="{ 'has_horizontal_scroll': has_horizontal_scroll }">
				<div
				class="item apretable"
				v-for="(item, i) in items"
				:key="i"
				:dusk="value(item)"
				@click="select(item)"
				:class="isActive(item)">
					{{ itemName(item) }}
					<b-badge
					variant="danger"
					v-if="item.alert">
						{{ item.alert }}
					</b-badge>
				</div>
			</div>

			<div
			class="cont-buttons search-buttons"
			v-if="show_filter_modal">
				<filter-modal
				:papelera="papelera"
				:model_name="model_name"></filter-modal>
				<b-btn-group
				class="m-r-15">
					<b-button
					v-if="can_filter_modal"
					variant="primary"
					@click="filterModal">
						<i class="icon-search"></i>
					</b-button>
					<b-button
					v-if="is_filtered"
					@click="restartSearch"
					variant="outline-success">
						<i class="icon-history"></i>
					</b-button>
				</b-btn-group>	
			</div>
			
			<div
			v-if="!papelera"
			class="cont-buttons create-buttons">
				<slot name="btn_create">
					<excel-drop-down
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
					:with_margin="false"
					:block="false"
					:model_name="model_name"></btn-create>
				</slot>
			</div>

			<div
			class="align-center m-l-15"
			v-if="ask_selectable">
				<b-form-checkbox
				:unchecked-value="0"
				:value="1"
				variant="warning"
				v-model="is_selecteable">
					Seleccionsdf
				</b-form-checkbox>
			</div>

			<!-- <options-dropdown
			v-if="show_filter_modal"
			:model_name="model_name">
				<template #options_drop_down>
					<slot name="options_drop_down"></slot>
				</template>
			</options-dropdown> -->
			
			<slot name="horizontal_nav_center"></slot>
		</div>
 
		
		<display-nav
		v-if="show_display"
		:change_from_dates_option="change_from_dates_option"
		:model_name="model_name"
		@setDisplay="setDisplay"></display-nav>

	</div>
</template>
<script>
import BtnCreate from '@/common-vue/components/BtnCreate'
import FilterModal from '@/common-vue/components/horizontal-nav/FilterModal'
import ExcelDropDown from '@/common-vue/components/horizontal-nav/ExcelDropDown'
import DisplayNav from '@/common-vue/components/horizontal-nav/DisplayNav'

export default {
	name: 'HorizontalNav',
	components: {
		BtnCreate,
		FilterModal,
		ExcelDropDown,
		DisplayNav,
		// OptionsDropdown: () => import('@/common-vue/components/horizontal-nav/options-dropdown/Index'),
	},
	props: {
		items: Array,
		change_from_dates_option: {
			type: Boolean,
			default: false,
		},
		show_btn_create: {
			type: Boolean,
			default: false,
		},
		prop_name: {
			type: String,
			default: null,
		},
		model_name: {
			type: String,
			default: null,
		},
		set_view: {
			type: Boolean,
			default: false,
		},
		set_sub_view: {
			type: Boolean,
			default: false,
		},
		set_sub_sub_view: {
			type: Boolean,
			default: false,
		},
		show_filter_modal: {
			type: Boolean,
			default: false,
		},
		show_display: {
			type: Boolean,
			default: true,
		},
		show_excel_drop_down: {
			type: Boolean,
			default: false,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		has_permission_create_dropdown: {
			type: Boolean,
			default: false,
		},
		ask_selectable: {
			type: Boolean,
			default: false,
		},
		emitir_setSelected_al_inicio: {
			type: Boolean,
			default: false,
		},
		/**
		 * Permite controlar externamente el item activo.
		 * Se utiliza como fallback de sincronización visual cuando un padre
		 * necesita forzar el tab activo sin click manual del usuario.
		 */
		selected_item_value: {
			type: [String, Number],
			default: null,
		},
		/**
		 * Si true, badge de filtrado y reinicio afectan solo papelera/{model_name} (resultados papelera).
		 */
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	created() {
		if (!this.set_view && !this.set_sub_view && !this.set_sub_sub_view) {
			if (this.selected_item_value !== null && this.selected_item_value !== '') {
				this.selected_item = this.routeString(this.selected_item_value)
				return
			}
			if (typeof this.items != 'undefined' && this.items && this.items.length && !this.selected_item) {
				this.select(this.items[0])
			}
		}
	},
	data() {
		return {
			selected_item: null,
			/* true cuando el ancho de los ítems supera el contenedor y hace falta scroll horizontal */
			has_horizontal_scroll: false,
		}
	},
	computed: {
		is_selecteable: {
			get() {
				return this.$store.state[this.model_name].is_selecteable
			},
			set(value) {
				this.$store.commit(this.model_name+'/setIsSelecteable', value)
				if (!this.is_selecteable) {
					this.$store.commit(this.model_name+'/setSelected', [])
				}
			},
		},
		can_filter_modal() {
			if (this.show_filter_modal) {
				if (this.check_permissions) {
					return this.can(this.model_name+'.index')
				}
				return true 
			}
			return false
		},
		can_create() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.store')
			}
			return true 
		},
		selected() { 
			if (this.set_view) {
				return this.view
			}
			if (this.set_sub_view) {
				return this.sub_view
			}
			if (this.set_sub_sub_view) {
				return this.sub_sub_view
			}
			return this.selected_item
		},
		is_filtered() {
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].is_filtered
			}
			return this.$store.state[this.model_name].is_filtered
		},
		/**
		 * Cantidad de registros cargados en el resultado del filtro de la papelera (páginas acumuladas con “ver más”).
		 */
		cantidad_filtrados_papelera() {
			if (!this.papelera || !this.model_name) {
				return 0
			}
			let filtrados = this.$store.state.papelera[this.model_name].filtered
			return filtrados ? filtrados.length : 0
		},
		_prop_name() {
			if (this.prop_name) {
				return this.prop_name
			}
			if (this.idiom == 'es') {
				return 'nombre'
			}
			return 'name'
		}
	},
	watch: {
		/**
		 * Sincroniza visualmente el item activo cuando cambia la selección externa.
		 */
		selected_item_value: {
			handler(value) {
				if (value !== null && value !== '') {
					this.selected_item = this.routeString(value)
				}
			},
		},
		/**
		 * Recalcula si hace falta scroll cuando cambia la cantidad o el texto de los ítems.
		 */
		items: {
			handler() {
				this.schedule_horizontal_scroll_check()
			},
			deep: true,
		},
	},
	mounted() {
		this.schedule_horizontal_scroll_check()
		window.addEventListener('resize', this.on_window_resize_for_horizontal_nav)
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.on_window_resize_for_horizontal_nav)
		if (this.horizontal_scroll_check_timeout) {
			clearTimeout(this.horizontal_scroll_check_timeout)
		}
	},
	methods: {
		/**
		 * Programa la verificación de overflow tras el próximo render del DOM.
		 */
		schedule_horizontal_scroll_check() {
			this.$nextTick(() => {
				this.update_horizontal_scroll_state()
			})
		},
		/**
		 * Revalida el overflow cuando cambia el tamaño de la ventana.
		 */
		on_window_resize_for_horizontal_nav() {
			if (this.horizontal_scroll_check_timeout) {
				clearTimeout(this.horizontal_scroll_check_timeout)
			}
			/* Evita recalcular en cada pixel del resize */
			this.horizontal_scroll_check_timeout = setTimeout(() => {
				this.update_horizontal_scroll_state()
			}, 100)
		},
		/**
		 * Detecta si los ítems desbordan el contenedor y activa espacio para la barra de scroll.
		 */
		update_horizontal_scroll_state() {
			let horizontal_nav = this.$refs.horizontal_nav
			if (!horizontal_nav) {
				this.has_horizontal_scroll = false
				return
			}
			/* Tolerancia de 1px por redondeos de subpíxeles en distintos navegadores */
			this.has_horizontal_scroll = horizontal_nav.scrollWidth > (horizontal_nav.clientWidth + 1)
		},
		filterModal() {
			this.$bvModal.show('filter-modal')
			setTimeout(() => {
				document.getElementById('search-modal-'+this.propsToFilterInModal(this.model_name)[0].key).focus()
			}, 300)
		},
		restartSearch() {
			let prefix = this.papelera ? ('papelera/' + this.model_name + '/') : (this.model_name + '/')
			this.$store.commit(prefix + 'setIsFiltered', false)
			this.$store.commit(prefix + 'setFiltered', [])
			this.$store.commit(prefix + 'setFilterPage', 1)
			this.$store.commit(prefix + 'setTotalFilterPages', null)
			this.$store.commit(prefix + 'setTotalFilterResults', 0)
		},
		setDisplay(display) {
			this.$emit('setDisplay', display)
		},
		itemName(item) {
			return this.capitalize(this.value(item))
		},
		select(item) {
			if (this.emitir_setSelected_al_inicio) {
				this.$emit('setSelected', item)
			}
			if (item.is_for_create) {
				this.setModel(null, item.is_for_create, this.modelPropertiesFromName(item.is_for_create))
				return
			}
			if (item.is_for_filter) {
				this.$bvModal.show('filter')
				return
			}
			if (item.is_for_modal) {
				this.$bvModal.show(item.is_for_modal)
				return
			}
			if (this.set_view) {
				if (this.view != this.routeString(this.routeValue(item))) {
					this.$router.push({params: {view: this.routeString(this.routeValue(item))}})
					this.callMethods(item, true)
				} else {
					this.callMethods(item)
				}
			}  
			if (this.set_sub_view) {
				if (this.sub_view != this.routeString(this.routeValue(item))) {
					this.$router.push({params: {method: this.method, sub_view: this.routeString(this.routeValue(item))}})
					this.callMethods(item, true)
				} else {
					this.callMethods(item)
				}
			} 
			if (this.set_sub_sub_view) {
				if (this.sub_sub_view != this.routeString(this.routeValue(item))) {
					this.$router.push({params: {method: this.method, sub_sub_view: this.routeString(this.routeValue(item))}})
					this.callMethods(item, true)
					console.log('se puso sub_sub_view, sub_sub_view: '+this.routeString(this.routeValue(item)))
				} else {
					this.callMethods(item)
				}
			} 

			/* Guarda el valor normalizado para que el estado `active` sea consistente. */
			this.selected_item = this.routeString(this.routeValue(item))
			if (!this.emitir_setSelected_al_inicio) {
				this.$emit('setSelected', item)
			}
		},
		callMethods(item, only_if_empty = false) {
			if (item.action) {
				this.$store.dispatch(item.action)
			}
			if (item.call_models) {
				const store_slice = this.$store.state[item.call_models]
				const has_models = store_slice && store_slice.models && store_slice.models.length
				const pdf_profiles_incomplete = item.call_models === 'pdf_column_profile'
					&& store_slice
					&& !store_slice.all_profiles_loaded
				if (!only_if_empty || !has_models || pdf_profiles_incomplete) {
					this.$store.dispatch(item.call_models + '/getModels')
				}
			} 
			if (item.commit) {
				item.commit.forEach(commit => {
					this.$store.commit(commit)
				})
			}
			if (item.view) {
				this.$store.commit(this.model_name+'/setView', item.view)
				this.$store.dispatch(this.model_name+'/getModels')
			}
		},
		value(item) {
			return item[this._prop_name]
		},
		routeValue(item) {
			if (item.route_value) {
				return item.route_value
			}
			return item[this._prop_name]
		},
		isActive(item) {
			if (this.selected) {
				if (this.selected+''.toLowerCase() == this.routeString(this.routeValue(item))) {
					return 'active'
				}
			} 
		},
	}
}
</script>
<style scoped lang="sass">
@import '@/sass/_custom.scss'
.cont-navs
	display: flex
	flex-wrap: wrap
	align-items: center
	// padding: 1em 0 0
	justify-content: space-between
	width: 100%

	.cont-left
		display: flex
		flex-direction: row
		justify-content: flex-start
		align-items: center
		flex-wrap: wrap
		max-width: 100%
		.cont-buttons
			display: flex 
			flex-direction: row 
			justify-content: flex-start

		& > div 
			margin-top: 15px
/* Pista gris segmentada (mismo estilo que impl-detail-tab-bar en admin Implementations) */
.horizontal-nav
	width: 100%
	display: flex
	gap: 6px
	padding: 4px
	overflow-x: auto
	overflow-y: hidden
	background-color: #E3E3E3
	border-radius: 8px
	transition: padding-bottom 0.12s ease

	/* Solo cuando hay overflow: reserva espacio al interactuar para que la barra no tape los ítems */
	&.has_horizontal_scroll:hover,
	&.has_horizontal_scroll:focus-within
		padding-bottom: 14px

	@media screen and (max-width: 576px)
		-webkit-scrollbar 
			-ms-overflow-style: none
			scrollbar-width: none
			display: none !important
			
		-ms-overflow-style: none
		scrollbar-width: none

	.buttons 
		display: flex

	/* Pestaña inactiva: texto secundario sobre fondo transparente */
	.item
		border: none
		border-radius: 6px
		padding: 8px 12px
		cursor: pointer
		font-size: 0.875rem
		font-weight: 500
		line-height: 1.25
		color: #6c757d
		background-color: transparent
		white-space: nowrap
		transition: color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease

		&:hover:not(.active)
			color: #0d6efd
			background-color: #e7f1ff

		&:focus,
		&:focus-visible
			box-shadow: none
			outline: none

		&:focus-visible
			outline: 2px solid #0d6efd
			outline-offset: 2px

		/* Pestaña activa: relleno azul sólido como btn-primary */
		&.active
			color: #fff
			background-color: #0d6efd
			font-weight: 600
			box-shadow: 0 1px 2px rgba(13, 110, 253, 0.28)

			&:hover
				color: #fff
				background-color: #0b5ed7
</style>