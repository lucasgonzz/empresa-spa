<template>
	<div>
	    <confirm
	    model_name="sale"
	    show_compensar_caja_checkbox
	    :actions="['sale/delete']"
	    id="delete-sale"></confirm>
		
		<!--
			listado_paginado_por_defecto en false: esta vista arma su propio listado scopeado
			(modulo 'deposito' en created(), filtrado por checked en sales_to_show()). Mismo
			defecto que por-entregar/ventas/Index.vue: sin la prop, runListadoPorDefecto del
			grupo 221 corre igual apenas monta y pisa el listado scopeado con el general de
			ventas terminadas. Sin arreglar aca desde el 25/7/2026.
		-->
		<!--
			mostrar_models_que_vinienen_por_prop_siempre dinamica a proposito (Historico y el
			buscador): ver el JSDoc de hay_filtro_del_store().
		-->
		<view-component
		:models_to_show="sales_to_show"
		:mostrar_models_que_vinienen_por_prop_siempre="hay_filtro_del_store"
		show_models_if_empty
		:properties_to_show="properties_to_show"
		:show_previus_days="show_previus_days"
		:show_btn_create="false"
		change_from_dates_option
		:listado_paginado_por_defecto="false"
		:show_modal="false"
		@clicked="clicked"
		:set_model_on_row_selected="false"
		:check_permissions_previus_days="false"
		model_name="sale">
			<template #table_right_options="props">
				<sale-buttons
				:sale="props.model"></sale-buttons>
			</template>
		</view-component>
	</div>
</template>
<script>
import previus_sale from '@/mixins/vender/previus_sale/index'
import depositos from '@/mixins/sale/depositos'
export default {
	mixins: [previus_sale, depositos],
	created() {
		this.$store.commit('sale/set_modulo', 'deposito')
		this.$store.commit('sale/setIsSelecteable', false)
		this.$store.commit('sale/setSelected', [])
		this.$store.commit('sale/setFromDates', false)
		this.$store.dispatch('sale/getModels')
	},
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		SaleButtons: () => import('@/components/deposito/components/SaleButtons'),
	},
	computed: {
		/**
		 * Hay un filtro del store activo (Historico, buscador o modal de filtros).
		 *
		 * Alimenta `mostrar_models_que_vinienen_por_prop_siempre` del view-component. El display
		 * (common-vue/components/display/Index.vue::models_to_show) con `is_filtered` en true
		 * IGNORA la prop `models_to_show` y dibuja `state.sale.filtered` entero, o sea que el filtro
		 * propio de la vista (`sales_to_show`) no llegaba a la tabla. Con esta prop en true se usa
		 * `sales_to_show`, que arranca de `filtered` cuando corresponde (ver `sales()`).
		 *
		 * 🔴 Es dinamica y NO fija en true, a proposito: sin filtro del store el display ya usa la
		 * prop (`show_models_if_empty && !is_filtered`), asi que la tabla se ve igual con la prop en
		 * false; y una prop fija en true dispararia siempre el "Corte 3" de
		 * common-vue/components/view/Index.vue::disparar_listado_por_defecto(). Hoy en esta vista
		 * corta antes el Corte 1 (`listado_paginado_por_defecto` en false, defecto documentado en el
		 * comentario del template), pero si alguien lo arregla, una prop fija mataria el listado por
		 * defecto sin aviso.
		 *
		 * @returns {Boolean}
		 */
		hay_filtro_del_store() {
			return this.$store.state.sale.is_filtered
		},
		/**
		 * Ventas de partida de la vista, antes de su filtro propio.
		 *
		 * 🔴 La lista de partida es la que la tabla esta mostrando, no siempre `models`: el modo
		 * Historico, el buscador y el modal de filtros son un FILTRO del store (cargan `filtered` y
		 * ponen `is_filtered` en true), y con eso el display dibuja `filtered`. Filtrar siempre
		 * `models` --la lista acotada que trae `getModels` (al entrar o en "Por fecha")-- dejaba el filtro de la vista sin efecto en Historico.
		 * Mismo patron que `mixins/sale.js::sales()` y `mixins/provider_order/models_to_show.js`.
		 */
		sales() {
			return this.$store.state.sale.is_filtered
				? this.$store.state.sale.filtered
				: this.$store.state.sale.models
		},
		sales_to_show() {
			return this.sales.filter(sale => {
				return sale.checked 
			})
		},
		show_previus_days() {
			return this.$store.state.sale.from_dates
		}
	},
	methods: {
		clicked(model) {
			this.setPreviusSale(model)
		}
	}
}
</script>