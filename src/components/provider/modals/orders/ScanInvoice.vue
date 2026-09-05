<template>
	<b-modal
	id="scan-invoice"
	size="md"
	title="Escanear factura o remito"
	hide-footer
	@hidden="al_cerrar">
		<div
		class="scan-invoice"
		data-tour="compras.modal_escaneo">

			<!--
				Aviso de contexto inseguro. En http://empresa.local el navegador no
				califica como contexto seguro (está medido en el propio proyecto:
				common-vue/components/support-chat/MessageInput.vue). El <input file>
				anda igual — por eso se eligió y no getUserMedia —, pero algunos
				navegadores ignoran `capture` fuera de HTTPS y abren el explorador de
				archivos en vez de la cámara. Se avisa en vez de dejar un botón que
				parece no responder.
			-->
			<b-alert
			v-if="contexto_inseguro"
			show
			variant="warning"
			class="scan-invoice__aviso">
				Estás entrando por una conexión no segura. Si "Tomar foto" no abre la cámara,
				sacá la foto con la cámara del teléfono y subila con "Elegir archivos".
			</b-alert>

			<!--
				Zona de arrastre. Es un div y no un <input> estirado: el input real vive
				escondido más abajo, porque su estilo nativo no se puede tocar.
			-->
			<div
			class="scan-invoice__zona"
			:class="{ 'scan-invoice__zona--activa': arrastrando }"
			@dragover.prevent="arrastrando = true"
			@dragleave.prevent="arrastrando = false"
			@drop.prevent="al_soltar">
				<i class="icon-camera scan-invoice__zona-icono"></i>
				<p class="scan-invoice__zona-texto">
					Arrastrá acá las fotos de la factura, o elegilas del dispositivo.
				</p>
				<div class="scan-invoice__zona-botones">
					<b-button
					size="sm"
					variant="outline-primary"
					:disabled="enviando || no_entran_mas"
					@click="abrir_selector_archivos">
						Elegir archivos
					</b-button>
					<b-button
					size="sm"
					variant="outline-primary"
					:disabled="enviando || no_entran_mas"
					data-tour="compras.boton_tomar_foto"
					@click="abrir_camara">
						Tomar foto
					</b-button>
				</div>
			</div>

			<!--
				🔴 Los dos inputs son de tipo file, NO un stream de getUserMedia.
				El de la cámara lleva `capture="environment"`, que le pide al sistema la
				cámara trasera: en el teléfono abre la cámara nativa, con enfoque, flash,
				previsualización y "repetir foto" — todo mejor que cualquier <video> +
				<canvas> propio. Y `multiple` deja elegir las 3 páginas de una factura en
				una sola pasada, que es justo lo que necesita el backend para leerlas
				juntas.
				Los dos son inputs distintos y no uno con el atributo cambiando: `capture`
				se evalúa cuando el navegador abre el diálogo, y alternarlo por binding
				deja carreras que no se ven hasta que estás con el teléfono en la mano.
			-->
			<input
			ref="input_archivos"
			type="file"
			class="d-none"
			accept="image/*"
			multiple
			@change="al_elegir_archivos">

			<input
			ref="input_camara"
			type="file"
			class="d-none"
			accept="image/*"
			capture="environment"
			multiple
			@change="al_elegir_archivos">

			<!-- Miniaturas de lo elegido. El ORDEN es la página que va a ver la IA. -->
			<div
			v-if="paginas.length"
			class="scan-invoice__paginas">
				<div
				v-for="(pagina, index) in paginas"
				:key="pagina.id"
				class="scan-invoice__pagina">
					<img
					:src="pagina.url"
					class="scan-invoice__pagina-img"
					:alt="'Página ' + (index + 1)">

					<span class="scan-invoice__pagina-numero">{{ index + 1 }}</span>

					<button
					type="button"
					class="scan-invoice__pagina-quitar"
					title="Sacar esta página"
					:disabled="enviando"
					@click="quitar(index)">
						&times;
					</button>

					<div class="scan-invoice__pagina-orden">
						<button
						type="button"
						title="Mover antes"
						:disabled="enviando || index === 0"
						@click="mover(index, -1)">
							&#8592;
						</button>
						<button
						type="button"
						title="Mover después"
						:disabled="enviando || index === paginas.length - 1"
						@click="mover(index, 1)">
							&#8594;
						</button>
					</div>

					<span
					class="scan-invoice__pagina-nombre"
					:title="pagina.nombre">
						{{ pagina.nombre }}
					</span>
				</div>
			</div>

			<p class="scan-invoice__contador">
				{{ paginas.length }} de {{ max_paginas }} páginas
			</p>

			<p class="scan-invoice__explicacion">
				Se procesan todas las páginas juntas, en una sola pasada: si la tabla sigue en la
				página siguiente, el sistema la une. Podés seguir trabajando mientras tanto; te
				avisamos cuando termine.
			</p>

			<div class="buttons j-center">
				<b-button
				variant="primary"
				class="m-r-15"
				:disabled="enviando || !paginas.length"
				data-tour="compras.boton_enviar_escaneo"
				@click="escanear">
					{{ enviando ? 'Mandando…' : 'Escanear' }}
				</b-button>
				<b-button
				variant="outline-secondary"
				:disabled="enviando"
				@click="cerrar">
					Cancelar
				</b-button>
			</div>

		</div>
	</b-modal>
