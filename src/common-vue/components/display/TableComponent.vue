<template>
	<div
	class="m-t-15">
		<div
		v-if="!loading">
			<div
			v-if="models.length">
				<b-table
				class="s-2 b-r-1 animate__animated animate__fadeIn"
				head-variant="dark"
				responsive
				:striped="_striped"
				:fields="fields"
				:items="items"
				:hover="hover" 
				selectable 
				ref="tableComponent"
				:select-mode="_select_mode"
				:tbody-tr-class="rowClass"
				@row-selected="onRowSelected">
					<template 
					v-for="prop in properties"
					:style="'border: 6px solid red !important'"
					v-slot:[toCellName(prop.key)]="data">
						<vue-load-image
						v-if="isImageProp(prop) && imageUrl(models[data.index], prop)"
						class="img-fluid">
							<img 
							slot="image"
							:src="imageUrl(models[data.index], prop)">

					        <b-spinner
							slot="preloader"
					        variant="primary"></b-spinner>

							<div slot="error">Imagen no encontrada</div>

						</vue-load-image>


						<div
						v-else-if="showInput(prop, models[data.index])">
							<b-form-textarea
							v-if="prop.type == 'textarea'"
							:class="getInputSize(prop)"
							:placeholder="propertyText(models[data.index], prop)"
							v-model="models[data.index][prop.key]"></b-form-textarea>
							<b-form-input
							v-if="prop.type == 'text'"
							:class="getInputSize(prop)"
							:placeholder="propertyText(models[data.index], prop)"
							v-model="models[data.index][prop.key]"></b-form-input>
							<p
							v-if="prop.type == 'checkbox'">
								<span
								v-if="models[data.index][prop.key]">
									Si
								</span>
								<span
								v-else>
									No
								</span>
							</p>
						</div>
						<b-button
						v-else-if="showProperty(prop, models[data.index]) && prop.button"
						:variant="prop.button.variant"
						@click="callMethod(prop, models[data.index])">
							<i
							v-if="prop.button.icon"
							:class="'icon-'+prop.button.icon"></i>
							<span
							v-else-if="prop.button.button_text">
								{{ prop.button.button_text }}
							</span>
							<span
							v-else>
								{{ propertyText(models[data.index], prop) }}
							</span>
						</b-button>
						<span
						:class="width(prop)"
						v-else>
							<span
							v-if="prop.from_pivot">
								{{ propertyText(models[data.index].pivot, prop) }}
							</span>
							<span
							v-else>
								{{ propertyText(models[data.index], prop) }}
							</span>
						</span>
					</template>

					<template #cell(updated_at)="data">
						<span>
							{{ date(models[data.index].updated_at) }}
						</span>
					</template>

					<!-- <template 
					v-for="(prop, index) in propsToSet()"
					v-slot:[toCellName(prop.key)]="data">
						<table-pivot-props-to-set
						:prop="prop"
						:model="models[data.index]"></table-pivot-props-to-set>
					</template> -->

					<template #cell(pivot_created_at)="data">
						<span
						v-if="models[data.index].pivot">
							{{ date(models[data.index].pivot.created_at) }}
						</span>
					</template>


					<template #cell(edit)="data">
						<div class="cont-edit">
							<slot 
							name="btn-edit"
							:model="models[data.index]"></slot>
							<div
							class="cont-pivot-inputs"
							v-if="pivot && pivot.properties_to_set">
								<div
								v-for="(prop, index) in propsToSet()">
									<b-form-group
									v-if="prop.type == 'text' || prop.type == 'textarea' || prop.type == 'number' || prop.type == 'select' || prop.type == 'checkbox' || prop.type == 'date'"
									:key="'pivot-prop-'+index"
									class="pivot-input"
									:label="propText(prop)">
										<p
										v-if="prop.only_show">
											{{ propertyText(models[data.index], prop, true) }}
										</p>
										<div
										v-else>
											<b-form-textarea
											:class="getInputSize(prop)"
											v-if="prop.type == 'textarea'"
											:type="prop.type"
											:placeholder="'Ingrese '+propText(prop)"
											v-model="models[data.index].pivot[prop.key]"></b-form-textarea>
											<b-form-select
											v-else-if="prop.type == 'select'"
											v-model="models[data.index].pivot[prop.key]"
											:class="getInputSize(prop)"
											:options="getOptions({key: prop.key, text: propText(prop), select_prop_name: prop.select_prop_name})"></b-form-select>
											<b-form-checkbox
											v-else-if="prop.type == 'checkbox'"
											:value="1"
											:unchecked-value="0"
											v-model="models[data.index].pivot[prop.key]">
											</b-form-checkbox>
											<b-form-input
											v-else
											:type="prop.type"
											:class="getInputSize(prop)"
											:placeholder="'Ingrese '+propText(prop)"
											v-model="models[data.index].pivot[prop.key]"></b-form-input>
										</div>
									</b-form-group>
									<b-button
									v-else-if="prop.type == 'button'"
									@click="callMethod(prop, models[data.index])"
									variant="primary"
									size="sm">
										{{ propText(prop) }}
									</b-button>
									<div
									v-else-if="prop.function">
										<p>
											{{ prop.text }}
										</p>
										{{ getFunctionValue(prop, models[data.index]) }}
									</div>
								</div>
							</div>
							<slot :model="models[data.index]"></slot>
						</div>
					</template>
				</b-table>
				<!-- <btn-add-to-show
				:model_name="model_name"></btn-add-to-show> -->
			</div>
			<p 
			v-else-if="!models.length && model_name && (!is_mobile || downloadOnMobile(model_name))"
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay {{ plural(model_name) }}
			</p>
			<div
			v-else>
				<p 
				class="text-with-icon">
					<i class="icon-exclamation"></i>
					No se descargaron {{ plural(model_name) }} para optimizar el rendimiento en este dispositivo
				</p>
				<p>
					Si lo prefiere, puede descargarlos
				</p>
				<b-button
				@click="download"
				block
				variant="primary">
					Descargar {{ plural(model_name) }}
				</b-button>
			</div>
		</div>
		<b-skeleton-table
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		v-else
		:rows="10" 
		:columns="columns"
		:table-props="skeleton_props"
		></b-skeleton-table>
	</div>
