<template>
	<div>
		<!--
			Misión "chat IA" (15/8/2026): la vista dejó de montar NavComponent (las
			secciones se navegan desde la nav vertical, hijos de "Tienda Online").
		-->
		<!--
			Acceso a la tienda del negocio (ensayo de la prueba, ronda 3, 12/11/2026): la dirección
			solo estaba en Agentes → «Tu tienda ↗» y el dueño no la encontraba desde acá. Usa la MISMA
			fuente y la misma validación que ese botón (url_de_tienda sobre owner.online, en
			store/ai_chat.js): sin una dirección segura, no se dibuja.
		-->
		<div
		v-if="tienda_url"
		class="online-ver-tienda">
			<a
			class="online-ver-tienda__link"
			:href="tienda_url"
			target="_blank"
			rel="noopener noreferrer"
			data-testid="online-ver-mi-tienda">Ver mi tienda <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
		</div>
		<orders></orders>
		<buyers></buyers>
		<!--
			Mensajes (misión mensajes-tienda-online, 28/9/2026): la bandeja de conversaciones con
			los compradores de la tienda. Reemplaza al módulo viejo de components/online/components/
			messages/, que estaba oculto desde el 15/8 y se borró. La conversación NO se dibuja
			acá: vive en el sidebar global (mensajes/SidebarHost.vue, montado en App.vue).
		-->
		<mensajes></mensajes>
		<!--
			Cupones: la vista se sacó el 14/10/2026 (misión tiendas-demo-y-limpieza-tienda): la
			tienda ya no ofrece cupones. Los pedidos viejos con cupón siguen mostrando su descuento.
		-->
		<!--
			Promociones (15/8/2026): wrapper fino del motor de ofertas por cliente.
			Hasta el 14/9/2026 montaba el MISMO componente que IA -> Ofertas; con el
			módulo IA viejo fuera del menú (misión "modulo-ia-mostrador") esta es la
			única entrada del menú a esa pantalla. La ruta /ofertas/:id? sigue viva
			para el puente del chat.
		-->
		<promociones></promociones>

		<!--
			Modal de "Vincular con un cliente del sistema" (misión vincular-comprador-desde-pedidos,
			24/9/2026). Se monta UNA sola vez, acá y no dentro de Pedidos ni de Clientes: las dos
			pestañas están montadas a la vez, y dos instancias escuchando el mismo evento
			(`vincular-comprador:abrir`) se abrirían juntas. Lo abren el badge "Sin vincular" de la
			tabla de Pedidos y el bloque del modal del comprador en Clientes.
		-->
		<vincular-comprador></vincular-comprador>
	</div>
</template>
<script>
import { url_de_tienda } from '@/store/ai_chat'

export default {
	computed: {
		/**
		 * Dirección de la tienda del negocio, o null. La misma cuenta que «Tu tienda» del panel de
		 * Agentes (components/asistente-ia/Panel.vue): no se duplica la validación.
		 *
		 * @returns {String|null}
		 */
		tienda_url() {
			return url_de_tienda(this.owner && this.owner.online)
		},
	},
	components: {
		Orders: () => import('@/components/online/components/orders/Index'),
		Buyers: () => import('@/components/online/components/buyer/Index'),
		Mensajes: () => import('@/components/online/components/mensajes/Index'),
		Promociones: () => import('@/components/online/components/promociones/Index'),
		VincularComprador: () => import('@/components/online/components/vincular-comprador/Index'),
	},
	created() {
		// Sin NavComponent nadie selecciona sección: /online pelado (URL directa
		// o marcador) quedaba en blanco porque los tres hijos se gatean por
		// $route.params.view. Se entra por Pedidos con replace (no push, para no
		// ensuciar el historial) y catch anti-NavigationDuplicated.
		/*
			Una sección que ya no existe (/online/cupones desde un marcador, el historial o una pestaña
			que quedó abierta cuando se sacaron los Cupones, 14/10/2026) también quedaba en blanco:
			se la trata igual que /online pelado.
		*/
		let secciones = ['pedidos', 'clientes', 'mensajes', 'promociones']
		if (!this.$route.params.view || secciones.indexOf(this.$route.params.view) == -1) {
			this.$router.replace({name: 'online', params: {view: 'pedidos'}}).catch(() => {})
		}
	},
}
</script>
<style lang="sass">
// Renglón chico arriba de la sección, alineado a la derecha. Un solo link corto que no se parte
// (nowrap) y con max-width para que en 360 px no empuje nada hacia los costados.
.online-ver-tienda
	display: flex
	justify-content: flex-end
	max-width: 100%
	padding: 4px 15px 0

	.online-ver-tienda__link
		display: inline-flex
		align-items: center
		gap: 4px
		max-width: 100%
		font-size: .9rem
		font-weight: 600
		white-space: nowrap
</style>
