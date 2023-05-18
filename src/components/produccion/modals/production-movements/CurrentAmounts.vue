<template>
<b-modal
title="Cantidades actuales"
hide-footer
size="md" 
id="current-amounts">
	<search-component
	model_name="article"
	:prop="{text: 'Articulo', key: 'article_id', store: 'article'}"
	@setSelected="setSelected"/>

	<div
	v-if="results || loading">
		<div
		v-if="!loading">
			<div
			class="m-t-15"
			v-if="results.length">
				<p>
					<strong>
						<i 
						@click="search"
						class="icon-undo c-p apretable"></i>
						{{ article.name }}
					</strong>
				</p>
				<div
				v-for="result in results">
					<p
					class="result">
						{{ result.order_production_status.name }}
						<span>
							{{ result.current_amount }}
						</span>	
					</p>
					<hr>
				</div>
				<p 
				class="result">
					<strong>
						Total
					</strong>
					<span>
						{{ total }}
					</span>
				</p>
			</div>
			<p
			v-else
			class="text-with-icon">
				<i class="icon-chart"></i>
				No hay registro de movimientos de produccion para {{ article.name }}
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
		Busque un articulo para ver las cantidades en cada estado de produccion
	</p>
</b-modal>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	created() {
		console.log('montado')
	},		
	data() {
		return {
			loading: false,
			article: {},
			results: null,
		}
	},
	computed: {
		total() {
			let total = 0
			this.results.forEach(result => {
				total += Number(result.current_amount)
			})
			return total
		}
	},
	methods: {
		setSelected(result) {
			console.log(result)
			this.article = result.model
			this.search() 
		},
		search() {
			this.loading = true 
			this.$api.get('production-movement/current-amounts/'+this.article.id)
			.then(res => {
				console.log(res)
				this.results = res.data.response
				this.loading = false
			})
			.catch(err => {
				this.loading = false
				this.$toast.error('Hubo un error al buscar')
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
#current-amounts 
	.result 
		display: flex
		flex-direction: row 
		justify-content: space-between
</style>