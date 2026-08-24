export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			key: 'saldo',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			use_store_models: true,
			value: 1,
			if_has_extencion: 'ventas_en_dolares',
		},
		{
			text: 'Sucursal/Deposito',
			key: 'address_id',
			type: 'select',
			relation_prop_name: 'street',
			use_store_models: true,
			// if_has_extencion: 'resumen_caja',
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			type: 'select',
			use_store_models: true,
			descriptions: [
				'Complete solo en caso de que quiera asignar esta caja a un unico empleado',
			]
			// if_has_extencion: 'resumen_caja',
		},
		{
			text: 'Fecha apertura',
			key: 'abierta_at',
			type: 'date',
			is_date: true,
			only_show: true,
		},
		{
			text: 'Fecha cierre',
			key: 'cerrada_at',
			type: 'date',
			is_date: true,
			only_show: true,
		},
		{
			// Grupo 371: la columna muestra la pildora de EstadoCaja.vue, no el "Si"/"No" de
			// propertyText(). Sin `text`, propText() cae al fallback (la key capitalizada) y el
			// encabezado decia "Abierta" arriba de una pildora que dice "Cerrada".
			text: 'Estado',
			key: 'abierta',
			type: 'checkbox',
			only_show: true,
		},
		// {
		// 	text: 'Metodos de pago vinculados',
		// 	store: 'current_acount_payment_method',
		// 	search_on_models_by: 'name',
		// 	type: 'search',
		// 	key: 'current_acount_payment_methods',
		// 	belongs_to_many: {
		// 		model_name: 'current_acount_payment_method',
		// 	}
		// },
		{
			text: 'Empleados con acceso',
			store: 'employee',
			search_on_models_by: 'name',
			type: 'search',
			key: 'users',
			belongs_to_many: {
				model_name: 'users',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					}
				],
			}
		},
		{
			text: 'Visibilidad en tesorería',
			store: 'employee',
			search_on_models_by: 'name',
			type: 'search',
			key: 'treasury_users',
			descriptions: [
				'Si no agrega empleados aquí, se usa la lista de «Empleados con acceso». Si ambas listas quedan vacías, todos los empleados ven la caja en tesorería.',
			],
			belongs_to_many: {
				model_name: 'users',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					}
				],
			}
		},
		// Grupo 223 · Prompt 03: sección "Liquidación y comisiones" (contraparte de frontend del
		// prompt 02, que ya implementó el cálculo en el backend). El separador `group_title` agrupa
		// estos campos aparte de los operativos de la caja (mismo mecanismo que usa expense.js).
		{
			group_title: 'Liquidación y comisiones',
		},
		{
			text: 'Días de liquidación',
			key: 'dias_liquidacion',
			type: 'number',
			descriptions: [
				'En cuántos días la plata cobrada por esta caja queda realmente disponible. Dejalo vacío si la plata está disponible al instante, como en efectivo.',
			],
		},
		{
			text: '% de comisión',
			key: 'comision_porcentaje',
			type: 'number',
			descriptions: [
				'Qué porcentaje se queda la entidad (Mercado Pago, el banco) por cada cobro. Se descuenta del monto para calcular lo que realmente te queda.',
			],
		},
		{
			text: 'Concepto de gasto de la comisión',
			key: 'expense_concept_id',
			type: 'select',
			use_store_models: true,
			descriptions: [
				'Con qué concepto se registra el gasto automático de la comisión.',
			],
		},
		{
			text: 'El % de comisión ya incluye IVA',
			key: 'comision_iva_incluido',
			type: 'checkbox',
			value: 0,
			descriptions: [
				'Marcalo si el porcentaje que cargaste ya tiene el IVA adentro. Si no, el sistema le suma el IVA.',
			],
		},
		{
			text: 'Alícuota de IVA de la comisión',
			key: 'comision_iva_alicuota',
			type: 'number',
			value: 21,
			descriptions: [
				'Alícuota de IVA de la comisión. Normalmente 21%.',
			],
		},
	],
	// Documentación del modelo (abm_descripcion), mismo patrón que concepto_movimiento_caja.js.
	// La caja no tenía esta sección antes del Grupo 223; se agrega ahora porque el prompt pide
	// documentar el nuevo comportamiento de liquidación/comisión de forma completa.
	abm_descripcion: {
		para_que_sirve: 'Define dónde entra el dinero de los cobros y, desde el Grupo 223, cómo y cuándo se libera esa plata (días de liquidación) y cuánto se descuenta por comisión de la entidad que cobra (Mercado Pago, el banco).',
		implicancias: 'Configurar días de liquidación y comisión en una caja hace que el sistema calcule tres saldos distintos (contable, disponible y a liquidar) y registre automáticamente el gasto de la comisión. Una caja sin configurar (ej. efectivo) sigue comportándose exactamente igual que antes: liquidación inmediata, sin comisión.',
		como_se_utiliza: 'Completá días de liquidación y % de comisión si esta caja corresponde a un medio de cobro que tarda en acreditar (ej. Mercado Pago). Si necesitás un valor distinto según el método de pago dentro de la misma caja, usá el override por método de pago.',
		palabras_clave: ['liquidación', 'comisión', 'saldo disponible', 'saldo a liquidar', 'IVA'],
	},
	singular_model_name_spanish: 'Caja',
	plural_model_name_spanish: 'Cajas',
	create_model_name_spanish: 'Nueva Caja',
	color_display_function: true,
	text_delete: 'la',
}