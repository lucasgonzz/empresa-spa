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
			// Redibuja el formulario: de este select depende que aparezca el vínculo de más abajo.
			on_change: 'redibujar_formulario_al_cambiar',
		},
		/*
		 * Vínculo con las cuotas de la tienda (misión tienda-cuotas-mercado-pago, 15/10/2026).
		 *
		 * Es el método de pago de CUENTA CORRIENTE cuyas cuotas (ABM → Cuenta corriente → Cuotas,
		 * campo "Método de pago") se le ofrecen al comprador de la tienda cuando este método es de
		 * tipo Mercado Pago. Sin vínculo, o sin cuotas cargadas para ese método, el checkout de la
		 * tienda queda como siempre.
		 *
		 * 🔴 Solo se ve cuando el "Tipo" del método es MercadoPago, y eso lo decide
		 * `es_metodo_de_pago_de_mercado_pago` (src/mixins/model_functions.js), que resuelve el tipo
		 * por NOMBRE: el id de MercadoPago no es fijo (`payment_method_types` se siembra con
		 * firstOrCreate). Es `v_if_function` y no `v_if` porque showProperty() compara
		 * `typeof v_if == 'array'`, que nunca es cierto (el `v_if` de "Cuotas" de más abajo tampoco
		 * filtra nada). Y el select "Tipo" declara `on_change` porque este modelo no tiene
		 * `full_reactivity`: sin él, al elegir Mercado Pago el campo no aparecería hasta que algo
		 * más redibujara el formulario.
		 *
		 * 🔴 "Sin vínculo" es NULL, no 0: la API devuelve NULL para un método sin vínculo y, si la
		 * opción "Seleccione ..." valiera 0, el select quedaría EN BLANCO (ninguna opción coincide
		 * con null y el navegador deja `selectedIndex = -1`) en todos los métodos ya cargados. Por
		 * eso las opciones son propias (`dynamic_options_function`: las de siempre, pero con el
		 * "Seleccione ..." en null) y un método nuevo arranca en null (`value_function`: sin ella el
		 * motor le pone 0 a todo select sin `value`, ver display.js::getSelectAndCheckboxProps).
		 * Mismo patrón que `descuento_tipo` de combo.js. Elegir "Seleccione ..." manda null y la API
		 * lo guarda como NULL.
		 *
		 * La API asigna este campo solo si el request lo trae (patrón de `access_token`): una SPA
		 * vieja que no lo conoce no puede borrar el vínculo, y esta lo manda con lo que trajo la API.
		 * Si el método deja de ser de Mercado Pago, el campo se oculta pero el vínculo guardado
		 * queda; la tienda solo lo usa en los de tipo MercadoPago.
		 *
		 * 🔴 La ayuda es CORTA a propósito: el popover (`.model-form-help-popover`) no puede pasar de
		 * ~350 px de alto y lo importante (el aviso de las cuotas sin interés) quedaba cortado. El
		 * texto completo vive en `abm_descripcion`.
		 */
		{
			text: 'Método de pago de cuenta corriente',
			key: 'current_acount_payment_method_id',
			type: 'select',
			store: 'current_acount_payment_method',
			dynamic_options_function: 'metodos_de_pago_de_cuenta_corriente_para_vincular',
			value_function: 'metodo_de_pago_vinculado_inicial',
			v_if_function: 'es_metodo_de_pago_de_mercado_pago',
			descriptions:
			[
				'Elegí el método de cuenta corriente cuyas cuotas cargaste: se ofrecen en tu tienda, con el recargo ya incluido en cada cuota.',
				'Activá las «cuotas sin interés» en tu cuenta de Mercado Pago (Negocio → Costos y cuotas), o el comprador paga además el interés de Mercado Pago.',
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
		implicancias: 'Son los medios de pago del checkout de la tienda: pueden tener descuento propio y cuotas configuradas. Las credenciales para cobrar con Mercado Pago ya no se cargan acá: salen de la conexión de ABM → Integraciones → Tienda online. No confundir con los Métodos de Pago de cuenta corriente, que son los del mostrador, aunque un método de Mercado Pago de la tienda se puede vincular con uno de cuenta corriente: las cuotas cargadas para ese método de cuenta corriente (ABM → Cuenta corriente → Cuotas) también se ofrecen en la tienda, cada una con su recargo ya incluido en el valor de la cuota. Sin vínculo, o sin cuotas cargadas para ese método, la tienda funciona como siempre. Para que el comprador pague exactamente la cuota que ve en la tienda, tenés que activar las «cuotas sin interés» para esas cantidades en tu cuenta de Mercado Pago (Negocio → Costos y cuotas); si no, Mercado Pago le suma su propio interés encima. El recargo que cargás en las cuotas es el que cubre lo que Mercado Pago te descuenta por ofrecerlas.',
		como_se_utiliza: 'Creá el método con nombre, tipo y descuento si corresponde, y configurá las cuotas disponibles. Para que Mercado Pago cobre, conectá tu cuenta en ABM → Integraciones → Tienda online. Si querés ofrecer cuotas con recargo en la tienda, elegí en un método de tipo Mercado Pago el «Método de pago de cuenta corriente» que tiene esas cuotas cargadas, y activá las «cuotas sin interés» para esas cantidades en tu cuenta de Mercado Pago (Negocio → Costos y cuotas).',
		palabras_clave: ['checkout', 'mercado pago', 'cuotas', 'tienda', 'cobro online', 'cuotas con recargo', 'vincular método de pago'],
	},
	singular_model_name_spanish: 'Metodo de pago',
	plural_model_name_spanish: 'Metodos de pago',
	create_model_name_spanish: 'Nuevo metodo de pago',
	text_delete: 'el',
}