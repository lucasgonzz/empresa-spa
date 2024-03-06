<template>
	<div
	v-if="view == 'cantidades-actuales'">
		<table-component
		:models="models"
		:properties="properties"
		:show_actualizado="false"
		:loading="loading"
		model_name="article"
		></table-component>
	</div>
</template>
<script>
export default {
	created() {
		this.get_cantidades_actuales()
	},
	watch: {
		view() {
			if (this.view == 'cantidades-actuales') {
				this.get_cantidades_actuales()
			}
		},
	},	
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
	},
	computed: {
		estados_de_produccion() {
			return this.$store.state.order_production_status.models 
		},
		properties() {
			let props = [{
				key: 'name',
				text: 'Articulo'
			}]
			this.estados_de_produccion.forEach(estado => {
				props.push({
					key: estado.id+'', 
					text: estado.name
				})
			})
			return props 
		},
		models() {
			let models = []
			this.articles.forEach(article => {
				let obj = {
					name: article.name
				}
				article.cantidades_actuales.forEach(cantidad_actual => {
					obj[cantidad_actual.order_production_status.id] = cantidad_actual.current_amount
				})
				models.push(obj)
			})
			return models
		}
	},
	data() {
		return {
			articles: [],
			loading: false,
		}
	},
	methods: {
		get_cantidades_actuales() {
			console.log('get_cantidades_actuales')
			this.loading = true 
			this.$api.get('production-movement/current-amounts/all-articles/all-recipes')
			.then(res => {
				this.loading = false
				console.log(res)
				this.articles = res.data.cantidades_actuales
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		}
	}
}
</script>