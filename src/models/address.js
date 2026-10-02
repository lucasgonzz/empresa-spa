export default {
	properties: [
		{
			text: 'Nombre',
			key: 'street',
			type: 'text',
			value: '',
			use_in_select: true,
			is_title: true,
		},
		{
			text: 'Domicilio',
			key: 'street_number',
			type: 'text',
			value: '',
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
			value: '',
		},
		{
			text: 'Email',
			key: 'email',
			type: 'text',
			value: '',
		},
		{
			text: 'Ciudad',
			key: 'city',
			type: 'text',
			value: '',
		},
		{
			text: 'Provincia',
			key: 'province',
			type: 'text',
			value: '',
		},
		{
			text: 'Deposito por defecto',
			key: 'default_address',
			type: 'checkbox',
			value: 0,
			description: 'Si se marca, este deeposito se ofrecera como opcion por defecto a la hora de indicar el deposito para cualquier articulo',
		},
		{
			/**
			 * Origen preferente de reposicion para las sugerencias inteligentes de
			 * stock (columna addresses.es_deposito_origen). Es un concepto distinto
			 * de default_address (que solo preselecciona el destino en algunos
			 * formularios): aca se marca desde donde conviene sacar mercaderia
			 * cuando el sistema sugiere movimientos entre sucursales. Puede haber
			 * varias sucursales marcadas, o ninguna (y todo funciona como siempre).
			 */
			text: 'Deposito de origen para sugerencias',
			key: 'es_deposito_origen',
			type: 'checkbox',
			value: 0,
			if_has_extencion: 'sugerencias_inteligentes',
			description: 'Si se marca, las sugerencias inteligentes de stock van a preferir esta sucursal como origen de los movimientos. Si ninguna sucursal esta marcada, el origen se elige por stock como siempre.',
		},
		{
			/**
			 * Vincula la sucursal con el afip_information que se usa por defecto al facturar
			 * ventas en negro desde acá (prompt 440, columna default_afip_information_id
			 * agregada en el prompt 438). Las opciones son SOLO los afip_information que
			 * pertenecen a esta sucursal (address.afip_informations); si se deja vacío,
			 * el backend cae al afip_information del dueño del negocio.
			 */
			text: 'Facturación por defecto (ventas en negro)',
			key: 'default_afip_information_id',
			type: 'select',
			value: null,
			// options: [] intencional (mismo patrón que sale_factura_print_option en user.js):
			// evita que FieldSelectInput monte el componente genérico de relación por "*_id".
			// Las opciones reales las calcula dynamic_options_function con las afip_information
			// propias de esta sucursal.
			options: [],
			dynamic_options_function: 'get_address_default_afip_information_options',
			disabled_function: 'is_address_default_afip_information_disabled',
			warning_function: 'address_default_afip_information_warning_text',
			descriptions: [
				'Cuando se hace una venta en negro desde esta sucursal y no se especifica la información de facturación, los datos fiscales del comprobante (razón social, domicilio, CUIT, ingresos brutos, etc.) se toman del afip_information que elijas acá. Si lo dejás vacío, se usa la facturación por defecto del negocio.',
			],
		},
		{
			/**
			 * Recargo o descuento propio de la sucursal (columnas addresses.ajuste_precio_tipo y
			 * addresses.ajuste_precio_porcentaje, mision sucursal-recargo-descuento). Cuando en
			 * Vender se elige esta sucursal, el porcentaje se mete en el precio de CADA articulo,
			 * combo y promocion (mixins/generals.js::getPriceVender), no en el total.
			 *
			 * options: [] intencional, igual que default_afip_information_id y modo_redondeo de
			 * user.js: con `options` fijas getOptions() antepone una opcion `0 "Seleccione ..."`
			 * que aca sobra y que la API rechazaria (tipo desconocido). Las opciones reales las
			 * arma dynamic_options_function, y "Sin ajuste" va con value null: asi el ABM manda
			 * null y la API borra las dos columnas.
			 *
			 * 🔴 NO hay on_change ni v_if_function que oculten o vacien el porcentaje al elegir "Sin
			 * ajuste". Se probo asi y no anda: el modelo address no declara full_reactivity, asi que
			 * el formulario recibe una copia plana ({...model}) y el $set sobre ella no avisa a un
			 * v_if_function que lee otra clave: el campo del porcentaje no aparecia al elegir un
			 * tipo (misma trampa que descuento_tipo de combo.js y article_price_range.js). Tampoco
			 * se activa full_reactivity: el formulario editaria la fila del store por referencia, y
			 * cerrar el modal sin guardar dejaria en address.models un ajuste sin guardar que
			 * Vender aplicaria a los precios. El porcentaje se ve SIEMPRE, y la API (que exige las
			 * dos columnas o ninguna) responde 422 con un mensaje claro si queda un porcentaje con
			 * "Sin ajuste" o un tipo sin porcentaje.
			 *
			 * 🔴 value_function: sin ella, al crear una sucursal NUEVA el motor le pone 0 a todo select
			 * sin `value` (common-vue/mixins/display.js::getSelectAndCheckboxProps; un `value: null`
			 * es falsy y no alcanza) y la API rechaza un tipo 0 con un 422. Mismo patron que
			 * descuento_tipo de combo.js.
			 */
			text: 'Ajuste de precios',
			key: 'ajuste_precio_tipo',
			type: 'select',
			value: null,
			value_function: 'address_ajuste_precio_tipo_inicial',
			options: [],
			dynamic_options_function: 'get_address_ajuste_precio_options',
			descriptions: [
				'Si cargás un recargo o un descuento, cuando elijas esta sucursal en Vender los precios de los artículos, combos y promociones ya lo llevan adentro. No se suma ni se resta al total de la venta. Los servicios y los precios que escribas a mano no se modifican.',
				'Las ventas y presupuestos que ya están guardados no cambian.',
			],
		},
		{
			/**
			 * Porcentaje del ajuste de arriba (addresses.ajuste_precio_porcentaje). Se ve siempre, con
			 * o sin tipo elegido (ver el porque en el comentario de "Ajuste de precios"): con "Sin
			 * ajuste" hay que dejarlo vacio, y si no la API responde con un 422 que el ABM muestra
			 * en el aviso del modal. La API lo devuelve como string decimal ("10.00") y acepta coma
			 * o punto al guardar (el ABM ya convierte la coma).
			 */
			text: 'Porcentaje del ajuste',
			key: 'ajuste_precio_porcentaje',
			type: 'number',
			value: null,
			descriptions: [
				'Porcentaje que se aplica sobre el precio de cada artículo, combo y promoción cuando se vende desde esta sucursal. Por ejemplo, con 10: un artículo de $1.000 se vende a $1.100 si es un recargo, o a $900 si es un descuento.',
				'Dejalo vacío si elegís "Sin ajuste".',
			],
		},
		{
			/**
			 * Logo propio de la sucursal (columna addresses.image_url, tarea 17).
			 * La subida la resuelve el endpoint generico set-image/{prop}, el mismo que
			 * usa la imagen de una marca (src/models/brand.js): por eso alcanza con
			 * declarar type: 'image' y no hay nada de carga de archivos aca.
			 */
			text: 'Logo',
			key: 'image_url',
			type: 'image',
			value: '',
			descriptions: [
				'Si cargás un logo acá, se usa en los comprobantes de esta sucursal en lugar del logo del negocio. Si lo dejás vacío, se sigue usando el logo del negocio.',
			],
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Registra las sucursales y depósitos del negocio con sus datos de contacto.',
		implicancias: 'Las sucursales estructuran gran parte del sistema: el stock se maneja por sucursal, las ubicaciones de artículos pertenecen a una sucursal, las cajas por defecto pueden diferenciarse por sucursal y cada una puede tener su facturación ARCA por defecto. Además, una sucursal puede llevar un recargo o un descuento en porcentaje: cuando se elige en Vender, los precios de los artículos, combos y promociones ya lo llevan adentro (no se aplica al total). El depósito por defecto es el que se ofrece al cargar artículos.',
		como_se_utiliza: 'Creá cada sucursal con nombre, domicilio y contacto. Marcá una como depósito por defecto y, si corresponde, asignale su punto de venta ARCA por defecto. Si en esa sucursal se vende más caro o más barato, elegí Recargo o Descuento en "Ajuste de precios" y cargá el porcentaje.',
		palabras_clave: ['deposito', 'locales', 'domicilio', 'puntos de venta', 'recargo', 'descuento', 'ajuste de precios'],
	},
	singular_model_name_spanish: 'Sucursal',
	plural_model_name_spanish: 'Sucursales',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}