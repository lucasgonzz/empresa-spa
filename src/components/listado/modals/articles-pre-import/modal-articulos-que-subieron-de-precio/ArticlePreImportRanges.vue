<template>
	<div class="article-pre-import-ranges">
		<div 
		v-for="range in ranges"
		class="range">
			<div 
			:class="range.color"
			class="color">
				{{ cantidad_de_articulos_en_este_rango(range) }}
			</div>
			<span>
				Desde {{ range.min }}% a {{ range.max }}%
			</span>

			<div 
			class="actualizar">
				<b-button
				@click="update(range)"
				variant="primary">
					Actualizar
				</b-button>
			</div>
		</div>
	</div>
</template>
<script>
import articles_pre_import from '@/mixins/articles_pre_import'
export default {
	mixins: [articles_pre_import],
	computed: {
		ranges() {
			return this.$store.state.article_pre_import_range.models
		},
		pre_import() {
			return this.$store.state.articles_pre_import.model
		}
	},
	methods: {
		articulos_en_este_rango(range) {
			return this.pre_import.articles.filter(article => {
				return this.esta_en_el_rango(this.get_procentaje_de_aumento(article), range)
			})  
		},
		cantidad_de_articulos_en_este_rango(range) {
			return this.articulos_en_este_rango(range).length
		},
		update(range) {
			this.loading = true
			this.$store.commit('auth/setMessage', 'Actualizando articulos')
			this.$store.commit('auth/setLoading', true)

			let articles_id = [] 

			let articulos_en_este_rango = this.articulos_en_este_rango(range)
			console.log('articulos_en_este_rango')
			console.log(articulos_en_este_rango)
			articulos_en_este_rango.forEach(article => {
				articles_id.push(article.pivot.article_id)
			})

			this.$api.put('articles-pre-import/update-articles', {
				articles_pre_import_id: this.pre_import.id,
				articles_id: articles_id
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.success(res.data.articulos_actualizados+' Articulos actualizados')

				this.$bvModal.hide('articulos-que-subieron-de-precio')
				this.$bvModal.hide('articles-pre-import-modal')
				this.$store.dispatch('article/getModels')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al actualziar articulos')
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
.article-pre-import-ranges
	display: flex 
	flex-direction: row 
	justify-content: flex-start
	align-items: center 

	.range 
		display: flex 
		flex-direction: row 
		justify-content: flex-start
		align-items: center 
		margin: 10px
		border: 1px solid rgba(0, 0, 0, .4)
		border-radius: 7px
		padding-right: 10px
		background: rgba(0, 0, 0, .1)
		cursor: pointer
		position: relative

		.actualizar
			// position: absolute
			display: none 
			margin-left: 15px
			// width: 100%
			// justify-content: center 
			// align-items: center

		&:hover > .actualizar
			display: block
			// display: flex

		.color
			width: 50px
			height: 50px
			border-radius: 7px 0 0 7px 
			display: flex 
			flex-direction: row 
			justify-content: center
			align-items: center 
			font-size: 24px
			color: #FFF
			margin-right: 10px
			text-shadow: rgb(0, 0, 0) 1px 0px 0px, rgb(0, 0, 0) 0.540302px 0.841471px 0px, rgb(0, 0, 0) -0.416147px 0.909297px 0px, rgb(0, 0, 0) -0.989992px 0.14112px 0px, rgb(0, 0, 0) -0.653644px -0.756802px 0px, rgb(0, 0, 0) 0.283662px -0.958924px 0px, rgb(0, 0, 0) 0.96017px -0.279415px 0px

#articulos-que-subieron-de-precio
	.verde, .table-verde
		background: #33B100
	.amarillo, .table-amarillo
		background: #FFD800
	.rojo, .table-rojo
		background: #CC1818
	.azul, .table-azul
		background: #3A7AD2
</style>