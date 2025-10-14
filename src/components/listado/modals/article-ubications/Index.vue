<template>
	<b-modal
	hide-footer
	v-if="article"
	size="lg"
	title="Ubicaciones"
	id="article-ubications">
		
		<div
		v-if="article.addresses && article.addresses.length">
			
			<div
			v-for="address in article.addresses">
				<p>
					<strong>{{ address.street }}</strong>
				</p>

				<div class="cont-ubications">
					<ubications
					:ubications="get_ubications_from_address(address)"></ubications>	
				</div>
				<hr>
			</div>

		</div>
		<div
		v-else>
			<ubications
			:ubications="article.article_ubications"></ubications>	
		</div>

		<b-button
		@click="guardar"
		variant="primary">
			Guardar
		</b-button>
	</b-modal>
</template>
<script>
export default {
	components: {
		Ubications: () => import('@/components/listado/modals/article-ubications/Ubications')
	},
	methods: {
		get_ubications_from_address(address) {
			return this.article.article_ubications.filter(ubication => ubication.address_id == address.id)
		},
		guardar() {
			console.log(this.article.article_ubications)

			this.$store.commit('auth/setMessage', 'Actualizando')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article-ubication/article/'+this.article.id, {
				article_ubications: this.article.article_ubications
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('article/add', res.data.model)
				this.$toast.success('Actualizado')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				
			})
		}
	},
	computed: {
		article() {
			return this.$store.state.article.model
		}
	},
}
</script>