<template>
<div
id="ventas"
data-tour="ventas.contenedor">	
	<current-acounts></current-acounts>

	<!-- <update-prices></update-prices> -->


	<afip-ticket-show-errors></afip-ticket-show-errors>
	<afip-ticket-show-observations></afip-ticket-show-observations>

	<sale-modifications></sale-modifications>

	<payment-plan-modal></payment-plan-modal>

	<!-- Modal con el desglose del cálculo del precio final de la venta seleccionada -->
	<sale-price-description></sale-price-description>

	<!-- Modal de consolidación de ventas para facturación -->
	<consolidar-facturacion></consolidar-facturacion>

	<view-component
	show_filter_modal
	:models_to_show="sales_to_show"
	:show_actualizar_option="false"
	ask_selectable
	show_models_if_empty
	:show_previus_days="show_previus_days"
	:show_btn_create="false"
	:show_modal="false"
    :not_show_delete_text="not_show_delete_text"
    mostrar_models_que_vinienen_por_prop_siempre
	model_name="sale">
		<template v-slot:display_top>
			<!--
				El nav de empleados ya no se monta suelto acá: desde la misión 32 vive adentro de
				address-afip-ticket-ventas-cobradas-nav, compartiendo fila con los filtros de
				facturación, cobro y método de pago.
			-->
			<address-afip-ticket-ventas-cobradas-nav></address-afip-ticket-ventas-cobradas-nav>
			<total></total>

			<!-- Mostrar u ocultar ventas contenedoras de facturación en el listado. -->
			<btn-show-consolidadas></btn-show-consolidadas>
		</template>
		<template v-slot:table_left_options="props">
			<!--
				Ya no se usan acá las utilidades `j-start` y `align-center`: las dos declaran su
				propiedad con !important (common-vue/sass/_displays.sass), así que no había forma de
				ajustarles el envolvido ni la alineación desde el <style> de abajo sin pelearles.
				Lo que hacían está declarado ahí, sin !important.
			-->
			<div class="table-left-options-ventas">
				<table-buttons
				:model="props.model" />

				<!--
					El botón de modificaciones y los distintivos van agrupados a propósito. Sueltos,
					eran hermanos directos de <table-buttons>, que cuando su fila de botones se parte
					en dos líneas crece de alto: con la alineación centrada de antes quedaban a media
					altura, sin coincidir con ninguna de las dos líneas. Eso es lo que Lucas vio como
					el botón de Modificaciones "flotando separado del resto".
				-->
				<div class="table-left-options-ventas__extras">
					<btn-sale-modifications
					:model="props.model"></btn-sale-modifications>

					<b-badge
					variant="danger"
					v-if="props.model.en_acopio">
						<i class="bi bi-archive"></i>
						Acopio
					</b-badge>

					<b-badge
					variant="success"
					title="Correo enviado al cliente"
					v-if="props.model.send_mail">
						<i class="bi bi-envelope"></i>
					</b-badge>

					<!-- Distintivo visual para ventas contenedoras de facturación -->
					<b-badge
					variant="warning"
					v-if="props.model.is_consolidacion_facturacion">
						<i class="bi bi-layers"></i>
						Consolidada
					</b-badge>

					<!-- Distintivo para ventas individuales ya incluidas en una consolidación -->
					<b-badge
					variant="info"
					v-if="props.model.consolidacion_facturacion_id">
						<i class="bi bi-clipboard-check"></i>
						Facturada en consolidación
					</b-badge>
				</div>
			</div>
		</template>
		<template #options_drop_down_seleccion>
			<option-dropdown-afip-ticket></option-dropdown-afip-ticket>
			<option-dropdown-consolidar-facturacion></option-dropdown-consolidar-facturacion>
			<send-mail-option-dropdown></send-mail-option-dropdown>
		</template>

		<template #table-prop-client_id="props">
			<client-btn
			:sale="props.model"></client-btn>
		</template>
	</view-component>
