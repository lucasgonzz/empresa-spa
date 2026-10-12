export default {
	properties: [
		/*
			Nombre, documento y contraseña son obligatorios en el alta Y en la edicion (mision
			empleados-alta-y-edicion, 9/10/2026): sin documento o sin contraseña el empleado no puede
			iniciar sesion (el login busca por doc_number).

			El `required` hace que el formulario avise "Ingrese ..." en el modal sin mandar el
			pedido. 🔴 Para eso hace falta el `value: ''`: el modelo nuevo nace con `prop.value`
			(common-vue/store/employee.js) y el `check()` de common-vue/components/model/Index.vue
			compara `== ''`; sin el value el campo sin tocar nace `undefined`, `undefined == ''` es
			false, y el required no frenaba nada.

			Ojo con lo que el required NO frena: al EDITAR un empleado viejo con el documento o la
			contraseña en null, `null == ''` tambien es false. Ahi el que frena es el API
			(EmployeeController::validar_datos_del_empleado), que contesta 422 con el motivo: el
			modal lo muestra en su aviso y queda abierto con lo escrito. El API es la red de verdad.
		*/
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
			value: '',
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
			value: '',
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
			value: '',
			required: true,
		},
		/*
			🔴 Las versiones NO se muestran en el formulario (mision empleados-alta-y-edicion,
			9/10/2026), y el API ya no las toma ni en el alta ni en la edicion:
			- `default_version` la escribe el admin, en el dueño y en todos sus empleados, en cada
			  rotacion de frente: guardarla desde un listado cargado antes de la rotacion mandaba al
			  empleado al frente viejo.
			- `estable_version` es interna (la URL de un frente) y el dueño no tiene que poner ahi:
			  se deja de cargar desde aca para que nadie la cambie sin saber. Si un empleado quedara
			  con una vieja, se corrige en la base.
			Se dejan declaradas (y no se borran) porque siguen viniendo en el modelo y viajan en el
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