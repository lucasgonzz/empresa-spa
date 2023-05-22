export default {
	computed: {
		abm_views() {
			return [
				{
					view: 'generales',
					models: [
						'task',
						'category',
						'sub_category',
						'brand',
						'location',
						'discount',
						'surchage',
						'order_production_status',
						'price_type',
    					'address',
    					'commission',
    					'sale_type',
    					'inventory_linkage',
					],
				},
				{
					view: 'facturacion',
					models: [
						'afip_information',
					]
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