</div>  
</template>
<script>
import clients from '@/mixins/clients'
import print_sale from '@/mixins/print_sale'
// import afip_ticket from '@/mixins/afip_ticket'
import sale from '@/mixins/sale'
export default {
	mixins: [clients, print_sale, sale],
	components: { 
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		AddressAfipTicketVentasCobradasNav: () => import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/Index'),
		SaleModifications: () => import('@/components/ventas/modals/sale-modifications/Index'),
		BtnSaleModifications: () => import('@/components/ventas/components/BtnSaleModifications'),
		Total: () => import('@/components/ventas/components/Total'),
		TableButtons: () => import('@/components/ventas/components/table-buttons/Index'),
		// UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),
		OptionDropdownAfipTicket: () => import('@/components/ventas/components/OptionDropdownAfipTicket'),
		OptionDropdownConsolidarFacturacion: () => import('@/components/ventas/components/OptionDropdownConsolidarFacturacion'),
		SendMailOptionDropdown: () => import('@/components/ventas/components/options-dropdown/SendMailOptionDropdown'),
		AfipTicketShowErrors: () => import('@/components/ventas/modals/afip-ticket/ShowErrors'),
		AfipTicketShowObservations: () => import('@/components/ventas/modals/afip-ticket/ShowObservations'),

		ClientBtn: () => import('@/components/ventas/components/ClientBtn'),

		PaymentPlanModal: () => import('@/components/common/payment-plan/Index'),
		// Modal con el desglose del cálculo del precio final de la venta
		SalePriceDescription: () => import('@/components/ventas/modals/SalePriceDescription'),
		// Modal de consolidación de ventas para facturación
		ConsolidarFacturacion: () => import('@/components/ventas/modals/consolidar-facturacion/Index'),
		BtnShowConsolidadas: () => import('@/components/ventas/components/BtnShowConsolidadas'),
	},
	created() {
		this.$store.commit('sale/setFromDates', true)

		// Los filtros de pantalla vuelven a su valor neutro ANTES de pedir el listado. En modo
		// paginado viajan en la query string del pedido: reiniciarlos después (como hasta el
		// 14/9/2026) mandaba el primer pedido con las opciones que quedaron de la visita anterior,
		// y los watchers de abajo tenían que pedirlo de vuelta.
		this.reiniciar_filtros()
		this.$store.commit('sale/set_modulo', 'ventas')
		this.sincronizar_alcance()
		this.$store.dispatch('sale/getModels')

		// Temporizador del refresco de totales (ver refrescar_totales_con_debounce). No va en
		// data() porque no hace falta que sea reactivo.
		this.timeout_refresco_totales = null
	},
	mounted() {
		// 🔴 Los watchers se registran acá, con $watch, y NO en la opción `watch:`. Un watcher
		// declarado en la opción existe desde antes de created(), y los commits de ahí arriba
		// (reiniciar_filtros, set_alcance_de_pantalla) cambian justamente los valores observados:
		// se dispararía en el primer tick y pediría el listado dos veces. Registrados en mounted(),
		// esos cambios ya pasaron y solo se observa lo que haga el usuario.

		// Solapa de sucursal / empleado: la ruta cambia de params sin destruir la vista.
		this.$watch('$route.params.view', this.recargar_por_cambio_de_alcance)
		this.$watch('$route.params.sub_view', this.recargar_por_cambio_de_alcance)

		// Show options y "ver consolidadas": en modo paginado el servidor recorta y totaliza, así
		// que cada cambio pide el día de vuelta (página 1) con el filtro en la query string.
		this.$watch(() => this.$store.state.sale.ventas_cobradas_show_option, this.recargar_por_cambio_de_alcance)
		this.$watch(() => this.$store.state.sale.afip_ticket_show_option, this.recargar_por_cambio_de_alcance)
		this.$watch(() => this.$store.state.sale.payment_method_show_option, this.recargar_por_cambio_de_alcance)
		this.$watch(() => this.$store.state.sale.mostrar_consolidadas, this.recargar_por_cambio_de_alcance)

		// 🔴 Los catálogos de sucursales y empleados llegan DESPUÉS del created() cuando se entra
		// por URL directa o con F5 (download-resources los baja en paralelo, con un segundo de
		// espera): `resolve_view_scope()` corre con los stores vacíos, no encuentra al empleado de
		// la ruta y resuelve `only_owner = true` (o no encuentra la sucursal y no manda
		// `address_id`). El primer pedido sale con ese alcance equivocado, y como el servidor es
		// el que recorta, nada lo corregía: la tabla quedaba vacía con los totales del dueño. Con
		// los catálogos ya cargados se vuelve a resolver, y solo si el alcance cambió se pide de
		// vuelta (un dueño en "todas / todos" no gasta un pedido de más).
		this.$watch(() => this.addresses.length + '/' + this.employees.length, () => {
			if (this.alcance_de_la_ruta_cambio()) {
				this.recargar_por_cambio_de_alcance()
			}
		})

		// Una venta agregada, editada o borrada desde un modal deja los totales del servidor
		// viejos (ver `totales_desactualizados` en el store): se vuelven a pedir, sin indicador.
		this.$watch(() => this.$store.state.sale.totales_desactualizados, (desactualizados) => {
			if (desactualizados) {
				this.refrescar_totales_con_debounce()
			}
		})
	},
	beforeDestroy() {
		clearTimeout(this.timeout_refresco_totales)
	},
	methods: {
		reiniciar_filtros() {
			this.$store.commit('sale/setVentasCobradasShowOption', 'cobradas-y-no-cobradas')
			this.$store.commit('sale/setAfipTicketShowOption', 'con-y-sin-factura')
			this.$store.commit('sale/set_payment_method_show_option', 'todos')
		},
		/**
		 * Le deja al store la solapa actual resuelta a ids (address_id / employee_id / only_owner),
		 * que es lo que `sale/_getModels` manda en la query string del modo paginado. Se resuelve
		 * acá y no en el store porque hace falta cruzar los nombres de la ruta con los stores de
		 * address y employee.
		 */
		sincronizar_alcance() {
			this.$store.commit('sale/set_alcance_de_pantalla', this.resolve_view_scope())
		},
		/**
		 * true si la solapa de la ruta, resuelta con los catálogos de AHORA, difiere del alcance que
		 * quedó en el store (el que viajó en el último pedido).
		 *
		 * @returns {Boolean}
		 */
		alcance_de_la_ruta_cambio() {
			let nuevo = this.resolve_view_scope()
			let actual = this.$store.state.sale.alcance_de_pantalla || {}
			return nuevo.address_id != actual.address_id
				|| nuevo.employee_id != actual.employee_id
				|| !!nuevo.only_owner != !!actual.only_owner
		},
		/**
		 * Cambió la solapa, una show option o "ver consolidadas": en modo paginado por fecha el
		 * servidor es el que recorta, así que hay que pedir el día de vuelta con el alcance nuevo.
		 */
		recargar_por_cambio_de_alcance() {
			// Navegación saliente: los params de la ruta cambian ANTES de que esta vista se
			// destruya y los watchers alcanzan a correr con la ruta nueva. Sin este corte, irse a
			// Depósito pedía el listado de ventas una vez más.
			if (this.$route.name != 'sale' && this.$route.name != 'VentasAll') {
				return
			}
			let state = this.$store.state.sale
			// En modo filtrado (buscador general / filtro de columna) los filtros de pantalla
			// siguen aplicándose en el navegador sobre `filtered`, como hasta ahora.
			if (state.is_filtered) {
				return
			}
			// Con la API vieja el listado ya es el día entero y se filtra en el navegador: pedirlo
			// de vuelta no cambia nada. La excepción es que haya un pedido en vuelo: ahí todavía no
			// se sabe si la API pagina (`paginado_por_fecha` es el resultado del último que LLEGÓ),
			// y volver a pedir con el alcance nuevo es lo seguro, porque la última pedida gana.
			if (!state.paginado_por_fecha && !state.pedido_en_curso) {
				return
			}
			this.sincronizar_alcance()
			this.$store.dispatch('sale/getModels')
		},
		/**
		 * Pide el refresco silencioso de los totales, agrupando ráfagas: facturar cinco ventas de
		 * una dispara cinco `add` seguidos y tiene que salir UN pedido, no cinco.
		 */
		refrescar_totales_con_debounce() {
			let self = this
			clearTimeout(this.timeout_refresco_totales)
			this.timeout_refresco_totales = setTimeout(function () {
				let state = self.$store.state.sale
				if (state.paginado_por_fecha && !state.is_filtered) {
					self.$store.dispatch('sale/refrescar_totales_del_dia')
				}
			}, 400)
		},
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('sale/setSelected', [])
		// El modo paginado por fecha es de ESTA pantalla y se apaga al salir. Si quedara prendido,
		// cualquier otra tabla con `model_name="sale"` (el modal "Ventas del artículo" del Listado,
		// que recibe sus filas por prop) mostraría la barra de paginación con los números del día
		// de Ventas, y un clic en una página pediría el día de vuelta. Al volver acá, la respuesta
		// de `getModels` lo vuelve a prender.
		this.$store.commit('sale/set_paginado_por_fecha', false)
		this.$store.commit('sale/set_totales_del_dia', null)
		next()
	},
	computed: {
		show_previus_days() {
			if (this.hasExtencion('sales.hide')) {
				console.log('ENTRO EN LA hasExtencion sales.hide')
				return this.$route.name == 'VentasAll'
			} else if (this.is_filtered) {
				return false
			}
			return true
		},
		is_filtered() {
			return this.$store.state.sale.is_filtered 
		},
		model_to_delete() {
			return this.$store.state.sale.delete 
		},
		not_show_delete_text() {
			return this.delete && this.delete.afip_ticket
		},
	},
}
</script>
<style scoped>

