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
import listado_articles_source from '@/mixins/listado/listado_articles_source'

export default {
	mixins: [listado_articles_source],
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
	},
	computed: {
		/**
		 * Origen guardado al abrir el modal desde el dropdown de filtrados o seleccionados.
		 *
		 * @return {boolean}
		 */
		use_filtered_source() {
			return this.remembered_options_from_filter()
		},
	},
	methods: {
		/**
		 * Resetea stock a 0 según el dropdown que abrió la confirmación.
		 *
		 * @return {void}
		 */
		resetStock() {
			let articles = this.resolve_articles()
			if (!articles || !articles.length) {
				return
			}

			let ids = []
			articles.forEach(function (article) {
				ids.push(article.id)
			})

			this.$store.commit('auth/setLoading', true)
			this.$api.put('article/reset-stock/to-0', {
				articles_id: ids,
			})
			.then(() => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Stock reseteado')
				ids.forEach(id => {
					this.loadModel('article', id)
				})
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
