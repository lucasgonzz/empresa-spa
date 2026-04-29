<template>
	<div 
	v-if="field.type == 'search'"
	class="text">

		<search-component
		ref="search_component"
		@setSelected="setFilters"
		@clearSelected="clear_selected"
		search_from_api
		:model_name="modelNameFromRelationKey(filter)"></search-component>

	</div>
</template>
<script>
export default {
	props: {
		field: Object,
		model_name: String,
	},
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	computed: {
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
		igual_que_value() {
			if (!this.filter) return null
			return this.filter.igual_que
		},
	},
	watch: {
		igual_que_value(new_value, old_value) {
			if (!this.$refs.search_component) return

			const is_cleared = (
				typeof new_value === 'undefined'
				|| new_value === null
				|| new_value === ''
				|| new_value === 0
			)

			if (!is_cleared) return

			const old_is_cleared = (
				typeof old_value === 'undefined'
				|| old_value === null
				|| old_value === ''
				|| old_value === 0
			)

			// Solo limpiamos si el cambio realmente fue hacia "limpio".
			if (!old_is_cleared) {
				this.$refs.search_component.clearSelected()
			}
		},
	},
	methods: {
		clear_selected() {
			console.log('clear_selected')
			this.$emit('clear_selected')
		},
		setFilters(result) {
			console.log('result:')
			console.log(result)
			let filter = {
				...this.filter,
				igual_que: result.model.id 
			}
			console.log('filter:')
			console.log(filter)
			this.$store.commit(this.model_name+'/addFilter', filter)
		},
		filtrar() {
			this.$emit('filtrar')
		}
	}
}
</script>
