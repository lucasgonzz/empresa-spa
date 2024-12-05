export default {
	computed: {
		properties_to_show() {
			return [
				{
					text: 'N°',
					key: 'num',
					type: 'number',
					not_show_on_form: true,
					filter_modal_position: 1,
				},
				{
					text: 'Total',
					key: 'total',
					type: 'number',
					only_show: true,
					function: 'totalSale',
				},
				{
					text: 'Hora',
					key: 'hora',
					function: 'get_hora',
					only_show: true,
					no_usar_en_filtros: true,
				},
				{
					text: 'Cliente',
					key: 'client_id',
					type: 'search',
					store: 'client',
					only_show: true,
					v_if: ['client_id', '!=', null],
					button: {
						function: 'showClientCurrentAcount',
					},
					filter_modal_position: 2,
				},
				{
					text: 'Empleado',
					key: 'employee_id',
					type: 'search',
					only_show: true,
				},
			]
		},
	}
}