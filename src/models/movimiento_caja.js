export default {
	properties: [
		{
			text: 'Concepto Movimiento',
			key: 'concepto_movimiento_caja_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Hora',
			key: 'hora',
			type: 'date',
			only_show: true,
			function: 'get_hora_from_created_at',
		},
		{
			text: 'Fecha',
			key: 'created_at',
			type: 'date',
			only_show: true,
			is_date: true,
		},
		{
			text: 'Ingreso',
			key: 'ingreso',
			type: 'number',
			is_price: true,
			descriptions: [
				'Plata que ENTRA a la caja. Cargá el monto acá o en Egreso, nunca en los dos.',
			],
		},
		{
			text: 'Egreso',
			key: 'egreso',
			type: 'number',
			is_price: true,
			descriptions: [
				'Plata que SALE de la caja. Cargá el monto acá o en Ingreso, nunca en los dos.',
			],
		},
		{
			text: 'Saldo',
			key: 'saldo',
			type: 'number',
			only_show: true,
			is_price: true,
		},
		{
			text: 'Notas',
			key: 'notas',
			type: 'textarea',
		},
	],
	// Documentación del modelo (abm_descripcion), mismo patrón que caja.js. La consume el
	// buscador de ABMs (common-vue/components/abm-search/Index.vue).
	abm_descripcion: {
		para_que_sirve: 'Registra la plata que entra y sale de una caja durante una apertura. La mayoría de los movimientos los genera el sistema solo (ventas, gastos, pagos de cuenta corriente); acá se cargan a mano los que no vienen de ninguna de esas operaciones.',
		implicancias: 'Cada movimiento actualiza el saldo de la caja y queda atado a la apertura en curso. Los movimientos de una apertura ya cerrada no se pueden editar: para corregir algo hay que reabrir esa apertura desde el modal de Aperturas.',
		como_se_utiliza: 'Abrí Movimientos desde la fila de la caja en Tesorería y cargá un movimiento nuevo con su concepto. El monto va en Ingreso o en Egreso, nunca en los dos: Ingreso es plata que entra, Egreso plata que sale.',
		palabras_clave: ['caja', 'ingreso', 'egreso', 'saldo', 'apertura', 'tesorería'],
	},
	singular_model_name_spanish: 'Movimiento de Caja',
	plural_model_name_spanish: 'Movimientos de Caja',
	create_model_name_spanish: 'Nuevo Movimiento de Caja',
	text_delete: 'el',
}