</template>
<script>
import VueLoadImage from 'vue-load-image'
import BtnAddToShow from '@/common-vue/components/BtnAddToShow'

export default {
	components: {
		VueLoadImage,
		BtnAddToShow,
		TablePivotPropsToSet: () => import('@/common-vue/components/display/TablePivotPropsToSet'),
	},
	props: {
		loading: {
			type: Boolean,
			default: false,
		},
		models: Array,
		model_name: {
			type: String,
			default: null,
		},
		properties: {
			type: Array,
			default() {
				return require('@/models/'+this.model_name).default.properties
			}
		},
		set_model_on_row_selected: {
			type: Boolean,
			default: true,
		},
		on_click_set_property: String,
		pivot: {
			type: Object,
			default: null,
		},
		pivot_model: {
			type: Object,
			default: null,
		},
		set_selected_models: {
			type: Boolean,
			default: true,
		},
		selected_index: {
			type: Number,
			default: 0,
		},
		select_mode: {
			type: String,
			default: null,
		},
		has_many_parent_model: {
			type: Object,
			default: null,
		},
		striped: {
			type: Boolean,
			default: true,
		},
		// Se usa porque en search modal se autoselecciona la primer fila y se s
		is_from_search_modal: {
			type: Boolean,
			default: false,
		},
		show_pivot_created_at: {
			type: Boolean,
			default: false,
		},
		show_created_at: {
			type: Boolean,
			default: true,
		},
		hover: {
			type: Boolean,
			default: true
		},
	},
	data() {
		return {
			last_selection: [],
			is_from_keydown: false,
		}
	},
	watch: {
		selected_index() {
			console.log('watch selected_index')
			if (this.selected_index != -1 && this.selected_index <= (this.items.length - 1)) {
				this.is_from_keydown = true
				this.$refs.tableComponent.selectRow(this.selected_index)
				setTimeout(() => {
					this.is_from_keydown = false
				}, 200)
				console.log('se selecciono la fila '+this.selected_index)
			}
		},
	},
	computed: {
		skeleton_props() {
			if (this.theme_dark) {
				return { bordered: false, striped: false }
			}
			return { bordered: true, striped: true }
		},
		_striped() {
			if (!this.striped) {
				return false
			}
			if (this.app_theme == 'light') {
				return true
			}
			return false
		},
		columns() {
			let props = this.propertiesToShow(this.properties, true)
			if (props.length) {
				if (props.length > 6) {
					return 6
				}
				return props.length
			}
			return 2
		},
		_select_mode() {
			if (this.model_name) {
				let is_selecteable = this.$store.state[this.model_name].is_selecteable
				if (this.select_mode === null) {
					if (typeof is_selecteable != 'undefined') {
						if (is_selecteable) {
							return 'multi'
						}
					}
					return 'single'
				} 
			}
			return this.select_mode
		},
		fields() {
			let fields = []
			this.propertiesToShow(this.properties, true).forEach(prop => {
				fields.push({
					key: prop.key,
					label: this.propText(prop, true, true),
					sortable: prop.sortable,
				})
			})

			if (this.show_created_at) {
				fields.push({
					key: 'updated_at',
					label: 'Actualizado',
				})
			}

			if (this.show_pivot_created_at) {
				fields.push({
					key: 'pivot_created_at',
					label: 'Agregado',
				})
			}
			// if (this.pivot && this.pivot.properties_to_set) {
			// 	this.pivot.properties_to_set.forEach(prop => {
			// 		fields.push({
			// 			key: prop.key,
			// 			function: prop.function,
			// 			button: prop.button,
			// 			label: prop.text,
			// 		})
			// 	})
			// }
			fields.push({
				key: 'edit',
				label: '',
			})
			return fields 
		},
		items() {
			let items = []
			let index = 0
			let item = {}
			this.models.forEach(model => {
				item = {}
				item.id = model.id
				this.propertiesToShow(this.properties).forEach(prop => {
					if (prop.function) {
						item[prop.key] = this.getFunctionValue(prop, model)
					} else if (prop.key) {
						item[prop.key] = this.propertyText(model, prop)
					}
				})
				item._rowVariant = this.getColor(model)
				items.push(item)
			})
			return items
		},
	},
	methods: {
		rowClass(item, type) {
			if (this.model_name && this.hasColor(this.model_name)) {
				return this[this.model_name+'GetColor'](this.models.find(model => model.id == item.id))
			}
		},
		download() {
			this.$store.dispatch(this.model_name+'/getModels')
		},
		width(prop) {
			if (prop.table_width && prop.table_width == 'lg') {
				return 'width-300'
			}
			return ''
		},
		getColor(model) {
			if (this.model_name) {
				let prop = this.getBorderColorProperty(this.model_name)
				if (prop && model[this.modelNameFromRelationKey(prop)]) {
					let color = model[this.modelNameFromRelationKey(prop)].color 
					console.log(color.variant)
					return color.variant 
				}
			}
			return ''
		},
		onRowSelected(items) {
			console.log('items.length: '+items.length)
			if (!this.is_from_keydown) {
				if (this._select_mode == 'single' && items.length) {
					console.log(1)
					let model = this.models.find(_model => {
						return _model.id == items[0].id
					})
					this.$emit('onRowSelected', model)
					if (this.set_model_on_row_selected) {
						this.$refs.tableComponent.clearSelected()
						this.setModel(model, this.model_name)
					}
				} else if (this._select_mode == 'single' && !items.length) {
					this.$emit('onRowSelected', this.models[0])
				} else if (this._select_mode == 'multi' && !this.isTheSameSelection(items) && !this.is_from_keydown) {
					console.log(2)
					if (this.set_selected_models) {
						let items_to_set = []
						let item_to_add = []
						items.forEach(item => {
							item_to_add = this.models.find(_model => _model.id == item.id)
							items_to_set.push(item_to_add)
						})
						this.$store.commit(this.model_name+'/setSelected', items_to_set)
					}
					this.last_selection = items
				}
			}
		},
		isTheSameSelection(items) {
			if (this.last_selection.length == items.length) {
				return true 
			} else {
				return false
			}
		},
		propsToSet() {
			let props = []
			if (this.pivot) {
				this.pivot.properties_to_set.forEach(prop => {
					if (!prop.can || (prop.can && this.can(prop.can))) {
						if (prop.from_store) {
							let models = this.modelsStoreFromName(prop.store)
							models.forEach(model => {
								props.push({
									type: prop.type,
									text: model.name,
									key: prop.store+'_'+model.id,
									size: prop.size,
								})
							})
						} else {
							props.push(prop)
						}
					}
				})
			}
			return props 
		},	
		toCellName(slot) {
			return `cell(${slot})`
		},
		showInput(prop, model) {
			if (prop.show_in_input_if) {
				if (prop.show_in_input_if[1] == '<') {
					return model[prop.show_in_input_if[0]] < prop.show_in_input_if[2] 
				} else if (prop.show_in_input_if[1] == '=') {
					return model[prop.show_in_input_if[0]] == prop.show_in_input_if[2] 
				} else if (prop.show_in_input_if[1] == '>') {
					return model[prop.show_in_input_if[0]] > prop.show_in_input_if[2] 
				}
			}
		},
		showBtn(prop, model) {
			return prop.button_to
		},
		// clicked(model) {
		// 		console.log(1)
		// 	if (this.set_model_on_row_selected) {
		// 		console.log(2)
		// 		if (this.on_click_set_property) {
		// 			this.setModel(model[this.on_click_set_property], this.model_name, this.properties)
		// 		} else {
		// 			if (this.has_many_parent_model) {
		// 				this.$store.commit(this.model_name+'/setSelectedModel', this.has_many_parent_model)
		// 			}
		// 			this.setModel(model, this.model_name, this.properties)
		// 		}
		// 	} else {
		// 		console.log(3)
		// 		this.$emit('clicked', model)
		// 	}
		// },
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.table 
	// background: #FFF
	img 
		width: 100px
	input, textarea
		width: 200px
	th, td 
		white-space: wrap
		text-align: left
		@if ($table_font_small)
			font-size: 1em
			padding: 5px !important
		span 
			white-space: wrap

	tr
		@if ($theme == 'dark')
			color: rgb(189, 189, 189)
			&:hover, &:active 
				border: 2px solid $blue !important
				& > td 
					color: rgb(189, 189, 189) !important
					background-color: rgba(0,0,0,.8) !important
 
		@else
			color: #000
			&:hover, &:active 
				border: 2px solid $blue !important
				& > td 
					color: #000 !important
					background-color: #999999 !important

	.b-table-row-selected 
		border: 2px solid $blue !important
		td 
			@if ($theme == 'dark')
				color: rgb(189, 189, 189) !important
				background-color: rgba(0,0,0,.8) !important
			@else 
				// color: rgb(189, 189, 189) !important
				background-color: #999999 !important


	// th, td 
	// 	white-space: nowrap
	// 	font-weight: bold
	// 	text-align: left
		
		th 
			padding: 10px 15px
			font-size: 17px
			position: sticky
			top: 0px
			@if ($theme == 'dark')
				color: rgb(189, 189, 189)
				background: #2C2C2C
				border-right: 1px solid rgba(255,255,255,.2)
				border-bottom: 1px solid rgba(255,255,255,.2)
				&:last-child(2)
					border-right: 0 !important
			@else
				background: rgb(189, 189, 189)


		td 
			padding: 5px 15px
			line-height: 25px
			@if ($theme == 'dark')
				background: #3E3E3E
				border-bottom: 1px solid rgba(255,255,255,.2)
			@else
				background: rgb(189, 189, 189)
				

	.width-300
		display: inline-block
		width: 300px

	.cont-edit 
		display: flex
		flex-direction: row
		justify-content: center
		align-items: center
		.cont-pivot-inputs
			display: flex
			& > div
				margin-left: 1em
				display: flex
				flex-direction: column
				align-items: center
				justify-content: center
			// .pivot-input
			// 	width: 200px
	.input-sm 
		width: 70px !important
	.input-md 
		width: 150px !important
	.input-lg
		width: 300px !important
</style>