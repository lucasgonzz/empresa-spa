export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			key: 'hora_inicio',
			type: 'text',
		},
		{
			key: 'hora_fin',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define los turnos horarios de trabajo de la caja (por ejemplo: mañana de 8 a 13, tarde de 17 a 21).',
		implicancias: 'Los turnos ordenan las aperturas y cierres de caja: cada apertura se asocia a un turno, lo que permite controlar la recaudación por franja horaria.',
		como_se_utiliza: 'Creá cada turno con su nombre, hora de inicio y hora de fin. Se eligen al abrir la caja.',
		palabras_clave: ['apertura', 'cierre', 'horario', 'caja', 'arqueo'],
	},
	singular_model_name_spanish: 'Turno Caja',
	plural_model_name_spanish: 'Turno Caja',
	create_model_name_spanish: 'Nuevo Turno Caja',
	text_delete: 'el',
}