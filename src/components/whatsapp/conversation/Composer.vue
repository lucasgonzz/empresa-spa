<template>
	<div
	v-if="chat"
	class="whatsapp-composer">
		<!-- Chat en simulación: el backend FRENA todo envío de texto hacia WhatsApp mientras el
		último entrante sea simulado. Sin este aviso el operador escribía, apretaba enviar, la
		fila se guardaba y no salía nada: fallaba en silencio. -->
		<div
		v-if="en_simulacion"
		class="whatsapp-composer__simulacion">
			<strong class="whatsapp-composer__simulacion-titulo">
				<i class="bi bi-cone-striped"></i>
				Chat en simulación: los envíos a WhatsApp están frenados
			</strong>
			<span class="whatsapp-composer__simulacion-detalle">
				El último mensaje entrante lo inyectaste vos desde "Simular mensaje", así que la
				ventana de 24 h está forzada y no hay una conversación real abierta con este
				número. Lo que mandes se va a guardar acá y lo vas a ver en la conversación,
				pero <strong>al cliente no le llega</strong>. Se destraba solo en cuanto el
				cliente escriba de verdad.
			</span>
		</div>

		<div class="whatsapp-composer__toolbar">
			<b-button
			size="sm"
			variant="outline-secondary"
			:disabled="suggesting"
			@click="suggest">
				<i class="bi bi-magic"></i>
				{{ suggesting ? 'Sugiriendo...' : 'Sugerir respuesta' }}
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			@click="$bvModal.show('whatsapp-templates')">
				<i class="bi bi-file-earmark-text"></i>
				Plantillas
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			:disabled="enviando_adjunto"
			@click="abrir_selector_de_imagen">
				<i class="bi bi-paperclip"></i>
				Foto
			</b-button>
		</div>

		<!-- El input real nunca se ve: lo abre el botón de arriba. Es el mismo camino que usa el
		molde de admin-spa. `accept` es la lista blanca de imágenes que acepta la Cloud API; no es
		una validación (el navegador la puede ignorar), es para que el explorador de archivos no
		le ofrezca al operador algo que el backend va a rechazar. -->
		<input
		ref="file_input"
		type="file"
		class="d-none"
		accept="image/png,image/jpeg,image/webp,image/gif"
		@change="on_file_change">

		<!-- Previsualización de la foto elegida, con su epígrafe. Mientras está armada, el
		operador ve exactamente lo que va a salir; recién con "Enviar" viaja. -->
		<div
		v-if="adjunto"
		class="whatsapp-composer__adjunto">
			<img
			:src="adjunto_preview_url"
			class="whatsapp-composer__adjunto-preview"
			alt="Imagen a enviar">
			<div class="whatsapp-composer__adjunto-datos">
				<span
				class="whatsapp-composer__adjunto-nombre"
				:title="adjunto.name">
					{{ adjunto.name }}
				</span>
				<b-form-input
				v-model="epigrafe"
				size="sm"
				placeholder="Epígrafe (opcional)"
				@keydown.enter="enviar_adjunto"></b-form-input>
				<div class="whatsapp-composer__adjunto-acciones">
					<btn-loader
					text="Enviar"
					:loader="enviando_adjunto"
					:block="false"
					size="sm"
					@clicked="enviar_adjunto"></btn-loader>
					<b-button
					size="sm"
					variant="outline-secondary"
					:disabled="enviando_adjunto"
					@click="cancelar_adjunto">
						Cancelar
					</b-button>
				</div>
			</div>
		</div>

		<div class="whatsapp-composer__input-row">
			<b-form-textarea
			v-model="text"
			id="whatsapp-composer-text"
			:placeholder="placeholder"
			rows="2"
			max-rows="6"
			@keydown.enter="onKeydownEnter"></b-form-textarea>
			<btn-loader
			:loader="sending"
			:block="false"
			icon="send"
			@clicked="send"></btn-loader>
		</div>

		<templates-modal
		:chat="chat"></templates-modal>
	</div>
</template>
<script>
import TemplatesModal from '@/components/whatsapp/conversation/TemplatesModal'

