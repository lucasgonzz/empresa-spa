export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Pocision',
			key: 'position',
			type: 'number',
			value: '',
			show: true,
		},
		{
			text: 'Margen por defecto',
			key: 'percentage',
			type: 'number',
			value: '',
			descriptions: [
				'Este margen de ganancia se le aplicara a todos los articulos que al momento de ser creados, no se le complete el margen de ganancia para esta lista de precios, ni tampoco se le complete el precio final de forma manual',
				'Si al momento de crear el articulo completa usted el campo, se usara ese valor y no se usara este valor',
				'Cambiar este margen no modifica los articulos que ya estan cargados. Para aplicarselo, use el boton "Sincronizar articulos" de abajo: le permite elegir si se aplica solo a los que tienen el margen actual o a todos los articulos de la lista',
			]
		},
		{
			text: 'Setear el precio final',
			key: 'setear_precio_final',
			type: 'checkbox',
			value: 0,
			not_show: true,
			descriptions: [
				'Si lo activa, en el modulo del LISTADO aparece siempre activada la opcion "Setear precio final" para esta lista de precio en cada articulo que vaya a crear',
			]
		},
		// {
		// 	text: 'Aplicar margen por defecto en articulos ya creados',
		// 	key: 'apply_percentage_on_existing_articles',
		// 	type: 'checkbox',
		// 	value: 1,
		// 	not_show: true,
		// 	// Solo editable al crear: al editar, isDisabled usa model.id (ModelForm.vue).
		// 	disabled_to_edit: true,
		// 	descriptions: [
		// 		'Si activa esta opcion, se agregara el "Margen por defecto" indicado a todos los articulos creados hasta el momento',
		// 		'Si no lo activa, no se agregara ningun margen a los articulos ya creados, para que usted lo complete de forma manual a cada articulo',
		// 		'Esta opcion solo se define al crear la lista; luego no se puede modificar.',
		// 	]
		// },
		/*
			Mision sincronizar-margen-lista-precios (1/10/2026): se saco la propiedad
			`update_existing_articles_percentage_mode` ("Al actualizar el margen por defecto,
			actualizar los articulos que..."). Cambiar el margen ya no toca ningun articulo por su
			cuenta: se sincroniza a proposito con el boton "Sincronizar articulos" que va debajo del
			margen (src/components/abm/sincronizar-margen-de-lista/, montado desde
			src/common-vue/views/Abm.vue). La columna sigue en la base por compatibilidad con el SPA
			viejo cacheado; la API ya no la persiste.
		*/
		{
			text: 'Ocultar al publico',
			key: 'ocultar_al_publico',
			type: 'checkbox',
			value: 0,
			show: true,
		},
		{
			text: 'Por defecto, incluir los articulos en esta lista para exportar en el Excel a los clientes',
			key: 'incluir_en_lista_de_precios_de_excel',
			type: 'checkbox',
			value: 1,
			not_show: true,
		},
		{
			// text: 'Setear el precio final',
			key: 'se_usa_en_tienda_nube',
			if_has_extencion: 'usa_tienda_nube',
			type: 'checkbox',
			value: 0,
			not_show: true,
		},
		{
			text: 'Se usa para Mercado Libre',
			key: 'se_usa_en_ml',
			if_has_extencion: 'usa_mercado_libre',
			type: 'checkbox',
			value: 0,
			not_show: true,
		},
		/*
			Mision catalogo-por-lista-tienda (5/10/2026): interruptor de la LISTA que restringe lo que
			ven en la tienda online los compradores cuya lista efectiva es esta. Con `1`, la tienda les
			muestra SOLO los articulos que tienen tildado "Visible en la tienda para esta lista" (columna
			`article_price_type.visible_en_tienda`); NULL y 0 son "sin restriccion", que es lo de hoy.

			- `if_has_extencion: 'online'`: sin tienda no hay nada que restringir, y una cuenta sin la
			  extension no ve ningun campo nuevo.
			- `value: 0`: una lista nueva nace SIN restriccion. Prenderlo es una decision explicita,
			  porque le saca el catalogo entero a esos clientes hasta que se habiliten articulos.
			- Debajo del campo, src/common-vue/views/Abm.vue monta (por el slot aditivo `prop_extras`)
			  el contador "X habilitados de Y" (src/components/abm/habilitados-en-tienda-de-lista/).
			- La API (PriceTypeController@update) solo escribe la columna si la clave viene en el
			  request: un SPA viejo cacheado que no la manda no la pisa.
		*/
		{
			text: 'En la tienda, mostrar solo los artículos habilitados para esta lista',
			key: 'catalogo_restringido_en_tienda',
			if_has_extencion: 'online',
			type: 'checkbox',
			value: 0,
			not_show: true,
			descriptions: [
				'Si lo activás, los clientes que tienen asignada esta lista ven en la tienda online SOLO los artículos que habilites para ella.',
				'Atención: al activarlo, los clientes con esta lista dejan de ver todos los artículos en la tienda hasta que habilites los que quieras.',
				'Los artículos se habilitan con el check "Visible en la tienda para esta lista" de la ficha del artículo, con la actualización masiva o con la importación de Excel. Los artículos nuevos nacen sin habilitar.',
				'Si esta es la lista que la tienda usa para quien entra sin cuenta (la de posición más alta que no está oculta al público), la restricción también se aplica a los visitantes.',
				'Las listas que no tienen esta opción activada no cambian: sus clientes siguen viendo todo el catálogo.',
			]
		},
		{
			text: 'Recargos',
			key: 'price_type_surchages',
			not_show: true,
			has_many: {
				text: 'Recargos',
				model_name: 'price_type_surchage',
			},
		},

		{
			text: 'Categorias',
			store: 'category',
			search_on_models_by: 'name',
			type: 'search',
			key: 'categories',
			not_show: true,
			belongs_to_many: {
				model_name: 'category',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Margen de ganancia',
						key: 'percentage',
						value: '',
						type: 'number'
					},
				],
			}
		},
		{
			text: 'Sub Categorias',
			key: 'sub_categories',
			type: 'search',
			store: 'sub_category',
			not_show: true,
			belongs_to_many: {
				model_name: 'sub_category',
				properties_to_set: [
					{
						label: 'Porcentaje',
						key: 'percentage',
						type: 'number',
					}
				],
			}
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define las listas de precios del negocio (minorista, mayorista, distribuidores, etc.) y cómo se calcula cada una.',
		implicancias: 'Cada lista aplica un margen por defecto sobre el costo de los artículos que no tengan margen o precio final propio. Cambiar el margen por defecto no modifica los artículos ya creados: para aplicárselo se usa el botón "Sincronizar artículos" que está debajo del margen, que pregunta si va solo a los que tienen el margen actual o a todos (los que tienen el precio fijado a mano quedan afuera, salvo que se los incluya a propósito). Las listas se asignan a los clientes, definen qué precio ven en Vender y en la tienda, y pueden ocultarse al público o usarse en Tienda Nube y Mercado Libre. Con la tienda online, una lista también puede restringir su catálogo: al activar "En la tienda, mostrar solo los artículos habilitados para esta lista", sus clientes ven en la tienda solo los artículos habilitados para ella (los demás dejan de verse hasta que se habiliten).',
		como_se_utiliza: 'Creá la lista con nombre, posición y margen por defecto. Opcionalmente definí recargos propios de la lista y márgenes específicos por categoría o subcategoría. Después asignásela a los clientes que corresponda.',
		palabras_clave: ['listas de precios', 'margen', 'ganancia', 'mayorista', 'minorista', 'porcentaje', 'catálogo', 'tienda', 'artículos habilitados'],
	},
	singular_model_name_spanish: 'Tipo de precio',
	plural_model_name_spanish: 'Tipos de precio',
	create_model_name_spanish: 'Nuevo tipo de precio',
	text_delete: 'el',
}