export default {
	properties: [
		{
			text: 'Condicion Frente al IVA',
			key: 'iva_condition_id',
			type: 'select',
			is_title: true,
		},
		{
			key: 'razon_social',
			type: 'text',
			use_in_select: true,
		},
		{
			key: 'domicilio_comercial',
			type: 'text',
		},
		{
			key: 'cuit',
			type: 'text',
		},
		{
			key: 'ingresos_brutos',
			type: 'text',
		},
		{
			key: 'inicio_actividades',
			type: 'date',
			is_date: true,
		},
		{
			key: 'punto_venta',
			type: 'number',
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'text',
			description: 'Si se ingresa, este dato sera usado para identificarlo en la seccion VENDER',			
		},
		{
			text: 'Direccion',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Modo produccion',
			key: 'afip_ticket_production',
			type: 'checkbox',
		},
	],
	singular_model_name_spanish: 'Punto de venta AFIP',
	plural_model_name_spanish: 'Puntos de venta AFIP',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}