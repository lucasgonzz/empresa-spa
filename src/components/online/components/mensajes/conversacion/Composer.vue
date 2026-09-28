<template>
	<div
	class="tienda-mensajes-composer"
	data-testid="tienda-mensajes-composer">
		<div class="tienda-mensajes-composer__fila">
			<!--
				`<textarea>` nativo y no `<b-form-textarea>`, por el mismo motivo que el composer de
				WhatsApp: el auto-alto de bootstrap-vue fuerza un piso de DOS renglones y deja la barra
				de scroll fija. Acá el campo arranca en uno y crece hasta cinco (`ajustar_alto()`).
			-->
			<textarea
			ref="textarea"
			v-model="text"
			class="form-control tienda-mensajes-composer__texto"
			rows="1"
			maxlength="5000"
			data-testid="tienda-mensajes-texto"
			placeholder="Escribí un mensaje"
			title="Enter envía. Shift+Enter hace un salto de línea."
			:disabled="sending"
			@keydown.enter="on_enter"></textarea>

			<!-- Círculo verde con la flecha, como el de WhatsApp. -->
			<b-button
			variant="success"
			class="tienda-mensajes-composer__enviar"
			data-testid="tienda-mensajes-enviar"
			title="Enviar"
			:disabled="sending || !texto_limpio"
			@click="enviar">
				<b-spinner
				v-if="sending"
				small></b-spinner>
				<i
				v-else
				class="bi bi-send-fill"></i>
			</b-button>
		</div>
	</div>
</template>
<script>
/**
 * Tope de alto del campo, en renglones: arranca en uno y crece hasta cinco; a partir de ahí el
 * texto scrollea adentro (mismo tope que el composer de WhatsApp).
 */
const MAX_RENGLONES = 5

/**
 * Composer de la conversación de la tienda: un campo y el botón de enviar. Solo texto escrito a
 * mano: sin adjuntos, sin notas de voz, sin plantillas ni sugerencias de IA (el pedido es
 * intercambio manual).
 *
 * Enter envía, Shift+Enter hace un salto de línea, no se manda un mensaje vacío (se recorta antes
 * de mirar) y todo queda deshabilitado mientras el envío viaja. Si falla, el texto se conserva
 * para reintentar.
 */
