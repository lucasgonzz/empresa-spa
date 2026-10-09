export default {
	properties: [
		/*
			Nombre, documento y contraseña son obligatorios en el alta Y en la edicion (mision
			empleados-alta-y-edicion, 9/10/2026): sin documento o sin contraseña el empleado no puede
			iniciar sesion (el login busca por doc_number). El `required` hace que el formulario
			avise "Ingrese ..." en el modal sin mandar el pedido; la red de verdad es el API
			(EmployeeController::validar_datos_del_empleado), que contesta 422 y el modal queda
			abierto con lo escrito.
		*/
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
			required: true,
		},
		{
			text: 'Teléfono',
			key: 'phone',
			type: 'text',
			show: true,
		},
		{
			text: 'N° de documento',
			key: 'doc_number',
			type: 'text',
			show: true,
			required: true,
		},
		/*
			Ingreso y Egreso los escribe el login: en el alta siempre estarian vacios, asi que se
			muestran solo al ver o editar un empleado que ya existe.
		*/
		{
			text: 'Ingreso',
			key: 'login_at',
			type: 'date',
			is_date: true,
			show_full_date: true,
			only_show: true,
			show_only_if_is_created: true,
		},
		{
			text: 'Egreso',
			key: 'logout_at',
			type: 'date',
			is_date: true,
			show_full_date: true,
			only_show: true,
			show_only_if_is_created: true,
		},
		{
			text: 'Contraseña',
			key: 'visible_password',
			type: 'text',
			not_show: true,
			required: true,
		},
		/*
			🔴 Las versiones NO se muestran en el formulario (mision empleados-alta-y-edicion,
			9/10/2026): son datos internos que escribe el admin en el dueño y en todos sus empleados
			en cada rotacion de frente, y el API ya no las toma ni en el alta ni en la edicion. Se
			dejan declaradas (y no se borran) porque siguen viniendo en el modelo y viajan en el
			guardado como el resto: el API las ignora.
		*/
		{
			text: 'Version por defecto',
			key: 'default_version',
			type: 'text',
			not_show: true,
			not_show_on_form: true,
		},
		{
			text: 'Version estable',
			key: 'estable_version',
			type: 'text',
			not_show: true,
			not_show_on_form: true,
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
			relation_prop_name: 'street',
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
				searchable: true,
				search_placeholder: 'Buscar permiso... Ej: caja, precios',
			}
		},
	],
	singular_model_name_spanish: 'Empleado',
	plural_model_name_spanish: 'Empleados',
	create_model_name_spanish: 'Nuevo empleado',
	text_delete: 'el',
	full_reactivity: true,
}