<template>
	<div>
		<div
		:id="id"
		v-if="!loading"
		class="cont-table">

			<pagination
			v-if="!pivot"
			@filtrar="filtrar"
			:model_name="model_name"></pagination>	

			<table
			v-if="models.length"
			class="common-table">
				<thead>
					<tr>
						<th
						v-for="field in fields">

							<div class="cont-th">
								<span v-html="field.label"></span>

								<div
								v-if="!pivot && usar_filtros"
								class="cont-filter-buttons">
									
									<ordenar
									class="m-l-10"
									@filtrar="filtrar"
									:model_name="model_name"
									:key="field.key"
									:field="field"></ordenar>	

									<btn-filter
									:model_name="model_name"
									@toggleFilter="toggleFilter"
									:field="field"></btn-filter>
								</div>


								<filter-component
								v-if="!pivot && usar_filtros"
								@limpiar_show_filters="limpiar_show_filters"
								@filtrar="filtrar"
								v-show="show_filters[field.key]"
								:model_name="model_name"
								:field="field"></filter-component>
							</div>	
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
			v-else-if="show_empty_text"
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
		FilterComponent: () => import('@/common-vue/components/display/table/filter/Index'),
		Ordenar: () => import('@/common-vue/components/display/table/Ordenar'),
		BtnFilter: () => import('@/common-vue/components/display/table/BtnFilter'),
		Pagination: () => import('@/common-vue/components/display/table/pagination/Index'),
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
		show_empty_text: {
			type: Boolean,
			default: true,
		},
		usar_filtros: {
			type: Boolean,
			default: true,
		},
		add_created_at: {
			type: Boolean,
			default: false,
		},
	},
	created() {
		console.log('se creo tabla')
		this.setHeight()
		let that = this
		window.addEventListener('resize', function(event) {
			that.setHeight()
		}, true);

		this.set_fields()
	},
	data() {
		return {
			index_to_show: 1,
			busy: false,
			show_buttons_scroll: false,
			intentos: 0,
			fields: [],
			show_filters: {},
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
			console.log('calculando props')
			let props = []
			 if (this.properties) {
				props = this.propertiesToShow(this.properties, true)
			} else if (!this.pivot || (this.pivot && !this.pivot.props_to_show)) {
			 	props = this.propertiesToShow(this.modelPropertiesFromName(this.model_name), true)
				
				if (this.add_created_at) {

					props.push({
						key: 'created_at',
						text: 'Creado',
						type: 'date',
						is_date: true,
					})
					props.push({
						key: 'updated_at',
						text: 'Actualizado',
						type: 'date',
						is_date: true,
					})
				}
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
			} 

			props.push({
				key: 'table_right_options',
				text: '',
				no_usar_en_filtros: true,
			})
			
			return props 
		},
		// fields() {
		// 	let fields = []
		// 	this.props.forEach(prop => {
		// 		fields.push({
		// 			key: prop.key,
		// 			label: this.propText(prop, true, true),
		// 			sortable: prop.sortable,
		// 			type: prop.type_to_update ? prop.type_to_update : prop.type
		// 		})
		// 	})

		// 	return fields 
		// },
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
		},
		model_name() {
			this.set_fields()
		},
		props() {
			this.set_fields()
		},
		models() {
			this.setHeight()
		}
	},
	methods: {
		filtrar() {
			let filters = this.$store.state[this.model_name].filters
			let current_page = this.$store.state[this.model_name].filter_page
			console.log('filters:')
			console.log(filters)
			
			this.limpiar_show_filters()
			
			this.$store.commit('auth/setMessage', 'Filtrando '+this.plural(this.model_name))
			this.$store.commit('auth/setLoading', true)


			this.$api.post('search/'+this.model_name+'/null/1?page='+current_page, { 
				filters: filters
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)

				console.log('resultados::')
				console.log(res)

				if (res.data.data.length) {

					// this.$store.commit(this.model_name+'/setFilters', [])
					
					this.$store.commit(this.model_name+'/setIsFiltered', true) 
					this.$store.commit(this.model_name+'/setFiltered', res.data.data)
					this.$store.commit(this.model_name+'/setTotalFilterPages', res.data.last_page)
					this.$store.commit(this.model_name+'/setTotalFilterResults', res.data.total)
					// this.$store.commit(this.model_name+'/setFilterPage', 1)

					// this.local_field.igual_que = null;
					// this.local_field.que_contenga = null;
					// this.local_field.menor_que = null;
					// this.local_field.mayor_que = null;
				} else {

					this.$toast.error('No se encontraron resultados')
				}


			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al buscar')
			})
		},
		toggleFilter(field_key) {
			if (this.show_filters[field_key]) {
				this.$set(this.show_filters, field_key, false);
			} else {
				// Si no está visible, oculta todos los filtros y muestra solo el seleccionado
				this.show_filters = {}; // Reinicia el objeto show_filters
				this.$set(this.show_filters, field_key, true); // Activa solo el seleccionado
			}
		},
		limpiar_show_filters() {
			this.show_filters = {}; 
		},
		set_fields() {

			console.log('set_fields:')

			this.fields = []
			this.props.forEach(prop => {
				this.fields.push({
					key: prop.key,
					label: this.propText(prop, true, true),
					sortable: prop.sortable,
					type: prop.type_to_update ? prop.type_to_update : prop.type
				})
			})
			console.log(this.fields)

			this.set_filters()

			this.restart_filters()
		},
		restart_filters() {
			this.$store.commit(this.model_name+'/setIsFiltered', false)
			this.$store.commit(this.model_name+'/setFiltered', [])
			this.$store.commit(this.model_name+'/setFilterPage', 1)
			this.$store.commit(this.model_name+'/setTotalFilterPages', 1)
		},
		set_filters() {

			if (this.pivot) {
				return
			}

			console.log('set_filters')

			console.log('props:')
			console.log(this.props)

			let filters = []

			this.props.forEach(prop => {
				if (typeof prop.no_usar_en_filtros == 'undefined'
					&& prop.type != 'images'
					&& prop.type != 'image'
					&& !prop.belongs_to_many
				) {

					console.log('agregando filtro para '+prop.text)

					filters.push({
						key: prop.key,
						label: this.propText(prop, true, true),
						type: prop.type_to_update ? prop.type_to_update : prop.type,
						igual_que: prop.type == 'select' ? 0 : '',
						checkbox: -1,
					})
				} else {
					console.log('NO SE AGREGO filtro para '+prop.text)
				}
			})

			console.log('filters:')
			console.log(filters)
			
			this.$store.commit(this.model_name+'/setFilters', filters)
		},
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
			min-width: 150px

		th  
			position: sticky
			top: 0px

			.cont-th

				// margin: -1px
				position: relative
				display: flex  
				flex-direction: row
				justify-content: space-between
				white-space: nowrap
				padding: 10px 15px
				font-size: 17px
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


				&.hovered .filter-component
					opacity: 1
					pointer-events: auto

		td 
			padding: 5px 15px
			line-height: 25px
			font-size: 1em
			width: 500px
			max-width: 500px
			overflow-wrap: break-word
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


		.cont-filter-buttons
			display: flex  
			flex-direction: row 
			margin: -3px 0



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
		min-height: 300px
		max-height: 50vh
		// margin-left: -15px
		margin-top: 15px



</style>