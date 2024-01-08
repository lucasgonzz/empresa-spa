<template>
    <confirm
    @resetStock="resetStock"
    not_show_delete_text
    text="¿Seguro que quiere resetear el stock a 0?"
    btn_text="Resetear"
    emit="resetStock"
    id="confirm-reset-stock"></confirm>
</template>
<script>
export default {
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
	},
	computed: {
		selected() {
			return this.$store.state.article.selected 
		},
		filtered() {
			return this.$store.state.article.filtered 
		},
	},
	methods: {
		resetStock() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) {
				articles = this.filtered
			}
			articles.forEach(article => {
				ids.push(article.id)
			})

			this.$store.commit('auth/setLoading', true)
			this.$api.put('article/reset-stock/to-0', {
				articles_id: ids,
			})
			.then(() => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Stock reseteado')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Hubo un error')
				this.$toast.error(err)
			})
		}
	}
}
</script>