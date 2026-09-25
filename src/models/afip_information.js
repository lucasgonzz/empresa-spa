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
			text: 'Nombre del dueño',
			key: 'owner_name',
			type: 'text',
			description: 'Si se completa este campo, se mostrara en la cabecera de la factura junto con la razon social',
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
		{
			text: 'Alícuota IIBB CABA (%)',
			key: 'isib_caba_alicuota',
			type: 'number',
			// Paso 0.01: sin esto el input queda en paso 1 y el navegador marca 3,5 como invalido.
			variable_decimals: { min: 2, max: 2 },
			descriptions: [
				'Resolución AGIP 169/2026: si facturás a consumidores finales en la Ciudad de Buenos Aires, cargá acá la alícuota de Ingresos Brutos que te corresponde (por ejemplo 3). Se imprime "ALÍCUOTA ISIB CABA 3,00%" en las facturas y tickets a consumidor final de este punto de venta.',
				'Dejalo vacío si no te corresponde (por ejemplo, si estás en el Régimen Simplificado). Solo se imprime en los comprobantes que se le informan a ARCA como emitidos a consumidor final: nunca en facturas A.',
			],
		},
		{
			text: 'IIBB por Convenio Multilateral',
			key: 'isib_caba_convenio_multilateral',
			type: 'checkbox',
			value: 0,
			description: 'Si tributás Ingresos Brutos por Convenio Multilateral, la leyenda suma "APLICABLE SOBRE INGRESOS BRUTOS ATRIBUIDOS A CABA". Consultalo con tu contador.',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Guarda los datos fiscales y puntos de venta de ARCA con los que el negocio emite facturas electrónicas.',
		implicancias: 'Cada registro define razón social, CUIT, condición frente al IVA, punto de venta, si opera en modo producción y, si corresponde, la alícuota de Ingresos Brutos de CABA que se informa en los comprobantes a consumidor final. Al facturar, se elige con qué punto de venta se emite el comprobante; los datos de la cabecera de la factura salen de acá. También puede vincularse a una sucursal como facturación por defecto.',
		como_se_utiliza: 'Creá el registro con todos los datos fiscales y el número de punto de venta habilitado en ARCA. Activá el modo producción recién cuando los certificados estén configurados en el servidor.',
		palabras_clave: ['arca', 'afip', 'factura electronica', 'punto de venta', 'cuit', 'fiscal'],
	},
	singular_model_name_spanish: 'Punto de venta AFIP',
	plural_model_name_spanish: 'Puntos de venta AFIP',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}