<template>
	<div
	v-if="view == 'ventas'"
	data-tour="ventas.por_entregar_contenedor">
	    <confirm
	    model_name="sale"
	    show_compensar_caja_checkbox
	    :actions="['sale/delete']"
	    id="delete-sale"></confirm>

		<current-acounts></current-acounts>

		<!--
			listado_paginado_por_defecto en false: esta vista ya trae sus propios modelos
			scopeados (RangoFechas.vue pega directo a sale/por-entregar y este Index.vue arma
			el modulo 'por_entregar' de sale/getModels). Sin la prop, runListadoPorDefecto
			del grupo 221 corre igual apenas monta -antes de que la respuesta scopeada
			llegue- y deja el store con el listado general de ventas terminadas en vez del
			de pendientes. Mismo defecto que ya tenian los modales de caja (ver
			caja/modals/movimientos/Index.vue), sin arreglar aca desde el 25/7/2026.
		-->
		<!--
			table_preference_scope: las columnas de esta tabla las elige el usuario (boton de
			columnas en RangoFechas.vue) y se guardan aparte de las del listado de Ventas, como
			`table_por_entregar`; los defaults del ambito estan en models/sale.js (table_scopes).
			Las cinco de properties_to_show quedan solo como fallback: lo que se ve mientras la
			preferencia no se aplico todavia.
		-->
		<view-component
		:show_view_header="false"
		:models_to_show="sales_to_show"
		:properties_to_show="properties_to_show"
		table_preference_scope="por_entregar"
		show_models_if_empty
		:listado_paginado_por_defecto="false"
		:show_previus_days="show_previus_days"
		:show_btn_create="false"
		:show_modal="false"
		model_name="sale">
			<template #header>
				<rango-fechas></rango-fechas>
			</template>
			<!--
				El cliente como boton que abre su cuenta corriente (el <current-acounts> de arriba
				existe para eso), igual que en el listado de Ventas. Antes lo daba el `button` de la
				prop client_id fija de properties_to_show; con las columnas del modelo esa prop ya no
				trae boton, y sin este slot el nombre quedaba como texto plano y el modal sin quien
				lo abra.
			-->
			<template #table-prop-client_id="props">
				<client-btn
				:sale="props.model"></client-btn>
			</template>
			<template #table_right_options="props">
				<b-button
				class="m-l-15"
				variant="success"
				@click.stop="terminada(props.model)">
					<i class="icon-check"></i>
					Terminada
				</b-button> 
			</template>
		</view-component>
	</div>
</template>
<script>
import marcar_como_terminada from '@/mixins/sale/marcar_como_terminada'
export default {
	mixins: [marcar_como_terminada],
	created() {
		this.$store.commit('sale/set_modulo', 'por_entregar')
		this.$store.commit('sale/setIsSelecteable', false)
		this.$store.commit('sale/setSelected', [])
		this.$store.commit('sale/setFromDates', false)
		this.$store.dispatch('sale/getModels')
	},
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		// SaleModal: () => import('@/components/common/SaleModal'),
		RangoFechas: () => import('@/components/por-entregar/components/ventas/RangoFechas'),
		Confirm: () => import('@/common-vue/components/Confirm'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		SaleButtons: () => import('@/components/deposito/components/SaleButtons'),
		ClientBtn: () => import('@/components/ventas/components/ClientBtn'),
	},
	computed: {
		// Fallback de columnas hasta que se aplica la preferencia del ambito (ver el comentario
		// del view-component). No agregar columnas aca: las nuevas van en models/sale.js.
		properties_to_show() {
			return [
				{
					text: 'N°',
					key: 'num',
					type: 'number',
					not_show_on_form: true,
					filter_modal_position: 1,
				},
				{
					text: 'Total',
					key: 'total',
					type: 'number',
					only_show: true,
					function: 'totalSale',
				},
				{
					text: 'Fecha Entrega',
					key: 'fecha_entrega',
					type: 'date',
					only_show: true,
					is_date: true,
				},
				{
					text: 'Cliente',
					key: 'client_id',
					type: 'search',
					store: 'client',
					only_show: true,
					v_if: ['client_id', '!=', null],
					button: {
						function: 'showClientCurrentAcount',
					},
					filter_modal_position: 2,
				},
				{
					text: 'Empleado',
					key: 'employee_id',
					type: 'search',
					only_show: true,
				},
			]
		},
		sales() {
			return this.$store.state.sale.models 
		},
		sales_to_show() {
			return this.sales.filter(sale => {
				return sale.fecha_entrega && !sale.terminada 
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