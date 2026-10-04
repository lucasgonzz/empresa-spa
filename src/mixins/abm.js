/*
 * Componentes propios de solapas del ABM.
 *
 * 🔴 Se declaran ACA AFUERA, y no adentro del computed, a proposito: Vue cachea el
 * componente asincrono sobre la funcion misma (factory.resolved). Si la fabrica se crea de
 * nuevo en cada evaluacion del computed, cada render vuelve a arrancar el import y remonta
 * el componente desde cero.
 */
const componente_integraciones_tienda_online = () => import('@/components/abm/integraciones/TiendaOnline')
// Diseños de Vender (mision diseno-vender-configurable, 28/9/2026): editor de arrastrar y soltar,
// no un formulario. Ver src/models/vender_layout.js.
const componente_disenos_de_vender = () => import('@/components/abm/disenos-de-vender/Index')
// Diseños de etiquetas de gondola (mision disenos-etiquetas-gondola, 29/9/2026): editor de
// arrastrar y soltar sobre la etiqueta. Ver src/models/article_ticket_design.js.
const componente_disenos_de_etiquetas = () => import('@/components/abm/disenos-de-etiquetas/Index')

export default {
	computed: {
		// Grupos ("views") del modulo de ABM, reorganizados por dominio de negocio.
		// Cada recurso aparece en un solo grupo. El primer modelo de cada grupo es el
		// que se abre por defecto al entrar a la pestania (Abm.vue -> setSelectedView).
		abm_views() {
			return [
				// Clasificacion, atributos e importacion de articulos
				{
					view: 'articulos',
					models: [
						'category',
						'sub_category',
						'brand',
						'combo',
						'tipo_envase',
						'article_ubication',
						'article_property_type',
						'article_property_value',
						'column_position',
						'article_pre_import_range',
						// Al final a proposito: el primero de la lista es la solapa que abre por defecto.
						'article_ticket_design',
					],
					// 'article_ticket_design' monta su propio componente (tarjetas + editor), no el ABM generico
					componentes: {
						article_ticket_design: componente_disenos_de_etiquetas,
					},
				},
				// Todo lo relacionado a precios en un solo lugar (marco de precios Fase 2)
				{
					view: 'precios',
					models: [
						'price_type',
						'discount',
						'surchage',
						'category_price_type_range',
						'article_price_type_group',
						'current_acount_payment_method_discount',
						'sale_tax',
					],
				},
				// Configuracion de venta (sin precios, cobros ni comisiones)
				{
					view: 'ventas',
					models: [
						'sale_status',
						'sale_type',
						'sale_sender_info',
						'client_reputation',
						'dealer',
						// Al final a proposito: el primero de la lista es la solapa que abre por defecto.
						'vender_layout',
					],
					// 'vender_layout' monta su propio componente (tarjetas + editor), no el ABM generico
					componentes: {
						vender_layout: componente_disenos_de_vender,
					},
				},
				// Metodos de cobro y planes de pago en cuenta corriente
				{
					view: 'cuenta corriente',
					models: [
						'current_acount_payment_method',
						'cuota',
					],
				},
				// Comisiones de vendedores (antes mezcladas dentro de ventas)
				{
					view: 'comisiones',
					models: [
						'commission',
						'venta_terminada_commission',
						'promocion_vinoteca_commission',
					],
				},
				// Caja y tesoreria (default_payment_method_caja vive SOLO aca)
				{
					view: 'tesoreria',
					models: [
						'turno_caja',
						'concepto_movimiento_caja',
						'default_payment_method_caja',
						// Bancos de cheques (misión cheques-endoso-y-bancos, 21/9/2026)
						'cheque_banco',
					],
				},
				// Gastos
				{
					view: 'gastos',
					models: [
						'expense_concept',
						'expense_category',
					],
				},
				// Facturacion ARCA
				{
					view: 'facturacion',
					models: [
						'afip_information',
						'afip_selected_payment_method',
					],
				},
				// Depositos e inventario
				{
					view: 'inventario',
					models: [
						'inventory_linkage',
						'deposit_movement_status',
					],
				},
				// Produccion
				{
					view: 'produccion',
					models: [
						// El primero de esta lista es la solapa que abre por defecto. Los grupos van
						// segundos a proposito: la mayoria de los clientes no usa grupos, y ponerlos
						// primero les cambiaria la pantalla de entrada de ABM > Produccion sin motivo.
						'order_production_status',
						'order_production_status_group',
						'recipe_route_type',
					],
				},
				// Todo lo de impresion / PDF junto
				{
					view: 'impresion',
					models: [
						'article_pdf',
						'article_pdf_observation',
						'pdf_column_profile',
					],
				},
				// Datos de la organizacion: sucursales y geografia
				{
					view: 'sucursales',
					models: [
						'address',
						'provincia',
						'location',
					],
				},
				// Tienda online
				{
					view: 'tienda online',
					models: [
						'title',
						'delivery_day',
						'delivery_zone',
						'payment_method',
					],
				},
				// Integraciones externas, en tres solapas: lo que conecta el SISTEMA con otra
				// plataforma (Mercado Libre, Tienda Nube), lo que conecta la TIENDA ONLINE
				// (Mercado Pago, Zipnova) y el bot de WHATSAPP.
				{
					view: 'integraciones',
					models: [
						'platform_connector',
						'integracion_tienda_online',
						'whatsapp_bot_config',
					],
					// Etiqueta propia de la solapa, cuando el plural del modelo no es el nombre
					// con el que el dueño del negocio piensa esa integracion ("Conectores de
					// plataforma" no le dice nada; "Sistema" si).
					//
					// 🔴 El segmento de la URL NO cambia: Abm.vue le pone al item un `route_value`
					// con el plural del modelo, asi que /abm/integraciones/conectores-de-plataforma
					// sigue resolviendo igual que antes y el buscador de recursos del ABM --que
					// arma sus enlaces con ese plural-- no se entera de nada.
					nombres: {
						platform_connector: 'Sistema',
						whatsapp_bot_config: 'WhatsApp',
					},
					// Solapas que montan un componente propio en vez del ABM generico.
					// 'integracion_tienda_online' no es un modelo: no tiene tabla, ni store, ni
					// endpoint de ABM. Ver src/models/integracion_tienda_online.js.
					componentes: {
						integracion_tienda_online: componente_integraciones_tienda_online,
					},
				},
				// Extension: vinoteca
				{
					if_has_extencion: 'vinoteca',
					view: 'vinoteca',
					models: [
						'bodega',
						'cepa',
					],
				},
				// Extension: Mercado Libre
				{
					if_has_extencion: 'usa_mercado_libre',
					view: 'meli',
					models: [
						'meli_listing_type',
						'meli_buying_mode',
						'meli_item_condition',
					],
				},
				// Extension: sistema de puntos para clientes
				{
					if_has_extencion: 'puntos_clientes',
					view: 'puntos',
					models: [
						'sistema_de_puntos',
					],
				},
				/*
					Balanzas (mision balanzas-configurables, 3/10/2026): cada balanza que imprime
					tickets con codigo de barras (codigo con el que empieza el ticket, articulo e
					importe/peso). Ver src/models/balanza.js.

					No va detras de una extension sino de la CONFIGURACION DEL DUEÑO: aparece solo si
					eligio "Por balanza" en Configuracion -> Modulo de VENDER -> Tickets de balanza
					(users.tickets_de_balanza). Con "Por PLU" no hace falta: ahi el codigo del ticket
					trae el PLU del articulo y se carga en su ficha. El gate lo resuelve
					cumple_config_del_dueno() de common-vue/mixins/generals.js, en Abm.vue y en el
					buscador del ABM.
				*/
				{
					if_config_del_dueno: { key: 'tickets_de_balanza', value: 'balanzas' },
					view: 'balanzas',
					models: [
						'balanza',
					],
				},
			]
		},
	}
}
