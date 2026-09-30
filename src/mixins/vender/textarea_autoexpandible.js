/*
	Textarea autoexpandible de las observaciones de Vender (mision diseno-vender-configurable,
	28/9/2026).

	Hasta esta mision las dos observaciones (las visibles y las ocultas) vivian juntas en
	stage-3/Observations.vue, y el ajuste de alto estaba escrito una vez para los dos textareas.
	Con los diseños de Vender cada una es un elemento aparte que el usuario puede poner en otra
	etapa o sacar, asi que se partieron en stage-3/ObservacionesVisibles.vue y
	stage-3/ObservacionesOcultas.vue. El ajuste de alto vive aca para que los dos sigan midiendo
	igual: si cada componente tuviera su copia, tarde o temprano uno cambia el alto minimo y el
	otro no, y las dos cajas quedan desparejas una al lado de la otra.

	El componente que lo usa tiene que:
	- ponerle `ref="textarea"` a su <textarea>;
	- llamar a `ajustar_alto_despues_del_render()` en el `@input` y en el watch de su valor del
	  store (el valor cambia desde afuera al cargar una venta previa, al limpiar, etc.).
*/

/* Alto minimo de una linea: el mismo de los inputs de las etapas (ver _vender-stages.sass). */
const ALTO_MINIMO = 36

export default {
	props: {
		/**
		 * Si la etapa que contiene al textarea esta abierta. Hace falta porque la etapa se pliega
		 * con v-show: mientras esta plegada el textarea mide 0 (display: none) y el alto que se
		 * calcula al montar no sirve. Al abrirse se vuelve a medir.
		 *
		 * Lo pasa layout/GrillaDeEtapa.vue, que lo recibe de la etapa.
		 */
		stage_open: {
			type: Boolean,
			default: false,
		},
	},
	watch: {
		/**
		 * Recalcula el alto cuando la etapa se abre (el DOM pasa de display:none a visible).
		 *
		 * @param {boolean} abierta
		 * @returns {void}
		 */
		stage_open(abierta) {
			if (abierta) {
				this.ajustar_alto_despues_del_render()
			}
		},
	},
	mounted() {
		/* Alto inicial acorde al contenido que ya tenga el store (una venta previa, por ejemplo) */
		this.ajustar_alto()
	},
	methods: {
		/**
		 * Ajusta el alto del textarea a su contenido, con un minimo de una linea.
		 *
		 * @returns {void}
		 */
		ajustar_alto() {
			let textarea = this.$refs.textarea
			if (!textarea) {
				return
			}

			/* Se vuelve a 'auto' antes de medir: si no, scrollHeight nunca baja al borrar renglones */
			textarea.style.height = 'auto'

			let alto = textarea.scrollHeight
			if (alto < ALTO_MINIMO) {
				alto = ALTO_MINIMO
			}

			textarea.style.height = alto + 'px'
		},

		/**
		 * Ajusta el alto en el proximo tick: el valor nuevo todavia no esta en el DOM cuando corre
		 * un watch o un @input con v-model de por medio.
		 *
		 * @returns {void}
		 */
		ajustar_alto_despues_del_render() {
			let self = this
			this.$nextTick(function () {
				self.ajustar_alto()
			})
		},
	},
}
