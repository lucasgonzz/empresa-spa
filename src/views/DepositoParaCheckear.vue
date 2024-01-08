<template>
	<view-component
	:models_to_show="sales_to_show"
	show_models_if_empty
	show_previus_days
	:show_btn_create="false"
	change_from_dates_option
	:show_modal="false"
	@clicked="clicked"
	:set_model_on_row_selected="false"
	:check_permissions_previus_days="false"
	model_name="sale">
	</view-component>
</template>
<script>
import previus_sales from '@/mixins/previus_sales'
export default {
	mixins: [previus_sales],
	created() {
		this.$store.commit('sale/setIsSelecteable', false)
		this.$store.commit('sale/setSelected', [])
	},
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	computed: {
		sales() {
			return this.$store.state.sale.models 
		},
		sales_to_show() {
			return this.sales.filter(sale => {
				return sale.to_check 
			})
		},
	},
	methods: {
		clicked(model) {
			this.setPreviusSale(model)
		}
	}
}
</script>