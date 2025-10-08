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

	<b-button 
	v-if="show_variants" 
	:variant="getVariant()"
	size="sm"
	id="btn-variantes"
	@click.stop="showVariants()" 
	class="m-l-10">
		<b-badge
		variant="danger"
		v-if="model.article_variants.length">
			{{ cantidad_variantes }}
		</b-badge>
		Variantes
	</b-button>

	<!-- <btn-loader
	v-if="has_online"
	@clicked="setFeatured(model)"
	:variant="isFeatured(model)"
	size="sm"
	icon="check"
	:block="false" 
	class="m-l-10"
	:loader="loading_featured"></btn-loader> -->

	<!-- Estadisticas -->
	<!-- <b-button 
	variant="primary"
	size="sm"
	@click.stop="showCharts()" 
	class="m-l-10">
		<i class="icon-chart"></i>
	</b-button> -->



	<!-- Movimientos de depositos -->
	<b-button 
	variant="outline-secondary"
	size="sm"
	dusk="btn-movimiento-depositos"
	v-if="show_btn_mover_stock"
	@click.stop="show_address_movement" 
	class="m-l-10 btn-movimiento-depositos">
		<i class="icon-refresh"></i>
	</b-button>



	<!-- Movimientos de stock -->
	<b-button 
	variant="secondary"
	size="sm"
	dusk="btn-stock-movements"
	@click.stop="stockMovements()" 
	class="m-l-10 btn-stock-movement">
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
	v-if="hasExtencion('produccion')"
	variant="success"
	size="sm"
	@click.stop="showArticleInRecipes()" 
	class="m-l-10">
		<i class="icon-chart"></i>
		Recetas
	</b-button>

	<b-button 
	v-if="hasExtencion('usa_mercado_libre')"
	variant="warning"
	size="sm"
	@click.stop="show_meli"
	class="m-l-10">
		Meli
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
		cantidad_variantes() {
			return this.model.article_variants.filter(variante => !variante.oculta).length
		},
		order_production_statuses() {
			return this.$store.state.order_production_status.models 
		},
		show_variants() {
			if (this.hasExtencion('article_variants')) {
				
				if (this.model.article_variants.length
					|| (
						this.model.stock === null
						|| this.model.stock == 0
						)
					) {
					return true
				}
			}
			return false
		},
        show_btn_mover_stock() {
            if (this.model.addresses && this.model.addresses.length) {
                return true 
            }
            if (this.model.article_variants && this.model.article_variants.length) {
                let show = false
                this.model.article_variants.forEach(article_variant => {
                    if (article_variant.addresses.length) {
                        show = true 
                    }
                })
                return show
            }
            return false
        },
	},
	methods: {
		show_meli() {
			this.setModel(this.model, 'article', [], false)

			if (this.model.meli_category_id) {

				this.$router.push({name: this.model_name, params: {view: 'del-articulo'}})
				this.$bvModal.show('mercado-libre')
			
			} else {

				this.$bvModal.show('mercado-libre-category-predictor')

			}

		},
		show_address_movement() {
			this.setModel(this.model, 'article', [], false)
			this.$bvModal.show('address-movement')
		},
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
			this.$store.commit('auth/setMessage', 'Cargando')
			this.$store.commit('auth/setLoading', true)

			this.setModel(this.model, 'article', [], false)
			this.$store.commit('article_property/setModels', this.model.article_properties)
			this.$store.commit('article_variant/setModels', this.model.article_variants)
			
			this.$store.commit('article/edit_variants_stock/set_variants_to_update', [])
			
			setTimeout(() => {

				this.$bvModal.show('article-variants')
				this.$store.commit('auth/setLoading', false)
			}, 500)

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