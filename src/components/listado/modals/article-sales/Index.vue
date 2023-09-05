<template>
<b-modal
scrollable
id="article-sales"
:title="'Ventas de '+model.name"
size="lg"
hide-footer>
	<model-component
	model_name="sale">
		
	</model-component>	

	<nav-component
	@getSales="getSales"></nav-component>

	<div
	v-if="results || loading">
		<div
		v-if="!loading">
			<div
			v-if="results.length">
				<table-component
				model_name="sale"
				:models="results"></table-component>
			</div>
			<p
			v-else
			class="text-with-icon">
				<i class="icon-chart"></i>
				No hay ventas de {{ model.name }}. Pruebe ampliando el rango de fechas.
			</p>	
		</div>
		<div
		class="all-center-md"
		v-else>
		    <b-spinner 
		    variant="primary"></b-spinner>
		</div>
	</div>
	<p
	class="text-with-icon"
	v-else>
		<i class="icon-exclamation"></i>
		Seleccione el rango de fechas y precione BUSCAR
	</p>

</b-modal>
</template>
<script>
export default {
	components: {
		ModelComponent: () => import('@/common-vue/components/model/Index'),
		NavComponent: () => import('@/components/listado/modals/article-sales/Nav'),
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
	},
	data() {
		return {
			results: null,
			loading: false,
		}
	},
	mounted() {
		this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
			this.results = null
		})
	},
	methods: {
		getSales(dates) {
			this.loading = true
			this.$api.get('article/sales/'+this.model.id+'/'+dates.from_date+'/'+dates.until_date)
			.then(res => {
				this.loading = false 
				this.results = res.data.result
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error('Error al cargar ventas')
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
.total-unidades-vendidas-number
	margin-top: 60px
	font-size: 200px
	line-height: 200px
	text-align: center
	margin-bottom: 0
	font-weight: 100
.total-unidades-vendidas-text
	margin-bottom: 60px
	font-size: 30px
	text-align: center
</style>