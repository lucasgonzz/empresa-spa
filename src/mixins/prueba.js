/**
 * Lo que las pantallas necesitan saber de la prueba gratuita de 7 días (misión
 * prueba-experiencia-empresa, 3/11/2026). Todo sale de `user.prueba`, que la API arma en el login y en
 * GET /api/user; para un cliente real es null y acá todo da false.
 */
export default {
	computed: {
		/**
		 * @returns {Object|null} `{activa, vence_at, vencida, video_url, whatsapp_soporte, modal_visto, semilla_presente}`
		 */
		prueba_del_usuario() {
			let user = this.$store.state.auth.user
			return user && user.prueba ? user.prueba : null
		},
		/** @returns {boolean} */
		prueba_activa() {
			return !!(this.prueba_del_usuario && this.prueba_del_usuario.activa)
		},
		/** @returns {boolean} True mientras el negocio en prueba todavía tiene los datos de ejemplo. */
		prueba_con_semilla() {
			return this.prueba_activa && !!this.prueba_del_usuario.semilla_presente
		},
	},
	methods: {
		/**
		 * Antes del primer import de un negocio en prueba: el aviso de que se elimina toda la información
		 * de ejemplo (decisión de Lucas, 3/11/2026). Resuelve `true` si hay que seguir; fuera de la prueba, o
		 * sin datos de ejemplo, resuelve `true` sin preguntar nada.
		 *
		 * @returns {Promise<boolean>}
		 */
		confirmar_borrado_de_la_semilla() {
			if (!this.prueba_con_semilla) {
				return Promise.resolve(true)
			}
			return this.$bvModal.msgBoxConfirm(
				'Se eliminan los artículos, clientes, proveedores y movimientos de ejemplo, y también las ventas, presupuestos y cobros que hayas hecho con ellos para probar. Lo que cargaste con tus propios datos (artículos, clientes y proveedores creados por vos y sus operaciones) queda. Es el momento en que tu sistema empieza a trabajar en serio con tus datos.',
				{
					title: 'Antes de importar',
					okTitle: 'Sí, eliminar los datos de ejemplo e importar',
					cancelTitle: 'Cancelar',
					okVariant: 'danger',
					cancelVariant: 'outline-secondary',
					centered: true,
					hideHeaderClose: false,
				}
			)
			.then(ok => !!ok)
		},
	},
}
