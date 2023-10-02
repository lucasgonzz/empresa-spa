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