</template>
<script>
/*
 * Modal de subida del escaneo de una factura de compra (misión escaneo-factura-compra).
 *
 * El usuario elige o saca entre 1 y 6 fotos, las ordena, y las manda TODAS JUNTAS en
 * un solo POST multipart. Ese "todas juntas" no es una comodidad: una tabla cortada
 * entre la página 1 y la 2 solo se puede reconstruir viendo las dos, y el backend hace
 * una sola llamada a la IA con las N imágenes.
 *
 * 🔴 El usuario NO espera. Al mandar, el modal se cierra, aparece un toast y el sistema
 * queda usable. El aviso de "terminó" llega por broadcast (o lo levanta start_methods
 * en la próxima carga). Nada de pantalla de espera ni de polling bloqueante.
 */

/*
 * 🔴 ESPEJO DE LA CONFIGURACIÓN DEL BACKEND. Estos dos números NO son la regla: son
 * una copia, y pueden quedar desfasados.
 *
 * El valor que manda de verdad vive en `empresa-api`:
 *   - config('services.escaneo_factura_compra.max_imagenes') ← env ESCANEO_FACTURA_MAX_IMAGENES
 *   - config('services.escaneo_factura_compra.max_mb')       ← env ESCANEO_FACTURA_MAX_MB
 * y el controlador de `POST /api/provider-order-scan` valida contra ESO, no contra esto.
 *
 * Acá están duplicados a propósito, para no dejar que el usuario elija nueve fotos, las
 * suba por una conexión de teléfono y recién ahí se las rechacen. La contra es la de
 * siempre con un espejo: si un cliente sube el techo en su `.env`, la SPA lo va a
 * seguir frenando en estos números hasta que alguien los toque acá. Si aparece un
 * "me deja subir hasta 6 y el backend acepta 10", el desajuste es este y se arregla
 * moviendo estas dos constantes (o, mejor, exponiendo los valores en el endpoint que
 * ya devuelve el contexto del comercio y leyéndolos de ahí).
 */
const MAX_PAGINAS = 6

/* Techo por archivo, en bytes. Espejo de `max_mb` del backend. */
const MAX_MB = 12
const MAX_BYTES = MAX_MB * 1024 * 1024

/* Contador para acuñar claves de lista estables (no reactivo a propósito). */
let proximo_id = 0

