<template>
	<div 
	v-if="field.type == 'search'"
	class="text">

		<search-component
		@setSelected="setFilters"
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
	},
	methods: {
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
