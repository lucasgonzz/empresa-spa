<template>
	<b-col
	v-if="authenticated && hasExtencion('vinoteca')"
	cols="12"
	class="margin-bottom-since-lg"
	:md="2">
		<search-component
		id="select-promocion_vinoteca"
		placeholder="Promocion"
		model_name="promocion_vinoteca"
		@setSelected="setSelected"
		clear_query
		search_from_api
		:save_if_not_exist="false"
		:show_selected="false"
		:str_limint="1"></search-component>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender/index'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	computed: {
		combos() {
			return this.$store.state.promocion_vinoteca.models
		},
		id() {
			return 'select-promocion_vinoteca'
		},
	},
	data() {
		return {
			promocion_vinoteca: null
		}
	},
	methods: {
		setSelected(result) {
			let promocion_vinoteca = {
				...result.model,
				is_promocion_vinoteca: true,
				// amount: 1,
			}

			promocion_vinoteca.final_price = Number(promocion_vinoteca.final_price)
			this.set_item_vender(promocion_vinoteca)
			
		},
	}
}
</script>