export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Guarda perfiles de mapeo de columnas para la importación de artículos por Excel: qué letra de columna corresponde a cada dato.',
		implicancias: 'Al importar un Excel, el sistema usa el perfil para saber en qué columna buscar el nombre, el costo, el stock, etc. Un perfil mal armado hace que los datos se importen en campos equivocados.',
		como_se_utiliza: 'Creá un perfil con nombre y definí la letra de columna de cada campo. Al importar artículos, elegí el perfil que coincida con el formato de tu Excel. Podés tener un perfil distinto por cada proveedor.',
		palabras_clave: ['importacion', 'excel', 'columnas', 'mapeo', 'planilla', 'proveedor'],
	},
	singular_model_name_spanish: 'Posiciones de columnas',
	plural_model_name_spanish: 'Posiciones de columnas',
	create_model_name_spanish: 'Nueva Posiciones de columnas',
	text_delete: 'la',
}