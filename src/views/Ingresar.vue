<template>
<div id="ingresar">
	<edit-article
	@clearArticle="clearArticle"></edit-article>

	<b-row class="justify-content-center">
		<b-col
		cols="12" 
		md="8">

			<title-agregar></title-agregar>
			
			<bar-code-name 
			:article="article"></bar-code-name>

			<cost-price 
			@saveArticle="saveArticle"
			:article="article"></cost-price>

			<stock-provider 
			:article="article"
			@saveArticle="saveArticle"></stock-provider>

			<category-subcategory 
			:article="article"></category-subcategory>

			<iva
			:article="article"></iva>

			<discounts
			:article="article"></discounts>

			<description
			:article="article"></description>

			<condition
			:article="article"></condition>

			<sizes
			:article="article"></sizes>

			<brand
			:article="article"></brand>

			<colors
			:article="article"></colors>

			<add-photo
			:article="article"></add-photo>

			<card-footer
			:articles="articles_to_print"
			:guardando="guardando"
			@saveArticle="saveArticle"></card-footer>
		</b-col>
	</b-row>
</div>
</template>
<script>
export default {
	name: 'Ingresar',
	components: {
		BarCodeName: () => import('@/components/ingresar/barcode-name/Index'),
		CostPrice: () => import('@/components/ingresar/cost-price/Index'),
		StockProvider: () => import('@/components/ingresar/provider-stock/Index'),
		CategorySubcategory: () => import('@/components/ingresar/category-subcategory/Index'),
		Tags: () => import('@/components/ingresar/Tags'),
		Iva: () => import('@/components/ingresar/Iva'),
		Discounts: () => import('@/components/ingresar/Discounts'),
		Description: () => import('@/components/ingresar/Description'),
		Condition: () => import('@/components/ingresar/Condition'),
		Sizes: () => import('@/components/ingresar/Sizes'),
		Brand: () => import('@/components/ingresar/Brand'),
		Colors: () => import('@/components/ingresar/Colors'),
		AddPhoto: () => import('@/components/ingresar/AddPhoto'),
		CardFooter: () => import('@/components/ingresar/CardFooter'),
		TitleAgregar: () => import('@/components/ingresar/TitleAgregar'),
	},
	data() {
		return {
			article: {
				bar_code: '',
				provider_code: '',
				category_id: 0,
				sub_category_id: 0,
				provider_id: 0,
				provider_price_list_id: 0,
				apply_provider_percentage_gain: 0,
				brand_id: 0,
				iva_id: 2,
				discounts: [{percentage: ''}],
				new_bar_code: '',
				name: '',
				cost: '',
				cost_in_dollars: 0,
				provider_cost_in_dollars: 0,
				price: '',
				percentage_gain: '',
				stock: '',
				deposits: [],
				tags: [],
				descriptions: [{}],
				sizes_id: [],
				colors: [],
				condition_id: null,
				new_stock: 0,
				stock_null: false,
				act_fecha: 1,
				add_photo: false,
				// created_at: new Date().toISOString().slice(0,10),
			},

			// Spinners
			guardando: false,
			articles_to_print: [],
		}
	},
	created() {
		this.listenEditArticle()
	},
	methods: {
		listenEditArticle() {
			this.$root.$on('bv::modal::hide', (bvEvent, modalId) => {
				if (this.article.name != '' && modalId == 'edit-article') {
					this.clearArticle()
				}
			})
		},
		validate() {
			var ok = true
			let provider = this.modelsStoreFromName('provider').find(model => {
				return model.id == this.article.provider_id
			})
			if (this.article.price == '' && this.article.percentage_gain == '' && (typeof provider == 'undefined' || !provider.percentage_gain)) {
				ok = false
				this.$toast.error('El campo precio es obligatorio')
				document.getElementById('article-price').focus()
			}
			if (this.article.name == '') {
				ok = false
				this.$toast.error('El campo nombre es obligatorio')
				document.getElementById('article-name').focus()
			}
			if (this.article.name.includes('/')) {
				ok = false
				this.$toast.error("El nombre no puede contener una barra '/'")
				document.getElementById('article-name').focus()
			}
			return ok
		},

		// Articles
		saveArticle() {
			if (this.validate()) {
				this.guardando = true
				this.$api.post('article', this.article)
				.then( res => {
					this.guardando = false
					var article = res.data.model
					this.$store.commit('article/add', article)
					this.articles_to_print.push(article)
					this.clearArticle()
					this.$toast.success('Articulo guardado')
					document.getElementById('article-bar-code').focus()
					if (this.article.add_photo) {
						this.uploadImage('article', article)
					}
				})
				.catch( err => {
					this.$toast.error('Error al guardar el artículo, revise sus datos e intentelo nuevamente por favor')
					this.guardando = false
					console.log(err)
				})
			}
		},
		clearArticle() {
			this.article.bar_code = ''
			this.article.provider_code = ''
			this.article.name = ''
			this.article.cost = ''
			this.article.cost_in_dollars = 0
			this.article.provider_cost_in_dollars = 0
			this.article.price = ''
			this.article.percentage_gain = ''
			this.article.apply_provider_percentage_gain = 0
			this.article.online_price = ''
			this.article.stock = ''
			this.article.stock_min = ''
			this.article.new_stock = ''
			this.article.stock_null = 0
			this.article.stock_null = false
			this.article.tags = []
			this.article.descriptions = [{}]
			this.sizes_id = []
			this.colors = []
			this.condition_id = null
			document.getElementById('article-bar-code').focus()
			if (document.getElementById('ingresar-article-name')) {
				document.getElementById('ingresar-article-name').value = ''
			}
		},
	}
}
</script>
<style lang="sass">
#ingresar
	.form-row 
		margin-bottom: 0
	hr 
		// border: 1px solid #000
		border: .1px solid rgba(0, 0, 0, .1) !important
		width: 100%
		margin-top: 0
	.card-header
		align-items: center
	.card-footer
		padding: 0
	.spinner-anterior 
		margin-bottom: 4px !important
	.form-group 
		margin-bottom: .5rem
	.spinner-border-sm 
		margin-bottom: 2px
	.col-12
		flex-direction: column 
</style>