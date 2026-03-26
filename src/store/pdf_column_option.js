import base from '@/store/table_column_preference'

export default {
	...base,
	state: {
		...base.state,
		model_name: 'pdf_column_option',
		route_string: 'pdf-column-options',
	},
}

