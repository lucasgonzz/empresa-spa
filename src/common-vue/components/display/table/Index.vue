<template>
	<div>
		<div
		:id="id"
		v-if="!loading"
		class="cont-table">
			<table
			v-if="models.length"
			class="common-table">
				<thead>
					<tr>
						<th
						v-for="field in fields">
							{{ field.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<template
					v-if="order_list_by">
						<template
						v-for="list in lists">
							<tr
							class="list-title">
								<td
								:colspan="props.length + 2">
									{{ list.name }} 
									<b-badge
									v-if="list.models.length"
									variant="danger"
									class="m-l-10">
										{{ list.models.length }}
									</b-badge>
								</td>
							</tr>	
							<tr-component
							v-for="model in list.models"
							@onRowSelected="onRowSelected"
							:model="model"
							:pivot="pivot"
							:select_mode="_select_mode"
							:model_name="model_name"
							:props="props"
							:set_model_on_row_selected="set_model_on_row_selected">
								<template v-slot:table_right_options="slotProps">
									<slot name="table_right_options" :model="model"></slot>
								</template>
								<template
								v-for="prop in properties"
								v-slot:[prop.key]>
									<slot :model="model" :name="'table-prop-'+prop.key"></slot>
								</template>
							</tr-component>
						</template>
					</template>
					<template
					v-else>
						<tr-component
						v-for="(model, i) in models"
						:key="i"
						:model="model"
						:pivot="pivot"
						:select_mode="_select_mode"
						:model_name="model_name"
						:props="props"
						@onRowSelected="onRowSelected"
						:set_model_on_row_selected="set_model_on_row_selected"
						:cont_table_id="id">
							<template v-slot:table_right_options="slotProps">
								<slot name="table_right_options" :model="model"></slot>
							</template>
							<template
							v-for="prop in properties"
							v-slot:[prop.key]>
								<slot :model="model" :name="'table-prop-'+prop.key"></slot>
							</template>
						</tr-component>

						<!-- <div 
						v-if="busy">
							Cargando...
						</div>

						<div v-infinite-scroll="loadMore" infinite-scroll-disabled="busy" infinite-scroll-distance="10"></div> -->
					</template>
				</tbody>
				<slot name="btn_add_to_show"></slot>
			</table>
			<p 
			v-else
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay {{ plural(model_name) }}
			</p>
			<!-- <div 
			v-if="models.length && show_buttons_scroll"
			class="scroll-buttons">
				<div 
				@click="scrollLeft"
				class="scroll-button">
					<i class="icon-left"></i>
				</div>
				<div 
				@click="scrollRight"
				class="scroll-button">
					<i class="icon-right"></i>
				</div>
			</div> -->
		</div>
		<b-skeleton-table
		class="s-2 b-r-1 m-t-15 animate__animated animate__fadeIn"
		v-else
		:rows="10" 
		:columns="columns"
		:table-props="{ bordered: true, striped: true }"
		></b-skeleton-table>
	</div>
</template>
<script>
import infiniteScroll from 'vue-infinite-scroll'
export default {
	directives: {infiniteScroll},
	components: {
		TrComponent: () => import('@/common-vue/components/display/table/Tr'),
	},
	props: {
		properties: {
			type: Array,
			default: null
		},
		order_list_by: {
			type: String,
			default: null
		},
		order_list_from_pivot: {
			type: Boolean,
			default: false,
		},
		select_mode: {
			type: String,
			default: 'single',
		},
		set_model_on_row_selected: {
			type: Boolean,
			default: true,
		},
		pivot: {
			type: Object,
			default: null
		},
		table_height_para_restar: {
			type: Number,
			default: null
		},
		set_table_height: {
			type: Boolean,
			default: true,
		},
		show_actualizado: {
			type: Boolean,
			default: true,
		},
		models: Array,
		loading: Boolean,
		model_name: String,
		set_model_on_click: Boolean,
		on_click_set_property: String,
	},
	created() {
		this.setHeight()
		let that = this
		window.addEventListener('resize', function(event) {
			that.setHeight()
		}, true);
	},
	data() {
		return {
			index_to_show: 1,
			busy: false,
			show_buttons_scroll: false,
			intentos: 0,
		}
	},
	computed: {
		// models_to_show() {
		// 	let to_show = this.models.slice(0, (this.cant_models_to_show * this.index_to_show))
		// 	return to_show
		// },
		_select_mode() {
			if (this.model_name) {
				let is_selecteable = this.$store.state[this.model_name].is_selecteable
				if (typeof is_selecteable != 'undefined' && is_selecteable) {
					return 'multi'
				}
				return 'single'
			}
			return this.select_mode
		},
		id() {
			return Math.random()+'-'+this.model_name
		},
		props() {
			let props = []
			 if (this.properties) {
				props = this.propertiesToShow(this.properties, true)
			} else if (!this.pivot || (this.pivot && !this.pivot.props_to_show)) {
			 	props = this.propertiesToShow(this.modelPropertiesFromName(this.model_name), true)
			}
			if (this.pivot) {
				if (this.pivot.props_to_show) {
					this.pivot.props_to_show.forEach(prop_to_show => {

						if (prop_to_show.if_has_extencion) {

							if (this.hasExtencion(prop_to_show.if_has_extencion)) {

								props.push(prop_to_show)
							}
						} else {

							props.push(prop_to_show)
						}
					})
				}
				if (this.pivot.pivot_props_to_show) {
					this.pivot.pivot_props_to_show.forEach(prop_to_show => {
						props.push({
							...prop_to_show,
							is_pivot_prop: true,
							only_show: true,
						})
					})
				}
				if (this.pivot.properties_to_set) {
					this.pivot.properties_to_set.forEach(prop_to_set => {


						if (prop_to_set.if_has_extencion) {

							if (this.hasExtencion(prop_to_set.if_has_extencion)) {

								props.push({
									...prop_to_set,
									is_pivot_prop: true,
								})
							}
						} else {

							props.push({
								...prop_to_set,
								is_pivot_prop: true,
							})
						}
						
					})
				}
			} else if (this.show_actualizado) {
				props.push({
					key: 'updated_at',
					text: 'Actualizado',
					is_date: true,
				})
			}
			return props 
		},
		fields() {
			let fields = []
			this.props.forEach(prop => {
				fields.push({
					key: prop.key,
					label: this.propText(prop, true, true),
					sortable: prop.sortable,
				})
			})

			// if (!this.pivot) {
			// 	fields.push({
			// 		key: 'updated_at',
			// 		label: 'Actualizado',
			// 	})
			// } 
			// fields.push({
			// 	key: 'edit',
			// 	label: '',
			// })
			return fields 
		},
		columns() {
			// let props = this.propertiesToShow(this.properties, true)
			if (this.props.length) {
				if (this.props.length > 6) {
					return 6
				}
				return this.props.length
			}
			return 2
		},
		lists() {
			if (this.order_list_by) {
				let models_from_order_by = this.$store.state[this.order_list_by].models
				let lists = []
				let list
				models_from_order_by.forEach(model => {
					list = {}
					if (this.idiom == 'es') {
						list.name = model.nombre
					} else {
						list.name = model.name
					}
					list.models = this.models.filter(_model => {
						if (this.order_list_from_pivot) {
							return _model.pivot[this.order_list_by+'_id'] == model.id 
						} else {
							return _model[this.order_list_by+'_id'] == model.id 
						}
					})
					lists.push(list)
				})

				// Sin asignar
				list = {}
				list.name = 'Sin asignar'
				list.models = this.models.filter(_model => {
					if (this.order_list_from_pivot) {
						return _model.pivot[this.order_list_by+'_id'] == null || _model.pivot[this.order_list_by+'_id'] == 0
					} else {
						return _model[this.order_list_by+'_id'] == null || _model[this.order_list_by+'_id'] == 0 
					}
				})
				if (list.models.length) {
					lists.push(list)
				}
				return lists
			} 
		},
	},
	watch: {
		loading() {
			this.setHeight()
		}
	},
	methods: {
		onRowSelected(model) {
			this.$emit('onRowSelected', model)
		},
		scrollLeft() {
			let table = document.getElementById(this.id)
			table.scrollLeft -= 300
		},
		scrollRight() {
			let table = document.getElementById(this.id)
			table.scrollLeft += 300
		},
		loadMore($state) {
			if (this.models_to_show.length < this.models.length) {
				this.busy = true;

				setTimeout(() => {
					this.index_to_show++
					this.busy = false;
				}, 300);
			}
		},
		setHeight() {
			if (this.set_table_height && !this.loading) {
				let table = document.getElementById(this.id)
				if (table) {
					setTimeout(() => {
						let height = window.innerHeight - (Number(table.offsetTop))
						// height -= 50
						if (this.table_height_para_restar) {
							height -= this.table_height_para_restar
						}
						console.log('setHeight de '+this.model_name)
						if (height > 500) {
							console.log('aplicando height calculado de '+height)
							table.style.height = height +'px'
						} else {
							console.log('no se aplico height calculado de '+height)
							console.log('la tabla tiene height de '+table.style.height)

							if (table.style.height < 500) {
								console.log('se aplico height de 500')
								table.style.height = '500px'
							}
						}
						// table.style.max_height = height +'px'

						this.setShowButtonsScroll()
					}, 500)
				} else {
					this.volver_a_llamar_set_height()
				}
			} 
		},
		volver_a_llamar_set_height() {

			setTimeout(() => {
				if (this.intentos < 5) {
					this.intentos++
					this.setHeight()
				} 
			}, 300)
		},
		setShowButtonsScroll() {
			let cont_table =  document.getElementById(this.id)
			let table = cont_table.firstChild
			if (cont_table.offsetWidth < table.offsetWidth) {
				this.show_buttons_scroll = true 
			} else {
				this.show_buttons_scroll = false
			}
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.cont-table
	width: calc(100% + 30px)
	// display: inline-block
	overflow-y: scroll
	margin-left: -15px
	margin-top: 15px

	.b-skeleton-table
		@if ($theme == 'dark')
			background: rgba(0,0,0,.8)
		@else 
			background: rgba(255,255,255,.8)
	
	.common-table
		position: relative
		border-spacing: 0px
		width: 100%

		thead 
			position: relative
			z-index: 900

		thead, tbody 
			min-width: 100%

		tr 
			@if ($theme == 'dark')
				color: #f1f3f4
			@else
				color: #000

		th, td 
			// white-space: nowrap
			text-align: left
			
		th 
			white-space: nowrap
			padding: 10px 15px
			font-size: 17px
			position: sticky
			top: 0px
			font-weight: bold
			background: #2C2C2C
			color: #f1f3f4
			@if ($theme == 'dark')
				border-left: 1px solid rgba(255,255,255,.2)
				border-bottom: 1px solid rgba(255,255,255,.2)
				&:first-child
					border-left: 0 !important
				&:last-child
					border-left: 0 !important
			@else 
				border-bottom: 1px solid rgba(0,0,0,.6)


		td 
			padding: 5px 15px
			line-height: 25px
			font-size: 1em
			max-width: 500px
			&:last-child 
				white-space: nowrap
				max-width: 2000px
			@if ($theme == 'dark')
				background: #1d1d1d
				border-bottom: 1px solid rgba(255,255,255,.2)
				font-weight: bold
			@else
				border-bottom: 1px solid rgba(0,0,0,.2)
				// background: #f1f3f4
				background: #FFF 

		.list-title td
			position: sticky
			top: 46.5px
			text-align: left
			font-weight: bold
			margin-top: 15px
			z-index: 300
			@if ($theme == 'dark') 
				color: rgba(255,255,255,.9)
				background: #2C2C2C 
			@media screen and (max-width: 768px)
				padding-left: 15px	

		img 
			width: 100px

	.scroll-buttons
		position: relative 
		bottom: 40px
		right: 40px
		display: flex 
		flex-direction: row 
		justify-content: center 
		z-index: 2000
		.scroll-button	
			width: 30px
			height: 30px
			background: $blue 
			border-radius: 50%
			margin-right: 10px
			color: #FFF
			display: flex 
			flex-direction: row 
			justify-content: center 
			align-items: center 



.modal-content
	.cont-table
		width: 98% 
		max-height: 50vh
		// margin-left: -15px
		margin-top: 15px

</style>