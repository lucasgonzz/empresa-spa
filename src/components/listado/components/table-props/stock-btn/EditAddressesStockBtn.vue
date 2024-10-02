<template>
	<div
	v-if="addresses.length && !article.article_variants.length">
	
		<div
		v-if="se_esta_editando_stock">
			
			<b-button
			size="sm"
			class="m-l-10"
			@click.stop="cancel"
			variant="outline-danger">
				<i class="icon-cancel"></i>
			</b-button>
			
			<b-button
			size="sm"
			class="m-l-10"
			@click.stop="actualizar"
			variant="success">
				<i class="icon-check"></i>
			</b-button>
		</div>

		<b-button
		v-else-if="article.addresses.length"
		size="sm"
		class="m-l-10"
		@click.stop="edit_addresses"
		variant="outline-success">
			<i class="icon-location"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
	},
	computed: {
		addresses() {
			return this.$store.state.address.models 
		},
		selected_article() {
			return this.$store.state.article.edit_addresses_stock.article 
		},
		se_esta_editando_stock() {
			return this.selected_article && this.selected_article.id == this.article.id
		}
	},
	methods: {
		edit_addresses() {
			this.$store.commit('article/edit_addresses_stock/set_article', this.article)
		},
		cancel() {
			this.$store.commit('article/edit_addresses_stock/set_article', null)
		},
		actualizar() {
			this.$store.commit('auth/setMessage', 'Actualizando Stock')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article-update-addresses', {
				article_id: this.article.id,
				addresses: this.article.addresses 
			})
			.then(res => {
				this.$store.commit('article/edit_addresses_stock/set_article', null)
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Actualizado correctamente')
			})
			.catch(err => {
				this.$store.commit('article/edit_addresses_stock/set_article', null)
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al actualizar')
			})
		}
	}
}
</script>