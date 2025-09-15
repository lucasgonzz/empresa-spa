<template>
	<b-col
	v-if="user.ask_amount_in_vender"
	class="col-buttons m-b-15 m-lg-b-0"
	cols="12"
	md="2">
		<div class="d-flex w-100">
			<b-form-input
			type="number"
			dusk="article_amount"
			min="1"
			:disabled="disabled"
			id="article-amount"
			v-model="item_vender.amount"
			@keydown.enter="add_item_vender"
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
import vender from '@/mixins/vender/index'
export default {
	components: {
		BtnLoader,
	},
	mixins: [vender],
	computed: {
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
        previus_sale() {
            return this.$store.state.vender.previus_sales.previus_sale
        },
        disabled() {
        	if (this.is_local) {
        		return false
        	}
        	
        	return this.item_vender == null || typeof this.item_vender == 'undefined' || (this.item_vender.name == '' && this.item_vender.bar_code == '')

        	// if (this.testing_dusk) {
        	// 	return false
        	// }
        	// return this.item_vender == null || typeof this.item_vender == 'undefined' || (this.item_vender.name == '' && this.item_vender.bar_code == '')
        }
	},
	methods: {
		callAddArticleToSale() {
			this.add_item_vender()
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