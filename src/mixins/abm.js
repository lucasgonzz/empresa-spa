export default {
	computed: {
		// Grupos ("views") del modulo de ABM, reorganizados por dominio de negocio.
		// Cada recurso aparece en un solo grupo. El primer modelo de cada grupo es el
		// que se abre por defecto al entrar a la pestania (Abm.vue -> setSelectedView).
		abm_views() {
			return [
				// Clasificacion, atributos e importacion de articulos
				{
					view: 'articulos',
					models: [
						'category',
						'sub_category',
						'brand',
						'combo',
						'tipo_envase',
						'article_ubication',
						'article_property_type',
						'article_property_value',
						'column_position',
						'article_pre_import_range',
					],
				},
				// Todo lo relacionado a precios en un solo lugar (marco de precios Fase 2)
				{
					view: 'precios',
					models: [
						'price_type',
						'discount',
						'surchage',
						'category_price_type_range',
						'article_price_type_group',
						'current_acount_payment_method_discount',
						'sale_tax',
					],
				},
				// Configuracion de venta (sin precios, cobros ni comisiones)
				{
					view: 'ventas',
					models: [
						'sale_status',
						'sale_type',
						'sale_sender_info',
						'client_reputation',
						'dealer',
					],
				},
				// Metodos de cobro y planes de pago en cuenta corriente
				{
					view: 'cuenta corriente',
					models: [
						'current_acount_payment_method',
						'cuota',
					],
				},
				// Comisiones de vendedores (antes mezcladas dentro de ventas)
				{
					view: 'comisiones',
					models: [
						'commission',
						'venta_terminada_commission',
						'promocion_vinoteca_commission',
					],
				},
				// Caja y tesoreria (default_payment_method_caja vive SOLO aca)
				{
					view: 'tesoreria',
					models: [
						'turno_caja',
						'concepto_movimiento_caja',
						'default_payment_method_caja',
					],
				},
				// Gastos
				{
					view: 'gastos',
					models: [
						'expense_concept',
						'expense_category',
					],
				},
				// Facturacion ARCA
				{
					view: 'facturacion',
					models: [
						'afip_information',
						'afip_selected_payment_method',
					],
				},
				// Depositos e inventario
				{
					view: 'inventario',
					models: [
						'inventory_linkage',
						'deposit_movement_status',
					],
				},
				// Produccion
				{
					view: 'produccion',
					models: [
						'order_production_status',
						'recipe_route_type',
					],
				},
				// Todo lo de impresion / PDF junto
				{
					view: 'impresion',
					models: [
						'article_pdf',
						'article_pdf_observation',
						'pdf_column_profile',
					],
				},
				// Datos de la organizacion: sucursales y geografia
				{
					view: 'sucursales',
					models: [
						'address',
						'provincia',
						'location',
					],
				},
				// Tienda online
				{
					view: 'tienda online',
					models: [
						'title',
						'delivery_day',
						'delivery_zone',
						'payment_method',
					],
				},
				// Integraciones externas
				{
					view: 'integraciones',
					models: [
						'platform_connector',
						'whatsapp_bot_config',
					],
				},
				// Extension: vinoteca
				{
					if_has_extencion: 'vinoteca',
					view: 'vinoteca',
					models: [
						'bodega',
						'cepa',
					],
				},
				// Extension: Mercado Libre
				{
					if_has_extencion: 'usa_mercado_libre',
					view: 'meli',
					models: [
						'meli_listing_type',
						'meli_buying_mode',
						'meli_item_condition',
					],
				},
			]
		},
	}
}
