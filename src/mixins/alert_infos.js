import online from '@/mixins/online'
export default {
    mixins: [online],
	computed: {
        /**
         * Cantidad de alertas de stock minimo para los badges (pestaña de Alertas y campana
         * del menu).
         *
         * 🔴 Lee el CONTADOR del reporte (`stock_minimo`) y no la relacion
         * `articles_stock_minimo`: el endpoint `inventory-performance` dejo de mandar esa
         * relacion cuando se pagino aparte (hay cuentas con decenas de miles de articulos bajo
         * el minimo y viajaban enteros en cada login). Este computed siguio apuntando al campo
         * ausente y los dos badges quedaron clavados en 0 con la tabla llena — exploracion del
         * modulo Alertas, 3/9/2026. El contador es el mismo numero que el chip "Bajo el minimo".
         *
         * @returns {Number}
         */
        stock_minimo_alert_count() {
            let models = this.$store.state.inventory_performance.models

            if (models[0] && models[0].stock_minimo) {
                return Number(models[0].stock_minimo)
            }

            return 0
        },
        problemas_al_facturar() {
            return this.$store.state.afip_ticket.problemas_al_facturar 
        },
        /**
         * Numero rojo de la solapa "Imagenes" de Alertas (y lo que suma a la campana del menu):
         * imagenes que esperan que alguien las apruebe o las rechace, mas busquedas de imagenes
         * terminadas que nadie abrio todavia (mision imagenes-catalogo-completo, 27/9/2026).
         *
         * Sale del getter del store y no se recalcula aca: el mismo numero lo usan la solapa y
         * la campana, y tienen que decir lo mismo.
         *
         * @returns {Number}
         */
        imagenes_alert_count() {
            return this.$store.getters['image_assignment/badge']
        },
        /**
         * Numero rojo de la sub-solapa "Categorias" de Alertas → Catalogo (y lo que suma a la
         * solapa Catalogo y a la campana del menu): un sistema de categorias esperando que el dueño
         * elija vale 1 y cada articulo dudoso por revisar suma uno (mision
         * categorizacion-tres-modelos, 5/10/2026).
         *
         * Sale del getter del store, que devuelve el `badge` que manda la API: no se recalcula aca
         * (es una cuenta del backend). Contra una API que todavia no tiene la ruta, o para alguien
         * que no es el dueño, vale 0.
         *
         * @returns {Number}
         */
        categorias_alert_count() {
            return this.$store.getters['category_proposal/badge']
        },
        deposit_movements_en_curso() {
            return this.$store.state.deposit_movement.en_curso.models 
        },
		is_online_view() {
			return this.route_name == 'online'
		},
        unconfirmed_orders_history() {
            return this.$store.state.order.unconfirmed_models
        },
        /**
         * Pedidos sin confirmar que alimentan la alerta del nav y el modal de alertas.
         *
         * 🔴 Sale de UNA sola coleccion, y ese es el arreglo (mision 43, 12/8/2026). Antes se
         * concatenaban dos: `unconfirmed_models` (que pide start_methods.js, sin filtro de fecha)
         * y `order.models` (que bajaba el arranque, y eran los pedidos DEL DIA). Un pedido sin
         * confirmar de hoy estaba en las dos y se contaba y se listaba dos veces. Se corrige por
         * construccion y no deduplicando por id: `order` salio del arranque (ver call_methods.js),
         * asi que `order.models` ya no tiene los pedidos del dia al iniciar, y de todas formas
         * `unconfirmed_models` los incluye a todos -- es el unico endpoint que trae los sin
         * confirmar de cualquier fecha.
         *
         * Ver prompts/hallazgos/20260811-arranque-baja-pedidos-del-dia-y-la-alerta-los-duplica.json
         *
         * @returns {Array}
         */
        unconfirmed_orders() {
            if (this.has_online) {
                return this.unconfirmed_orders_history.filter(order => {
                    return order.order_status.name == 'Sin confirmar' && order.buyer
                })
            }
            return []
        },
        /**
         * Mensajes sin leer de la tienda: el número rojo de Alertas → Mensajes y lo que suma a la
         * campana del menú.
         *
         * Sale del resumen del store `tienda_mensajes` (misión mensajes-tienda-online, 28/9/2026),
         * que pide el anfitrión del sidebar de Mensajes al iniciar sesión y mantiene al día el
         * broadcast. Antes sumaba `messagesNotRead()` sobre `message.chats_to_show`, y para eso el
         * arranque bajaba TODOS los compradores de la tienda (GET /api/buyer entero) en cada login.
         *
         * Devuelve SIEMPRE un número (la versión anterior devolvía un array vacío cuando no había
         * tienda, y un número cuando sí: quien lo usaba tenía que adivinar cuál le tocaba).
         *
         * @returns {Number}
         */
        messages_not_read() {
            let tienda_mensajes = this.$store.state.tienda_mensajes
            if (!tienda_mensajes) {
                return 0
            }
            return Number(tienda_mensajes.resumen.mensajes_no_leidos) || 0
        },
        provider_order_days_to_advise() {
            return this.$store.state.provider_order.days_to_advise_models 
        },
        ventas_sin_cobrar() {
            return this.$store.state.sale.ventas_sin_cobrar.models 
        },

        /**
         * Cantidad de sincronizaciones con Tienda Nube que terminaron con error.
         * Alimenta el badge del ítem de menú "Tienda Nube".
         */
        tn_sync_failed_count() {
            return this.$store.state.sync_to_tn_article.failed_count
        },
	},
	methods: {
		/**
		 * LA regla de qué solapas de Alertas puede ver esta persona (misión
		 * permisos-navegacion-empleados, decisión de Lucas del 9/10/2026).
		 *
		 * Es una sola definición a propósito, porque la misma pregunta se hace en tres lugares y
		 * tienen que contestar lo mismo:
		 *   - views/Alertas.vue: qué pestañas se dibujan (`nav_items`) y adónde se lleva una URL
		 *     con una solapa no permitida (`completar_ruta`).
		 *   - lista-de-alertas-table/Index.vue: qué secciones se montan (recibe la lista ya armada
		 *     por prop). Esconder solo la pestaña NO alcanzaba: cada sección se dibuja por la URL
		 *     (/alertas/stock-minimo mostraba Stock mínimo aunque no hubiera pestaña), y Stock
		 *     mínimo pedía su reporte apenas se entraba a Alertas por cualquier solapa.
		 *   - mixins/nav_functions.js → alerts_count(): el número rojo del ítem Alertas del menú.
		 *     Si sumara lo de una solapa que la persona no ve, la campana marcaría alertas que no
		 *     puede encontrar.
		 *
		 * Antes Stock mínimo y Catálogo no pedían ningún permiso, y Movimientos de depósitos solo
		 * la extensión: un empleado sin permisos veía el stock y el catálogo. Ahora:
		 *   - cobros                     → cualquier usuario cargado (sin permiso, ver abajo)
		 *   - stock-minimo               → article.index
		 *   - catalogo (y el alias viejo imagenes, /alertas/imagenes) → article.index
		 *   - pedidos-proveedor          → alerts.provider_orders
		 *   - pedidos-online             → alerts.orders
		 *   - mensajes                   → alerts.messages
		 *   - movimientos-de-depositos   → la extensión deposit_movements Y article.index
		 *   - facturacion                → alerts.problemas_al_facturar
		 *   - cualquier otra             → false (una solapa inventada en la URL no se ve)
		 *
		 * `can()` ya le da true al dueño y al acceso maestro, así que para ellos todo queda como
		 * antes (salvo Movimientos, que sigue pidiendo la extensión). `hasExtencion()` puede
		 * devolver undefined mientras el usuario no cargó: se toma como falso.
		 *
		 * Esto es SOLO qué se dibuja: la API no valida estos permisos (hallazgo de la misión).
		 *
		 * 🔴 El nombre es largo y único a propósito: un método de mixin pisa en silencio a un
		 * global con el mismo nombre (el 30/9/2026 eso bloqueó todas las ventas).
		 *
		 * @param {String} solapa El slug de la solapa en la URL (`$route.params.view`).
		 * @returns {Boolean}
		 */
		puede_ver_solapa_de_alertas(solapa) {
			if (!this.user) {
				return false
			}
			/*
				Cobros, sin permiso (Lucas lo re-decidió el 9/10/2026, en esta misma misión, al saber
				esto): la API ya recorta las ventas sin cobrar de un empleado común a SUS propias
				ventas (SaleController::ventas_sin_cobrar, `$ver_solo_las_ventas_suyas`, salvo
				que el dueño le tilde `ver_alertas_de_todos_los_empleados`), así que la solapa no le
				expone las de otros. Pedirle `client.index`, en cambio, le sacaba a un vendedor el
				aviso de lo que él mismo tiene que cobrar, y dejaba sin efecto
				`alerts.recordatorio_cobro` para quien no tuviera `client.index`.
			*/
			if (solapa == 'cobros') {
				return true
			}
			if (solapa == 'stock-minimo') {
				return this.can('article.index')
			}
			if (solapa == 'catalogo' || solapa == 'imagenes') {
				return this.can('article.index')
			}
			if (solapa == 'pedidos-proveedor') {
				return this.can('alerts.provider_orders')
			}
			if (solapa == 'pedidos-online') {
				return this.can('alerts.orders')
			}
			if (solapa == 'mensajes') {
				return this.can('alerts.messages')
			}
			if (solapa == 'movimientos-de-depositos') {
				return !!this.hasExtencion('deposit_movements') && this.can('article.index')
			}
			if (solapa == 'facturacion') {
				return this.can('alerts.problemas_al_facturar')
			}
			return false
		},
	},
}