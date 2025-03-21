export default {
	computed: {
		abm_views() {
			return [
				{
					view: 'listado',
					models: [
						'category',
						'sub_category',
						'combo',
						'brand',
						'price_type',
						'tipo_envase',
    					'inventory_linkage',
    					'article_property_type',
    					'article_property_value',
    					'article_pre_import_range',
    					'deposit_movement_status',
    					// 'deposit',
					],
				}, 
				{
					view: 'ventas',
					models: [
						'discount',
						'surchage',
						'category_price_type_range',
						'article_price_type_group',
						'cuota',
						'default_payment_method_caja',
						'current_acount_payment_method_discount',
    					'commission',
    					'sale_type',
					],
				},
				{
					view: 'generales',
					models: [
						'address',
						'location',
						'order_production_status',
					]
				},
				{
					view: 'facturacion',
					models: [
						'afip_information',
						'afip_selected_payment_method',
					]
				},
				{
					view: 'gastos',
					models: [
						'expense_concept',
					],
				},
				{
					view: 'tienda online',
					models: [
						'delivery_zone',
						'payment_method',
		    			'title',
					]
				},
			]
		},
	}
}