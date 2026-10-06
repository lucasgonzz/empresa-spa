import { escapar_html } from '@/components/abm/disenos-de-vender/avisos'

/**
 * Avisos (toasts) de Alertas → Catálogo → Categorías (misión categorizacion-tres-modelos, 5/10/2026).
 *
 * 🔴 POR QUÉ TODO AVISO DE ESTA CARPETA PASA POR ACÁ. `vue-toast-notification` (0.6.3, el que usa la SPA)
 * pinta el mensaje con `v-html`: lo interpreta como HTML. Un aviso armado con un texto que no escribió esta
 * pantalla se ejecuta como HTML, y en esta pantalla los nombres de los sistemas, de las categorías y los
 * motivos los escribe un modelo de IA que lee el catálogo del negocio: un nombre como
 * `<img src=x onerror=...>` correría con la sesión del dueño en cuanto un aviso lo nombrara (XSS guardado;
 * el verificador lo demostró con el aviso de "Elegir este", B-01).
 *
 * Por eso ningún componente de esta carpeta llama a `this.$toast` directo: llama a `avisar()`, que escapa el
 * mensaje ENTERO antes de mostrarlo. Se escapa todo y no solo el nombre porque ningún aviso de acá necesita
 * HTML, y así un texto nuevo no puede olvidarse de escapar su parte variable. Es el mismo mecanismo (y la
 * misma función de escape) de `abm/disenos-de-vender/avisos.js`, que ya tuvo este problema.
 *
 * Las cajas de confirmación (`$bvModal.msgBoxConfirm`) NO necesitan esto: el texto que reciben como string
 * lo ponen como nodo de texto, no como HTML. Y lo que va en una plantilla (`{{ }}` o un atributo) ya lo
 * escapa Vue. Lo único de esta carpeta que llega a un `innerHTML` es el toast.
 */

/**
 * Muestra un aviso (toast) con el mensaje escapado.
 *
 * @param {Object} vm Componente (se usa su `$toast`).
 * @param {String} tipo 'success' | 'error' | 'warning' | 'info'.
 * @param {String} mensaje Texto plano: puede llevar nombres que escribió otra persona o la IA.
 * @param {Object} [opciones] Las opciones de vue-toast-notification (por ejemplo `{ duration: 6000 }`).
 * @returns {void}
 */
export function avisar(vm, tipo, mensaje, opciones) {
	if (!vm || !vm.$toast || typeof vm.$toast[tipo] !== 'function') {
		return
	}
	vm.$toast[tipo](escapar_html(mensaje), opciones)
}
