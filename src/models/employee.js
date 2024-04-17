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
			text: 'Contraseña',
			key: 'visible_password',
			type: 'text',
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
		},
		{
			text: 'Ver las ventas no cobradas de TODOS los empleados',
			key: 'ver_alertas_de_todos_los_empleados',
			type: 'checkbox',
			description: 'Si no se activa, solo podra ver las alertas sin cobrar de SUS PROPIAS VENTAS. Si se activa, vera las alertas de TODOS los empleados',
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
}