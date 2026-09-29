/**
 * Diseños de etiquetas de gondola (mision disenos-etiquetas-gondola, 29/9/2026).
 *
 * Un diseño dice de que tamaño es la etiqueta (cuantas por fila de la hoja A4 y de que alto) y que
 * datos del articulo lleva, donde y con que letra. El negocio puede tener todos los que quiera: cada
 * uno es una opcion del menu de Listado -> "Documentos PDF". Al instalarse, cada negocio arranca con
 * el diseño de siempre, uno por lista de precios si trabaja con listas.
 *
 * 🔴 La solapa del ABM NO usa el ABM generico ni su modal: monta un componente propio
 * (components/abm/disenos-de-etiquetas/Index.vue, declarado en `componentes` de src/mixins/abm.js),
 * porque armar una etiqueta es arrastrar campos, no llenar un formulario. Estas `properties` quedan
 * solo para lo que el resto de la SPA lee de un modelo (nombre, valores por defecto del store).
 *
 * El JSON del diseño (`diseno`) lo interpretan components/abm/disenos-de-etiquetas/diseno.js y
 * catalogo.js (espejo del contrato con la API).
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
		para_que_sirve: 'Define cómo salen las etiquetas de góndola: de qué tamaño son, cuántas entran por hoja y qué datos del artículo llevan.',
		implicancias: 'Cada diseño aparece como una opción para imprimir en Listado, en el menú de artículos seleccionados o filtrados, dentro de Documentos PDF. Si trabajás con listas de precios, cada lista tiene su diseño con su precio.',
		como_se_utiliza: 'Entrá a ABM → Artículos → Diseños de etiquetas y tocá un diseño. Elegí cuántas etiquetas van por fila y cuántas filas por hoja, arrastrá a la etiqueta los datos que quieras mostrar (nombre, precio, código de barras, foto…) y agrandalos o achicalos tirando de sus bordes. Guardá y ya lo tenés para imprimir.',
		// Sin tildes a proposito: es lo que el dueño tipea en el buscador del ABM.
		palabras_clave: ['etiqueta', 'etiquetas', 'gondola', 'gondolas', 'precio', 'imprimir', 'diseño', 'diseno', 'cartel', 'codigo de barras', 'hoja', 'a4'],
	},
	singular_model_name_spanish: 'Diseño de etiqueta',
	plural_model_name_spanish: 'Diseños de etiquetas',
	create_model_name_spanish: 'Nuevo diseño de etiqueta',
	text_delete: 'el',
}
