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
	/*
		🔴 SIN ESTO, `deshabilitado_si_hay` NO APAGA NADA EN PANTALLA. Medido en el navegador el
		24/9/2026, y no es un detalle de estilo: es la mitad de lo que se pidio ("si coloca el
		porcentaje, se le deshabilita el monto").

		La causa esta en `common-vue/components/model/Index.vue:413-420`: sin `full_reactivity` el
		computed `model` devuelve `{...model}`, una COPIA nueva del modelo del store. El formulario
		escribe en esa copia, el store no cambia, el computed no se invalida y Vue no vuelve a
		renderizar — asi que `isDisabled()` devuelve `true` y el input sigue habilitado igual.

		Comprobado contra el precedente: `article_discount` declara el mismo `deshabilitado_si_hay`
		para el par porcentaje/monto y TAMPOCO apaga nada, por esta misma razon. O sea que el
		defecto es del motor y es anterior a esta mision; lo que hace esta linea es sacar a este
		modelo de ahi, con el mecanismo que el propio motor provee y que ya usan otros once
		modelos (article, promocion_vinoteca, expense, recipe...).
	*/
	full_reactivity: true,
	// Femenino: el singular paso de "Rango de precio" a "Oferta por cantidad", y Confirm.vue arma
	// el aviso de borrado como "eliminar <text_delete> <singular>".
	text_delete: 'la',
}
