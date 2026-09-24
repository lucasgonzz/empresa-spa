export default {
	properties: [
		{
			text: 'Modo',
			key: 'modo',
			type: 'select',
			options: [
				'Igual',
				'Mayor o igual',
			],
		},
		{
			text: 'A partir de x Cantidad',
			key: 'amount',
			type: 'number',
		},
		{
			text: 'Precio fijo por unidad',
			key: 'price',
			type: 'number',
			// Una oferta por cantidad lleva SOLO precio fijo o SOLO porcentaje, nunca los dos: el
			// criterio unico (utils/criterio_de_oferta_por_cantidad.js, espejo de
			// CriterioDeOfertaPorCantidadHelper.php) le da la prioridad al precio fijo y el
			// porcentaje queda inerte, ignorado en silencio.
			// Ver `deshabilitado_si_hay` en common-vue/components/model/ModelForm.vue.
			deshabilitado_si_hay: 'porcentaje',
		},
		{
			text: 'Porcentaje de descuento',
			key: 'porcentaje',
			type: 'number',
			// La otra mitad de la regla: si ya hay precio fijo, el porcentaje se apaga.
			deshabilitado_si_hay: 'price',
		},
	],
	singular_model_name_spanish: 'Oferta por cantidad',
	plural_model_name_spanish: 'Ofertas por cantidad',
	create_model_name_spanish: 'Nueva Oferta por cantidad',
	// Femenino: el singular paso de "Rango de precio" a "Oferta por cantidad", y Confirm.vue arma
	// el aviso de borrado como "eliminar <text_delete> <singular>".
	text_delete: 'la',
}
