<template>
<b-modal
scrollable
id="mercado-libre"
:title="'Mercado Libre '+model.name"
size="lg"
hide-footer>
	
	<h3
	v-if="meli_category">
    	Categoria: {{ meli_category.meli_category_name }}
	</h3>

	<category-predictor
	v-else></category-predictor>
	
	<nav-component
	@get_article_attributes="get_article_attributes"></nav-component>

	<attributes-mercado-libre></attributes-mercado-libre>

	<attributes-article></attributes-article>

</b-modal>
</template>
<script>
export default {
	components: {
        NavComponent: () => import('@/components/listado/modals/mercado-libre/Nav'),
        AttributesMercadoLibre: () => import('@/components/listado/modals/mercado-libre/attributes-mercado-libre/Index'),
        AttributesArticle: () => import('@/components/listado/modals/mercado-libre/attributes-article/Index'),
        CategoryPredictor: () => import('@/components/listado/modals/mercado-libre/CategoryPredictor'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		meli_category() {
			return this.$store.state.meli.meli_category
		}
	},
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (modalId === 'mercado-libre') {
            	this.cargar_info()
            }
        })
    },
	data() {
		return {
			results: null,
			loading: false,
		}
	},
	methods: {
		async cargar_info() {
			this.$store.commit('auth/setLoading', true)
        	
        	await this.get_meli_category_attributes()
        	await this.get_article_attributes()

			this.$store.commit('auth/setLoading', false)
		},
		get_meli_category_attributes() {
			if (this.model.meli_category_id) {
				this.get_meli_category()
			} else {
				this.get_category_predictor()
			}
		},
		get_category_predictor() {
			console.log('get_category_predictor')
			console.log(this.model.name)
			this.$api.get('meli-category-predictor/'+this.model.name)
			.then(res => {
				this.$store.commit('meli/set_categories_predictor', res.data.categories)
			})
			.catch(err => {
				console.log(err)
			})
		},	
		get_meli_category() {

			this.$api.get('meli-category/'+this.model.meli_category_id)
			.then(res => {
				let meli_category = res.data.model
				this.$store.commit('meli/set_meli_category', meli_category)
			})
			.catch(err => {
				console.log(err)
			})
		},
		get_article_attributes() {
			return this.$api.get('article-meli-attribute/'+this.model.id)
			.then(res => {
				let article_meli_atributes = res.data.models
				this.$store.commit('meli/set_article_meli_attributes', article_meli_atributes)
			})
			.catch(err => {
				console.log(err)
			})
		},
	}
}
</script>
<style lang="sass">
#mercado-libre
	h4 
		margin: 15px 
		
.cont-attributes
	display: flex   
	flex-direction: row 
	justify-content: space-between
	align-items: flex-start
	flex-wrap: wrap

	.attribute
		width: 30%
		padding: 15px
		border-radius: 7px
		margin-bottom: 35px

</style>