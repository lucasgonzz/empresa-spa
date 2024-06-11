<template>
<div 
class="buttons-listado">
	<!-- Online -->
	<!-- <btn-loader
	v-if="has_online"
	@clicked="setArticleOnline(model)"
	:variant="isArticleOnline(model)"
	size="sm"
	icon="not"
	:block="false"
	:loader="loading_online"></btn-loader> -->

	<btn-loader
	v-if="has_online"
	@clicked="setFeatured(model)"
	:variant="isFeatured(model)"
	size="sm"
	icon="check"
	:block="false" 
	class="m-l-10"
	:loader="loading_featured"></btn-loader>

	<!-- Estadisticas -->
	<b-button 
	variant="primary"
	size="sm"
	@click.stop="showCharts()" 
	class="m-l-10">
		<i class="icon-chart"></i>
	</b-button>

	<!-- Movimientos de stock -->
	<b-button 
	variant="secondary"
	size="sm"
	@click.stop="stockMovements()" 
	class="m-l-10">
		<i class="icon-database"></i>
	</b-button>

	<!-- Cammbios de precios -->
	<b-button 
	variant="secondary"
	size="sm"
	@click.stop="priceChanges()" 
	class="m-l-10">
		<i class="icon-dolar"></i>
	</b-button>

	<!-- Ventas -->
	<b-button 
	variant="primary"
	size="sm"
	@click.stop="showSales()" 
	class="m-l-10">
		Ventas
	</b-button>

	<b-button 
	v-if="order_production_statuses.length"
	variant="success"
	size="sm"
	@click.stop="showArticleInRecipes()" 
	class="m-l-10">
		<i class="icon-chart"></i>
		Recetas
	</b-button>

	<b-button 
	:variant="getVariant()"
	size="sm"
	@click.stop="showVariants()" 
	class="m-l-10">
		<b-badge
		variant="danger"
		v-if="model.article_variants.length">
			{{ model.article_variants.length }}
		</b-badge>
		Variantes
	</b-button>
</div>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		model: Object,
	},
	data() { 
		return {
			loading_featured: 0,
			loading_online: 0,
		}
	},
	computed: {
		order_production_statuses() {
			return this.$store.state.order_production_status.models 
		},
	},
	methods: {
		getVariant() {
			if (this.model.article_properties.length) {
				return 'primary'
			}
			return 'outline-primary'
		},
		showArticleInRecipes() {
			this.$store.dispatch('article_used_in_recipes/getModels', this.model)
			this.$bvModal.show('article-used-in-recipes')
		},
		showVariants() {
			this.setModel(this.model, 'article', [], false)
			this.$store.commit('article_property/setModels', this.model.article_properties)
			this.$store.commit('article_variant/setModels', this.model.article_variants)
			this.$bvModal.show('article-variants')
		},
		showCharts() {
			this.setModel(this.model, 'article', [], false)
			this.$bvModal.show('article-charts')
		},
		showSales() {
			console.log('¿asd')
			this.setModel(this.model, 'article', [], false)
			this.$bvModal.show('article-sales')
		},
		setFeatured() {
			this.loading_featured = true
			this.$api.get(`/article/set-featured/${this.model.id}`)
			.then(res => {
				this.$toast.success('Articulo actualizado')
				this.loading_featured = false 
				this.$store.commit('article/add', res.data.model)
			})
			.catch(err => {
				this.$toast.error('Error al agregar articulo en destacados')
				this.loading_featured = false
				console.log(err)
			})
		},
		isFeatured() {
			if (this.model.featured) {
				return 'success'
			}
			return 'outline-success'
		},
		setArticleOnline() {
			this.loading_online = true
			this.$api.get(`/article/set-online/${this.model.id}`)
			.then(res => {
				this.$toast.success('Articulo actualizado')
				this.loading_online = 0
				this.$store.commit('article/add', res.data.model)
			})
			.catch(err => {
				this.$toast.error('Error al actualizar articulo')
				this.loading_online = 0
				console.log(err)
			})
		},
		isArticleOnline() {
			if (this.model.online == 1) {
				return 'outline-danger'
			}
			return 'danger'
		},
		stockMovements() {
			this.$store.commit('article/setModel', {model: this.model, properties: []})
			this.$bvModal.show('stock-movement-modal-info')
			this.$store.dispatch('article/stock_movement/getModels', this.model)
		},
		priceChanges() {
			this.$store.commit('article/setModel', {model: this.model, properties: []})
			this.$bvModal.show('price-changes')
		},
	}
}
</script>
<style lang="sass">
.buttons-listado
	margin-left: 15px
</style>