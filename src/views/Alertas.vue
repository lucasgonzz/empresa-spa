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
/*
	Mision categorizacion-tres-modelos (5/10/2026): la solapa "Imagenes" paso a ser "Catalogo" y
	adentro lleva dos sub-solapas, Imagenes y Categorias. La ruta es ahora
	/alertas/:view?/:sub_view? y la URL canonica es /alertas/catalogo/imagenes y
	/alertas/catalogo/categorias. Que combinacion de `view` y `sub_view` es valida, y a cual se
	normaliza cada una (incluida la URL de antes, /alertas/imagenes), vive en
	components/alertas/solapas.js, para que esta vista, la sub-barra del catalogo y los llamadores
	("Ver en Alertas") no tengan tres versiones de la misma regla.
*/
import alert_infos from '@/mixins/alert_infos'
import { ruta_normalizada, subsolapas_permitidas } from '@/components/alertas/solapas'
export default {
	mixins: [alert_infos],
	components: {
		ListaDeAlertasTable: () => import('@/components/alertas/components/lista-de-alertas-table/Index'),
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	created() {
		this.completar_ruta()
	},
	watch: {
		/*
			Corrige lo que deja HorizontalNav al cambiar de solapa: hace un `$router.push` RELATIVO y
			vue-router lo mezcla con los params actuales y descarta la query. Tocar "Cobros" estando en
			/alertas/catalogo/categorias dejaba /alertas/cobros/categorias, y tocar "Catalogo" dejaba
			/alertas/catalogo sin sub-solapa.

			Tambien cubre las entradas por la URL de antes (/alertas/imagenes, por ejemplo desde el menu
			Excel del listado: `push({name: 'alertas', params: {view: 'imagenes'}})`) cuando ya se esta
			parado en Alertas: ahi `beforeEnter` no corre (cambian solo los params del mismo record), pero
			este watcher si.

			Se dispara en TODA navegacion de la vista, tambien en las que solo cambian la query (abrir o
			cerrar el detalle de una asignacion de imagenes): `completar_ruta` sale temprano cuando la
			ruta ya esta normalizada, asi que no puede entrar en loop.
		*/
		'$route.params'() {
			this.completar_ruta()
		},
		/*
			Las sub-solapas permitidas dependen del usuario (Categorias, solo dueño o acceso maestro). Si
			el usuario termina de cargarse despues de crear la vista, la ruta se vuelve a mirar con la
			lista real.
		*/
		sub_solapas_permitidas() {
			this.completar_ruta()
		},
	},
	computed: {
		/**
		 * Las sub-solapas del Catalogo que esta persona puede ver. Categorias, solo para el dueño o
		 * para quien entro con el acceso maestro (la API contesta 403 a cualquier otro).
		 *
		 * @returns {Array<String>}
		 */
		sub_solapas_permitidas() {
			let usuario = this.$store.state.auth.user
			return subsolapas_permitidas(!!this.is_owner, !!(usuario && usuario.es_acceso_maestro))
		},
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
					Catalogo: antes era la solapa "Imagenes" (busquedas de imagenes inteligentes,
					mision imagenes-catalogo-completo, 27/9/2026) y desde la mision
					categorizacion-tres-modelos (5/10/2026) agrupa dos sub-solapas: Imagenes
					(exactamente como era) y Categorias (los sistemas de categorias con IA). Sin
					permiso que la condicione: cualquiera que pida imagenes desde el listado tiene que
					poder ver que paso con ellas. La sub-solapa Categorias, en cambio, la ven solo el
					dueño o el acceso maestro (ver `sub_solapas_permitidas`).

					🔴 Es la unica pestaña con acento en el nombre visible, y por eso lleva
					`route_value` y `testid`: el slug sale de routeString() sobre el nombre, y
					"Catálogo" daria "catálogo" con tilde en la URL. La ruta es
					/alertas/catalogo/<sub_solapa>. La URL de antes, /alertas/imagenes, sigue
					andando (la que usan los links de "Revisar en Alertas", el historial del listado y
					la pildora de procesos): `completar_ruta` la lleva a la nueva. `testid` deja el
					data-testid en `nav-item-catalogo`, sin tilde.

					El numero rojo suma los de las dos sub-solapas (el mismo que suma la campana del
					menu, ver mixins/nav_functions.js).
				*/
				{
					name: 'Catálogo',
					route_value: 'catalogo',
					testid: 'catalogo',
					alert: this.imagenes_alert_count + this.categorias_alert_count
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
					// para filtrar en el navegador. Esto es solo el "volver a tocar la pestaña para
					// recargar": la carga al ENTRAR la hace la propia tabla (lista-de-alertas-table/
					// Mensajes.vue, watch de `view`), porque este método no corre en ese momento. Si
					// los dos piden a la vez, el store reusa el pedido en vuelo. La acción resuelve
					// siempre, así que el cargando global no puede quedar prendido.
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

				if (this.view == 'catalogo') {
					// 🔴 Un `view` nuevo SIN su rama deja el overlay prendido para siempre: el
					// loading se prende arriba antes de mirar la vista, y solo las ramas conocidas lo
					// apagan. `recargar_catalogo` lo apaga SIEMPRE, salga bien o mal. (La rama de
					// `view == 'imagenes'` que estaba aca quedo adentro: con la URL canonica esa
					// solapa ya no existe de primer nivel.)
					this.recargar_catalogo()
				}

			}
		},
		/**
		 * Recarga lo que muestra la solapa Catalogo (la sub-solapa abierta) al volver a tocarla, y
		 * apaga el cargando global que prendio `setSelectedView`.
		 *
		 *  - Imagenes: la tabla de busquedas y el numero rojo salen del mismo pedido (el listado trae
		 *    el resumen adentro).
		 *  - Categorias: la corrida vigente y el numero rojo. Los dos son pedidos de fondo
		 *    (silenciosos) que resuelven siempre.
		 *
		 * Las acciones resuelven siempre, pero el catch va igual: el loading global no puede quedar
		 * prendido por nada.
		 *
		 * @returns {void}
		 */
		recargar_catalogo() {
			let self = this
			let sub_solapa = ruta_normalizada(self.view, self.sub_view, self.sub_solapas_permitidas).sub_view
			let pedidos = []
			if (sub_solapa == 'categorias') {
				pedidos.push(self.$store.dispatch('category_proposal/get_actual'))
				pedidos.push(self.$store.dispatch('category_proposal/get_resumen'))
			} else {
				pedidos.push(self.$store.dispatch('image_assignment/get_asignaciones'))
			}
			Promise.all(pedidos)
			.then(() => {
				self.apagar_el_cargando()
			})
			.catch(() => {
				self.apagar_el_cargando()
			})
		},
		/**
		 * Apaga el indicador global de carga y borra su mensaje.
		 *
		 * @returns {void}
		 */
		apagar_el_cargando() {
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},
		/**
		 * Deja la ruta siempre en una combinacion de `view` y `sub_view` que se pueda dibujar: sin
		 * ella la barra de solapas y el cuerpo no tienen que mostrar. Lo que falta se completa
		 * (catalogo sin sub-solapa va a la primera), lo que sobra se saca (Cobros no lleva
		 * sub-solapa), una sub-solapa que esta persona no puede ver (Categorias para un empleado)
		 * se lleva a la primera permitida, y la URL de antes (/alertas/imagenes) se lleva a
		 * /alertas/catalogo/imagenes. Ver `ruta_normalizada`.
		 *
		 * Es un replace y no un push para no dejar en el historial una entrada invalida a la que
		 * "volver". La QUERY se arrastra tal cual (`?asignacion=7&solapa=a_revisar` del link de
		 * "Revisar en Alertas"), porque un replace con `name` no la conserva solo. Con una ruta ya
		 * valida no hace nada, asi que no puede entrar en loop.
		 *
		 * Sin usuario cargado no decide nada: no se sabe todavia que sub-solapas le tocan, y
		 * mandar a Imagenes a un dueño que entro directo a /alertas/catalogo/categorias seria
		 * perder su pagina. Cuando el usuario llega, el watcher de `sub_solapas_permitidas` vuelve a
		 * llamar.
		 *
		 * @returns {void}
		 */
		completar_ruta() {
			// Un watcher que corre despues de salir de Alertas no tiene que tocar la ruta nueva.
			if (this.$route.name !== 'alertas' || !this.user) {
				return
			}

			/** Combinacion valida a la que corresponde la ruta actual. */
			let destino = ruta_normalizada(this.view, this.sub_view, this.sub_solapas_permitidas)

			// La ruta ya es la que corresponde (en la ruta la ausencia llega como undefined: se
			// comparan los dos como "sin valor").
			if (destino.view == this.view && (destino.sub_view || null) == (this.sub_view || null)) {
				return
			}

			/**
			 * Params exactos de la ruta nueva. `router.replace` con `name` NO mezcla con los
			 * actuales: lo que no se pasa (el sub_view de Cobros) queda afuera de la URL.
			 */
			let params = {view: destino.view}
			if (destino.sub_view) {
				params.sub_view = destino.sub_view
			}

			// El catch vacio es el mismo de App.vue: vue-router 3 rechaza la promesa si la
			// navegacion se pisa con otra, y aca no hay nada que hacer con eso.
			this.$router.replace({
				name: 'alertas',
				params: params,
				query: this.$route.query,
			}).catch(() => {})
		},
	}
}
</script>