/*
	Impuestos de retención (misión retenciones-abm-impuestos, 8/10/2026).

	Son los impuestos que el cliente puede retenerte en un cobro (el "Impuesto" del certificado de
	retención sufrida). Ganancias, IVA e Ingresos Brutos vienen de fábrica y NO están en esta lista:
	acá se agregan los otros (SUSS, tasas municipales, etc.). Cada fila se elige después en el
	selector de impuesto del cobro con retención, y su valor viaja como `imp_<id>`.
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
		para_que_sirve: 'Agrega otros impuestos que tus clientes te pueden retener, además de los tres que ya vienen incluidos: Ganancias, IVA e Ingresos Brutos.',
		implicancias: 'Ganancias, IVA e Ingresos Brutos no aparecen acá porque ya están siempre disponibles y no se pueden editar ni borrar. Los impuestos que agregues se suman a esa lista al cobrar con retención y aparecen en Reportes, en la Posición Fiscal, como "Otras retenciones sufridas" (solo informativas: no se restan de ningún saldo). No se puede borrar un impuesto que ya tiene certificados cargados.',
		como_se_utiliza: 'Creá el impuesto con su nombre (por ejemplo SUSS o una tasa municipal). Después, al cobrar a un cliente con el método de pago "Retención", lo elegís en el selector "Impuesto" junto a Ganancias, IVA e Ingresos Brutos.',
		palabras_clave: ['retenciones', 'impuestos', 'certificado de retención', 'SUSS', 'tasas municipales', 'posición fiscal', 'tesorería'],
	},
	singular_model_name_spanish: 'Impuesto de retención',
	plural_model_name_spanish: 'Impuestos de retención',
	create_model_name_spanish: 'Nuevo impuesto',
	text_delete: 'el',
}
