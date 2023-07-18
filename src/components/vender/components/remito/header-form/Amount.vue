<template>
	<b-col
	v-if="user.ask_amount_in_vender"
	class="col-buttons"
	cols="12"
	lg="3">
		<div class="d-flex w-100">
			<b-form-input
			type="number"
			min="1"
			id="article-amount"
			v-model="article.amount"
			@keydown.enter="addArticleToSale"
			placeholder="Cantidad"></b-form-input>
			<b-button 
			class="d-lg-none m-l-10"
			@click="callAddArticleToSale"
			variant="primary">
				<i class="icon-check"></i>
			</b-button>
		</div>
	</b-col>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import vender from '@/mixins/vender'
import previus_sales from '@/mixins/previus_sales'
export default {
	components: {
		BtnLoader,
	},
	mixins: [vender, previus_sales],
	computed: {
		article() {
			return this.$store.state.vender.article
		},
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
        previus_sale() {
            return this.$store.state.vender.previus_sales.previus_sale
        },
	},
	methods: {
		callAddArticleToSale() {
			this.addArticleToSale()
		}
	}
}
</script>
<style scoped lang="sass">
.col-buttons 
	display: flex
	align-items: center
	justify-content: flex-end
</style>