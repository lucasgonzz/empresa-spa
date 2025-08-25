<template>
	
    <model-index
    :show_btn_remove_belongs_to_many="false"
    :prop_to_send_on_save="prop_to_send_on_save"
    check_permissions
    not_show_delete_text
    model_name="payment_plan">

    	<template #model_modal_header>
			<sale-info></sale-info>    		
    	</template>

    </model-index> 

</template>
<script>
export default {
	components: {
		ModelIndex: () => import('@/common-vue/components/model/Index'),
		SaleInfo: () => import('@/components/common/payment-plan/SaleInfo'),
	},
	computed: {
		prop_to_send_on_save() {
			return {
				key: 'sale_id',
				value: this.sale.id
			}
		},
		sale() {
			return this.$store.state.sale.model
		},
	}
}
</script>