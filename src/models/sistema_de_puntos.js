export default {
	properties: [
		{
			text: 'Nombre del programa',
			key: 'nombre',
			type: 'text',
			value: 'Programa de puntos',
			is_title: true,
			descriptions: [
				'Es el nombre con el que vas a ver el programa en este listado. Por ejemplo: "Puntos de la ferreteria".',
			],
		},
		{
			text: 'Programa activo',
			key: 'activo',
			type: 'checkbox',
			value: 0,
			descriptions: [
				'Mientras este apagado no se dan ni se canjean puntos, aunque el resto de la configuracion este completa.',
				'Solo puede haber un programa activo a la vez: si prendes este, se apagan los otros que tengas cargados.',
			],
		},
		{
			text: 'Puntos que se dan por cada tramo',
			key: 'puntos_por_tramo',
			type: 'number',
			value: 1,
			descriptions: [
				'Junto con "Cada cuantos pesos se completa un tramo" arma la regla "N puntos cada $M".',
				'Con 1 punto por tramo y $1.000 por tramo, una compra de $10.000 le deja 10 puntos al cliente.',
			],
		},
		{
			text: 'Cada cuantos pesos se completa un tramo',
			key: 'puntos_cada',
			type: 'number',
			value: 1000,
			descriptions: [
				'Es el escalon en pesos. Se cuenta sobre el subtotal de los articulos sin IVA, no sobre el total de la factura.',
				'Con $1.000 por tramo y 1 punto por tramo, una venta de $2.500 da 2 puntos: los $500 que sobran se pierden, nunca se redondea para arriba.',
			],
		},
		{
			text: 'Cuanto vale un punto al canjear (en pesos)',
			key: 'valor_punto',
			type: 'number',
			value: 10,
			descriptions: [
				'Con $10 por punto, 500 puntos son $5.000 de descuento en la caja.',
				'Cuidado con la combinacion: si das 1 punto cada $1.000 y el punto vale $10, le estas devolviendo el 1% de todo lo que te compra.',
			],
		},
		{
			text: 'Minimo de puntos para poder canjear',
			key: 'minimo_canje',
			type: 'number',
			value: 500,
			descriptions: [
				'Hasta que el cliente no junte esta cantidad de puntos, no puede usarlos.',
				'Con 500 puntos de minimo y el punto a $10, recien puede canjear cuando tiene $5.000 acumulados. Sirve para que no te descuenten $30 en cada compra.',
			],
		},
		{
			text: 'Maximo de la compra que se puede pagar con puntos (%)',
			key: 'tope_porcentaje',
			type: 'number',
			value: 20,
			descriptions: [
				'Es un techo por venta, aunque al cliente le sobre saldo.',
				'Con 20%, en una venta de $10.000 se puede descontar hasta $2.000 con puntos y el resto lo tiene que pagar con plata.',
			],
		},
		{
			text: 'A los cuantos meses vencen los puntos',
			key: 'vencimiento_meses',
			type: 'number',
			value: 12,
			descriptions: [
				'Con 12, los puntos que gana hoy le vencen dentro de un año si no los usa.',
				'Dejalo vacio para que no venzan nunca.',
				'Siempre se gastan primero los puntos mas viejos, asi que el cliente que compra seguido no pierde nada.',
			],
		},

		{
			text: 'Listas de Precio en las que aplica',
			store: 'price_type',
			search_on_models_by: 'name',
			type: 'search',
			key: 'price_types',
			descriptions: [
				'Elegi en que listas de precio se dan puntos. Si no elegis ninguna, se dan en todas.',
				'Se mira la lista de cada renglon de la venta, no la de la venta entera: en una venta con precios mezclados suman solo los renglones de las listas que elegiste.',
			],
			belongs_to_many: {
				model_name: 'price_type',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
					},
				],
				// properties_to_set queda VACIO a proposito: el multiplicador por lista existe en la
				// columna price_type_sistema_de_puntos.multiplicador (hedge de la decision de Lucas del
				// 21/8/2026) y NO se expone en el MVP. Exponerlo es agregar un objeto aca, nada mas.
				properties_to_set: [],
			},
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Configura el programa de puntos para clientes: cuantos puntos se ganan por compra, cuanto vale cada punto al canjearlo y hasta cuando duran.',
		implicancias: 'Con el programa activo, cada venta cobrada a un cliente le suma puntos calculados sobre el subtotal de los articulos sin IVA (los servicios, los combos y las promociones no suman). Los puntos se descuentan en Vender como un descuento en pesos que baja el total de la venta y, por lo tanto, el importe que se factura. Si una venta se anula o se devuelve, los puntos de esa venta se dan de baja solos.',
		como_se_utiliza: 'Cargá el programa, definí cuantos puntos se dan por cada tramo de pesos y cuanto vale un punto al canjear, poné el minimo de canje y el tope por venta, y recien ahi marcá "Programa activo". Si querés que los puntos se den solo con algunas listas de precio, elegilas abajo; si no elegis ninguna, aplica a todas.',
		palabras_clave: ['puntos', 'fidelizacion', 'premios', 'canje', 'clientes', 'descuento'],
	},
	singular_model_name_spanish: 'Sistema de puntos',
	plural_model_name_spanish: 'Sistemas de puntos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}
