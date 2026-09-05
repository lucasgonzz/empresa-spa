import set_employee_vender from '@/mixins/set_employee_vender'
import inventory_performance from '@/mixins/inventory_performance'
import cotizacion_dolar from '@/mixins/cotizacion_dolar'
export default {
	mixins: [set_employee_vender, inventory_performance, cotizacion_dolar],
	methods: {
		startMethods() {
			console.log('llamando startMethods')

			this.checkUserAppUrl()
			
			this.setEmployeeVender()
			
			this.init_vender_address_id()
			
			// this.checkUpdateFeaturesCookie()
			
			this.getUnconfirmedOrders()
			
			this.getProviderOrdersDaysToAdvise()
			
			this.get_ventas_sin_cobrar()

			this.get_deposit_movements_en_curso()

			this.get_buyers_and_set_messages_not_read()

			if (this.is_admin) this.get_problemas_al_facturar()

			this.get_articles_por_defecto()

			// this.get_ultimos_articulos_actualizados()

			// Red de seguridad de los pedidos online + polling de mensajes de compradores
			this.escuchar_orders_y_messages()

		this.get_inventory_performance()

		this.get_tn_failed_syncs_count()

		this.check_synced_version_notifications()

		this.check_excel_analysis_en_curso()

		this.check_escaneo_factura_en_curso()

		// Va ultimo a proposito: es el chequeo que menos urge y el que mas puede tardar,
		// porque por detras del backend sale a una API de terceros.
		this.check_cotizacion_dolar()

		},
		/**
		 * Recupera el análisis de Excel con IA que el usuario haya dejado corriendo.
		 *
		 * El aviso de "terminó" viaja por broadcast, y un broadcast solo le llega a
		 * quien está conectado en ese momento: si encoló el análisis y cerró la
		 * pestaña, el evento pasó sin nadie que lo escuche. Esto es lo que cierra ese
		 * agujero, y es la misma red de seguridad que ya tienen los pedidos online
		 * frente a una reconexión de Echo.
		 *
		 * Tres casos:
		 *  - terminada y sin ver: se muestra el aviso, igual que si hubiera llegado en vivo.
		 *  - todavía corriendo: queda en el store, y el aviso llega por broadcast cuando
		 *    termine. El modal de importación también la usa para retomarla si lo abren.
		 *  - no hay nada: no pasa nada.
		 *
		 * @return {void}
		 */
		check_excel_analysis_en_curso() {
			this.$store.dispatch('excel_analysis/get_en_curso')
			.then(run => {
				if (!run) {
					return
				}

				if (run.estado !== 'listo' && run.estado !== 'error') {
					return
				}

				const contexto = run.contexto || {}

				/*
				 * Se arma el mismo payload que manda el broadcast, para que el modal de
				 * aviso no tenga que saber por cuál de los dos caminos llegó.
				 */
				this.$store.commit('global_notification/set_excel_analysis', {
					uuid:              run.uuid,
					tipo:              run.tipo,
					estado:            run.estado,
					error:             run.error,
					model:             contexto.model,
					original_filename: contexto.original_filename,
				})

				this.$bvModal.show('excel-analysis-ready-notification')
			})
		},
		/**
		 * Deja el escaneo de facturas de compra en condiciones apenas arranca la SPA.
		 *
		 * Hace DOS cosas, y la primera es la que importa:
		 *
		 *  1. Carga los escaneos pendientes (listos y sin gestionar). 🔴 Es lo que
		 *     enciende los botones rojos del listado de compras. Sin esto, un escaneo
		 *     que terminó mientras el usuario no estaba conectado no se ve por ningún
		 *     lado hasta que llegue otro broadcast — o sea, nunca.
		 *  2. Recupera el aviso de "terminó" que se haya perdido, igual que
		 *     check_excel_analysis_en_curso: un broadcast solo le llega a quien está
		 *     conectado en ese momento, y si mandó el escaneo y cerró la pestaña, el
		 *     evento pasó sin nadie que lo escuche.
		 *
		 * Todo gateado por la extensión: sin ella los endpoints devuelven 403 y no hay
		 * nada que mostrar.
		 *
		 * @return {void}
		 */
		check_escaneo_factura_en_curso() {
			if (!this.hasExtencion('escaneo_factura_compra')) {
				return
			}

			this.$store.dispatch('provider_order_scan/get_pendientes')

			this.$store.dispatch('provider_order_scan/get_en_curso')
			.then(run => {
				if (!run) {
					return
				}

				if (run.estado !== 'listo' && run.estado !== 'error') {
					return
				}

				const contexto = run.contexto || {}

				/*
				 * Se arma el mismo payload que manda el broadcast, para que el modal de
				 * aviso no tenga que saber por cuál de los dos caminos llegó. Los datos
				 * de la compra se leen del contexto o de la raíz de la corrida, lo que
				 * venga: el aviso no se pierde por una clave de más o de menos.
				 */
				this.$store.commit('global_notification/set_provider_order_scan', {
					uuid:               run.uuid,
					provider_order_id:  run.provider_order_id || contexto.provider_order_id,
					estado:             run.estado,
					error:              run.error,
					cantidad_articulos: contexto.cantidad_articulos,
					provider_nombre:    contexto.provider_nombre,
				})

				this.$bvModal.show('provider-order-scan-ready-notification')
			})
		},
		check_synced_version_notifications() {
			this.$store.dispatch('synced_version_notification/get_pending')
			.then(() => {
				if (this.$store.getters['synced_version_notification/has_pending']) {
					this.$bvModal.show('synced-version-notifications')
				}
			})
		},
		/**
		 * Pide el reporte de inventario al iniciar el sistema y decide si mostrar
		 * el modal de stock minimo:
		 *
		 * - Escenario 1 (reporte vigente): se muestra el modal de una si corresponde.
		 * - Escenario 2 (reporte vencido o inexistente, generating: true): no se espera nada,
		 *   se suscribe al canal de broadcast y el modal se muestra recien cuando el job
		 *   en background termina de calcular el reporte (puede tardar minutos en cuentas grandes).
		 *
		 * Si show_stock_min_al_iniciar esta desactivado, el reporte igual se pide (y se
		 * regenera si vencio) porque lo usan el modulo de Alertas y el boton Inventario.
		 */
		get_inventory_performance() {
			if (!this.is_admin) return

			this.$store.dispatch('inventory_performance/get_models_con_estado')
			.then(() => {

				// Escenario 1: el reporte ya estaba vigente.
				if (this.mostrar_modal_stock_minimo()) {
					this.$bvModal.show('articles-stock-minimo')
					return
				}

				// Escenario 2: se esta generando en background -> esperar el broadcast.
				if (this.inventory_performance_generating) {
					this.escuchar_inventory_performance(() => {
						if (this.mostrar_modal_stock_minimo()) {
							this.$bvModal.show('articles-stock-minimo')
						}
					})
				}
			})
		},
		/**
		 * Determina si corresponde mostrar el modal de stock minimo al iniciar sesion.
		 * Se decide con el contador stock_minimo del reporte (no con la lista completa
		 * de articulos, que ya no viaja en la respuesta del backend).
		 *
		 * @returns {Boolean}
		 */
		mostrar_modal_stock_minimo() {
			return !!(this.owner.show_stock_min_al_iniciar && this.hay_articulos_stock_minimo)
		},
		escuchar_orders_y_messages() {
			if (this.owner.online) {

				/*
					🔴 ESTE INTERVALO NO SE BORRA, aunque el aviso de pedido nuevo ya llegue por
					broadcast (mision 43, 12/8/2026; el canal se escucha en mixins/broadcast.js).

					Bajo de 20 segundos a 5 minutos porque el broadcast hace el trabajo en tiempo
					real. Sigue existiendo porque es la red de seguridad: si Pusher se cae, si las
					credenciales de tienda-api y empresa-spa dejan de apuntar a la misma app, o si
					la pestana pierde la conexion y el navegador no la recupera, el comercio deja
					de ver los pedidos nuevos y NO SE ENTERA -- no hay error en ningun lado. Un
					pedido de la tienda que nadie mira es plata perdida.

					Cinco minutos es el peor caso de demora si el broadcast no llega; con el
					broadcast andando, el aviso es inmediato.
				*/
				setInterval(() => {
					if (this.$route.name != 'online') {

						this.$store.dispatch('order/getUnconfirmedModels')
					}
				}, 300000)

				// El polling de mensajes de compradores es otro asunto y queda como estaba.
				setInterval(() => {
					if (this.$route.name != 'online') {
						
						this.get_buyers_and_set_messages_not_read()
					}
				}, 20000)
			}
		},
		// get_ultimos_articulos_actualizados() {
		// 	if (!this.download_articles) {

		// 		this.$api.get('articles-ultimos-actualizados')
		// 		.then(res => {
		// 			this.$store.commit('article/addModels', res.data.models)
		// 		})
		// 		.catch(err => {
		// 			this.$toast.error('error al cargar ultimos articulos actualizados')
		// 		})
		// 	}
		// },
		get_articles_por_defecto() {
			if (this.hasExtencion('articles_default_in_vender') 
				&& !this.owner.download_articles) {

				this.$api.get('articles-por-defecto')
				.then(res => {
					console.log('articles-por-defecto:')
					console.log(res.data.models)
					this.$store.commit('article/addModels', res.data.models)
				})
				.catch(err => {
					this.$toast.error('error al cargar articulos por defecto')
				})
			}
		},
		get_deposit_movements_en_curso() {
			this.$store.dispatch('deposit_movement/en_curso/getModels')
		},
		get_ventas_sin_cobrar() {
			if (this.owner.dias_alertar_empleados_ventas_no_cobradas) {
				this.$store.dispatch('sale/ventas_sin_cobrar/getModels')
			}
		},

		/**
		 * Carga la cantidad de sincronizaciones fallidas con Tienda Nube.
		 * Solo se ejecuta si el usuario tiene habilitada la extensión 'usa_tienda_nube'.
		 * El resultado se guarda en el store y alimenta el badge del menú.
		 */
		get_tn_failed_syncs_count() {
			/* Solo cargar si el usuario usa la integración con Tienda Nube */
			if (this.hasExtencion('usa_tienda_nube')) {
				this.$store.dispatch('sync_to_tn_article/getFailedCount')
			}
		},
		checkUserAppUrl() {
			console.log('checkUserAppUrl')
			console.log(location.href)
			if (this.owner.app_url && this.owner.app_url != location.href) {
				alert('Su empresa tiene que ingresar desde el siguiente LINK: '+this.owner.app_url+'. Precio ACEPTAR para ser redirigido.')
				console.log('cerrando sesion')
				this.$store.dispatch('auth/logout')
				setTimeout(() => {
        			location.replace(this.owner.app_url)
				}, 2000)
			}
		},

		/*
			Al iniciar el sistema, se setea address_id con el configurado para el usuario
			Solo si no se le configuro nada, se usa la cookie
		*/
		init_vender_address_id() {
			
			if (this.user.address_id) {
				
				console.log('seteando VENDER address_id desde USER->ADDRESS_ID')
				this.$store.commit('vender/setAddressId', this.user.address_id)
				
				this.$cookies.set('address_id', this.user.address_id, -1)

			} else {


				let cookie = this.$cookies.get('address_id')

				if (cookie) {
					console.log('seteando VENDER address_id desde COOKIE')
					this.$store.commit('vender/setAddressId', cookie)
				}
			}

		},
		checkUpdateFeaturesCookie() {
			let cookie = this.$cookies.get('update_features_watched')
			console.log(cookie)
			if (cookie === null) {
				this.$cookies.set('update_features_watched', false, -1)
				cookie = this.$cookies.get('update_features_watched')
			}
			if (cookie == 'false') {
				this.$store.dispatch('update_feature/getModels')
				setTimeout(() => {
					this.$bvModal.show('update-features')
				}, 3000)
			} 
		},
		getUnconfirmedOrders() {
			if (this.has_online) {
				this.$store.dispatch('order/getUnconfirmedModels')
			}
		},
		getProviderOrdersDaysToAdvise() {
			this.$store.dispatch('provider_order/getDaysToAdvise')
		},
		get_buyers_and_set_messages_not_read() {
			console.log('get_buyers_and_set_messages_not_read')
			this.$store.dispatch('buyer/getModels')
			.then(() => {
				console.log('llegaron los buyers, mandando setChatsToShow')
				this.$store.dispatch('message/setChatsToShow')
				console.log('setChatsToShow mandado')
			})
		},
		get_problemas_al_facturar() {
			this.$store.dispatch('afip_ticket/get_problemas_al_facturar')
			.then(() => {
				if (this.owner.show_afip_errors_al_iniciar) {
					this.notificar_errores_afip()
				}
			})
		},
		notificar_errores_afip() {
			if (this.$store.state.afip_ticket.problemas_al_facturar.length) {
				this.$bvModal.show('afip-reenviar-facturas')
			}
		}
	}
}