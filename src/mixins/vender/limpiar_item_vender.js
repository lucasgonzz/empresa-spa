/*
	El foco va a la primera entrada de articulos A LA VISTA (codigo de barras, si no el buscador por
	nombre) y no al codigo de barras a secas: con los diseños de Vender el codigo de barras puede
	estar sacado (montado y escondido en layout/ReservaDeElementos.vue) o en una etapa plegada, y el
	foco se iba a un input invisible. El porque completo esta en layout/foco.js.
*/
import { enfocar_primera_entrada_de_articulos } from '@/components/vender/layout/foco'

/*
	Cuantas veces se reintenta encontrar un input que todavia no esta en el DOM, y cada cuanto. Los
	reintentos son para el componente asincrono que tarda en llegar; sin tope, con el tope de items
	por venta alcanzado (las entradas de articulos no se montan en ningun lado) quedaba una cadena de
	setTimeout cada 500 ms viva toda la sesion. 10 x 500 ms = 5 s, de sobra para que llegue.
*/
const MAXIMO_DE_REINTENTOS = 10
const ESPERA_ENTRE_REINTENTOS_MS = 500

export default {
	methods: {

		limpiar_item() {

			this.limpiar_codigo()

			this.limpiar_nombre()

			this.$store.commit('vender/setItem', null)

			if (this.owner.ask_amount_in_vender) {

				setTimeout(() => {

					this.limpiar_amount()
				}, 10)
			}

		},
		/**
		 * Vacia el codigo de barras y devuelve el foco a la primera entrada a la vista.
		 *
		 * Con el codigo de barras a la vista es lo de siempre: se vacia y se enfoca ese mismo input.
		 * Si esta sacado o plegado se vacia igual (existe, escondido) y el foco va al buscador por
		 * nombre si se ve.
		 *
		 * @param {number} [intento=0] reintento en curso, si el input todavia no llego al DOM
		 * @returns {void}
		 */
		limpiar_codigo(intento = 0) {

			if (!this.hasExtencion('no_usar_codigos_de_barra')) {

				let bar_code = document.getElementById('article-bar-code')

				if (bar_code) {

					bar_code.value = ''
					enfocar_primera_entrada_de_articulos()

				} else if (intento < MAXIMO_DE_REINTENTOS) {
					setTimeout(() => {
						this.limpiar_codigo(intento + 1)
					}, ESPERA_ENTRE_REINTENTOS_MS)
				}
			}

		},
		/**
		 * Vacia el buscador por nombre. Con la extension no_usar_codigos_de_barra (no hay codigo de
		 * barras) ademas le devuelve el foco, por el mismo helper: si el buscador esta a la vista es
		 * ese mismo input, como siempre.
		 *
		 * @param {number} [intento=0] reintento en curso, si el input todavia no llego al DOM
		 * @returns {void}
		 */
		limpiar_nombre(intento = 0) {

			let search_name = document.getElementById('search-article')

			if (search_name) {

				this.setInputValueSync(search_name, '')


				if (this.hasExtencion('no_usar_codigos_de_barra')) {
					enfocar_primera_entrada_de_articulos()
				}

			} else if (intento < MAXIMO_DE_REINTENTOS) {
				setTimeout(() => {
					this.limpiar_nombre(intento + 1)
				}, ESPERA_ENTRE_REINTENTOS_MS)
			}

		},
		/**
		 * Vacia la cantidad pendiente ("pedir la cantidad al vender").
		 *
		 * @param {number} [intento=0] reintento en curso, si el input todavia no llego al DOM
		 * @returns {void}
		 */
		limpiar_amount(intento = 0) {

			let input_amount = document.getElementById('article-amount')

			if (input_amount) {

				input_amount.value = ''



			} else if (intento < MAXIMO_DE_REINTENTOS) {
				setTimeout(() => {
					this.limpiar_amount(intento + 1)
				}, ESPERA_ENTRE_REINTENTOS_MS)
			}

		},
	}
}
