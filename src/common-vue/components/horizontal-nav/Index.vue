<template>
	<div
	class="cont-navs">
		<div
		class="cont-left">
			<div 
			v-if="items"
			class="horizontal-nav">
				<div
				class="item apretable"
				v-for="(item, i) in items"
				:key="i"
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
			class="cont-buttons create-buttons">
				<slot name="btn_create">
					<excel-drop-down
					v-if="show_excel_drop_down"
					:check_permissions="check_permissions"
					:can_create="can_create"
					:model_name="model_name"></excel-drop-down>

					<btn-create
					v-else-if="show_btn_create && can_create"
					:with_margin="false"
					:block="false"
					:model_name="model_name"></btn-create>
				</slot>
			</div>

			<div
			class="align-center m-l-15 m-t-15 m-sm-t-0"
			v-if="ask_selectable">
				<b-form-checkbox
				:unchecked-value="false"
				:value="true"
				v-model="is_selectable">
					Seleccion multiple
				</b-form-checkbox>
			</div>

			<options-dropdown
			v-if="show_filter_modal"
			:model_name="model_name">
				<template #options_drop_down>
					<slot name="options_drop_down"></slot>
				</template>
			</options-dropdown>
			
			<slot name="horizontal_nav_center"></slot>
		</div>
 
		
		<display-nav
		v-if="show_display"
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
		OptionsDropdown: () => import('@/common-vue/components/horizontal-nav/options-dropdown/Index'),
	},
	props: {
		items: Array,
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
		ask_selectable: {
			type: Boolean,
			default: false,
		},
	},
	created() {
		if (!this.set_view && !this.set_sub_view) {
			if (typeof this.items != 'undefined' && this.items && this.items.length && !this.selected_item) {
				this.select(this.items[0])
			}
		}
	},
	data() {
		return {
			selected_item: null,
		}
	},
	computed: {
		is_selectable: {
			get() {
				return this.$store.state[this.model_name].is_selectable
			},
			set(value) {
				this.$store.commit(this.model_name+'/setIsSelecteable', value)
				if (!this.is_selectable) {
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
			return this.selected_item
		},
		is_filtered() {
			return this.$store.state[this.model_name].is_filtered 
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
	methods: {
		filterModal() {
			this.$bvModal.show('filter-modal')
			setTimeout(() => {
				document.getElementById('search-modal-'+this.propsToFilterInModal(this.model_name)[0].key).focus()
			}, 300)
		},
		restartSearch() {
			this.$store.commit(this.model_name+'/setIsFiltered', false)
			this.$store.commit(this.model_name+'/setFiltered', [])
		},
		setDisplay(display) {
			this.$emit('setDisplay', display)
		},
		itemName(item) {
			return this.capitalize(this.value(item))
		},
		select(item) {
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
			this.selected_item = item.name
			this.$emit('setSelected', item)
		},
		callMethods(item, only_if_empty = false) {
			if (item.action) {
				this.$store.dispatch(item.action)
			}  
			if (item.call_models && (!only_if_empty || !this.$store.state[item.call_models].models.length)) {
				this.$store.dispatch(item.call_models+'/getModels')
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
				if (this.selected.toLowerCase() == this.routeString(this.routeValue(item))) {
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
	padding: 1em 0 0
	justify-content: space-between
	width: 100%

	.cont-left
		display: flex
		flex-direction: row
		justify-content: flex-start
		flex-wrap: wrap
		max-width: 100%
		.cont-buttons
			display: flex 
			flex-direction: row 
			justify-content: flex-start
.horizontal-nav
	width: 100%
	display: flex
	overflow-x: scroll
	overflow-y: hidden
	padding-bottom: 5px
	@media screen and (max-width: 576px)
		&::-webkit-scrollbar 
			-ms-overflow-style: none
			scrollbar-width: none
			display: none
	.buttons 
		display: flex

	.item
		border-bottom: 3px solid lighten($blue, 30)
		padding: 5px 15px
		cursor: pointer
		border-radius: 4px 4px 0 0
		transition: all .2s
		font-size: 1em
		white-space: nowrap 
		@if ($theme == 'dark') 
			color: rgba(255, 255, 255, .8) !important
		@else 
			color: rgba(0, 0, 0, .6) !important

	.active 
		font-weight: bold
		border-bottom: 3px solid $blue
		@if ($theme == 'dark') 
			color: #fff !important
		@else 
			color: #000 !important
</style>