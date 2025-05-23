export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'N° de documento',
			key: 'doc_number',
			type: 'text',
			show: true,
		},
		{
			text: 'Ingreso',
			key: 'login_at',
			type: 'date',
			is_date: true,
			show_full_date: true,
			only_show: true,
		},
		{
			text: 'Egreso',
			key: 'logout_at',
			type: 'date',
			is_date: true,
			show_full_date: true,
			only_show: true,
		},
		{
			text: 'Contraseña',
			key: 'visible_password',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Version por defecto',
			key: 'default_version',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Version estable',
			key: 'estable_version',
			type: 'text',
			not_show: true,
		},
		{
			text: 'Acceso de ADMINISTRADOR',
			key: 'admin_access',
			type: 'checkbox',
			description: 'Si se activa, el usuario tendra el mismo nivel de acceso al sistema que la cuenta administrador, por lo que no hara falta asignar permisos, ya que los tendra a todos.'
		},
		{
			text: 'Dias a partir de los cuales alertar sobre las ventas no cobradas',
			key: 'dias_alertar_empleados_ventas_no_cobradas',
			type: 'number',
			description: 'Si se deja en blanco, va a ser el valor que se establecio desde la configuracion para todos los empleados',
			not_show: true,
		},
		{
			text: 'Ver las ventas no cobradas de TODOS los empleados',
			key: 'ver_alertas_de_todos_los_empleados',
			type: 'checkbox',
			description: 'Si no se activa, solo podra ver las alertas sin cobrar de SUS PROPIAS VENTAS. Si se activa, vera las alertas de TODOS los empleados',
			not_show: true,
		},
		{
			text: 'Sucursal',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Perfil de Vendedor',
			key: 'seller_id',
			type: 'select',
			use_store_models: true,
		},
		{
			key: 'puede_guardar_ventas_sin_cliente',
			type: 'checkbox',
			if_has_extencion: 'check_guardar_ventas_con_cliente',
		},
		{
			text: 'Permisos',
			key: 'permissions',
			type: 'checkbox',
			store: 'permission',
			belongs_to_many: {
				order_by: 'model_name',
			}
		},
	],
	singular_model_name_spanish: 'Empleado',
	plural_model_name_spanish: 'Empleados',
	create_model_name_spanish: 'Nuevo empleado',
	text_delete: 'el',
	full_reactivity: true,
}