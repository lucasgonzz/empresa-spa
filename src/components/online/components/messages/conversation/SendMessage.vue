<template>
	<div class="send-message"
	v-if="selected_buyer">
		<b-form-input
		v-model="text"
		id="message-text"
		@keyup.enter="sendMessage"
		placeholder="Escribe un mensaje"></b-form-input>
        <b-button 
		class="m-l-15"
        variant="success"
        target="_blank"
        :href="'https://wa.me/'+selected_buyer.phone">
            <i class="icon-whatsapp"></i>
        </b-button>
		<img 
		v-if="selected_article"
		class="selected-article-img"
		:src="message_article_img">
		<b-button
		@click="showArticles"
		variant="primary"
		class="m-l-15">
			<i
			:class="icon_class"></i>
		</b-button>
		<btn-loader
		class="m-l-15"
		@clicked="sendMessage"
		:loader="loading"
		:block="false"
		icon="send"></btn-loader>
	</div>
</template>
<script>
import online from '@/mixins/online'
export default {
	mixins: [online],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		selected_buyer() {
			return this.$store.state.message.selected_buyer
		},
		selected_article() {
			return this.$store.state.message.selected_article
		},
		show_articles() {
			return this.$store.state.message.show_articles
		},
		icon_class() {
			if (!this.show_articles) {
				return 'icon-camera' 
			}
			return 'icon-not' 
		},
		message_article_img() {
			if (this.selected_article) {
				return this.articleImageUrl(this.selected_article)
			}
		},
	},
	data() {
		return {
			text: '',
			loading: false,
		}
	},
	methods: {
		showArticles() {
			if (this.show_articles) {
				this.$store.commit('message/setShowArticles', false)
			} else {
				this.$store.commit('message/setShowArticles', true)
			}
		},
		sendMessage() {
			this.loading = true
			this.$api.post('message', {
				buyer_id: this.selected_buyer.id,
				text: this.text,
				article_id: this.getSelectedArticleId(),
			})
			.then(res => {
				this.addBuyerMessage(res.data.model)
				// this.$store.commit('buyer/addMessage', res.data.model)
				this.$store.commit('message/setChatsToShow')
				this.loading = false
				this.scrollBottom('messages')
				this.clear()
			})
			.catch(err => {
				console.log(err)
				this.loading = false
			})
		},
		getSelectedArticleId() {
			if (!this.selected_article) {
				return null
			}
			return this.selected_article.id
		},
		clear() {
			this.$store.commit('message/setSelectedArticle', null)
			this.text = ''
		}
	}
}
</script>
<style lang="sass">
.send-message
	height: 70px
	display: flex
	align-items: center
	img 
		width: 40px
		border-radius: .3em
		margin-left: 1em
</style>