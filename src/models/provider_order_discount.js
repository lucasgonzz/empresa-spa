export default {
	properties: [
		{
			text: 'Descripcion',
			key: 'description',
			type: 'text',
		},
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			// Un descuento de compra lleva SOLO porcentaje o SOLO monto, nunca los dos: al cargar uno
			// se apaga el otro. Ver `deshabilitado_si_hay` en common-vue/components/model/ModelForm.vue.
			deshabilitado_si_hay: 'monto',
		},
		{
			text: 'Monto',
			key: 'monto',
			type: 'number',
			deshabilitado_si_hay: 'percentage',
		},
	],
	singular_model_name_spanish: 'Descuento de compra',
	plural_model_name_spanish: 'Descuento de compra',
	create_model_name_spanish: 'Nuevo Descuento de compra',
	// Sin esto `deshabilitado_si_hay` no apaga nada en pantalla (ver article_price_range.js).
	full_reactivity: true,
	text_delete: 'el',
}