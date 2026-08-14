import moment from 'moment'
export default {
	methods: {
		listenChannels() {
            this.Echo.channel('added_model.'+this.owner_id)
            .notification((notification) => {
                console.log('notification: ')
                console.log(notification)
                let model_name = notification.model_name
                console.log('added_model: '+this.routeString(model_name))

                if (!notification.check_added_by || notification.added_by != this.user.id) {

                    /* 
                        * Si se buscan los modelos por fecha, no lo agrego
                        * Para evitar que por ejemplo se agregue una venta del dia actual cuando estan viendo 
                        las ventas de otra fecha
                    
                    */

                    this.$api.get(this.routeString(model_name)+'/'+notification.model_id)
                    .then(res => {

                        let model_to_add = res.data.model

                        if (!this.store_use_from_dates(model_name)
                            || this.get_from_date(model_name) == moment(model_to_add.created_at).format('YYYY-MM-DD')) {

                            this.$store.commit(model_name.toLowerCase()+'/add', res.data.model)
                        } else {
                            console.log('No se agrego, fecha que se esta viendo: '+this.get_from_date(model_name))
                            console.log('Fecha del que llego: '+moment(model_to_add.created_at).format('YYYY-MM-DD'))
                        }

                    })
                    .catch(err => {
                        console.log(err)
                    })

                } else {
                    console.log('Ya estaba')
                }
            })
            this.Echo.channel('deleted_model.'+this.owner_id)
            .notification((notification) => {
                console.log('deleted_model')
                if (!notification.check_added_by || notification.added_by != this.user.id) {
                    this.$store.commit(notification.model_name.toLowerCase()+'/setDelete', {
                        id: notification.model_id
                    })
                    this.$store.commit(notification.model_name.toLowerCase()+'/delete')
                }
            })
            this.Echo.channel('update_models.'+this.owner_id)
            .notification((notification) => {
                console.log('update_models')
                console.log(notification)
                if (!notification.check_added_by || notification.added_by != this.user.id) {
                    this.$store.commit('general/setModelNameToUpdate', notification.model_name)
                    setTimeout(() => {
                        this.$bvModal.show('update-models')
                    }, 500)
                }
            })
            this.Echo.channel('global_notification.'+this.owner_id)
            .listen('.CompanyOwnerContextUpdated', (payload) => {
                if (!this.user) {
                    return
                }
                /** Detalle de cambios enviado por la API (español). */
                const change_descriptions = payload.change_descriptions || []
                /** Id del usuario que guardó el perfil; no mostramos modal en su sesión. */
                const updated_by_user_id = parseInt(payload.updated_by_user_id, 10)

                this.$store.dispatch('auth/refresh_user_from_api_silent')
                    .then(() => {
                        if (this.$route.name === 'consultora_de_precios') {
                            return
                        }
                        if (updated_by_user_id === parseInt(this.user.id, 10)) {
                            return
                        }
                        if (!change_descriptions.length) {
                            return
                        }
                        this.$store.commit('global_notification/set_functions_to_execute', [
                            {
                                btn_text: 'Entendido',
                                function_name: 'close_notification_modal',
                                btn_variant: 'primary',
                            },
                        ])
                        this.$store.commit('global_notification/set_info_to_show', [
                            {
                                title: 'Detalle de los cambios',
                                parrafos: change_descriptions,
                            },
                        ])
                        this.$store.commit('global_notification/set_message_text', 'Se actualizó la configuración del sistema.')
                        this.$store.commit('global_notification/set_color_variant', 'info')
                        this.$bvModal.show('global-notification')
                    })
            })
            .notification((notification) => {

                console.log('global notificacion:')
                console.log(notification)

                if (this.$route.name == 'consultora_de_precios') {
                    return 
                }

                console.log(notification)
                // Mostrar siempre si no hay restricción, o solo al auth_user indicado.
                if (!notification.is_only_for_auth_user || notification.is_only_for_auth_user == this.user.id) {

                    this.$store.commit('global_notification/set_from_broadcast', notification)

                    // El aviso de que termino un analisis de Excel no se muestra si el usuario
                    // esta justamente mirando esa corrida en el modal de importacion: ahi el
                    // resultado aparece solo, en la pantalla en la que lo esta esperando, y el
                    // modal de aviso encima seria decirle lo que acaba de ver.
                    if (this.esta_mirando_este_analisis(notification)) {
                        return
                    }

                    this.show_global_notification_modal(notification.notification_modal)

                }
            })

            this.Echo
            .channel(`import_status.${this.owner_id}`)
            .listen('.ImportStatusUpdated', (e) => {
                console.log('Evento recibido', e)

                if (this.$route.name === 'consultora_de_precios') {
                    return
                }

                this.$store.commit('import_status/setModel', e.import_status)
            })
		},

		/*
		 * True si la notificacion avisa el fin de un analisis de Excel que el usuario
		 * ya esta siguiendo en vivo, con el modal de importacion abierto.
		 *
		 * El store excel_analysis es del SPA de empresa; este mixin lo comparten otros
		 * proyectos, asi que se chequea que exista antes de leerlo.
		 *
		 * @param {Object} notification  payload de la GlobalNotification recibida
		 * @return {boolean}
		 */
		esta_mirando_este_analisis(notification) {
			if (notification.notification_modal !== 'excel_analysis_ready') {
				return false
			}

			if (!this.$store.state.excel_analysis) {
				return false
			}

			const siguiendo_uuid = this.$store.state.excel_analysis.siguiendo_uuid
			const excel_analysis = notification.excel_analysis || {}

			return !!siguiendo_uuid && siguiendo_uuid === excel_analysis.uuid
		},

		/*
		 * Abre el modal indicado en notification_modal (default: global-notification).
		 */
		show_global_notification_modal(notification_modal) {
			let modal_id = 'global-notification'

			if (notification_modal === 'article_import_result') {
				modal_id = 'article-import-result-notification'
			}

			if (notification_modal === 'price_update_result') {
				modal_id = 'price-update-result-notification'
			}

			if (notification_modal === 'excel_analysis_ready') {
				modal_id = 'excel-analysis-ready-notification'
			}

			this.$bvModal.show(modal_id)
		},
	}
}