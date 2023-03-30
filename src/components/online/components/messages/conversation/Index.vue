<template>
	<div
	class="conversation">
		<messages></messages>
		<send-message></send-message>
	</div>
</template>
<script>
export default {
	components: {
		Messages: () => import('@/components/online/components/messages/conversation/Messages'),
		SendMessage: () => import('@/components/online/components/messages/conversation/SendMessage'),
	},
	computed: {
		show_articles() {
			return this.$store.state.message.show_articles
		},
		selected_article() {
			return this.$store.state.message.selected_article
		},
	},
	methods: {
		isSelectedArticle(article) {
			return this.selected_article && this.selected_article.id == article.id
		},
		articleSelected(article) {
			if (this.isSelectedArticle(article)) {
				this.$store.commit('message/setSelectedArticle', null)
			} else {
				this.$store.commit('message/setSelectedArticle', article)
			}
			this.$store.commit('message/setShowArticles', false)
		}
	}
}
</script>
<style lang="sass">
.conversation
	height: 100%
	display: flex
	justify-content: space-between
	flex-direction: column
</style>