import set_employee_vender from '@/mixins/set_employee_vender'
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [set_employee_vender, inventory_performance],
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

			// Llamo cada 20 segundos a peidos online
			this.escuchar_orders_y_messages()

		this.get_inventory_performance()

		this.get_tn_failed_syncs_count()

		this.check_synced_version_notifications()

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

				setInterval(() => {
					if (this.$route.name != 'online') {
						
						this.$store.dispatch('order/getUnconfirmedModels')
					}
				}, 20000)

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