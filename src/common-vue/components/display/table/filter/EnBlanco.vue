<template>
	<div 
	v-if="field.type != 'checkbox'"
	class="text">
		<hr>
		<b-form-group>
			<b-form-checkbox
			@change="setFilters"
			:value="1"
			:unchecked-value="0"
			v-model="filter.en_blanco">
				En blanco
			</b-form-checkbox>
			
		</b-form-group>
	</div>
</template>
<script>
import filters from '@/common-vue/mixins/filters'
export default {
	mixins: [filters],
	props: {
		field: Object,
		model_name: String,
	},
	computed: {
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
	},
	methods: {
		setFilters() {

			let filter = this.limpiar_filtro(this.filter, false)
			// if (
			// 	this.field.type == 'search'
			// 	|| this.field.type == 'select'
			// 	) {

			// 	this.field.igual_que = 0
			// } else {
			// 	this.field.igual_que = ''
			// 	this.field.igual_que = ''
			// 	this.field.mayor_que = ''
			// 	this.field.menor_que = ''
			// 	this.field.que_contenga = ''
			// }

			
			console.log('actualizando filtro con:')
			console.log(filter)
			this.$store.commit(this.model_name+'/addFilter', {...filter})
		},
	}
}
</script>
