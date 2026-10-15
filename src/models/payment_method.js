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
		 * Vínculo con las cuotas de la tienda (misión tienda-cuotas-mercado-pago, 15/10/2026).
		 *
		 * Es el método de pago de CUENTA CORRIENTE cuyas cuotas (ABM → Cuenta corriente → Cuotas,
		 * campo "Método de pago") se le ofrecen al comprador de la tienda cuando este método es de
		 * tipo Mercado Pago. Sin vínculo, o sin cuotas cargadas para ese método, el checkout de la
		 * tienda queda como siempre.
		 *
		 * 🔴 Se muestra SIEMPRE, sea cual sea el "Tipo", y la descripción del campo lo aclara. No se
		 * condiciona al tipo porque el `v_if` de array no filtra nada (showProperty() compara
		 * `typeof v_if == 'array'`, que nunca es cierto: el `v_if` de "Cuotas" de más abajo
		 * tampoco), y el id del tipo MercadoPago no es fijo (`payment_method_types` se siembra con
		 * firstOrCreate, sin ids garantizados). Ocultarlo bien pide un `v_if_function` que resuelva
		 * el tipo por NOMBRE en src/mixins/model_functions.js (como `mostrar_order_envio_resumen`).
		 *
		 * `value: 0` es el "Seleccione ..." del select: la API lo guarda como NULL (sin vínculo). La
		 * API asigna este campo solo si el request lo trae (patrón de `access_token`): una SPA vieja
		 * que no lo conoce no puede borrar el vínculo, y esta lo manda con lo que trajo la API.
		 */
		{
			text: 'Método de pago de cuenta corriente',
			key: 'current_acount_payment_method_id',
			type: 'select',
			store: 'current_acount_payment_method',
			value: 0,
			descriptions:
			[
				'Solo se usa con los métodos de tipo Mercado Pago. Elegí el método de pago de cuenta corriente cuyas cuotas querés ofrecer en la tienda.',
				'La tienda le muestra al comprador «Contado» y una opción «N cuotas de $X» por cada cuota que cargaste en ABM → Cuenta corriente → Cuotas para ESE método de pago (campo «Método de pago»), con su recargo ya incluido en el valor de cada cuota. Las cuotas genéricas (sin método de pago) no se ofrecen en la tienda.',
				'Si no elegís ninguno, o el método elegido no tiene cuotas cargadas, la tienda funciona como siempre. En un método que no es de Mercado Pago este campo no tiene efecto.',
			],
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
		implicancias: 'Son los medios de pago del checkout de la tienda: pueden tener descuento propio y cuotas configuradas. Las credenciales para cobrar con Mercado Pago ya no se cargan acá: salen de la conexión de ABM → Integraciones → Tienda online. No confundir con los Métodos de Pago de cuenta corriente, que son los del mostrador, aunque un método de Mercado Pago de la tienda se puede vincular con uno de cuenta corriente: las cuotas cargadas para ese método de cuenta corriente (ABM → Cuenta corriente → Cuotas) también se ofrecen en la tienda, cada una con su recargo ya incluido en el valor de la cuota. Sin vínculo, o sin cuotas cargadas para ese método, la tienda funciona como siempre.',
		como_se_utiliza: 'Creá el método con nombre, tipo y descuento si corresponde, y configurá las cuotas disponibles. Para que Mercado Pago cobre, conectá tu cuenta en ABM → Integraciones → Tienda online. Si querés ofrecer cuotas con recargo en la tienda, elegí en un método de tipo Mercado Pago el «Método de pago de cuenta corriente» que tiene esas cuotas cargadas.',
		palabras_clave: ['checkout', 'mercado pago', 'cuotas', 'tienda', 'cobro online', 'cuotas con recargo', 'vincular método de pago'],
	},
	singular_model_name_spanish: 'Metodo de pago',
	plural_model_name_spanish: 'Metodos de pago',
	create_model_name_spanish: 'Nuevo metodo de pago',
	text_delete: 'el',
}