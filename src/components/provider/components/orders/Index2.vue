<template>
    <div
    v-if="view == 'pedidos'">

		<edit-article></edit-article>
		<b-row>
			<b-col
			cols="12">

				<horizontal-nav
				:show_btn_create="can('provider_order.store')"
				:model_name="model_name"
				:create_model_name_spanish="create_model_name_spanish"
				:display="display"
				set_sub_view></horizontal-nav>

				<previus-days
				model_name="provider_order"
				model_name_spanish="Pedidos"></previus-days>

				<display
				:display="display"
				:loading="loading"
				:models="to_show"
				:model_name="model_name"
				:properties="properties"
				:model_name_spanish="model_name_spanish"></display>

			</b-col>
		</b-row>

    </div>
</template>
<script>
import EditArticle from '@/components/common/EditArticle.vue'

import HorizontalNav from '@/components/common/horizontal-nav/Index'
import PreviusDays from '@/components/common/previus-days/Index'
import Display from '@/components/common/display/Index'
export default {
	computed: {
		model_name() {
			return 'provider_order'
		},
		model_name_spanish() {
			return 'pedido'
		},
		create_model_name_spanish() {
			return 'Nuevo pedido'
		},
		display() {
			return this.$store.state[this.model_name].display
		},
		loading() {
			return this.$store.state[this.model_name].loading
		},
		to_show() {
			return this.$store.state[this.model_name].to_show
		},
		models() {
			return this.$store.state[this.model_name].models
		},
		model() {
			return this.$store.state[this.model_name].model
		},
		delete() {
			return this.$store.state[this.model_name].delete
		},
		text_delete() {
			if (this.delete) {
				return 'el pedido'
			}
			return ''
		},
		items() {
			return [
				{
					name: 'Nuevo '+this.model_name_spanish,
					is_for_create: this.model_name
				},
				{
					name: 'Lista',
				},
			] 
		},
		properties() {
			return require(`@/models/${this.model_name}`).default.properties 
		}
	},
	methods: {
		setDisplay(display) {
			this.$store.commit(this.model_name+'/setDisplay', display)
		},
		received(item) {
			console.log(item)
			// this.$store.commit('providers/orders/create/setArticleReceived', item)
			// this.$bvModal.show('provider-order-article-received')
		},
		removeArticle(item) {
			console.log(item)
			let index = this.model.articles.findIndex(article => {
				return article.id == item.id 
			})
			this.model.articles.splice(index, 1)
		}
	},
	components: {
		EditArticle,
		
		HorizontalNav,
		PreviusDays,
		Display,
	}
}
</script>