/*
 * La celda de controles de cada venta del listado (7/9/2026, pedido de Lucas: "el botón de
 * Modificaciones aparece desorganizado, el de los Log también").
 *
 * La fila de botones de adentro (table-buttons) ya se había arreglado: separa por `gap` y envuelve
 * ordenada. Lo que seguía mal era este contenedor, que es el que la envuelve acá. No envolvía, y
 * alineaba a sus hijos al centro: cuando la barra de botones se parte en dos líneas —en ventas pasa
 * casi siempre, son seis o siete controles— este div crece de alto y el centro vertical cae en el
 * medio de las dos líneas. Ahí quedaba el "Mod", a media altura y sin alinearse con ninguna.
 *
 * Se alinea al tope para que los extras acompañen a la PRIMERA línea de botones, que es donde el
 * ojo los busca, y se envuelve con las mismas medidas que usa table-buttons por dentro para que las
 * dos separaciones se lean como una sola.
 */
.table-left-options-ventas {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: flex-start;
	align-items: flex-start;
	/* Las líneas se apilan desde arriba en vez de repartirse el sobrante de una celda más alta. */
	align-content: flex-start;
	/* 8px entre controles y 6px entre líneas: los mismos de table-buttons (--toolbar-btn-gap). */
	gap: 6px 8px;
}

/*
 * El "Mod" y los distintivos se centran ENTRE ELLOS —una pastilla es más baja que un botón— pero el
 * grupo entero se apoya arriba por el align-items del contenedor. Así el botón queda a la altura de
 * la primera línea de la barra y los distintivos a la altura del botón.
 */
.table-left-options-ventas__extras {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 8px;
}

/*
 * Un `v-if` en falso deja un nodo comentario, y un <div> que sólo tiene comentarios SÍ matchea
 * :empty. Sin esto, una venta sin modificaciones y sin ningún distintivo —que son la mayoría—
 * dejaría igual el hueco de 8px del gap después de la barra de botones.
 */
.table-left-options-ventas__extras:empty {
	display: none;
}

.card-icon {
	font-size: 1.5rem
}
.spinner-border {
	margin-bottom: 3px;
}
.clients-results {
	position: absolute;
	top: 100%;
	width: 100%;
	z-index: 500;
}
</style>