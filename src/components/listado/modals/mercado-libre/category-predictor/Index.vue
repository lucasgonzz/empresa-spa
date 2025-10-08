<template>
<b-modal
scrollable
id="mercado-libre-category-predictor"
title="Mercado Libre Predictor de Categoria"
size="lg"
hide-footer>
	<b-form-input
	v-model="query"></b-form-input>

	<div 
	v-for="category in categories_predictor"
	@click="select_category(category)"
	class="category s-1">
		{{ category.category_name }}
	</div>
</b-modal>
</template>
<script>
export default {
	components: {
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		categories_predictor() {
			return this.$store.state.meli.categories_predictor
		}
	},
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (modalId === 'mercado-libre-category-predictor') {
            	this.set_query()

            	this.get_category_predictor()
            }
        })
    },
	data() {
		return {
			query: null,
		}
	},
	methods: {
		set_query() {
			this.query = this.model.name
		},
		get_category_predictor() {
			console.log('get_category_predictor')
			console.log(this.model.name)
			this.$api.get('meli-category-predictor/'+this.query)
			.then(res => {
				this.$store.commit('meli/set_categories_predictor', res.data.categories)
			})
			.catch(err => {
				console.log(err)
			})
		},	
		select_category(category) {
			
			this.$store.commit('auth/setLoading', true)
			this.$api.get('meli-category-predictor/asignar-meli-category/'+this.model.id+'/'+category.category_id)
			.then(res => {
				
				let article = res.data.model

				this.$store.commit('auth/setLoading', false)

				this.$store.commit('article/add', article)
				
				this.setModel(article, 'article', [], false)

				this.$toast.success('Categoria asignada')

				this.$store.commit('meli/set_categories_predictor', [])

				this.$bvModal.hide('mercado-libre-category-predictor')
				this.$bvModal.show('mercado-libre')
			})
			.catch(err => {
				this.$toast.error(err)
				this.$store.commit('auth/setLoading', false)
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
#mercado-libre-category-predictor
	.category
		font-size: 20px
		margin: 20px
		padding: 10px
		border-radius: 7px
		cursor: pointer

</style>