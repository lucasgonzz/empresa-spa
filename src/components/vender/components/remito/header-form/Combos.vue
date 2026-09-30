<template>
	<!--
		Elemento `combos` del diseño de Vender (mision diseno-vender-configurable, 28/9/2026): la
		raiz era un <b-col cols="12" md="2"> de la fila de buscadores; ahora es un div suelto y el
		ancho lo da el diseño en uso (layout/GrillaDeEtapa.vue). El v-if de la extension se queda.
	-->
	<div
	v-if="authenticated && hasExtencion('combos')">
		<search-component
		id="select-combo"
		placeholder="Combos"
		:search_from_api="!download_articles"
		model_name="combo"
		@setSelected="setSelectedCombo"
		clear_query
		:show_selected="false"
		:str_limint="3"></search-component>
	</div>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender/index'
import { precio_de_combo_para_lista } from '@/utils/precio_de_combo'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	computed: {
		combos() {
			return this.$store.state.combo.models
		},
		id() {
			return 'select-combo'
		},
	},
	data() {
		return {
			combo: null
		}
	},
	methods: {
		/*
			El alta del combo elegido en el selector es setSelectedCombo() (abajo), atado a
			@setSelected del search-component: arma el final_price con el precio del combo y entra
			por set_item_vender(), el mismo camino que la promocion y el articulo por nombre.
		
			Hasta el 18/9/2026 (mision vender-lista-obligatoria, tanda 2) aca habia ademas un
			add_combo() que nadie llamaba: commiteaba vender/setArticle (una mutacion que ya no
			existe) y leia un from_mobile que no esta definido en ningun lado (ReferenceError).
			Se borro para que nadie lo vuelva a atar creyendo que anda. Ojo: check_stock() --el
			chequeo de stock de los COMPONENTES del combo con la extension
			check_article_stock_en_vender-- solo lo llamaba ese metodo muerto: hoy el combo elegido
			no pasa por el. Queda anotado en el informe de la mision como decision pendiente.
		*/
		check_stock() {

			let ok = true

			if (!this.guardar_como_presupuesto && this.hasExtencion('check_article_stock_en_vender')) {

				let articles_sin_stock = this.combo.articles.filter(article => {

					if (article.stock !== null && article.stock <= 0) {
						ok = false
						return true 
					}
				})

				articles_sin_stock.forEach(article => {

					this.$toast.error('El articulo '+article.name+' no tiene stock')
				})
			}
			return ok 
		},
		setSelectedCombo(result) {
			let combo = {
				...result.model,
				is_combo: true,
				// amount: 1,
			}

			/*
				El precio sale de la lista de la venta, con el mismo helper que usa la deteccion
				automatica de combos y el rearmado de precios (utils/precio_de_combo.js): un combo
				calculado de una cuenta con listas trae un precio por cada una en `price_types`.
				Sin lista en la venta, o sin fila para esa lista (combo manual, servidor viejo), cae
				a `combo.price`, que es el precio de la lista por defecto. Antes era siempre
				`combo.price`, sin mirar la lista.

				Si el vendedor cambia la lista despues, aplicar_tipos_de_precio() (generals.js)
				vuelve a elegir la fila cuando se rearman los precios, igual que con un articulo.
			*/
			let precio_del_combo = precio_de_combo_para_lista(
				combo,
				this.price_type_vender ? this.price_type_vender.id : null
			)

			combo.final_price = precio_del_combo !== null ? precio_del_combo : Number(combo.price)
			this.set_item_vender(combo)
		},
	}
}
</script>