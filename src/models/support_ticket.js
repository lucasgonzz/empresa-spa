export default {
	/**
	 * Propiedad principal usada en modales/listados del modelo.
	 */
	prop_to_show: 'name',
	/**
	 * Definición declarativa de campos del ticket de soporte.
	 */
	properties: [
		{
			key: 'name',
			text: 'Nombre',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			key: 'status',
			text: 'Estado',
			type: 'select',
			value: 'open',
			values: [
				{ id: 'open', name: 'Abierto' },
				{ id: 'closed', name: 'Cerrado' },
			],
		},
	],
}

