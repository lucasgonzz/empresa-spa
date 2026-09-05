<template>

	<!--
		Misma regla que la tarjeta que lo contiene: una instancia por lista de precios, asi que el
		`data-tour` sale solo en la primera. Ver el comentario de `price-type-input/Index.vue`.

		⚠️ Con la extension `ventas_en_dolares` prendida este componente NO se monta (`Index.vue`
		dibuja `PriceTypeMonedas` en su lugar), asi que el paso del clip 1.3 que lo senala
		desaparece en una cuenta con dolares. El motor lo saltea solo.
	-->
	<div
	:data-tour="es_primera_lista ? 'listado.opciones_lista_precio' : null"
	class="price-type-card__opciones m-t-10">

		<!-- El interruptor que invierte cual de los dos campos manda. Va separado y con su
		     explicacion: antes estaba abajo, con el mismo peso visual que "Incluir en Excel", que es
		     un tema completamente distinto. -->
		<div class="price-type-card__interruptor">
			<b-form-checkbox
			variant="success"
			:value="1"
			:unchecked-value="0"
			v-model="article_price_type.pivot.setear_precio_final"
			size="sm">
				Setear precio final
			</b-form-checkbox>
			<div class="price-type-card__interruptor-ayuda">
				<template v-if="article_price_type.pivot.setear_precio_final">
					Cargas el precio y el sistema calcula el margen
				</template>
				<template v-else>
					Cargas el margen y el sistema calcula el precio
				</template>
			</div>
		</div>

		<!-- Datos calculados, subordinados. "Monto ganancia" se calcula SIEMPRE
		     (ArticlePricesHelper::aplicar_price_type_surchages lo devuelve haya o no recargos), asi
		     que ya no vive adentro del v-if de los recargos: hasta el 5/8/2026 estaba ahi y no se
		     veia en ninguna lista sin recargos, aunque el dato existiera. -->
		<div class="price-type-card__datos">
			<div
			v-if="price_type_store.price_type_surchages.length"
			class="price-type-card__dato">
				<span class="price-type-card__dato-label">Con recargos</span>
				{{ price(article_price_type.pivot.precio_luego_de_recargos) }}
			</div>

			<div
			v-if="tiene_monto_ganancia"
			class="price-type-card__dato price-type-card__dato--ganancia">
				<span class="price-type-card__dato-label">Ganancia</span>
				{{ price(article_price_type.pivot.monto_ganancia) }}
			</div>
		</div>

		<div
		v-if="hasExtencion('elegir_si_incluir_lista_de_precios_de_excel')"
		class="price-type-card__excel">
			<b-form-checkbox
			variant="success"
			:value="1"
			:unchecked-value="0"
			v-model="article_price_type.pivot.incluir_en_excel_para_clientes"
			size="sm">
				Incluir en Excel
			</b-form-checkbox>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		article_price_type: Object,
		price_type_store: Object,
	},
	computed: {
		/**
		 * ¿Estas opciones son las de la PRIMERA lista de precios?
		 *
		 * `article_price_type.id` es el id del `price_type` (lo arma `price-type-input/Index.vue`,
		 * tanto para un articulo nuevo como para uno existente), y `price_types` viene del mixin
		 * global `mixins/generals.js`.
		 *
		 * @returns {Boolean}
		 */
		es_primera_lista() {
			if (!this.price_types.length || !this.article_price_type) {
				return false
			}

			return this.price_types[0].id == this.article_price_type.id
		},
		/**
		 * En un articulo nuevo el pivot se arma en memoria (ver init_article_price_type en
		 * Index.vue) y todavia no tiene monto_ganancia: ahi no hay nada que mostrar.
		 */
		tiene_monto_ganancia() {
			let valor = this.article_price_type.pivot.monto_ganancia

			return valor !== null && valor !== '' && typeof valor != 'undefined'
		},
	},

}
</script>
