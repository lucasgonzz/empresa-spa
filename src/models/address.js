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
			 *
			 * Desde la misión deposito-madre (2/10/2026), si hay un depósito madre
			 * (es_deposito_madre, abajo) el madre manda: esta marca solo ordena los
			 * orígenes de respaldo, que se usan cuando el madre no alcanza o no
			 * tiene el artículo. Sin madre, todo sigue exactamente como antes.
			 */
			text: 'Deposito de origen para sugerencias',
			key: 'es_deposito_origen',
			type: 'checkbox',
			value: 0,
			if_has_extencion: 'sugerencias_inteligentes',
			description: 'Si se marca, las sugerencias inteligentes de stock van a preferir esta sucursal como origen de los movimientos. Si ninguna sucursal está marcada, el origen se elige por stock como siempre. Si hay un depósito madre, esta marca se usa solo cuando el madre no alcanza o no tiene el artículo: entre las sucursales a las que les sobra stock, primero se saca de las marcadas acá.',
		},
		{
			/**
			 * Depósito madre de las sugerencias inteligentes de stock (columna
			 * addresses.es_deposito_madre, misión deposito-madre, 2/10/2026).
			 *
			 * A diferencia de es_deposito_origen (que puede estar en varias
			 * sucursales), el madre es UNO solo: lo garantiza empresa-api, que al
			 * marcar una sucursal desmarca las demás en la base. Con madre, las
			 * sugerencias salen primero desde acá y, cuando no alcanza para todas,
			 * se reparte primero a las sucursales que más venden (el criterio es
			 * sugerencias_prioridad_destino, en src/models/user.js).
			 *
			 * Como la notificación de modelo del backend está apagada, el tilde
			 * viejo de la sucursal que dejó de ser madre lo saca del store la
			 * mutación add de src/store/address.js.
			 *
			 * Gateo con if_has_alguna_extencion (OR, el mismo mecanismo que usan
			 * peso y medidas en article.js): lo ve quien tenga
			 * sugerencias_inteligentes o asistente_ia, porque las sugerencias de
			 * stock también salen en la carpeta Stock del mostrador.
			 */
			text: 'Depósito madre',
			key: 'es_deposito_madre',
			type: 'checkbox',
			value: 0,
			if_has_alguna_extencion: ['sugerencias_inteligentes', 'asistente_ia'],
			descriptions: [
				'Solo una sucursal puede ser el depósito madre: si marcás otra, esta deja de serlo.',
				'Las sugerencias de stock salen primero desde acá hacia las demás sucursales. Si el depósito madre no alcanza o no tiene el artículo, se completa con las sucursales a las que les sobra.',
				'Cuando no alcanza para todas, se reparte primero a las sucursales que más venden. Cómo se mide eso lo elegís en Configuración general, en el grupo "Sugerencias inteligentes de stock".',
			],
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
		implicancias: 'Las sucursales estructuran gran parte del sistema: el stock se maneja por sucursal, las ubicaciones de artículos pertenecen a una sucursal, las cajas por defecto pueden diferenciarse por sucursal y cada una puede tener su facturación ARCA por defecto. El depósito por defecto es el que se ofrece al cargar artículos.',
		como_se_utiliza: 'Creá cada sucursal con nombre, domicilio y contacto. Marcá una como depósito por defecto y, si corresponde, asignale su punto de venta ARCA por defecto.',
		palabras_clave: ['deposito', 'locales', 'domicilio', 'puntos de venta'],
	},
	singular_model_name_spanish: 'Sucursal',
	plural_model_name_spanish: 'Sucursales',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}