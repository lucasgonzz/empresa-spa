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
}
