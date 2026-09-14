/**
 * Gate de entrada al mostrador (módulo IA, misión "modulo-ia-mostrador", 14/9/2026).
 *
 * Es UN solo lugar a propósito. La ruta /ia exige dos cosas a la vez —la extensión
 * `asistente_ia` (la misma que gatea el botón flotante del chat y las rutas
 * mostrador/* del backend) y ser el dueño o el acceso maestro (decisión 8 del plan;
 * el backend devuelve 403 a un empleado)— y antes cada punto de entrada miraba una
 * cosa distinta: DepositButtons mandaba a /ia a cualquiera con
 * `sugerencias_inteligentes`, las notificaciones de sugerencias a cualquiera que
 * las recibiera, y los dos terminaban en el cartel de "solo para el dueño" o en el
 * de "requiere la extensión". Lo detectó el chequeo independiente del 14/9/2026.
 *
 * Quien decide adónde mandar a alguien (o qué montarle) pregunta acá:
 *   - `puede_entrar_al_mostrador`  -> /ia
 *   - si no puede                  -> los modales históricos de sugerencias de stock
 *                                     (stock-suggestion/Index.vue los monta) o un
 *                                     aviso, según el punto de entrada.
 *
 * Los dos criterios sueltos también se exponen porque components/ia/Index.vue
 * muestra un cartel distinto según cuál de los dos falla.
 *
 * `hasExtencion` devuelve undefined mientras auth/me no resolvió: se trata como
 * "no tiene" y las computeds cambian solas cuando llegan el usuario y sus
 * extensiones (por eso Index.vue las observa con un watch para la apertura por ruta).
 */
export default {
	computed: {
		mostrador_tiene_extension() {
			return !!this.hasExtencion('asistente_ia')
		},
		/**
		 * Solo el dueño y el acceso maestro. Es el mismo par que mira check_is_owner
		 * en common-vue/mixins/nav.js para el menú.
		 */
		mostrador_es_el_dueno() {
			return !!(this.is_owner || (this.user && this.user.admin_access))
		},
		puede_entrar_al_mostrador() {
			return this.mostrador_tiene_extension && this.mostrador_es_el_dueno
		},
	},
}
