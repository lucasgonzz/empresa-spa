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
		v-if="total_de_registros > per_page"
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
		// Total de registros cuando la lista llega paginada del servidor y `registros_para_mostrar` es
		// solo la pagina vigente. Sin esta prop se cuenta lo que trae `registros_para_mostrar`.
		total_registros: Number,
	},
	computed: {
		order_by: {
			get() {
				return this.$store.state.chart[this.module_name].order_by 
			},
			set(value) {
				this.$store.commit('chart/'+this.module_name+'/setOrderBy', value)
			}
		},
		current_page() {
			return this.$store.state.chart[this.module_name].current_page 
		},
		total_de_registros() {
			if (typeof this.total_registros == 'number') {
				return this.total_registros
			}
			return this.registros_para_mostrar.length
		},
		total_pages() {
			return Math.ceil(this.total_de_registros / this.per_page)
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
				this.$store.commit('chart/'+this.module_name+'/incrementCurrentPage')
			}
		},
		decrementPage() {
			if (this.current_page > 0) {
				this.$store.commit('chart/'+this.module_name+'/decrementCurrentPage')
			}
		},
	}
}
</script>