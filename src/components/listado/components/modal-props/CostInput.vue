<template>
	<div>

		<!--
			Prompt 612: reemplaza el input generico de ModelForm (slot #cost en Listado.vue) para
			poder agregarle debajo una descripcion PERMANENTE (no popover). Reusa "field-text-input"
			(el mismo componente que renderiza ModelForm.vue para prop.type == 'text') para no
			duplicar el formateo de precio ni el resto del comportamiento del campo "costo".
		-->
		<field-text-input
		model_name="article"
		:prop="prop"
		:value="article.cost"
		:disabled="false"
		:prop_text="propText(prop)"
		:price_value="price(article.cost)"
		:has_bar_code_scanner="false"
		@input="$set(article, 'cost', $event)"></field-text-input>

		<!--
			Descripcion permanente (Prompt 612): antes esta aclaracion solo estaba en el popover de
			"description" del prop (visible solo al hacer click en el label), lo que generaba
			confusion, sobre todo al Monotributista, que ve un costo distinto al de la factura de
			su proveedor. Ahora queda siempre visible y cambia segun la condicion de IVA de la cuenta.
		-->
		<small class="text-muted d-block m-t-5">
			<span v-if="es_monotributista">
				Costo base sin IVA, calculado a partir de lo que pagaste. El costo real, con IVA incluido, es el que se usa para calcular los precios de venta.
			</span>
			<span v-else>
				Costo base sin IVA. El IVA se suma al final segun la alicuota del articulo.
			</span>
		</small>

	</div>
</template>
<script>
export default {
	components: {
		FieldTextInput: () => import('@/common-vue/components/model/form/FieldTextInput'),
	},
	computed: {
		/**
		 * Articulo en edicion (modal de ModelForm), leido directo del store, mismo patron
		 * que el resto de los componentes de "modal-props" de este mismo modulo (PriceInput.vue,
		 * PercentageGainInput.vue).
		 */
		article() {
			return this.$store.state.article.model
		},
		/**
		 * Definicion declarativa del campo "cost" (src/models/article.js), necesaria para
		 * reusar "field-text-input" con el mismo comportamiento (formateo de precio, etc.)
		 * que usa ModelForm.vue para este mismo prop.
		 */
		prop() {
			return this.modelPropertiesFromName('article').find(model_prop => model_prop.key == 'cost')
		},
	},
}
</script>