export default {
	data() {
		return {
			/*
			 * Páginas elegidas, en orden: [ { id, file, url, nombre } ].
			 * `url` es un objectURL que hay que revocar sí o sí al cerrar.
			 */
			paginas: [],
			enviando: false,
			arrastrando: false,
			max_paginas: MAX_PAGINAS,
		}
	},
	computed: {
		/* La compra sobre la que se escanea. La deja BtnScanInvoice antes de abrir. */
		compra() {
			return this.$store.state.provider_order_scan.compra
		},
		no_entran_mas() {
			return this.paginas.length >= MAX_PAGINAS
		},
		/*
		 * Mismo chequeo que MessageInput.vue: http://empresa.local no califica como
		 * contexto seguro.
		 *
		 * @return {Boolean}
		 */
		contexto_inseguro() {
			return typeof window !== 'undefined' && window.isSecureContext === false
		},
	},
	beforeDestroy() {
		this.soltar_previsualizaciones()
	},
	methods: {
		abrir_selector_archivos() {
			if (this.$refs.input_archivos) {
				this.$refs.input_archivos.click()
			}
		},
		abrir_camara() {
			if (this.$refs.input_camara) {
				this.$refs.input_camara.click()
			}
		},
		/*
		 * Toma lo que eligió el usuario en cualquiera de los dos inputs.
		 *
		 * El `value = ''` del final no es cosmético: sin él, elegir dos veces seguidas
		 * el MISMO archivo no dispara un segundo `change` (el valor no cambió), así que
		 * después de sacar una página el botón parecía no responder.
		 *
		 * @param {Event} event
		 */
		al_elegir_archivos(event) {
			let archivos = event.target.files ? Array.prototype.slice.call(event.target.files) : []
			event.target.value = ''
			this.agregar(archivos)
		},
		/*
		 * @param {DragEvent} event
		 */
		al_soltar(event) {
			this.arrastrando = false
			let archivos = event.dataTransfer && event.dataTransfer.files
				? Array.prototype.slice.call(event.dataTransfer.files)
				: []
			this.agregar(archivos)
		},
		/*
		 * Suma archivos a la lista, validando cantidad, tipo y peso antes de crear la
		 * previsualización.
		 *
		 * @param {Array} archivos
		 */
		agregar(archivos) {
			let self = this

			archivos.forEach(archivo => {
				if (self.paginas.length >= MAX_PAGINAS) {
					self.$toast.warning('Se pueden escanear hasta ' + MAX_PAGINAS + ' páginas por vez.')
					return
				}

				if (archivo.type.indexOf('image') !== 0) {
					self.$toast.error('"' + archivo.name + '" no es una imagen.')
					return
				}

				if (archivo.size > MAX_BYTES) {
					self.$toast.error('"' + archivo.name + '" pesa más de ' + MAX_MB + ' MB.')
					return
				}

				proximo_id++

				self.paginas.push({
					id: proximo_id,
					file: archivo,
					url: URL.createObjectURL(archivo),
					nombre: archivo.name,
				})
			})
		},
		/*
		 * @param {Number} index
		 */
		quitar(index) {
			let pagina = this.paginas[index]
			if (pagina && pagina.url) {
				URL.revokeObjectURL(pagina.url)
			}
			this.paginas.splice(index, 1)
		},
		/*
		 * Mueve una página un lugar para adelante o para atrás. El orden ES la página
		 * que ve la IA, así que esto no es cosmético.
		 *
		 * @param {Number} index
		 * @param {Number} direccion  -1 o 1
		 */
		mover(index, direccion) {
			let destino = index + direccion
			if (destino < 0 || destino >= this.paginas.length) {
				return
			}
			let movida = this.paginas.splice(index, 1)[0]
			this.paginas.splice(destino, 0, movida)
		},
		/*
		 * Manda el escaneo y se va. No espera el resultado.
		 */
		escanear() {
			if (!this.compra || !this.compra.id) {
				this.$toast.error('No se pudo identificar la compra.')
				return
			}

			if (!this.paginas.length) {
				this.$toast.warning('Subí al menos una foto de la factura.')
				return
			}

			let self = this
			let form_data = new FormData()

			form_data.append('provider_order_id', this.compra.id)

			this.paginas.forEach(pagina => {
				form_data.append('imagenes[]', pagina.file, pagina.nombre)
			})

			this.enviando = true

			/*
			 * skip_global_error_event: el 409 ("ya hay un escaneo en curso") se maneja
			 * acá con su propio mensaje; sin esto además saltaría el modal de error
			 * genérico del sistema y el usuario vería dos avisos del mismo hecho.
			 */
			this.$api.post('provider-order-scan', form_data, {
				skip_global_error_event: true,
			})
			.then(res => {
				self.enviando = false
				self.$store.commit('provider_order_scan/set_corrida', res.data)
				self.$toast.success('El escaneo arrancó. Te avisamos cuando termine.')
				self.$bvModal.hide('scan-invoice')
			})
			.catch(err => {
				self.enviando = false

				let respuesta = err.response
				let mensaje = respuesta && respuesta.data && respuesta.data.message
					? respuesta.data.message
					: 'No se pudo mandar el escaneo.'

				if (respuesta && respuesta.status === 409) {
					self.$toast.warning(mensaje)
					return
				}

				self.$toast.error(mensaje)
			})
		},
		cerrar() {
			this.$bvModal.hide('scan-invoice')
		},
		/*
		 * Al cerrar se sueltan las previsualizaciones y se vacía la lista: si no, cada
		 * apertura del modal deja los objectURL de la anterior colgados en memoria.
		 */
		al_cerrar() {
			this.soltar_previsualizaciones()
			this.paginas = []
			this.arrastrando = false
		},
		soltar_previsualizaciones() {
			this.paginas.forEach(pagina => {
				if (pagina.url) {
					URL.revokeObjectURL(pagina.url)
				}
			})
		},
	},
}
</script>
<style lang="sass">
.scan-invoice
	padding: 4px 2px

	&__aviso
		font-size: 0.85rem

	&__zona
		border: 2px dashed rgba(100, 116, 139, 0.4)
		border-radius: 12px
		padding: 18px 12px
		text-align: center
		transition: background 0.15s ease, border-color 0.15s ease

		&--activa
			border-color: #2563eb
			background: rgba(37, 99, 235, 0.06)

	&__zona-icono
		font-size: 1.8rem
		color: #64748b

	&__zona-texto
		margin: 8px 0 12px 0
		color: #475569
		font-size: 0.9rem

	&__zona-botones
		display: flex
		flex-direction: row
		flex-wrap: wrap
		justify-content: center
		gap: 8px

	&__paginas
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 10px
		margin-top: 14px

	&__pagina
		position: relative
		// Tres por fila en el modal md, dos en teléfono. Se declara con flex-basis y
		// no con un ancho fijo: a 360px un ancho fijo de 110px desborda el modal.
		flex: 0 0 calc(33.333% - 7px)
		max-width: calc(33.333% - 7px)
		border: 1px solid rgba(100, 116, 139, 0.25)
		border-radius: 10px
		padding: 6px
		background: rgba(100, 116, 139, 0.04)

	&__pagina-img
		width: 100%
		height: 90px
		object-fit: cover
		border-radius: 6px
		display: block

	&__pagina-numero
		position: absolute
		top: 10px
		left: 10px
		min-width: 22px
		height: 22px
		border-radius: 999px
		background: rgba(15, 23, 42, 0.75)
		color: #fff
		font-size: 0.75rem
		font-weight: 700
		display: flex
		align-items: center
		justify-content: center

	&__pagina-quitar
		position: absolute
		top: 10px
		right: 10px
		width: 22px
		height: 22px
		border: 0
		border-radius: 999px
		background: rgba(220, 38, 38, 0.85)
		color: #fff
		font-size: 0.9rem
		line-height: 1
		display: flex
		align-items: center
		justify-content: center
		padding: 0

	&__pagina-orden
		display: flex
		flex-direction: row
		justify-content: center
		gap: 6px
		margin-top: 4px

		button
			border: 1px solid rgba(100, 116, 139, 0.3)
			background: #fff
			border-radius: 6px
			// 28px de alto: es el mínimo con el que un dedo acierta la flecha sin
			// agrandar la miniatura entera.
			min-width: 30px
			height: 28px
			line-height: 1
			padding: 0
			color: #475569

			&:disabled
				opacity: 0.4

	&__pagina-nombre
		display: block
		margin-top: 4px
		font-size: 0.7rem
		color: #64748b
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__contador
		margin: 10px 0 0 0
		font-size: 0.85rem
		font-weight: 600
		color: #475569
		text-align: right

	&__explicacion
		margin: 6px 0 18px 0
		font-size: 0.85rem
		color: #64748b

	@media (max-width: 575.98px)
		&__pagina
			flex: 0 0 calc(50% - 5px)
			max-width: calc(50% - 5px)

html.dark-mode .scan-invoice
	&__pagina-orden button
		background: var(--bg-card)
		color: var(--color-text-primary)
		border-color: var(--color-border)
</style>
