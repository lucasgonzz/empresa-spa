export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
			value: '',
			show: true,
		},
		{
			text: 'Posicion',
			key: 'position',
			type: 'number',
			value: '',
			show: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Junta los estados de produccion que corresponden a una misma etapa del proceso. Por ejemplo: un grupo con los estados por los que pasa una pata de silla (nivel 1 de partes) y otro con los de la estructura ya armada (nivel 2).',
		implicancias: 'El grupo se elige en la RUTA de la receta, no en la receta: una ruta tercerizada puede tener otro grupo de estados que la interna del mismo producto. Cuando la ruta tiene grupo, los selects de estado de los insumos y de los movimientos del lote muestran solo los estados de ese grupo, y la solapa "Cantidades en cada Estado" del lote tambien.',
		como_se_utiliza: 'Crea un grupo por etapa del proceso, asignale los estados desde el ABM de Estados de Produccion, y despues elegi el grupo en la ruta de cada receta. Si dejas la ruta sin grupo, todo funciona como siempre: se ven todos los estados de la cuenta.',
		palabras_clave: ['produccion', 'estados', 'etapas', 'multinivel', 'recetas', 'rutas'],
	},
	singular_model_name_spanish: 'Grupo de Estados de Produccion',
	plural_model_name_spanish: 'Grupos de Estados de Produccion',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}
