<template>
<div
class="m-b-15">
	<b-row
	v-if="show">
		<article-bar-code></article-bar-code>
		<article-name></article-name>
		<combos></combos>
		<services></services>
		<amount></amount>	
	</b-row>
	<b-row
	v-else>
		<b-col>
			<p>
				Limite de Items en una venta alcanzado.		
			</p>
			<p>
				Guarde esta venta para comenzar una nueva.
			</p>
		</b-col>
	</b-row>
</div>
</template>
<script>
import ArticleBarCode from '@/components/vender/components/remito/header-form/ArticleBarCode'
import ArticleName from '@/components/vender/components/remito/header-form/ArticleName'
import Combos from '@/components/vender/components/remito/header-form/Combos'
import Services from '@/components/vender/components/remito/header-form/Services'
export default {
	components: {
		ArticleBarCode,
		ArticleName,
		Combos,
		Services,
		Amount: () => import('@/components/vender/components/remito/header-form/Amount')
	},
	computed: {
		items() {
			return this.$store.state.vender.items 
		},
		show() {
			if (this.owner.max_items_in_sale && this.items.length == this.owner.max_items_in_sale) {
				return false 
			} 
			return true
		},
	},
}
</script>