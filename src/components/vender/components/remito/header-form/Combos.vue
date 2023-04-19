<template>
	<b-col
	v-if="authenticated && hasExtencion('combos')"
	cols="12"
	class="margin-bottom-since-lg"
	:lg="col_lg_extencions">
		<search-component
		id="select-combo"
		model_name="combo"
		@setSelected="setSelectedCombo"
		clear_query
		:show_selected="false"
		:str_limint="3"></search-component>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	computed: {
		combos() {
			return this.$store.state.combo.models
		},
		id() {
			return 'select-combo'
		},
	},
	methods: {
		setSelectedCombo(result) {
			let combo = {
				...result.model,
				is_combo: true,
				amount: 1,
			}
			combo.final_price = Number(combo.price)
			console.log(combo)
			this.$store.commit('vender/addItem', combo)
			if (this.index_previus_sales > 0) {
				this.setItemsPrices(true, false)
			} else {
				this.setItemsPrices(true, false)
			}
		},
	}
}
</script>