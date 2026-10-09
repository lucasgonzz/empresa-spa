export default {
	properties: [
		/*
			Mision `compras-factura-manual-alicuotas` (17/9/2026).

			🔴 Este `group_title` NO es decorativo: es el arreglo del defecto visual que reporto
			Lucas. `ModelForm.vue` (get_group_title_for_prop, linea 922) tiene un fallback: toda
			prop declarada ANTES del primer `group_title` se asigna al PRIMER grupo del modelo.
			Como el primer grupo de este archivo era "Retenciones", la fecha de emision, el
			numero, los dos totales y la tabla de alicuotas se dibujaban adentro de la solapa de
			retenciones, que no tiene nada que ver.

			Va primero de todo, y cualquier prop nueva de datos generales va debajo de este.
		*/
		{
			group_title: 'Generales'
		},
		{
			text: 'Fecha de emision',
			key: 'issued_at',
			type: 'date',
			value: '',
			/*
				Mision `factura-compra-tres-defectos` (9/10/2026): una factura NUEVA arranca con la
				fecha de hoy, que es lo que el servidor ya guardaba cuando el campo viajaba vacio. Antes
				el campo se veia en blanco (dd/mm/aaaa) y la persona no sabia con que fecha iba a quedar
				el comprobante en el Libro IVA y en Posicion Fiscal.

				🔴 Va por `value_function` y NO con `value: moment().format(...)`: un `value` de este
				archivo se evalua una sola vez, cuando se carga la pestaña, y una pestaña abierta desde
				el lunes le pondria el lunes a todas las facturas del jueves (ver el 🔴 de `created_at`
				en src/models/provider_order.js). La funcion corre al abrir el formulario
				(common-vue/mixins/display.js::getSelectAndCheckboxProps). Editando una factura que ya
				existe no corre: el campo muestra la fecha guardada.
			*/
			value_function: 'fecha_de_hoy_para_input',
			show: true,
			is_date: true,
		},
		{
			text: 'Numero',
			key: 'code',
			type: 'text',
			value: '',
			show: true,
			is_title: true,
		},
		{
			text: 'Total',
			key: 'total',
			type: 'number',
			is_price: true,
			value: '',
			/*
				🔴 Pasa a ser de SOLO LECTURA, igual que "Total IVA". El total de una factura no
				es un dato que se carga: es una cuenta que sale de sus dos sumandos, que ya estan
				en la base -- las alicuotas y las percepciones.

					total = Σ(neto + iva_importe de las alicuotas) + percepcion_iibb + percepcion_iva

				Lo calcula el servidor (FacturaDeCompraHelper::guardar_totales en empresa-api) y el
				`total` que mande el cliente se ignora. Dejarlo editable era pedirle a la persona
				que mantuviera a mano un numero que el sistema ya sabe, y que se desincronizaba en
				cuanto tocaba una alicuota.
			*/
			only_show: true,
			show: true,
			description: 'Lo calcula el sistema: la suma de las alicuotas de IVA (neto + IVA) mas las percepciones. No se carga a mano.',
		},
		{
			text: 'Total IVA',
			key: 'total_iva',
			type: 'number',
			is_price: true,
			value: '',
			only_show: true,
			show: true,
			description: 'Lo calcula el sistema: la suma del importe de IVA de cada alicuota. Las percepciones NO entran aca, porque no son credito fiscal de IVA.',
		},
		{
			/*
				Se llamaba "Ivas". El label es lo unico que la persona lee arriba de la tabla, y
				"Ivas" no dice que adentro hay una fila por alicuota.
			*/
			text: 'Alicuotas IVA',
			key: 'provider_order_afip_ticket_ivas',
			/*
				Ancho completo de la tabla dentro del formulario. `ModelForm.vue:2015-2024`
				(form_col_for) ya devuelve 12 columnas de grilla cuando la prop declara
				`full_cols`, asi que no hay nada que tocar en el componente generico.

				Sin esto la tabla quedaba en una columna angosta al lado de los campos de arriba,
				con cuatro columnas de numeros adentro.
			*/
			full_cols: true,
			has_many: {
				text: 'Alicuota IVA',
				model_name: 'provider_order_afip_ticket_iva',
			}
		},


		/*
			🔴 Aca vivia la solapa "Retenciones", con `retencion_iibb`, `retencion_iva` y
			`retencion_ganancias`. Se fue entera, y no es una simplificacion: es un error
			conceptual que estaba escrito en la pantalla.

			En una factura de COMPRA no existe una retencion. Quien retiene es TU CLIENTE cuando
			te paga, no el proveedor cuando te factura (audio de Ferretotal del 17/9/2026: "la
			parte de retenciones no deberia ir ahi, deberia ir en la parte de cobros, de
			recibos"). Por eso las retenciones se cargan al registrar un cobro en la cuenta
			corriente de un cliente, como un medio de pago mas.

			Las columnas de la tabla NO se borraron en la base: lo que ya esta cargado se migra a
			la tabla nueva y los reportes de posicion fiscal siguen leyendo lo mismo.
		*/


		{
			group_title: 'Percepciones'
		},
		{
			key: 'percepcion_iibb',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
			description: 'Lo que el proveedor te percibio de Ingresos Brutos en esta factura. Suma al total de la factura y a lo que le debes, porque es plata que le pagas a el.',
		},
		{
			key: 'percepcion_iva',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
			description: 'Lo que el proveedor te percibio de IVA en esta factura. Suma al total de la factura y a lo que le debes, pero NO al Total IVA: una percepcion de IVA no es credito fiscal.',
		},
	],
	plural_model_name_spanish: 'Facturas',
	singular_model_name_spanish: 'Factura',
	create_model_name_spanish: 'Nueva factura',
	text_delete: 'esta',
	/*
		Mision `factura-compra-tres-defectos` (9/10/2026). 🔴 Sin esto, agregar una alicuota BORRABA
		el numero y la fecha de la factura que ya se habian tipeado (la factura se guardaba con
		`code: null`).

		Sin `full_reactivity`, `common-vue/components/model/Index.vue` (computed `model()`) le pasa
		al formulario una COPIA plana del modelo del store (`{...model}`). Lo que se tipea queda en
		la copia; el store no se entera. Y la copia es un computed que lee todas las claves del
		modelo del store: en cuanto algo escribe ahi --guardar la alicuota hace
		`$set(factura, 'provider_order_afip_ticket_ivas', ...)` sobre el modelo del store (es el
		`has_many_parent_model` de AlicuotasIva.vue)-- el computed se rehace desde el store y el
		formulario recibe una copia nueva, sin el numero ni la fecha. Medido con Playwright el
		9/10/2026: el formulario y `$store.state.provider_order_afip_ticket.model` eran dos objetos
		distintos desde que se abria el modal.

		Es la misma clase que ya tuvo la compra el 15/8/2026 (ver el comentario de
		`full_reactivity` en src/models/provider_order.js) y se arregla igual: los dos lados sobre
		el MISMO objeto. La contra es la misma y esta aceptada: editar una factura y cerrar sin
		guardar deja los cambios en el objeto en memoria hasta que se vuelva a cargar la compra.
	*/
	full_reactivity: true,
}
