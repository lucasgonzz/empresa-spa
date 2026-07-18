export default {
	properties: [
		{
			text: 'Caja',
			key: 'caja_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Metodo de pago',
			key: 'current_acount_payment_method_id',
			store: 'current_acount_payment_method',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Direccion',
			select_prop_name: 'street',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			relation_prop_name: 'street',
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			type: 'select',
			use_store_models: true,
		},

	],
	abm_descripcion: {
		para_que_sirve: 'Define a qué caja entra el dinero según el método de pago con que se cobra, pudiendo diferenciar por sucursal y empleado.',
		implicancias: 'Al cobrar una venta, el sistema dirige el dinero a la caja configurada para ese método de pago. Permite, por ejemplo, que el efectivo vaya a la caja física y las transferencias a una caja bancaria.',
		como_se_utiliza: 'Creá el registro combinando caja, método de pago y, si hace falta, sucursal y empleado. El sistema lo aplica automáticamente en cada cobro.',
		palabras_clave: ['caja', 'destino del dinero', 'cobros', 'sucursal'],
	},
	singular_model_name_spanish: 'Caja por defecto',
	plural_model_name_spanish: 'Cajas por defecto',
	create_model_name_spanish: 'Nueva Caja por defecto',
	text_delete: 'la',
}