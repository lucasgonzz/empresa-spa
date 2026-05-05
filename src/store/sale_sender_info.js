import __base_store from '@/store/__base_store'

/**
 * Store CRUD de remitentes para cabecera de etiqueta de envío (SaleSenderInfo).
 */
export default __base_store({
	state: {
		model_name: 'sale_sender_info',
		per_page: 50,
	},
})
