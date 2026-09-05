export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: true,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'textarea',
			value: '',
			show: true,
			required: false,
		},
		{
			text: 'Descuento',
			key: 'discount',
			type: 'number',
			value: '',
		},
		{
			text: 'Tipo',
			key: 'payment_method_type_id',
			type: 'select',
			value: 0,
			show: true,
		},
		/*
		 * 🔴 Aca vivian "Clave publica" (public_key) y "Clave privada" (access_token).
		 * Se sacaron: las credenciales de Mercado Pago dejaron de pegarse a mano en un
		 * formulario y salen del OAuth, en ABM -> Integraciones -> Tienda online.
		 *
		 * Las columnas NO se borraron de la base: la tienda las sigue leyendo como respaldo
		 * mientras las dos puntas no esten desplegadas. Lo unico que ya no se puede hacer
		 * desde el ERP es editarlas.
		 */
		{
			key: 'payment_method_installments',
			text: 'Cuotas',
			v_if: ['payment_method_type_id', '=', 2],
			has_many: {
				text: 'Cuotas',
				model_name: 'payment_method_installment',
			},
		}

	],
	abm_descripcion: {
		para_que_sirve: 'Define los métodos de pago que ofrece la tienda online a los compradores.',
		implicancias: 'Son los medios de pago del checkout de la tienda: pueden tener descuento propio y cuotas configuradas. Las credenciales para cobrar con Mercado Pago ya no se cargan acá: salen de la conexión de ABM → Integraciones → Tienda online. No confundir con los Métodos de Pago de cuenta corriente, que son los del mostrador.',
		como_se_utiliza: 'Creá el método con nombre, tipo y descuento si corresponde, y configurá las cuotas disponibles. Para que Mercado Pago cobre, conectá tu cuenta en ABM → Integraciones → Tienda online.',
		palabras_clave: ['checkout', 'mercado pago', 'cuotas', 'tienda', 'cobro online'],
	},
	singular_model_name_spanish: 'Metodo de pago',
	plural_model_name_spanish: 'Metodos de pago',
	create_model_name_spanish: 'Nuevo metodo de pago',
	text_delete: 'el',
}