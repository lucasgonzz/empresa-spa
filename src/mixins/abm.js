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
						'article_ubication',
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
					if_has_extencion: 'usa_mercado_libre',
					view: 'meli',
					models: [
						'meli_listing_type',
						'meli_buying_mode',
						'meli_item_condition',
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
					view: 'tesoreria',
					models: [
						'turno_caja',
						'default_payment_method_caja',
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
						'expense_category',
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