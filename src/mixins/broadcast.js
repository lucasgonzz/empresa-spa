import online from '@/mixins/online'
export default {
    mixins: [online],
    data() {
        return {
            /** Nombre del canal support.user.* actualmente suscrito (para Echo.leave al cambiar de usuario). */
            support_user_echo_channel: null,
            /** Nombre del canal order.created.* actualmente suscrito, para no suscribirse dos veces. */
            order_created_echo_channel: null,
            /** Nombre del canal article_embeddings.* actualmente suscrito, para no suscribirse dos veces. */
            embeddings_echo_channel: null,
            /** true una vez que se engancho el listener de reconexion de Echo (se engancha una sola vez). */
            reconexion_de_echo_enganchada: false,
            /**
             * true cuando Echo ya estuvo conectado alguna vez. Sirve para distinguir la primera
             * conexion de una reconexion: solo la reconexion tiene que re-pedir los pedidos.
             */
            echo_ya_estuvo_conectado: false,
            /** Nombre del canal App.Models.User.* actualmente suscrito (para Echo.leave al cambiar de usuario). */
            session_forced_logout_echo_channel: null,
        }
    },
    watch: {
        /**
         * Tras auth/me el usuario puede llegar después de `authenticated`; re-suscribe al canal correcto.
         */
        'user.id'() {
            this.listenSupportChannel()
            this.listenSessionForcedLogoutChannel()
        },
    },
	methods: {
		listenChannelsLocal() {
            this.Echo.channel('message.from_buyer.'+this.owner_id)
            .notification((notification) => {
                console.log(notification)
                this.addBuyerMessage(notification.message)
                this.$store.dispatch('message/setChatsToShow')
                this.checkIfIsMessagesView(notification)
            });
            // Aviso en tiempo real de que entro un pedido nuevo en la tienda.
            this.escuchar_pedidos_nuevos()
            // Refresco al reconectar Echo. Se llama ACA ademas de desde escuchar_pedidos_nuevos():
            // aquella solo llega a engancharlo cuando el comercio tiene tienda online (sin canal de
            // pedidos corta antes), y desde la mision procesos-en-segundo-plano el refresco lo
            // necesita cualquier comercio, tenga tienda o no. Es idempotente: se engancha una vez.
            this.escuchar_reconexion_de_echo()
            // Aviso por lote de que el asistente ya puede responder por articulos nuevos.
            this.escuchar_embeddings_generados()
            // Suscribe canal de soporte para chat interno con admin.
            this.listenSupportChannel()
            // Escucha si ESTE dispositivo es expulsado por un login forzado en otro (candado de sesión única).
            this.listenSessionForcedLogoutChannel()
		},
        /**
         * Se suscribe al canal por el que `empresa-api` avisa que TERMINO una tanda de generacion
         * de embeddings con al menos un articulo vectorizado.
         *
         * Es un aviso POR LOTE, no por articulo, y esa es la decision de diseño: los jobs que
         * despachan los observers cuando alguien edita un articulo a mano van sin tanda y no
         * llegan nunca hasta aca. Si notificaramos por embedding, cargar veinte articulos
         * seguidos serian veinte toasts.
         *
         * Para que sirve, en criollo: hasta que el embedding no existe, el agente de WhatsApp no
         * encuentra ese articulo por mas que este cargado. El toast es lo unico que le avisa al
         * dueño que ya puede probarlo.
         *
         * @return {void}
         */
        escuchar_embeddings_generados() {
            if (!this.Echo || !this.owner_id) {
                return
            }

            /** Canal publico del comercio, igual que article_batch_descriptions.{id} e import_status.{id}. */
            const embeddings_channel = 'article_embeddings.' + this.owner_id

            // Misma guarda que escuchar_pedidos_nuevos() y por el mismo motivo: listenChannelsLocal()
            // corre en el watch de `authenticated`, que puede dispararse mas de una vez en la misma
            // sesion, y sin esto se acumularian listeners (un toast por cada vez que se disparo).
            if (this.embeddings_echo_channel === embeddings_channel) {
                return
            }
            // 🔴 El Echo.leave va ANTES de asignar el canal nuevo: si en la misma pestaña se cierra
            // sesion y entra un usuario de OTRO comercio, dejar viva la suscripcion anterior le
            // mostraria a este usuario los avisos del comercio de antes.
            if (this.embeddings_echo_channel) {
                this.Echo.leave(this.embeddings_echo_channel)
            }
            this.embeddings_echo_channel = embeddings_channel

            /*
                🔴 Tiene que ser .listen('.ArticleEmbeddingsBatchGenerated'), NO .notification().

                Es exactamente al reves que el canal order.created.{id} de unas lineas mas arriba, y
                por eso se aclara: lo que viaja aca es un ShouldBroadcastNow con broadcastAs(), no
                una notificacion de Laravel envuelta en BroadcastNotificationCreated. Un
                .notification() sobre este canal no recibiria NADA NUNCA, sin ningun error a la
                vista ni en el navegador ni en el servidor.

                El precedente exacto es components/common/AvisoDescripcionesAutomaticas.vue, que
                escucha .ArticleBatchDescriptionsProcessed del mismo modo.
            */
            this.Echo.channel(embeddings_channel)
            .listen('.ArticleEmbeddingsBatchGenerated', (payload) => {
                // El backend ya no emite cuando no genero nada, pero el chequeo queda igual: un
                // toast que dice "0 articulos" es peor que no avisar.
                if (!payload || !payload.generados) {
                    return
                }

                this.$toast.success(this.texto_de_embeddings_generados(payload.generados))
            })

            // 🔴 A diferencia de inventory_performance y de los anfitriones de imagenes y
            // descripciones automaticas, que escuchan un evento puntual que ellos mismos
            // dispararon y despues hacen leaveChannel(), esta
            // suscripcion es permanente por sesion: el scheduler emite cada 30 minutos sin que el
            // usuario haya pedido nada. Si se abandonara el canal despues del primer aviso, el
            // segundo no llegaria nunca.
        },
        /**
         * Texto del toast de embeddings, con el singular y el plural resueltos.
         *
         * Va en un metodo aparte y no armado en el listener para que el texto viva en un solo
         * lugar y se pueda probar sin levantar Echo.
         *
         * No dice "embeddings" ni "vectores" a proposito: el dueño de una ferreteria no sabe que es
         * eso. Tampoco dice "nuevos", porque la tanda mezcla articulos recien creados con otros que
         * se re-vectorizaron por un cambio de nombre o de descripcion.
         *
         * @param {Number} cantidad Articulos que quedaron con embedding nuevo.
         * @return {String}
         */
        texto_de_embeddings_generados(cantidad) {
            if (cantidad == 1) {
                return 'Asistente actualizado: 1 artículo'
            }

            return 'Asistente actualizado: ' + this.numero_es(cantidad) + ' artículos'
        },
        /**
         * Se suscribe al canal por el que `tienda-api` avisa que entro un pedido nuevo
         * (mision 42, 12/8/2026). Hasta ahora eso se sabia preguntando cada 20 segundos.
         *
         * @return {void}
         */
        escuchar_pedidos_nuevos() {
            if (!this.Echo) {
                return
            }

            /**
             * Canal publico del comercio dueño del pedido, tal como lo emite tienda-api. Queda en
             * null si este comercio no tiene tienda online: no hay pedidos que escuchar, que es la
             * misma guarda que usa el polling de start_methods.js.
             */
            const order_created_channel = (this.owner && this.owner.online && this.owner_id)
                ? 'order.created.' + this.owner_id
                : null

            // listenChannelsLocal() corre en el watch de `authenticated`, que puede dispararse mas
            // de una vez en la misma sesion: sin esta guarda se acumularian listeners y cada
            // pedido nuevo dispararia N requests.
            if (this.order_created_echo_channel === order_created_channel) {
                return
            }
            // 🔴 El Echo.leave va ANTES de cortar por "no hay canal nuevo", no despues. Si en la
            // misma pestaña se cierra sesion y entra un usuario de OTRO comercio sin tienda online,
            // salir temprano dejaria viva la suscripcion al canal del comercio anterior: cada pedido
            // de ese otro comercio seguiria disparando getUnconfirmedModels en esta sesion.
            if (this.order_created_echo_channel) {
                this.Echo.leave(this.order_created_echo_channel)
            }
            this.order_created_echo_channel = order_created_channel

            if (!order_created_channel) {
                return
            }

            /*
                🔴 Tiene que ser .notification(), NO .listen('.OrderCreated', ...).

                Lo que viaja por el cable es una notificacion de Laravel envuelta en
                `Illuminate\Notifications\Events\BroadcastNotificationCreated`, y
                `Channel.notification(cb)` de Echo es azucar de listen() sobre exactamente ese
                nombre. Un .listen('.OrderCreated') no recibiria NADA NUNCA y no habria ningun
                error a la vista, ni en el navegador ni en el servidor. Es el modo de falla mas
                probable de este cambio y esta medido en el INFORME.md de la mision 42.

                Es el mismo mecanismo que message.from_buyer.{id}, unas lineas mas arriba.
            */
            this.Echo.channel(order_created_channel)
            .notification(() => {
                /*
                    El evento solo avisa que hay que ir a buscar: la lista se pide a empresa-api y
                    NO se arma con el payload. El payload trae order_id y order_num, y salen de la
                    base de tienda-api, que es otra base -- construir la fila con eso seria armar
                    un pedido que empresa-api nunca devolvio.
                */
                this.$store.dispatch('order/getUnconfirmedModels')
            })

            this.escuchar_reconexion_de_echo()
        },
        /**
         * Vuelve a pedir lo que el broadcast pudo haberse perdido cada vez que Echo se reconecta:
         * los pedidos sin confirmar (si el comercio tiene tienda) y el listado de procesos en
         * segundo plano (mision procesos-en-segundo-plano, 18/9/2026).
         *
         * 🔴 Es el agujero que el broadcast solo NO cubre: los eventos que ocurrieron mientras la
         * conexion estaba caida no se reenvian cuando vuelve. Sin esto, un pedido que entro con la
         * pestana desconectada no aparece hasta el proximo polling, y un proceso que termino con
         * la pestaña desconectada quedaria "en proceso" en la pildora hasta el proximo respaldo.
         *
         * @return {void}
         */
        escuchar_reconexion_de_echo() {
            if (this.reconexion_de_echo_enganchada) {
                return
            }

            // El conector de Pusher lo expone Echo (ver la config de main.js). Se chequea en vez
            // de asumirlo: si algun dia cambia el broadcaster, esto deja de existir y lo unico que
            // se pierde es el refresco al reconectar, no la pantalla.
            if (!this.Echo.connector || !this.Echo.connector.pusher || !this.Echo.connector.pusher.connection) {
                return
            }

            /** Conexion de Pusher, que es la que emite los cambios de estado. */
            const connection = this.Echo.connector.pusher.connection

            // Si ya esta conectado cuando nos enganchamos --que es lo normal, porque Echo se crea
            // en main.js y conecta mucho antes de que resuelva la sesion--, entonces cualquier
            // 'connected' que venga despues ES una reconexion.
            this.echo_ya_estuvo_conectado = connection.state == 'connected'
            this.reconexion_de_echo_enganchada = true

            connection.bind('connected', () => {
                if (!this.echo_ya_estuvo_conectado) {
                    // Primera conexion: los sin confirmar ya los pide startMethods(), pedirlos de
                    // nuevo aca seria un request al pedo en cada arranque.
                    this.echo_ya_estuvo_conectado = true
                    return
                }
                // Los pedidos solo si hay canal de pedidos, o sea si el comercio tiene tienda
                // online: antes este hook solo existia en ese caso, y un comercio sin tienda no
                // tiene por que pegarle a /order/unconfirmed/models en cada reconexion.
                if (this.order_created_echo_channel) {
                    console.log('Echo reconecto: se vuelven a pedir los pedidos sin confirmar')
                    this.$store.dispatch('order/getUnconfirmedModels')
                }

                // Los procesos en segundo plano, siempre: un avance o un cierre emitido con la
                // pestaña desconectada no se reenvia, y el listado es la unica forma de ponerse
                // al dia. El store atrapa el 404 de una API vieja, asi que no hay que guardarlo.
                if (this.$store.state.background_processes) {
                    console.log('Echo reconecto: se vuelve a pedir el listado de procesos en segundo plano')
                    this.$store.dispatch('background_processes/getModels')
                }
            })
        },
        checkIfIsMessagesView(noti) {
            if (this.$route.name == 'online' && this.view == 'mensajes' && this.$route.params.sub_view == noti.message.buyer_id) {
                console.log('se marcaron mensajes como leidos desde broadcast')
                this.setMessagesRead()
                this.scrollBottom('messages')
            }
        },
        /**
         * Escucha mensajes de soporte enviados desde admin-api (empresa-api re-emite a support.user.{id}).
         * Deja el canal previo para no acumular listeners y re-enlaza al cargar el usuario.
         */
        listenSupportChannel() {
            if (!this.Echo) {
                return
            }
            if (this.support_user_echo_channel) {
                this.Echo.leave(this.support_user_echo_channel)
                this.support_user_echo_channel = null
            }
            if (!this.user || !this.user.id) {
                return
            }
            const support_user_channel = 'support.user.' + this.user.id
            this.support_user_echo_channel = support_user_channel
            this.Echo.channel(support_user_channel)
            .listen('.SupportMessageReceived', (event_data) => {
                if (!event_data || !event_data.message) {
                    return
                }
                const msg = event_data.message
                this.$store.commit('support_message/addModel', msg)
                // ticket + unread_messages_count: el API emite toArray; si faltan, se refresca la bandeja (badge en FloatingButton).
                if (msg.ticket && msg.ticket.id) {
                    this.$store.dispatch('support_ticket/applyTicketFromMessage', msg)
                } else if (msg.sender_type === 'admin' && msg.support_ticket_id) {
                    this.$store.dispatch('support_ticket/getModels')
                }
            })
            .listen('.SupportMessageRead', (event_data) => {
                if (event_data && event_data.message) {
                    this.$store.commit('support_message/patchMessageRead', event_data.message)
                    this.$store.dispatch('support_ticket/applyTicketFromMessage', event_data.message)
                }
            })
            /**
             * Cierre / reapertura / nombre desde admin-api (sync HTTP + broadcast).
             * Actualiza bandeja y estado del ticket abierto en el modal (bloqueo de envío y panel “nuevo ticket”).
             */
            .listen('.SupportTicketUpdated', (event_data) => {
                if (!event_data || !event_data.ticket) {
                    return
                }
                this.$store.commit('support_ticket/upsertFromBroadcast', event_data.ticket)
            })
        },
        /**
         * Escucha si ESTE dispositivo es el que queda expulsado por un login forzado desde otro
         * (botón "Cerrar la otra sesión e ingresar acá" del cartel de candado, ver
         * AuthController::login_forzado en empresa-api).
         *
         * Canal PRIVADO `App.Models.User.{id}` -el mismo que ya autoriza routes/channels.php para
         * cualquier Notification enviada a un User sin broadcastOn() propio-, no uno nuevo.
         *
         * 🔴 Es `.notification()`, NO `.listen('.Evento', ...)`: SessionForcedLogoutNotification
         * es una Notification de Laravel (viaja envuelta en BroadcastNotificationCreated), no un
         * Event con broadcastAs(). Confundirlo es la trampa que ya documentó esta misma familia de
         * canales (ver escuchar_pedidos_nuevos más arriba): no llegaría NADA NUNCA, sin ningún
         * error a la vista.
         *
         * 🔴 Por qué esto NO llama a `auth/logout` (que pegaría `/logout` al backend): ese POST
         * liberaría el candado que el dispositivo NUEVO acaba de tomar, expulsándolo a él en vez
         * de quedarse afuera este. En cambio, se muestra el aviso y se recarga la página sin
         * pasar por el backend: el arranque normal (`auth/me` -> GET /api/user ->
         * AuthController::get_user() -> checkUserLastActivity()) ya rechaza esta sesión sola,
         * porque su session_id ya no matchea -lo pisó el login forzado-. Es la misma red de
         * contención si el broadcast no llegara (Pusher caído, pestaña en segundo plano sin
         * socket): el próximo request de esta sesión la saca igual.
         *
         * @return {void}
         */
        listenSessionForcedLogoutChannel() {
            if (!this.Echo) {
                return
            }
            if (this.session_forced_logout_echo_channel) {
                this.Echo.leave(this.session_forced_logout_echo_channel)
                this.session_forced_logout_echo_channel = null
            }
            if (!this.user || !this.user.id) {
                return
            }
            const session_forced_logout_channel = 'App.Models.User.' + this.user.id
            this.session_forced_logout_echo_channel = session_forced_logout_channel
            this.Echo.private(session_forced_logout_channel)
                .notification((notification) => {
                    // El canal es el automático de Laravel para CUALQUIER Notification enviada
                    // a este User sin broadcastOn() propio -no uno dedicado a esto-, así que hay
                    // que filtrar por tipo: una Notification nueva del día de mañana que caiga en
                    // este mismo canal no tiene por qué significar "te expulsaron".
                    if (notification.type !== 'App\\Notifications\\SessionForcedLogoutNotification') {
                        return
                    }
                    this.$bvModal.show('sesion-cerrada-otro-dispositivo')
                    // Red de contención: si el usuario no hace click en "Entendido", igual se
                    // recarga sola. El arranque post-reload es quien realmente cierra la sesión
                    // (ver el comentario de arriba).
                    setTimeout(() => {
                        window.location.reload()
                    }, 8000)
                })
        },
	}
}