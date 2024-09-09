<template>
	<div>
	    <confirm
	    model_name="sale"
	    :actions="['sale/delete']"
	    id="delete-sale"></confirm>
		
		<view-component
		:models_to_show="sales_to_show"
		show_models_if_empty
		:show_previus_days="show_previus_days"
		:show_btn_create="false"
		change_from_dates_option
		:show_modal="false"
		@clicked="clicked"
		:set_model_on_row_selected="false"
		:check_permissions_previus_days="false"
		model_name="sale">
			<template #header>
				<nav-component></nav-component>
			</template>

			<template #table_right_options="props">
				<sale-buttons
				:sale="props.model"></sale-buttons>
			</template>
		</view-component>
	</div>
</template>
<script>
import previus_sales from '@/mixins/previus_sales'
export default {
	mixins: [previus_sales],
	created() {
		this.$store.commit('sale/setIsSelecteable', false)
		this.$store.commit('sale/setSelected', [])
		this.$store.commit('sale/setFromDates', false)
	},
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		NavComponent: () => import('@/components/deposito/components/Nav'),
		SaleButtons: () => import('@/components/deposito/components/SaleButtons'),
	},
	computed: {
		sales() {
			return this.$store.state.sale.models 
		},
		sales_to_show() {
			if (this.view == 'para-checkear') {
				return this.sales.filter(sale => {
					return sale.to_check 
				})
			} else if (this.view == 'confirmadas') {
				return this.sales.filter(sale => {
					return sale.confirmed && sale.terminada == 0
				})
			}
		},
		show_previus_days() {
			return this.$store.state.sale.from_dates
		}
	},
	methods: {
		clicked(model) {
			this.setPreviusSale(model)
		}
	}
}
</script>