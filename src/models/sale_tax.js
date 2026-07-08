export default {
	properties: [
		{
			// Nombre visible del impuesto sobre ventas (ej: "IIBB 3.5%"), se usa como titulo en tablas y listados
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
			descriptions: [
				'Nombre descriptivo del impuesto sobre ventas (por ejemplo "IIBB 3.5%" o "Impuesto municipal").',
				'Se muestra en el listado de impuestos y ayuda a identificar el impuesto en el detalle del calculo de precio del articulo.',
			],
		},
		{
			// Aliquota del impuesto, expresada en porcentaje (ej: 3.5 significa 3.5%)
			text: 'Alicuota (%)',
			key: 'percentage',
			type: 'number',
			descriptions: [
				'Porcentaje del impuesto sobre ventas. Es la Capa 2 del marco de precios (se aplica despues de bonificaciones/recargos del articulo).',
				'El impuesto se aplica con formula de division despues del margen de ganancia (precio ÷ (1 − alicuota)), porque se calcula sobre el precio que ya lo incluye.',
				'Ejemplo: con una alicuota de 3.5% (0.035), el precio final se divide por (1 - 0.035).',
			],
		},
		{
			// Define si el impuesto se aplica a todos los articulos del usuario o solo a los seleccionados manualmente
			text: 'Aplica a todos los articulos',
			key: 'apply_to_all',
			type: 'checkbox',
			value: 1,
			descriptions: [
				'Si esta activado, el impuesto se aplica a todos los articulos del negocio.',
				'Si se desactiva, debe seleccionar manualmente los articulos a los que aplica este impuesto en el campo "Articulos".',
			],
		},
		{
			// Articulos a los que aplica el impuesto cuando "apply_to_all" esta desactivado. Se oculta del formulario cuando apply_to_all esta activo (v_if)
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			not_show: true,
			v_if: ['apply_to_all', '=', false],
			// Necesario porque "apply_to_all" en false es un valor falsy y showProperty() lo trataria como "sin valor" sin este flag
			v_if_not_check_if_null: true,
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
					},
				],
			},
			// El backend (SaleTaxController) espera esta relacion como un array plano de ids bajo la clave
			// "article_ids" (usa sync()), a diferencia de la convencion generica de belongs_to_many
			// (GeneralHelper::attachModels) que usan otros modelos como price_type/combo.
			send_belongs_to_many_ids_as: 'article_ids',
			descriptions: [
				'Articulos a los que se les aplica este impuesto sobre ventas.',
				'Solo se usa cuando "Aplica a todos los articulos" esta desactivado.',
			],
		},
		{
			// Permite desactivar el impuesto sin eliminarlo, dejando de aplicarlo en el calculo de precios
			text: 'Activo',
			key: 'activo',
			type: 'checkbox',
			value: 1,
			descriptions: [
				'Si se desactiva, el impuesto deja de aplicarse en el calculo de precios sin necesidad de eliminarlo.',
			],
		},
	],
	singular_model_name_spanish: 'Impuesto sobre venta',
	plural_model_name_spanish: 'Impuestos sobre ventas',
	create_model_name_spanish: 'Nuevo impuesto sobre venta',
	text_delete: 'el',
}
