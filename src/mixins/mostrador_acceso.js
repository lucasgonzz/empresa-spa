/**
 * Gate de entrada al mostrador (módulo IA, misión "modulo-ia-mostrador", 14/9/2026).
 *
 * Es UN solo lugar a propósito. La ruta /ia exige dos cosas a la vez —la extensión
 * `agentes_ia` (la misma que gatea el botón flotante del chat y las rutas
 * mostrador/* del backend) y tener permiso para el asistente personal— y antes cada punto de entrada miraba una
 * cosa distinta: DepositButtons mandaba a /ia a cualquiera con la extensión de
 * sugerencias (hoy unificada en `agentes_ia`), las notificaciones de sugerencias a cualquiera que
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
		/**
		 * true cuando auth/me ya resolvio y las extensiones de la cuenta estan cargadas. Antes de eso
		 * hasExtencion devuelve undefined y "no tiene la extension" no es una respuesta: quien
		 * dibuja un cartel de "falta la extension" tiene que esperar a esto, o el cartel parpadea
		 * en cada carga fria (F5 sobre /ia) aunque la cuenta la tenga.
		 */
		mostrador_extensiones_cargadas() {
			return !!(this.authenticated && this.owner_extencions)
		},
		mostrador_tiene_extension() {
			return !!this.hasExtencion('agentes_ia')
		},
		/** El maestro audita como el dueño; el soporte firmado conserva su restricción. */
		mostrador_es_el_dueno() {
			const usuario = this.user
			return !!(usuario && !usuario.es_sesion_soporte
				&& (usuario.es_acceso_maestro || this.is_owner || usuario.admin_access))
		},
		puede_entrar_al_mostrador() {
			return this.mostrador_tiene_extension && this.mostrador_es_el_dueno
		},
	},
}
