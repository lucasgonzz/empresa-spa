<template>
	<div>

		<!--
			`m-b-15` en vez del `m-b-40` que tenía: 40px dejaban el contenido flotando lejos de las
			pestañas, sobre todo en movimientos de depósitos, que arranca directo con su barra.

			🔴 Y NO va sin clase, aunque Comprobantes y Listado monten este mismo nav sin ninguna:
			ahí lo que sigue es un `view-component`, cuyo header trae `p-t-15` propio. Acá varias
			secciones arrancan con un `<b-table>` desnudo, que no tiene margen de arriba, así que sin
			clase quedan PEGADAS al nav. Medido: `.cont-navs` no tiene margin-bottom ni padding-bottom
			propio, y el `margin-top: 15px` de adentro del nav es del pill, no aire debajo. Vacías no
			se nota —el estado vacío trae 48px de padding—, y con datos sí: es justo el defecto que
			se ve solo cuando el módulo tiene información.

			15px es el mismo aire que el `p-t-15` de esos otros módulos, así que no estrena un valor.
		-->
		<horizontal-nav
		class="m-b-15"
		@setSelected="setSelectedView"
		set_view
		emitir_setSelected_al_inicio
		:show_display="false"
		:items="nav_items"></horizontal-nav>

		<lista-de-alertas-table></lista-de-alertas-table>

	</div>
</template>
<script>
import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	components: {
		ListaDeAlertasTable: () => import('@/components/alertas/components/lista-de-alertas-table/Index'),
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		nav_items() {

			let items = [
				{
					name: 'Cobros',
					alert: this.ventas_sin_cobrar.length	
				},
				{
					name: 'Stock minimo',
					alert: this.stock_minimo_alert_count
				},
				/*
					Busquedas de imagenes inteligentes (mision imagenes-catalogo-completo,
					27/9/2026). Sin permiso que la condicione: cualquiera que pida imagenes desde el
					listado tiene que poder ver que paso con ellas.

					🔴 Es la unica pestaña con acento en el nombre visible, y por eso lleva
					`route_value` y `testid`: el slug sale de routeString() sobre el nombre, y
					"Imágenes" daria "imágenes" con tilde en la URL. La ruta queda
					/alertas/imagenes, que es la que usan los links de "Revisar en Alertas", el
					historial del listado y la pildora de procesos. `testid` deja el data-testid
					en `nav-item-imagenes`, sin tilde.
				*/
				{
					name: 'Imágenes',
					route_value: 'imagenes',
					testid: 'imagenes',
					alert: this.imagenes_alert_count
				},
			]

			if (this.can('alerts.provider_orders')) {
				items.push({
					name: 'Pedidos Proveedor',	
					alert: this.provider_order_days_to_advise.length	
				})
			}

			if (this.can('alerts.orders')) {
				items.push({
					name: 'Pedidos Online',	
					alert: this.unconfirmed_orders.length	
				})
			}

			if (this.can('alerts.messages')) {
				items.push({
					name: 'Mensajes',	
					alert: this.messages_not_read		
				})
			}

			if (this.hasExtencion('deposit_movements')) {
				items.push({
					name: 'Movimientos de depositos',	
					alert: this.deposit_movements_en_curso.length		
				})
			}

			if (this.can('alerts.problemas_al_facturar')) {
				items.push({
					name: 'Facturacion',	
					alert: this.problemas_al_facturar.length		
				})
			}

			return items
		},
		
	},
	methods: {
		setSelectedView(item) {
			console.log('setSelectedView')
			console.log(this.view)
			console.log(item)
			// `route_value` manda sobre el nombre cuando el item lo trae (la pestaña "Imágenes"):
			// es lo mismo que hace horizontal-nav para armar la URL, y sin esto volver a tocar esa
			// pestaña no recargaria nunca, porque "imágenes" no es igual a "imagenes".
			if (this.view == this.routeString(item.route_value ? item.route_value : item.name)) {
				
				this.$store.commit('auth/setMessage', 'Cargando informacion')
				this.$store.commit('auth/setLoading', true)

				if (this.view == 'stock-minimo') {
					this.$store.dispatch('inventory_performance/getModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'cobros') {
					this.$store.dispatch('sale/ventas_sin_cobrar/getModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'pedidos-proveedor') {
					this.$store.dispatch('provider_order/getDaysToAdvise')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'pedidos-online'){
					this.$store.dispatch('order/getUnconfirmedModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				} 

				if (this.view == 'mensajes') {
					// Conversaciones de la tienda con algo sin leer (store tienda_mensajes, misión
					// mensajes-tienda-online). Antes bajaba TODOS los compradores con buyer/getModels
					// para filtrar en el navegador. El resumen se pide junto para que el número de la
					// pestaña y la tabla digan lo mismo. La acción resuelve siempre, así que el
					// cargando global no puede quedar prendido.
					this.$store.dispatch('tienda_mensajes/getResumen')
					this.$store.dispatch('tienda_mensajes/getChatsNoLeidos')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
						this.$store.commit('auth/setMessage', '')
					})
				}

				if (this.view == 'movimientos-de-depositos') {
					this.$store.dispatch('deposit_movement/en_curso/getModels')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'facturacion') {
					this.$store.dispatch('afip_ticket/get_problemas_al_facturar')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
					})
				}

				if (this.view == 'imagenes') {
					// La tabla de busquedas y el numero rojo salen del mismo pedido (el listado trae
					// el resumen adentro). La accion resuelve siempre, pero el catch va igual: el
					// loading global no puede quedar prendido por nada.
					this.$store.dispatch('image_assignment/get_asignaciones')
					.then(() => {
						this.$store.commit('auth/setLoading', false)
						this.$store.commit('auth/setMessage', '')
					})
					.catch(() => {
						this.$store.commit('auth/setLoading', false)
						this.$store.commit('auth/setMessage', '')
					})
				}

			}
		}
	}
}
</script>