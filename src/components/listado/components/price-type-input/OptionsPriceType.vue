<template>
	<div
	class="cont-prices m-t-10">

		<div 
		v-if="hasExtencion('elegir_si_incluir_lista_de_precios_de_excel')">
			<b-form-checkbox
			variant="success"
			:value="1"
			:unchecked-value="0"
			v-model="article_price_type.pivot.incluir_en_excel_para_clientes"
			size="sm">
				Incluir en Excel
			</b-form-checkbox>
		</div>

		<div>
			<b-form-checkbox
			variant="success"
			:value="1"
			:unchecked-value="0"
			v-model="article_price_type.pivot.setear_precio_final"
			size="sm">
				Setear precio final
			</b-form-checkbox>

			<div
			v-if="price_type_store.price_type_surchages.length">
				<div class="cont-price price m-b-5">
					Con recargos: {{ price(article_price_type.pivot.precio_luego_de_recargos) }}
				</div>

				<div class="cont-price cont-iva">
					Monto ganancia: {{ price(article_price_type.pivot.monto_ganancia) }}
				</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		article_price_type: Object,
	},
	
}
</script>