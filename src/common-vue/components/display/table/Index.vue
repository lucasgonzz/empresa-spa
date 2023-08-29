<template>
	<div>
		<div
		:id="id"
		v-if="!loading"
		class="cont-table">
			<table
			v-if="models_to_show.length"
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
									variant="danger"
									class="m-l-10">
										{{ list.models.length }}
									</b-badge>
								</td>
							</tr>	
							<tr-component
							v-for="model in list.models"
							:model="model"
							:pivot="pivot"
							:select_mode="_select_mode"
							:model_name="model_name"
							:props="props"
							:set_model_on_row_selected="set_model_on_row_selected">
								<template v-slot:table_right_options="slotProps">
									<slot name="table_right_options" :model="model"></slot>
								</template>
							</tr-component>
						</template>
					</template>
					<template
					v-else>
						<tr-component
						v-for="(model, i) in models_to_show"
						:key="i"
						:model="model"
						:pivot="pivot"
						:select_mode="_select_mode"
						:model_name="model_name"
						:props="props"
						:set_model_on_row_selected="set_model_on_row_selected"
						:cont_table_id="id">
							<template v-slot:table_right_options="slotProps">
								<slot name="table_right_options" :model="model"></slot>
							</template>
						</tr-component>

						<div 
						v-if="busy">
							Cargando...
						</div>

						<div v-infinite-scroll="loadMore" infinite-scroll-disabled="busy" infinite-scroll-distance="10"></div>
					</template>
				</tbody>
			</table>
			<p 
			v-else
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay {{ plural(model_name) }}
			</p>
			<div 
			v-if="models_to_show.length && show_buttons_scroll"
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
			</div>
		</div>
		<b-skeleton-table
		class="s-2 b-r-1 animate__animated animate__fadeIn"
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
		models: Array,
		loading: Boolean,
		model_name: String,
		set_model_on_click: Boolean,
		on_click_set_property: String,
	},
	created() {
		this.setHeight()
	},
	data() {
		return {
			index_to_show: 1,
			busy: false,
			show_buttons_scroll: false,
		}
	},
	computed: {
		models_to_show() {
			let to_show = this.models.slice(0, (this.cant_models_to_show * this.index_to_show))
			return to_show
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
						props.push(prop_to_show)
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
						props.push({
							...prop_to_set,
							is_pivot_prop: true,
						})
					})
				}
			} else {
				props.push({
					key: 'updated_at',
					text: 'Actualizado',
					is_date: true,
				})
			}
			console.log('props')
			console.log(props)
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
			let props = this.propertiesToShow(this.properties, true)
			if (props.length) {
				if (props.length > 6) {
					return 6
				}
				return props.length
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
						return _model[this.order_list_by+'_id'] == model.id 
					})
					lists.push(list)
				})
				return lists
			} 
		},
	},
	watch: {
		loading() {
			console.log('watch loading y setHeight')
			this.setHeight()
		}
	},
	methods: {
		scrollLeft() {
			let table = document.getElementById(this.id)
			table.scrollLeft -= 300
		},
		scrollRight() {
			let table = document.getElementById(this.id)
			table.scrollLeft += 300
		},
		loadMore($state) {
			console.log('loadMore')
			if (this.models_to_show.length < this.models.length) {
				console.log('entro loadMore')
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
						console.log('window: '+window.innerHeight)
						console.log('table_top: '+table.offsetTop)
						console.log(window.innerHeight - table.offsetTop +'px')
						let height = window.innerHeight - (Number(table.offsetTop))
						// height -= 50
						if (this.table_height_para_restar) {
							height -= this.table_height_para_restar
						}
						table.style.height = height +'px'
						// table.style.max_height = height +'px'

						this.setShowButtonsScroll()
					}, 500)
				} else {
					setTimeout(() => {
						console.log('no estaba la tabla, voy a llamar denuvo a setHeight')
						this.setHeight()
					}, 300)
				}
			}
		},
		setShowButtonsScroll() {
			let cont_table =  document.getElementById(this.id)
			let table = cont_table.firstChild
			console.log('cont_table: '+cont_table.width)
			console.log('table: '+table.offsetWidth)
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
				background: #f1f3f4


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
		position: absolute 
		bottom: 40px
		right: 40px
		display: flex 
		flex-direction: row 
		justify-content: center 
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
		width: 98% !important
		max-height: 50vh
		// margin-left: -15px
		margin-top: 15px

</style>