<template>
	<div
	class="options-panel-control">

		<span
		class="p-md-r-10 m-b-15 m-md-b-0">
			{{ total_registros_text }} 
		</span>
		
		<b-form-select
		class="p-md-r-10 m-b-15 m-md-b-0"
		v-model="order_by"
		:options="order_options"></b-form-select>

		<div
		v-if="registros_para_mostrar.length > per_page"
		class="current-page m-b-15 m-md-b-0">
			<i class="icon-left"
			@click="decrementPage"></i>
			<span>
				{{ current_page + 1 }} / {{ total_pages }}
			</span>
			<i class="icon-right"
			@click="incrementPage"></i>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		module_name: String,
		total_registros_text: String,
		registros_para_mostrar: Array,
	},
	computed: {
		order_by: {
			get() {
				return this.$store.state.reportes[this.module_name].order_by 
			},
			set(value) {
				this.$store.commit('reportes/'+this.module_name+'/setOrderBy', value)
			}
		},
		current_page() {
			return this.$store.state.reportes[this.module_name].current_page 
		},
		total_pages() {
			return Math.ceil(this.registros_para_mostrar.length / this.per_page)
		},
		order_options() {
			return [
				{
					text: 'Mayor a menor',
					value: 'mayor-a-menor',	
				},
				{
					text: 'Menor a mayor',
					value: 'menor-a-mayor',	
				},
			]
		}
	},
	data() {
		return {
			per_page: 10,
		}
	},
	created() {
		this.current_order_by = this.order_by
	},
	methods: {
		setOrderBy(value) {
			this.$emit('setOrderBy', value)
		},
		incrementPage() {
			if (this.current_page < this.total_pages-1) {
				this.$store.commit('reportes/'+this.module_name+'/incrementCurrentPage')
			}
		},
		decrementPage() {
			if (this.current_page > 0) {
				this.$store.commit('reportes/'+this.module_name+'/decrementCurrentPage')
			}
		},
	}
}
</script>