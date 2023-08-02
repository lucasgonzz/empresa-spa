export default {
	computed: {
		abm_views() {
			return [
				{
					view: 'listado',
					models: [
						'category',
						'sub_category',
						'brand',
						'price_type',
    					'inventory_linkage',
    					'article_property_type',
    					'article_property_value',
    					'deposit',
					],
				},
				{
					view: 'ventas',
					models: [
						'discount',
						'surchage',
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