/**
 * Tope local de una imagen, en bytes. Está duplicado a propósito con el del backend: el de
 * acá evita el viaje inútil de subir 8 MB para que los rechacen, pero el que manda es el del
 * backend, porque este se puede saltear. Es el límite real de la Cloud API de Meta.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export default {
	components: {
		TemplatesModal,
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			text: '',
			sending: false,
			suggesting: false,

			// Foto elegida con el clip y todavía no enviada (null = no hay ninguna armada).
			adjunto: null,
			// objectURL de la previsualización. Se revoca SIEMPRE que se suelta el archivo:
			// un objectURL vivo le sostiene el blob entero en memoria al navegador.
			adjunto_preview_url: '',
			// Epígrafe de la foto (viaja como `caption`; el audio no lleva).
			epigrafe: '',
			// true mientras un adjunto está viajando (bloquea el clip y los dos botones).
			enviando_adjunto: false,
		}
	},
	computed: {
		// El getter del store hace exactamente esto y ya existía; este computed estaba copiado
		// byte por byte también en conversation/Index.vue y en Header.vue.
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		/**
		 * El chat abierto está en modo simulación (ver el getter en `store/whatsapp_chat.js`:
		 * se resuelve mirando el último entrante cargado, que es lo único que el broadcast
		 * mantiene al día).
		 */
		en_simulacion() {
			return this.$store.getters['whatsapp_chat/chat_en_simulacion']
		},
		/**
		 * En simulación el placeholder también lo dice: el aviso de arriba se puede pasar por
		 * alto, el cursor no.
		 */
		placeholder() {
			if (this.en_simulacion) {
				return 'Simulación: lo que escribas se guarda pero no le llega al cliente'
			}
			return 'Escribí un mensaje (Enter para enviar, Shift+Enter para salto de línea)'
		},
	},
	beforeDestroy() {
		// El sidebar destruye este componente cada vez que se cierra: si la previsualización
		// quedaba armada, su objectURL se filtraba con el blob de la foto adentro.
		this.soltar_adjunto()
	},
	methods: {
		/**
		 * Enter solo (sin Shift) envía el mensaje; Shift+Enter deja pasar el salto de línea normal.
		 *
		 * @param {KeyboardEvent} event
		 */
		onKeydownEnter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.send()
			}
		},
		send() {
			let body = this.text.trim()
			if (!body || !this.chat) {
				return
			}
			this.sending = true
			this.$store.dispatch('whatsapp_chat/sendMessage', {
				chat_id: this.chat.id,
				body: body,
			})
			.then(() => {
				this.sending = false
				this.text = ''
			})
			.catch(err => {
				this.sending = false
				this.manejar_error_de_envio(err, 'No se pudo enviar el mensaje')
			})
		},
		/**
		 * Manejo común del error de cualquier envío del composer (texto, foto o nota de voz).
		 *
		 * Está factorizado porque el caso de la ventana de 24 h no es un error más: cuando el
		 * backend contesta 422 con `code: 'fuera_de_ventana'` hay que abrirle al operador el
		 * modal de plantillas, que es el único camino que deja Meta para retomar una
		 * conversación fría. Copiarlo en cada envío es garantizar que el tercero se olvide.
		 *
		 * @param {Error} err Error de axios.
		 * @param {string} texto_por_defecto Mensaje a mostrar si el backend no mandó uno.
		 * @returns {void}
		 */
		manejar_error_de_envio(err, texto_por_defecto) {
			console.log(err)
			let data = err.response && err.response.data
			if (err.response && err.response.status == 422 && data && data.code == 'fuera_de_ventana') {
				this.$toast.error(
					'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite retomar la conversación con una plantilla.',
					{ duration: 8000 }
				)
				this.$bvModal.show('whatsapp-templates')
				return
			}
			this.$toast.error((data && data.message) || texto_por_defecto)
		},
		/**
		 * Abre el explorador de archivos del sistema. El `<input type="file">` está escondido
		 * con `d-none` porque su estilo nativo no se puede tocar y no pega con el resto.
		 *
		 * @returns {void}
		 */
		abrir_selector_de_imagen() {
			if (this.enviando_adjunto || !this.$refs.file_input) {
				return
			}
			this.$refs.file_input.click()
		},
		/**
		 * Toma la foto elegida, la valida y arma la previsualización.
		 *
		 * El `value = ''` del input al final no es cosmético: sin él, elegir dos veces seguidas
		 * el MISMO archivo no dispara un segundo `change` (el valor no cambió), así que después
		 * de cancelar un envío el clip parecía no responder.
		 *
		 * @param {Event} event
		 * @returns {void}
		 */
		on_file_change(event) {
			let file = event.target.files && event.target.files[0]
			event.target.value = ''
			if (!file) {
				return
			}
			if (file.size > MAX_IMAGE_BYTES) {
				this.$toast.error('La imagen no puede pesar más de 5 MB.')
				return
			}
			this.soltar_adjunto()
			this.adjunto = file
			this.adjunto_preview_url = URL.createObjectURL(file)
			this.epigrafe = ''
		},
		/**
		 * Manda la foto armada con su epígrafe.
		 *
		 * @returns {void}
		 */
		enviar_adjunto() {
			let self = this
			if (!this.adjunto || !this.chat || this.enviando_adjunto) {
				return
			}
			this.enviando_adjunto = true
			this.$store.dispatch('whatsapp_chat/sendMedia', {
				chat_id: this.chat.id,
				file: this.adjunto,
				caption: this.epigrafe,
			})
			.then(function (data) {
				self.enviando_adjunto = false
				self.cancelar_adjunto()
				self.avisar_si_no_salio(data)
			})
			.catch(function (err) {
				self.enviando_adjunto = false
				self.manejar_error_de_envio(err, 'No se pudo enviar la imagen')
			})
		},
		/**
		 * El backend contesta 201 con `enviado: false` en DOS casos distintos: WhatsApp rechazó
		 * el archivo, o el chat está en simulación (donde el envío se frena a propósito y no
		 * falló nada). Sin distinguirlos, simular una conversación —que es un flujo normal del
		 * dueño— tiraba un "WhatsApp lo rechazó" que era mentira. La simulación ya se avisa con
		 * el cartel de arriba del composer, así que acá se calla.
		 *
		 * @param {Object} data Respuesta del backend, { model, enviado }.
		 * @returns {void}
		 */
		avisar_si_no_salio(data) {
			if (!data || data.enviado !== false || this.en_simulacion) {
				return
			}
			this.$toast.warning(
				'El archivo se guardó en la conversación pero WhatsApp lo rechazó.',
				{ duration: 8000 }
			)
		},
		/**
		 * Descarta la foto armada sin mandarla.
		 *
		 * @returns {void}
		 */
		cancelar_adjunto() {
			this.soltar_adjunto()
			this.epigrafe = ''
		},
		/**
		 * Suelta el archivo y revoca su objectURL. Es el único lugar del componente que revoca:
		 * llamarlo de más es inofensivo (revocar una URL vacía no hace nada), olvidarlo deja la
		 * imagen entera colgada en memoria hasta recargar la página.
		 *
		 * @returns {void}
		 */
		soltar_adjunto() {
			if (this.adjunto_preview_url) {
				URL.revokeObjectURL(this.adjunto_preview_url)
			}
			this.adjunto_preview_url = ''
			this.adjunto = null
		},
		/**
		 * Pide una sugerencia de la IA y la carga en el input, editable antes de enviar
		 * (nunca se envía sola).
		 */
		suggest() {
			if (!this.chat) {
				return
			}
			this.suggesting = true
			this.$store.dispatch('whatsapp_chat/suggest', this.chat.id)
			.then(suggestion => {
				this.suggesting = false
				this.text = suggestion || ''
			})
			.catch(err => {
				this.suggesting = false
				console.log(err)
				this.$toast.error('No se pudo generar la sugerencia')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-composer
	padding: 8px 14px 14px 14px
	background: #ffffff
	border-top: 1px solid rgba(0, 0, 0, .08)
	&__simulacion
		display: flex
		flex-direction: column
		gap: 2px
		background: #fff6e5
		border: 1px dashed #d39e00
		border-radius: 8px
		padding: 8px 10px
		margin-bottom: 8px
		text-align: left
		&-titulo
			display: flex
			flex-direction: row
			align-items: center
			gap: 6px
			font-size: .8rem
			color: #8a5b00
		&-detalle
			font-size: .74rem
			line-height: 1.35
			color: rgba(0, 0, 0, .65)
			// En teléfono el detalle come media pantalla. Se recorta a tres líneas y el resto
			// queda accesible al tocarlo (el título ya dice lo que hay que saber para no
			// mandar un mensaje creyendo que sale).
			@media screen and (max-width: 575px)
				max-height: 3.5em
				overflow-y: auto
	&__toolbar
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 8px
		margin-bottom: 6px
	&__adjunto
		display: flex
		flex-direction: row
		align-items: flex-start
		gap: 10px
		background: #f7f9fb
		border: 1px solid rgba(0, 0, 0, .08)
		border-radius: 8px
		padding: 8px 10px
		margin-bottom: 8px
		&-preview
			width: 72px
			height: 72px
			object-fit: cover
			border-radius: 6px
			flex-shrink: 0
		&-datos
			display: flex
			flex-direction: column
			gap: 6px
			// `min-width: 0` para que el nombre largo pueda recortarse: sin esto el ítem flex
			// se niega a achicarse debajo de su contenido y el bloque desborda el composer.
			min-width: 0
			flex: 1
		&-nombre
			font-size: .78rem
			color: rgba(0, 0, 0, .6)
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
		&-acciones
			display: flex
			flex-direction: row
			gap: 8px
	&__input-row
		display: flex
		flex-direction: row
		align-items: flex-end
		gap: 8px
		textarea
			flex: 1
</style>
