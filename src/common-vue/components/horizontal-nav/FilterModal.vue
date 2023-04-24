<template>
	<b-modal
	:title="'Buscar '+singular(model_name).toLowerCase()"
	scrollable
	id="filter-modal">
		<p>
			<strong>
				Complete los campos que quiere usar para filtrar
			</strong>
		</p>
		<div
		v-for="filter in filters">

			<b-form-group
			v-if="filter.type == 'search'"
			:label="filter.label">
				<search-component
				class="m-b-15"
				:id="model_name+'-'+filter.key"
				@setSelected="setSelected"
				:model_name="modelNameFromRelationKey(filter)"
				:model="model_for_pass_to_search"
				:prop="filter"></search-component>
			</b-form-group>

			<b-form-group
			v-if="filter.type == 'text' || filter.type == 'textarea'"
			:label="filter.label">
				<div class="d-flex">
					<b-form-input
					@keyup.enter="search"
					class="m-b-15"
					:id="'search-modal-'+filter.key"
					v-model="filter.value"
					:placeholder="'Ingrese '+filter.text"></b-form-input>

					<bar-code-scanner
					class="m-l-10"
					v-if="filter.use_bar_code_scanner && hasExtencion('bar_code_scanner')"
					@setBarCode="setBarCode"></bar-code-scanner>
				</div>
			</b-form-group>

			<div
			class="m-b-15"
			v-if="filter.type == 'number'">
				<p
				v-if="filter.label">
					{{ filter.label }}
				</p>
				<b-form-input
				@keyup.enter="search"
				class="m-b-10"
				v-if="filter.number_type == 'min'"
				v-model="filter.value"
				type="number"
				:placeholder="'Que tengan '+filter.text+' menor a:'"></b-form-input>

				<b-form-input
				@keyup.enter="search"
				class="m-b-10"
				v-if="filter.number_type == 'equal'"
				v-model="filter.value"
				type="number"
				:placeholder="'Que tengan '+filter.text+' igual a:'"></b-form-input>

				<b-form-input
				@keyup.enter="search"
				class="m-b-10"
				v-if="filter.number_type == 'max'"
				v-model="filter.value"
				type="number"
				:placeholder="'Que tengan '+filter.text+' mayor a:'"></b-form-input>
			</div>

			<b-form-group
			class="m-b-15"
			v-if="filter.type == 'select'"
			:label="filter.label">
				<b-form-select
				@change="setSelectOptions(filter)"
				v-model="filter.value"
				:options="select_options[filter.key]"></b-form-select>
			</b-form-group>

			<b-form-group
			class="m-b-15"
			v-if="filter.type == 'boolean'"
			:label="filter.label">
				<b-form-select
				:options="booleanOptions(filter)"
				v-model="filter.value"></b-form-select>
			</b-form-group>

		</div>

		<template #modal-footer>
			<div 
			class="j-start w-100 m-b-15">
				<b-form-checkbox
				v-model="clear_filter"
				:value="1"
				:unchecked-value="0">
					Limpiar filtro
				</b-form-checkbox>
			</div>

			<b-button
			variant="primary"
			@click="search"
			block>
				Buscar
			</b-button>
		</template>
	</b-modal>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
export default {
	props: {
		model_name: String,
	},
	components: {
		SearchComponent,
		BarCodeScanner: () => import('@/common-vue/components/bar-code-scanner/Index'),
	},
	data() {
		return {
			filters: [],
			props: [],
			filter_model: {},
			select_options: {},
			clear_filter: 1,
			model_for_pass_to_search: {},
		}
	},
	watch: {
		model_name() {
			this.initProps()
			this.initFilter()
		},
	},
	created() {	
		this.initProps()
		this.initFilter()
		this.setSelectOptions()
	},
	methods: {
		setBarCode(bar_code) {
			let prop = this.getBarCodeProp(this.model_name)
			let filter = this.filters.find(_filter => {
				return _filter.key == prop.key 
			})
			let index = this.filters.findIndex(_filter => {
				return _filter.key == prop.key 
			})
			filter.value = bar_code
			this.filters.splice(index, filter)
		},
		initProps() {
			this.props = this.propsToFilterInModal(this.model_name)
		},
		search() {
			this.$store.commit(this.model_name+'/setFilters', this.filters)
			this.$store.commit(this.model_name+'/setLoading', true)
			this.$store.commit(this.model_name+'/setFromDate', '')
			this.$bvModal.hide('filter-modal')
			this.$api.post('search/'+this.model_name, {
				props: this.props,
				filters: this.filters,
			})
			.then(res => {
				this.$store.commit(this.model_name+'/setLoading', false)
				this.$store.commit(this.model_name+'/setIsFiltered', true) 
				this.$store.commit(this.model_name+'/setFiltered', res.data.models)
				this.clearFilter()
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al buscar')
			})
		},
		clearFilter() {
			if (this.clear_filter) {
				let new_filters = []
				let filter_to_add  
				this.filters.forEach(filter => {
					filter_to_add = {...filter} 
					if (filter_to_add.type == 'search') {
						filter_to_add.value = 0
					} else if (filter_to_add.type == 'text' || filter_to_add.type == 'textarea' || filter_to_add.type == 'number') {
						filter_to_add.value = ''
					}
					new_filters.push(filter_to_add)
				})
				this.filters = new_filters
			}
		},
		initFilter() {	
			this.filters = []
			this.props.forEach(prop => {
				if ((prop.filter_type && prop.filter_type == 'number') || prop.type == 'number') {
					this.filters.push({
						label: this.propText(prop),
						type: 'number',
						text: this.propText(prop),
						number_type: 'min',
						key: prop.key,
						value: '',
					})
					this.filters.push({
						type: 'number',
						text: this.propText(prop),
						number_type: 'equal',
						key: prop.key,
						value: '',
					})
					this.filters.push({
						type: 'number',
						text: this.propText(prop),
						number_type: 'max',
						key: prop.key,
						value: '',
					})
				} else if (prop.type == 'text' || prop.type == 'textarea') {
					this.filters.push({
						label: this.propText(prop),
						type: prop.type,
						text: this.propText(prop),
						store: prop.store,
						key: prop.key,
						use_bar_code_scanner: prop.use_bar_code_scanner,
						value: '',
					})
				} else if (prop.type == 'boolean') {
					this.filters.push({
						label: this.propText(prop),
						type: prop.type,
						text: this.propText(prop),
						store: prop.store,
						key: prop.key,
						value: -1,
					})
				} else {
					this.filters.push({
						label: this.propText(prop),
						type: prop.type,
						text: this.propText(prop),
						store: prop.store,
						key: prop.key,
						depends_on: prop.depends_on,
						value: 0,
					})
				}
			})
		},
		setSelectOptions() {
			this.filters.forEach(filter => {
				if (filter.type == 'select') {
					this.filter_model[filter.key] = filter.value 
					this.$set(this.select_options, filter.key, this.getOptions({key: filter.key, text: filter.label, depends_on: filter.depends_on}, this.filter_model))
				}
			})
		},
		setSelected(result) {
			result.prop.value = result.model.id
			this.filters.forEach(filter => {
				this.model_for_pass_to_search[filter.key] = filter.value 
			})
		},
	}
}
</script>