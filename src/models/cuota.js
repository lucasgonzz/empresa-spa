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
				'Si es el método vinculado a Mercado Pago en tu tienda, estas cuotas también se ofrecen ahí.',
			],
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define las opciones de cuotas de los planes de pago, con su descuento o recargo.',
		implicancias: 'Al armar un plan de pago en cuenta corriente, las opciones de cantidad de cuotas disponibles y su ajuste (descuento o recargo porcentual) salen de acá. Las cuotas cargadas para un método de pago de cuenta corriente también se ofrecen en la tienda online cuando el método de Mercado Pago de la tienda está vinculado con ese método de pago (ABM → Tienda online → Métodos de pago): el comprador ve «N cuotas de $X», con el recargo ya incluido en cada cuota. Solo se ofrecen las que tienen un método de pago elegido y un ajuste neto (recargo menos descuento) de cero o más; las genéricas no. Para que el comprador pague exactamente la cuota que ve en la tienda, activá las «cuotas sin interés» para esas cantidades en tu cuenta de Mercado Pago (Negocio → Costos y cuotas); si no, Mercado Pago le suma su propio interés encima. El recargo que cargás acá es el que cubre lo que Mercado Pago te descuenta por ofrecer esas cuotas.',
		como_se_utiliza: 'Creá cada opción indicando la cantidad de cuotas y, si corresponde, el descuento o recargo que aplica. Se usan al generar planes de pago para los clientes. Para ofrecerlas también en la tienda, elegí el método de pago en cada cuota y, en ABM → Tienda online → Métodos de pago, vinculá tu método de Mercado Pago con ese mismo método.',
		palabras_clave: ['plan de pago', 'financiacion', 'cuotas', 'recargo', 'interes', 'tienda', 'mercado pago', 'cuotas en la tienda'],
	},
	singular_model_name_spanish: 'Cuota',
	plural_model_name_spanish: 'Cuotas',
	create_model_name_spanish: 'Nueva Cuota',
	text_delete: 'la',
}