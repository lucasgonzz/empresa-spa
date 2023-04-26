export default {
	computed: {
		abm_views() {
			return [
				{
					view: 'generales',
					models: [
						'category',
						'sub_category',
						'brand',
						'discount',
						'surchage',
						'order_production_status',
						'price_type',
    					'address',
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