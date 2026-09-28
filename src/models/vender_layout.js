/**
 * Diseños de Vender (mision diseno-vender-configurable, 28/9/2026).
 *
 * Un diseño dice en que etapa de Vender va cada campo, en que orden y de cuantas columnas. El
 * negocio puede tener todos los que quiera y usa UNO solo, el que esta "En uso" (decision de Lucas,
 * 28/9/2026: uno para todo el negocio, desde Vender no se cambia).
 *
 * 🔴 La solapa del ABM NO usa el ABM generico ni su modal: monta un componente propio
 * (components/abm/disenos-de-vender/Index.vue, declarado en `componentes` de src/mixins/abm.js),
 * porque editar un diseño es arrastrar y soltar, no llenar un formulario. Estas `properties` quedan
 * solo para lo que el resto de la SPA lee de un modelo (nombre, valores por defecto del store).
 *
 * El JSON del diseño (`layout`) lo interpretan components/vender/layout/resolver_diseno.js y
 * elementos.js; `null` es el diseño predeterminado del sistema.
 */
export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'En uso',
			key: 'en_uso',
			type: 'checkbox',
			value: 0,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define cómo se ve el módulo Vender: en qué etapa va cada campo, en qué orden y de qué ancho.',
		implicancias: 'Todos los usuarios del negocio venden con el diseño que está En uso. Los campos que se sacan dejan de verse en Vender y se pueden volver a agregar cuando quieras. Sucursal, caja, lista de precios, método de pago, tipo de venta y el resumen de la venta no se pueden sacar porque sin ellos la venta no se guarda.',
		como_se_utiliza: 'Entrá a ABM → Ventas → Diseños de Vender y tocá un diseño. Arrastrá cada campo a la etapa y al lugar que quieras, cambiale el ancho tirando de su borde izquierdo o derecho, y sacá los que no uses arrastrándolos a la bandeja de la derecha. Guardá y marcalo En uso.',
		// Sin tildes a proposito: es lo que el dueño tipea en el buscador del ABM.
		palabras_clave: ['diseño', 'diseno', 'vender', 'campos', 'ubicacion', 'ordenar', 'arrastrar', 'columnas', 'ancho', 'etapas', 'pantalla de venta', 'personalizar'],
	},
	singular_model_name_spanish: 'Diseño de Vender',
	plural_model_name_spanish: 'Diseños de Vender',
	create_model_name_spanish: 'Nuevo diseño de Vender',
	text_delete: 'el',
}
