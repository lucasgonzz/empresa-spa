<template>
<b-modal
scrollable
id="article-charts"
:title="model.name"
size="lg"
hide-footer>
	<nav-component
	@getCharts="getCharts"></nav-component>
	<div
	v-if="results || loading">
		<div
		v-if="!loading">
			<div
			v-if="results.length">
				<p
				class="total-unidades-vendidas-number">
					{{ total_unidades_vendidas }}
				</p>
				<p
				class="total-unidades-vendidas-text">
					Unidades vendidas
				</p>
				<chart
				:article="model"
				:results="results"></chart>
			</div>
			<p
			v-else
			class="text-with-icon">
				<i class="icon-chart"></i>
				No hay unidades vendidas de {{ model.name }}. Pruebe ampliando el rango de fechas.
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
		NavComponent: () => import('@/components/listado/modals/article-charts/Nav'),
		Chart: () => import('@/components/listado/modals/article-charts/Chart'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		total_unidades_vendidas() {
			let total = 0 
			if (this.results) {
				this.results.forEach(result => {
					total += result.unidades_vendidas
				})
			}
			return total
		}
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
		getCharts(dates) {
			this.loading = true
			this.$api.get('article/charts/'+this.model.id+'/'+dates.from_date+'/'+dates.until_date)
			.then(res => {
				this.loading = false 
				this.results = res.data.result
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error('Error al cargar graficos')
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