/*
	Banco de cheques (misión cheques-endoso-y-bancos, 21/9/2026).

	El banco de un cheque pasó de texto libre (`cheques.banco`, que se conserva) a este catálogo
	(`cheques.cheque_banco_id`). Arranca VACÍO por decisión de Lucas: se carga desde este ABM,
	desde el "+ nuevo banco" al lado del select del cheque en un pago o un gasto, o pidiéndole al
	asistente que unifique los textos que ya tienen los cheques.
*/
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
		para_que_sirve: 'Unifica el banco de los cheques: en vez de escribirlo cada vez, se elige de esta lista.',
		implicancias: 'Los cheques que ya tenían el banco escrito a mano lo conservan como texto hasta que se les asigne uno de la lista (el asistente puede hacerlo por vos a partir de esos textos). Borrar un banco no borra los cheques: quedan con el texto que tenían.',
		como_se_utiliza: 'Cargá los bancos con los que trabajás. Después, al registrar un cheque en un pago a proveedor o en un gasto, lo elegís del select o lo creás ahí mismo con "+ nuevo banco".',
		palabras_clave: ['cheques', 'bancos', 'endoso', 'tesorería', 'unificar'],
	},
	singular_model_name_spanish: 'Banco de cheque',
	plural_model_name_spanish: 'Bancos de cheques',
	create_model_name_spanish: 'Nuevo banco',
	text_delete: 'el',
}
