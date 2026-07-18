export default {
	properties: [
		{
			// text: 'Nombre',
			key: 'cantidad_cuotas',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Descuento',
			key: 'descuento',
			type: 'number',
		},
		{
			text: 'Recargo',
			key: 'recargo',
			type: 'number',
		},
		/*
		 * Prompt 266 (Fase 2, Capa 3): metodo de pago (tarjeta) al que aplica esta regla de cuotas.
		 * Si se deja vacio, la regla es generica y aplica a cualquier metodo de pago con esa cantidad
		 * de cuotas (comportamiento actual). Si se elige un metodo, la regla especifica tiene
		 * precedencia sobre la generica para la misma cantidad de cuotas (ej: "Visa 3 cuotas +5%" vs
		 * "3 cuotas generico +3%").
		 */
		{
			text: 'Metodo de pago',
			key: 'payment_method_id',
			type: 'select',
			store: 'current_acount_payment_method',
			descriptions:
			[
				'Dejar vacio para aplicar a cualquier metodo de pago (regla generica).',
				'Si se elige un metodo, esta regla tiene prioridad sobre una generica con la misma cantidad de cuotas.',
			],
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define las opciones de cuotas de los planes de pago, con su descuento o recargo.',
		implicancias: 'Al armar un plan de pago en cuenta corriente, las opciones de cantidad de cuotas disponibles y su ajuste (descuento o recargo porcentual) salen de acá.',
		como_se_utiliza: 'Creá cada opción indicando la cantidad de cuotas y, si corresponde, el descuento o recargo que aplica. Se usan al generar planes de pago para los clientes.',
		palabras_clave: ['plan de pago', 'financiacion', 'cuotas', 'recargo', 'interes'],
	},
	singular_model_name_spanish: 'Cuota',
	plural_model_name_spanish: 'Cuotas',
	create_model_name_spanish: 'Nueva Cuota',
	text_delete: 'la',
}