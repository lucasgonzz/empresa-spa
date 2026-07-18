export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define los conceptos para clasificar los ingresos y egresos manuales de caja.',
		implicancias: 'Cada movimiento manual de caja (retiro, ingreso extra, pago a proveedor en efectivo) se registra con un concepto, lo que ordena el arqueo y los reportes de caja.',
		como_se_utiliza: 'Creá los conceptos que use tu operación y elegilos al registrar movimientos manuales en la caja.',
		palabras_clave: ['ingreso', 'egreso', 'retiro', 'arqueo', 'movimientos'],
	},
	singular_model_name_spanish: 'Concepto movimiento',
	plural_model_name_spanish: 'Concepto movimiento',
	create_model_name_spanish: 'Nuevo Concepto movimiento',
	text_delete: 'el',
}