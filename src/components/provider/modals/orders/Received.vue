<template>
<b-modal
id="provider-order-article-received"
title="Unidades recibidas"
hide-footer>
	<b-form-group
	:label="'Unidades recibidas de '+article.name">
		<b-form-input
		type="number"
		:min="1"
		:max="article.amount"
		placeholder="¿Cuantas unidades se recibieron?"
		v-model="article.received"
		@keyup.enter="save"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="save"
	text="Guardar"
	:loader="saving"></btn-loader>
</b-modal>
</template>
<script>
import provider_orders from '@/mixins/provider_orders'
import edit_articles from '@/mixins/edit_articles'

import BtnLoader from '@/components/common/BtnLoader2'
export default {
	mixins: [edit_articles],
	components: {
		BtnLoader,
	},
	computed: {
		article() {
			return this.$store.state.provider_order.received
		},
		model() {
			return this.$store.state.provider_order.model
		},
	},
	data() {
		return { 
			received: '',
			saving: false,
		}
	},
	methods: {
		save() {
			this.saving = true 
			this.$api.post('provider-order/received', {
				provider_order_id: this.model.id,
				article: this.article,
			})
			.then(res => {
				this.saving = false
				this.$toast.success('Recibo de mercaderia guardado')
				let article = res.data.article
				article.provider_id = this.model.provider_id
				this.$store.commit('article/add', article)
				this.editArticle(article)
				this.$bvModal.show('edit-article')
				this.$bvModal.hide('provider-order-article-received')
			})
			.catch(err => {
				console.log(err)
				this.saving = false
				this.$toast.error('Error al guardar recibo de mercaderia')
			})
		}
	}
}
</script>