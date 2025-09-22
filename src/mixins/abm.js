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
						'column_position',
						'tipo_envase',
						'article_pdf_observation',
    					'inventory_linkage',
    					'article_property_type',
    					'article_property_value',
    					'article_pre_import_range',
    					'deposit_movement_status',
    					// 'deposit',
					],
				}, 
				{
					if_has_extencion: 'vinoteca',
					view: 'vinoteca',
					models: [
						// 'promocion_vinoteca',
						'bodega',
						'cepa',
					]
				},
				{
					view: 'ventas',
					models: [
						'discount',
						'surchage',
						'current_acount_payment_method',
						'dealer',
						'category_price_type_range',
						'article_price_type_group',
						'client_reputation',
						'cuota',
						'default_payment_method_caja',
						'current_acount_payment_method_discount',
    					'venta_terminada_commission',
    					'promocion_vinoteca_commission',
    					'commission',
    					'sale_type',
					],
				},
				{
					view: 'generales',
					models: [
						'address',
						'provincia',
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
		    			'title',
						'delivery_day',
						'delivery_zone',
						'payment_method',
					]
				},
			]
		},
	}
}