export default {
	data() {
		return {
			text: '',
		}
	},
	computed: {
		buyer_id() {
			return this.$store.state.tienda_mensajes.selected_buyer_id
		},
		sending() {
			return this.$store.state.tienda_mensajes.sending
		},
		texto_limpio() {
			return String(this.text || '').trim()
		},
	},
	watch: {
		/**
		 * 🔴 Lo escrito es de la conversación abierta: al saltar a otra se tira. Un mensaje para el
		 * comprador A no puede quedar cargado con el comprador B abierto, a un Enter de salirle al
		 * que no era (el mismo accidente que ya resolvió el composer de WhatsApp).
		 */
		buyer_id() {
			this.text = ''
		},
		/**
		 * El alto sigue al contenido. Como watch y no como `@input` porque el texto también cambia
		 * por código (el reset después de enviar, el cambio de conversación).
		 */
		text() {
			this.$nextTick(this.ajustar_alto)
		},
		/**
		 * El campo se deshabilita mientras viaja el envío, y un campo deshabilitado pierde el foco:
		 * se lo devuelve al terminar para que se pueda seguir escribiendo sin ir a buscarlo.
		 */
		sending(enviando) {
			if (!enviando) {
				this.$nextTick(this.enfocar)
			}
		},
	},
	created() {
		// Observador del ancho y último ancho visto. Fuera de `data()`: no los lee ningún template,
		// y un ResizeObserver adentro de la reactividad de Vue 2 sería un objeto observado al pedo.
		this._observador_de_ancho = null
		this._ancho_observado = 0
	},
	mounted() {
		this.ajustar_alto()
		this.observar_ancho()
		this.enfocar()
	},
	beforeDestroy() {
		this.dejar_de_observar_ancho()
	},
	methods: {
		/**
		 * Recalcula el alto del campo cuando cambia el ANCHO del composer.
		 *
		 * 🔴 No alcanza con el watch de `text`: el panel se redimensiona arrastrando su borde
		 * (sidebar/Index.vue) o con la ventana, y ninguna de las dos cosas dispara un evento del
		 * campo. Con tres renglones escritos y el panel angostándose, el texto pasaba a cinco
		 * renglones y el campo se quedaba con el alto de tres hasta la próxima tecla. Misma técnica
		 * que el composer de WhatsApp: se compara el ancho contra el anterior para no recalcular
		 * cuando el que cambió es el ALTO (que es lo que hace `ajustar_alto()`).
		 *
		 * Sin ResizeObserver (navegador viejo) se cae al `resize` de la ventana.
		 */
		observar_ancho() {
			let self = this
			if (!this.$el || this.$el.nodeType !== 1) {
				return
			}
			this._ancho_observado = this.$el.offsetWidth
			if (typeof ResizeObserver === 'undefined') {
				window.addEventListener('resize', this.ajustar_alto)
				return
			}
			this._observador_de_ancho = new ResizeObserver(function () {
				let ancho = self.$el ? self.$el.offsetWidth : 0
				if (ancho === self._ancho_observado) {
					return
				}
				self._ancho_observado = ancho
				self.ajustar_alto()
			})
			this._observador_de_ancho.observe(this.$el)
		},
		dejar_de_observar_ancho() {
			if (this._observador_de_ancho) {
				this._observador_de_ancho.disconnect()
				this._observador_de_ancho = null
			}
			window.removeEventListener('resize', this.ajustar_alto)
		},
		/**
		 * En teléfono no se enfoca solo: abriría el teclado encima de la conversación apenas se abre.
		 */
		enfocar() {
			if (window.innerWidth < 768) {
				return
			}
			if (this.$refs.textarea) {
				this.$refs.textarea.focus()
			}
		},
		/**
		 * @param {KeyboardEvent} event
		 */
		on_enter(event) {
			if (event.shiftKey) {
				return
			}
			// Con un IME abierto (teclados de idiomas con composición) el Enter confirma la palabra,
			// no manda el mensaje.
			if (event.isComposing) {
				return
			}
			event.preventDefault()
			this.enviar()
		},
		enviar() {
			let texto = this.texto_limpio
			let buyer_id = this.buyer_id
			// Guarda de reentrada: Enter con autorepeat o un doble click no pueden mandar dos veces
			// el mismo mensaje mientras el primero viaja.
			if (!texto || !buyer_id || this.sending) {
				return
			}
			let self = this
			this.$store.dispatch('tienda_mensajes/enviarMensaje', {
				buyer_id: buyer_id,
				text: texto,
			})
			.then(function () {
				// Si mientras viajaba se saltó a otra conversación, el watch de `buyer_id` ya limpió
				// el campo: no se pisa lo que se esté escribiendo para el otro comprador.
				if (self.buyer_id == buyer_id) {
					self.text = ''
				}
			})
			.catch(function (err) {
				console.log(err)
				let data = err && err.response ? err.response.data : null
				let mensaje = 'No se pudo enviar el mensaje. Probá de nuevo.'
				if (err && err.response && err.response.status == 404) {
					mensaje = 'Esa conversación no es de tu tienda.'
				} else if (data && data.message && err.response.status == 422) {
					mensaje = data.message
				}
				self.$toast.error(mensaje)
			})
		},
		/**
		 * Ajusta el alto del campo al contenido, de uno a cinco renglones (copiado del composer de
		 * WhatsApp, con su misma trampa): el `height = 'auto'` antes de medir no se puede sacar,
		 * porque `scrollHeight` nunca es menor que el alto ya puesto y el campo no se achicaría
		 * más al borrar.
		 */
		ajustar_alto() {
			let el = this.$refs.textarea
			if (!el) {
				return
			}
			let estilo = window.getComputedStyle(el)
			let borde = parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth)
			let relleno = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom)
			let alto_renglon = parseFloat(estilo.lineHeight)
			if (isNaN(alto_renglon)) {
				alto_renglon = parseFloat(estilo.fontSize) * 1.4
			}
			let maximo = (alto_renglon * MAX_RENGLONES) + relleno + borde
			/*
				🔴 Vacío, un renglón exacto, sin medir. Chrome cuenta el PLACEHOLDER en `scrollHeight`:
				con uno que no entraba en el ancho del panel, el campo vacío arrancaba en dos
				renglones (medido en la verificación visual, sidebar a 320 px). El placeholder se
				acortó, y esto hace que no dependa de su largo.
			*/
			if (!this.text) {
				el.style.height = (alto_renglon + relleno + borde) + 'px'
				el.style.overflowY = 'hidden'
				return
			}
			el.style.height = 'auto'
			let alto = el.scrollHeight + borde
			el.style.height = Math.min(alto, maximo) + 'px'
			el.style.overflowY = alto > maximo ? 'auto' : 'hidden'
		},
	},
}
</script>
<style lang="sass">
.tienda-mensajes-composer
	padding: 8px 10px 10px 10px
	background: var(--wa-panel)
	border-top: 1px solid var(--wa-borde)
	color: var(--wa-texto)
	// `align-items: flex-end` mantiene el botón pegado al piso mientras el campo crece hacia arriba.
	&__fila
		display: flex
		flex-direction: row
		align-items: flex-end
		gap: 6px
	// La cápsula donde se escribe. NADA de height/min-height/max-height acá: el alto lo escribe
	// `ajustar_alto()` en el estilo inline y una regla propia pelearía contra ese cálculo.
	&__texto.form-control
		flex: 1
		min-width: 0
		padding: 9px 14px
		border-radius: var(--wa-input-radius)
		border: 1px solid var(--wa-borde)
		background: var(--wa-input-bg)
		color: var(--wa-texto)
		font-size: .9rem
		line-height: 1.4
		box-shadow: none
		resize: none
		overflow-y: hidden
		&:focus
			border-color: var(--wa-verde)
			box-shadow: none
			background: var(--wa-input-bg)
			color: var(--wa-texto)
		&:disabled
			background: var(--wa-input-bg)
			opacity: .7
		&::placeholder
			color: var(--wa-texto)
			opacity: var(--wa-texto-muy-tenue-op)
	// El verde de la marca con la flecha en verde oscuro (el blanco sobre ese verde no llega a
	// 2:1). Los selectores de estado llevan `.btn-success:not(:disabled):not(.disabled)` porque
	// Bootstrap 4 declara el :active en (0,4,0) y sin esto el círculo saltaba al verde de Bootstrap
	// mientras se lo mantiene apretado.
	&__enviar.btn
		flex-shrink: 0
		width: var(--wa-control-h)
		height: var(--wa-control-h)
		border-radius: 50%
		display: inline-flex
		align-items: center
		justify-content: center
		padding: 0
		border: none
		font-size: 1.05rem
		line-height: 1
		background: var(--wa-verde)
		color: var(--wa-verde-texto)
		&.btn-success:not(:disabled):not(.disabled):hover,
		&.btn-success:not(:disabled):not(.disabled):focus,
		&.btn-success:not(:disabled):not(.disabled):active,
		&.btn-success:not(:disabled):not(.disabled):active:focus
			background: var(--wa-verde-hover)
			border-color: var(--wa-verde-hover)
			color: var(--wa-verde-texto)
			box-shadow: none
		&:disabled
			background: var(--wa-verde)
			color: var(--wa-verde-texto)
			opacity: .5
</style>
