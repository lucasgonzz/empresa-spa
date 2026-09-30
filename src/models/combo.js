export default {
	properties: [
		{
			// Foto propia del combo. Si el combo esta publicado en la tienda y tiene foto, la tienda
			// la usa; si no, arma un collage con las imagenes de los articulos que lo componen.
			// En el buscador de Vender tambien se ve, como la del articulo.
			text: 'Imagenes',
			key: 'images',
			type: 'images',
			description: 'Foto del combo. En la tienda online se usa esta foto si el combo está publicado; si no cargás ninguna, la tienda arma un collage con las imágenes de los artículos que lo componen.',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			// 🔴 Nace APAGADO en todos los combos que ya existen: ningun combo cambia de precio por
			// haberse desplegado esta version. Con el check prendido, el servidor calcula costo y
			// precio al guardar (y los recalcula cada vez que cambia el costo o el precio de un
			// articulo del combo). El front no calcula nada.
			text: 'Calcular en base a los artículos que lo componen',
			table_text: 'Calculado',
			key: 'calcular_desde_articulos',
			type: 'checkbox',
			value: 0,
			description: 'Si lo activás, el costo y el precio del combo salen de los artículos que lo componen (cada uno por su cantidad) y se recalculan solos cada vez que cambia el costo o el precio de alguno. Si tu cuenta usa listas de precios, se calcula un precio por cada lista. Apagado, cargás costo y precio a mano como siempre.',
		},
		{
			text: 'Costo',
			key: 'cost',
			type: 'number',
			// Con el check prendido lo escribe el servidor: se bloquea y se avisa por que.
			disabled_function: 'combo_costo_y_precio_bloqueados',
			nota_function: 'combo_nota_de_campo_calculado',
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'number',
			disabled_function: 'combo_costo_y_precio_bloqueados',
			nota_function: 'combo_nota_de_campo_calculado',
		},
		{
			// Select propio (dynamic_options_function) y no `options`: getOptions() le antepone una
			// opcion "Seleccione" con value 0, y el servidor solo entiende 'porcentaje', 'monto' o null.
			// Solo se ve con el check prendido (v_if_function; el `v_if: [..]` esta muerto).
			text: 'Descuento',
			table_text: 'Desc.',
			key: 'descuento_tipo',
			type: 'select',
			dynamic_options_function: 'combo_descuento_tipo_options',
			value_function: 'combo_descuento_tipo_inicial',
			// Prop de formulario: no es filtrable (sin options ni store el filtro de select no sabe armarse).
			no_usar_en_filtros: true,
			v_if_function: 'show_combo_descuento_tipo',
			not_show: true,
			description: 'Descuento que se aplica al precio de venta del combo calculado, en porcentaje o en monto fijo. Se aplica igual a cada lista de precios y nunca toca el costo.',
		},
		{
			// Aparece recien cuando se elige el tipo, asi nunca viaja un numero sin saber si son
			// pesos o por ciento.
			text: 'Valor del descuento',
			table_text: 'Valor desc.',
			key: 'descuento_valor',
			type: 'number',
			value: 0,
			v_if_function: 'show_combo_descuento_valor',
			nota_function: 'combo_nota_de_descuento',
			not_show: true,
			description: 'Porcentaje (por ejemplo 10 para un 10%) o monto en pesos, según el tipo elegido. Un porcentaje tiene que ser menor a 100; un monto nunca deja el precio por debajo de $0.',
		},
		{
			// Solo lectura: lo que el servidor calculo para cada lista, ya con el descuento. Es una
			// prop virtual (no existe como columna): NO se manda al guardar ni se filtra.
			// `no_mostrar_nunca` la saca del selector de columnas del buscador; `not_show`, de la
			// tabla; el v_if_function la deja aparecer solo en el formulario de un combo guardado.
			text: 'Precio por lista',
			key: 'precios_por_lista',
			type: 'text',
			only_show: true,
			function: 'get_precios_por_lista_del_combo',
			v_if_function: 'show_combo_precios_por_lista',
			no_mostrar_nunca: true,
			not_show: true,
			no_usar_en_filtros: true,
			description: 'Precio de venta que el sistema calculó para este combo en cada lista de precios, con el descuento ya aplicado. Se actualiza solo cuando cambian los artículos.',
		},
		{
			// Columna de la TABLA del ABM y del buscador de Vender. Es siempre calculado, nunca a
			// mano: cuantos combos se pueden armar con lo que hay de cada componente (manda el que
			// mas limita). Se calcula al leer en el servidor porque articles.stock se escribe por
			// muchos caminos y persistirlo exigiria enganchar todos.
			// `null_es_sin_control`: null = ningun componente lleva stock, no es cero ni va en rojo
			// (ver TableComponent.vue::stock_sin_control). El formulario usa la prop de abajo.
			text: 'Stock',
			key: 'stock_disponible',
			type: 'number',
			is_stock: true,
			null_es_sin_control: true,
			function: 'get_stock_disponible_del_combo',
			not_show_on_form: true,
			no_usar_en_filtros: true,
			description: 'Cuántos combos se pueden armar con el stock actual de sus artículos. Lo limita el artículo que más escasea (stock dividido la cantidad que lleva el combo). Vacío significa que ningún artículo del combo lleva control de stock.',
		},
		{
			// El mismo dato, para el FORMULARIO: el recuadro de solo lectura no sabe pintar un null,
			// asi que aca va en texto ("Sin control de stock" o "N (cuantos combos...)").
			text: 'Stock disponible',
			key: 'stock_disponible_detalle',
			type: 'text',
			only_show: true,
			function: 'get_stock_disponible_del_combo_en_formulario',
			v_if_function: 'show_combo_dato_calculado_si_esta_guardado',
			no_mostrar_nunca: true,
			not_show: true,
			no_usar_en_filtros: true,
			description: 'Cuántos combos se pueden armar con el stock actual de sus artículos. Se calcula siempre solo, no se carga a mano.',
		},
		{
			text: 'Mostrar en la tienda',
			key: 'online',
			type: 'checkbox',
			show: true,
			description: 'Si lo activás, el combo se publica en tu ecommerce y los compradores pueden agregarlo al carrito. Apagado, el combo sigue existiendo solo para vender desde el sistema.',
			// Arranca apagado: hay cuentas con combos armados solo para cargar ventas mas rapido,
			// y esos no tienen por que aparecer en el ecommerce sin que el dueño lo decida.
			value: 0,
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			search_from_api_function: 'search_from_api_in_provider_order',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
				],
			}
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Arma paquetes de varios artículos que se venden juntos con un precio propio, o que se calculan solos a partir de los artículos que lo componen.',
		implicancias: 'Al vender un combo se descuenta el stock de cada artículo que lo compone. Si cargás el precio a mano, es independiente de la suma de los precios individuales, así que podés ofrecerlo como promoción. Si activás "Calcular en base a los artículos", el costo y el precio salen de los artículos (un precio por cada lista) y se recalculan cuando cambian; el descuento se aplica solo al precio de venta. El stock del combo se calcula siempre solo: cuántos combos se pueden armar con lo que hay.',
		como_se_utiliza: 'Creá el combo, agregale los artículos con sus cantidades y definí costo y precio de venta a mano, o activá el cálculo automático y, si querés, un descuento. Podés cargarle una foto: en la tienda online se usa esa, o un collage de los artículos si no tiene. Después lo buscás en Vender como cualquier artículo y ahí ves cuántos se pueden armar.',
		palabras_clave: ['pack', 'promocion', 'paquete', 'kit', 'oferta', 'combo calculado', 'descuento'],
	},
	/*
		🔴 SIN ESTO el check "Calcular en base a los articulos" NO REFRESCA EL FORMULARIO. Sin
		`full_reactivity`, common-vue/components/model/Index.vue entrega al formulario una COPIA
		del modelo del store: el check escribe en la copia, el store no cambia, el computed no se
		invalida y Vue no vuelve a evaluar los `v_if_function` / `disabled_function` de los campos
		de costo, precio y descuento. Mismo motivo y mismo remedio que article_price_range.js.
	*/
	full_reactivity: true,
	singular_model_name_spanish: 'Combo',
	plural_model_name_spanish: 'Combos',
	create_model_name_spanish: 'Nuevo Combo',
	text_delete: 'el',
}