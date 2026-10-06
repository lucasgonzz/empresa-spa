import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	methods: {
		/**
		 * Devuelve la cantidad de sincronizaciones TN con estado 'error'.
		 * Usada como budget_function en el ítem de menú "Tienda Nube".
		 *
		 * @returns {number}
		 */
		tn_failed_syncs_count() {
			return this.tn_sync_failed_count
		},
		/**
		 * Total para el badge del ítem "Tienda Online": pedidos sin confirmar + conversaciones con
		 * mensajes sin leer de la tienda.
		 *
		 * @returns {number}
		 */
		online_menu_alert_count() {
			let total = 0
			if (this.has_online && this.can('alerts.orders')) {
				total += Number(this.unconfirmed_orders.length)
			}
			/*
				Mensajes de la tienda (misión mensajes-tienda-online, 28/9/2026): cuenta
				CONVERSACIONES con algo sin leer y no mensajes, como el badge de una bandeja de chats.
				Sale del resumen que pide el anfitrión del sidebar al iniciar sesión, así que está
				prendido desde el login sin entrar al submódulo. Mismo permiso que el hijo "Mensajes"
				del menú; el resumen solo se pide con la extensión `online`, así que sin ella es 0.
			*/
			if (this.can('buyer.index') && this.$store.state.tienda_mensajes) {
				total += Number(this.$store.state.tienda_mensajes.resumen.chats_no_leidos) || 0
			}
			return total
		},
		/**
		 * Total para el badge del ítem "WhatsApp": cantidad de mensajes de la IA esperando
		 * aprobación del negocio (misión sugerencia-ia-como-borrador, 29/9/2026). Mismo patrón
		 * que `online_menu_alert_count` con `tienda_mensajes.resumen`: sale del resumen que pide
		 * `SidebarHost.vue` apenas el módulo está habilitado, así que está prendido desde el
		 * login sin entrar a la vista de WhatsApp. Sin la extensión (o antes de la primera
		 * carga) da 0: `state.whatsapp_chat.resumen` nace en ese valor.
		 *
		 * @returns {number}
		 */
		whatsapp_por_aprobar_count() {
			return Number(this.$store.state.whatsapp_chat.resumen.mensajes_por_aprobar) || 0
		},
		alerts_count() {
			let total = 0
			
			total += this.ventas_sin_cobrar.length

			if (this.can('alerts.provider_orders')) {
				total += Number(this.provider_order_days_to_advise.length)
			}
			
			if (this.can('alerts.orders')) {
				total += Number(this.unconfirmed_orders.length)
			}
			
			if (this.can('alerts.messages')) {
				total += Number(this.messages_not_read)
			}
			
			if (this.can('alerts.problemas_al_facturar')) {
				total += Number(this.problemas_al_facturar.length)
			}
			
			total += this.stock_minimo_alert_count

			total += Number(this.deposit_movements_en_curso.length)
			
			// Imagenes para revisar + busquedas de imagenes terminadas sin abrir. Sin permiso que
			// lo condicione: la solapa "Catalogo" de Alertas tampoco lo tiene.
			total += Number(this.imagenes_alert_count)

			// Sistemas de categorias esperando que el dueño elija + articulos dudosos por revisar
			// (mision categorizacion-tres-modelos). El numero lo arma la API y para quien no es el
			// dueño o el acceso maestro vale 0, asi que tampoco necesita un permiso aca.
			total += Number(this.categorias_alert_count)

			return  total
		}
	}
}