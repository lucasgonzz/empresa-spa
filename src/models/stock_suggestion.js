export default {
	properties: [
		{
			text: 'Objetivo',
			key: 'modo',
			type: 'select',
			options: [
				'minimo',
				'ideal',
			],
			description: '¿Hasta dónde querés completar el stock en cada depósito?',
			descriptions: [
				'MINIMO: Se sugiere stock solo si el depósito está por debajo del stock mínimo definido. Usar en situaciones de emergencia o baja disponibilidad.',
				'IDEAL: Se sugiere stock para llevar el depósito al valor ideal, calculado como (mínimo + máximo) / 2. Usar si querés mantener los depósitos balanceados.',
			]
		},
		{
			text: 'Origen',
			key: 'origen',
			type: 'select',
			options: [
				'absoluto',
				'relativo',
			],
			description: '¿Cómo elegir el depósito desde el cual mover stock?',
			descriptions: [
				'ABSOLUTO: El sistema elige el depósito con mayor cantidad absoluta de stock. El que más tiene en total.',
				'RELATIVO: El sistema elige el depósito con el porcentaje más alto respecto a su stock máximo. El que más lleno está según su capacidad.',
			]
		},
		{
			text: 'Limite origen',
			key: 'limite_origen',
			type: 'select',
			options: [
				'minimo',
				'ideal',
				'sin_limite',
			],
			description: '¿Hasta dónde permitir vaciar el depósito origen?',
			descriptions: [
				'MINIMO: No se mueve stock si eso deja al depósito por debajo de su stock mínimo. Protege el stock mínimo del origen.',
				'IDEAL: Se puede mover stock incluso si eso baja el depósito hasta su nivel ideal. Permite vaciar hasta un punto óptimo.',
				'SIN LIMITE: Se puede mover todo el stock necesario, aunque deje vacío el depósito origen. Usar solo si necesitás abastecer otros depósitos urgentemente.',
			]
		},
	],
	singular_model_name_spanish: 'Sugerencia de Stock',
	plural_model_name_spanish: 'Sugerencias de Stock',
	create_model_name_spanish: 'Nueva Sugerencia de Stock',
	text_delete: 'la',
	color_display_function: true,
}