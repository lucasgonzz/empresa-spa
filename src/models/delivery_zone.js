/*
	Formas de envío propias de la tienda online (tabla `delivery_zones`).

	Hasta la misión formas-envio-direcciones-maps (19/10/2026) se llamaban "Zonas de envío" y eran
	solo un nombre con un precio. Ahora son las formas de envío a domicilio que crea el comercio,
	además del envío por correo con Zipnova, y tienen dos variantes:

	 - Con precio fijo ("Reparto en la ciudad", $ 3.000): el precio se suma al total del pedido.
	 - Con el costo a convenir (`costo_a_convenir`, p. ej. "Acordar con el vendedor"): la tienda no
	   cobra nada por el envío y muestra "A coordinar con el vendedor"; el vendedor acuerda la
	   entrega y el costo con el comprador cuando gestiona el pedido. En el ERP se ve "A convenir".

	🔴 Con `costo_a_convenir` tildado la API guarda `price = 0` (DeliveryZoneController): una tienda
	vieja, que no conoce la columna, cobraría el precio guardado. Por eso el Precio se esconde en el
	formulario al tildarlo, y la columna "Costo" de la tabla dice "A convenir" en vez de "$ 0".

	🔴 El plural queda "Zonas de envio" A PROPÓSITO: Abm.vue arma el segmento de la URL con el plural, y
	/abm/tienda-online/zonas-de-envio lo usan el asistente IA (CatalogoDeEscrituraIaHelper) y el clip
	T9.39 del centro de recursos. La solapa se ve como "Formas de envío" por `nombres` en
	src/mixins/abm.js, el mismo mecanismo que usa Integraciones.
*/
export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: true,
			description: 'El nombre con el que el comprador ve esta forma de envío al finalizar el pedido en la tienda. Por ejemplo: "Reparto en la ciudad" o "Acordar con el vendedor".',
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
			/*
				Va antes del Precio a propósito: es lo que decide si el Precio se carga. Redibuja el
				formulario al cambiar (`redibujar_al_cambiar`) porque el Precio se muestra o se
				esconde con un `v_if_function` que lee esta clave, y el modelo del formulario es una
				copia que Vue no observa (ver ModelForm::al_cambiar_interruptor). `not_show`: en la
				tabla lo resume la columna "Costo".

				Solo se ofrece si la API tiene la columna (`mostrar_costo_a_convenir`, en
				src/mixins/model_functions.js): contra una API vieja la casilla se tildaría y no se
				guardaría, y la forma quedaría cobrando el precio.
			*/
			text: 'El costo se coordina con el comprador (no se cobra en la tienda)',
			key: 'costo_a_convenir',
			type: 'checkbox',
			not_show: true,
			redibujar_al_cambiar: true,
			v_if_function: 'mostrar_costo_a_convenir',
			description: 'Si lo tildás, la tienda no le cobra nada al comprador por el envío y le muestra "A coordinar con el vendedor". Vos acordás la entrega y el costo con el comprador cuando gestionás el pedido (por WhatsApp o por teléfono). Sirve, por ejemplo, para una forma "Acordar con el vendedor". Si ya tenés pedidos con esta forma, conviene crear una nueva en lugar de cambiarla: el cambio también se ve en los pedidos anteriores.',
		},
		{
			// Solo cuando la forma cobra un precio fijo (ver `delivery_zone_cobra_precio`, en
			// src/mixins/model_functions.js). En la tabla lo muestra la columna "Costo".
			text: 'Precio',
			key: 'price',
			type: 'number',
			value: '',
			not_show: true,
			v_if_function: 'delivery_zone_cobra_precio',
			description: 'Lo que se le suma al total del pedido cuando el comprador elige esta forma de envío.',
		},
		{
			// Columna de la tabla, solo lectura: el precio, o "A convenir" si el costo se coordina
			// con el comprador. No es una columna de la base: no viaja al guardar.
			text: 'Costo',
			key: 'costo_texto',
			function: 'getDeliveryZoneCostoTexto',
			not_show_on_form: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define tus propias formas de envío a domicilio para la tienda online, además del envío por correo con Zipnova. Cada forma puede cobrar un precio fijo (por ejemplo, "Reparto en la ciudad") o dejar el costo a coordinar con el comprador (por ejemplo, "Acordar con el vendedor").',
		implicancias: 'El comprador elige la forma de envío al finalizar el pedido. Si la forma tiene precio, ese precio se suma al total de la compra. Si tildás "El costo se coordina con el comprador", la tienda no cobra nada por el envío y le muestra "A coordinar con el vendedor": vos acordás la entrega y el costo cuando gestionás el pedido. Ninguna forma propia genera envíos en Zipnova.',
		como_se_utiliza: 'Creá cada forma con un nombre y, si querés, una descripción. Después, o cargás el precio, o tildás "El costo se coordina con el comprador (no se cobra en la tienda)". Para que el comprador las vea tiene que estar activado "Ofrecer opcion de envio en la Tienda" en la configuración de la tienda online; ahí mismo podés destildar "Ofrecer envío por correo con Zipnova" para ofrecer solo tus formas propias.',
		palabras_clave: ['envio', 'formas de envio', 'costo', 'reparto', 'zonas', 'a convenir', 'acordar con el vendedor', 'tienda'],
	},
	singular_model_name_spanish: 'Forma de envío',
	plural_model_name_spanish: 'Zonas de envio',
	create_model_name_spanish: 'Nueva forma de envío',
	text_delete: 'la',
}