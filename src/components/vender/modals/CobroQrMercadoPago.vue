<template>
<!--
	Modal "Esperando el pago" del cobro con el QR de Mercado Pago (misión cobro-qr-mercado-pago,
	26/10/2026). Lo abre el botón "Cobrar con QR" de la barra de acciones (CobrarConQr.vue) después de
	cargar el total en el QR del mostrador.

	Mientras el cobro está pendiente (o la venta se está guardando) no se cierra con un clic afuera ni
	con Esc: la única salida es "Cancelar cobro", que también lo cancela en Mercado Pago. Si se pudiera
	cerrar a ciegas, el cliente podría pagar un cobro que nadie está mirando y la venta no se guardaría.
-->
<b-modal
id="cobro-qr-mercado-pago"
data-testid="vender-modal-cobro-qr"
:title="titulo"
centered
hide-footer
:no-close-on-backdrop="bloqueado"
:no-close-on-esc="bloqueado"
:hide-header-close="bloqueado"
@shown="al_mostrar"
@hidden="al_ocultar">
	<div
	v-if="qr_cobro"
	class="cobro-qr">

		<!-- Total grande: es lo primero que el cajero le dice al cliente -->
		<div class="cobro-qr__total">
			<span class="cobro-qr__total-etiqueta">Total a cobrar</span>
			<span
			class="cobro-qr__total-valor"
			data-testid="vender-cobro-qr-total">{{ price(qr_cobro.total) }}</span>
		</div>

		<!-- ============================== ESPERANDO EL PAGO ============================== -->
		<template v-if="qr_fase == 'esperando'">
			<p
			v-if="nombre_del_qr"
			class="cobro-qr__nombre">
				QR: <strong>{{ nombre_del_qr }}</strong>
			</p>

			<!-- La imagen por si el cliente prefiere escanearlo de la pantalla -->
			<img
			v-if="imagen_del_qr"
			:src="imagen_del_qr"
			:alt="'Código QR ' + (nombre_del_qr || 'de Mercado Pago')"
			class="cobro-qr__imagen">

			<p class="cobro-qr__instruccion">
				El cliente escanea el QR del mostrador con la app de Mercado Pago y paga desde ahí.
			</p>

			<div class="cobro-qr__esperando">
				<b-spinner
				small
				variant="primary"></b-spinner>
				<span>Esperando el pago…</span>
			</div>

			<b-alert
			:show="!!qr_aviso_pagando"
			variant="info"
			class="cobro-qr__alerta">
				{{ qr_aviso_pagando }}
			</b-alert>

			<div class="cobro-qr__acciones">
				<b-button
				variant="outline-danger"
				:disabled="qr_cancelando"
				data-testid="vender-cobro-qr-cancelar"
				@click="cancelar_cobro">
					<b-spinner
					v-if="qr_cancelando"
					small></b-spinner>
					Cancelar cobro
				</b-button>
			</div>
		</template>

		<!-- ============================== VENCIDO / CANCELADO / ERROR ============================== -->
		<template v-else-if="qr_fase == 'terminado'">
			<b-alert
			show
			:variant="qr_cobro.estado == 'error' ? 'danger' : 'warning'"
			class="cobro-qr__alerta">
				<strong>{{ texto_del_final }}</strong>
				<span v-if="qr_cobro.error_message"><br>{{ qr_cobro.error_message }}</span>
			</b-alert>

			<div class="cobro-qr__acciones">
				<b-button
				variant="primary"
				:disabled="qr_regenerando"
				data-testid="vender-cobro-qr-volver-a-generar"
				@click="volver_a_generar">
					<b-spinner
					v-if="qr_regenerando"
					small></b-spinner>
					Volver a generar
				</b-button>
				<b-button
				variant="outline-secondary"
				@click="cerrar">
					Cerrar
				</b-button>
			</div>
		</template>

		<!-- ============================== PAGADO: GUARDANDO LA VENTA ============================== -->
		<template v-else-if="qr_fase == 'guardando'">
			<b-alert
			show
			variant="success"
			class="cobro-qr__alerta">
				<strong>Pago recibido por Mercado Pago.</strong>
			</b-alert>
			<div class="cobro-qr__esperando">
				<b-spinner
				small
				variant="success"></b-spinner>
				<span>Guardando la venta…</span>
			</div>
		</template>

		<!-- ============================== PAGADO, PERO LA VENTA NO SE GUARDÓ ============================== -->
		<template v-else-if="qr_fase == 'guardado_fallido'">
			<b-alert
			show
			variant="warning"
			class="cobro-qr__alerta"
			data-testid="vender-cobro-qr-guardado-fallido">
				<strong>El pago ya se cobró por Mercado Pago</strong>, pero la venta todavía no se guardó.
				<br>
				Fijate el aviso que salió, corregí lo que haga falta y tocá <strong>Guardar venta</strong>:
				el cobro queda asociado a esta venta. <strong>No lo vuelvas a cobrar.</strong>
			</b-alert>
			<div class="cobro-qr__acciones">
				<b-button
				variant="primary"
				@click="cerrar_despues_del_fallo">
					Entendido
				</b-button>
			</div>
		</template>
	</div>
</b-modal>
</template>
<script>
import mercado_pago_qr from '@/mixins/mercado_pago_qr'
/*
	El mismo camino que "Guardar venta" para una venta nueva: BtnGuardar.vue::saveSale() termina en
	guardar_venta(false) cuando no es presupuesto ni edición (su check() para ese caso es el del
	artículo pendiente de agregar, que checkear_vender() ya corre adentro).
*/
import guardar_venta from '@/mixins/vender/guardar_venta/index'
/*
	🔴 Los chequeos que corre guardar_venta() leen `this.address_id`, `this.sale_type_id`, el cliente y
	el total, que BtnGuardar.vue recibe de este mixin (y del de mixins/vender.js que trae adentro). Sin
	él quedan undefined y los chequeos de sucursal y de tipo de venta no frenan nunca.
*/
import vender_presupuestos from '@/mixins/vender_presupuestos'

/*
	Cada cuántos milisegundos se consulta el estado del cobro, y cuánto se espera, como mínimo, a que
	el guardado termine antes de decir que falló (ver vigilar_guardado()).
*/
const MS_ENTRE_CONSULTAS = 3000
const MS_MINIMO_PARA_DAR_POR_FALLIDO = 2500

/**
 * Modal "Esperando el pago" del cobro por QR de Mercado Pago.
 *
 * Consulta `GET /api/mercado-pago/qr/cobros/{id}` cada 3 segundos (sin el indicador global de
 * carga: taparía la pantalla cada 3 segundos) y:
 * - `pagado`: deja el id del cobro en el store (`vender/setMercadoPagoQrCobroId`) y guarda la venta
 *   por el camino normal. Si se guarda, limpiar_vender() vuelve el id a null y el modal se cierra; si
 *   no, avisa que el pago YA se cobró y que reintente con "Guardar venta" (el id sigue en el store).
 * - `vencido` / `cancelado` / `error`: lo muestra y ofrece volver a generar el cobro o cerrar.
 *
 * 🔴 El intervalo se limpia SIEMPRE: al terminar, al cerrar el modal y en beforeDestroy. Y no se
 * dispara una consulta si la anterior todavía no volvió.
 */
export default {
	name: 'CobroQrMercadoPago',
	mixins: [mercado_pago_qr, guardar_venta, vender_presupuestos],
	data() {
		return {
			// Copia local del cobro que se muestra (forma del contrato `Cobro`)
			qr_cobro: null,
			// 'esperando' | 'terminado' | 'guardando' | 'guardado_fallido' (null con el modal cerrado)
			qr_fase: null,
			// Id del setInterval de la consulta del estado
			qr_intervalo: null,
			// true mientras hay una consulta en vuelo (evita apilar pedidos si la red está lenta)
			qr_consultando: false,
			// true mientras se está cancelando el cobro
			qr_cancelando: false,
			// true mientras se está volviendo a generar el cobro
			qr_regenerando: false,
			// Aviso de "el cliente está pagando" que devuelve la API al intentar cancelar
			qr_aviso_pagando: '',
			// Id del setTimeout que vigila si el guardado de la venta terminó
			qr_temporizador_guardado: null,
			// Momento (ms) en que se mandó a guardar la venta
			qr_inicio_guardado: 0,
		}
	},
	computed: {
		/**
		 * Mientras se espera el pago o se guarda la venta, el modal no se cierra por afuera.
		 *
		 * @returns {Boolean}
		 */
		bloqueado() {
			return this.qr_fase == 'esperando' || this.qr_fase == 'guardando'
		},
		/**
		 * Título del modal según la fase.
		 *
		 * @returns {String}
		 */
		titulo() {
			if (this.qr_fase == 'guardando' || this.qr_fase == 'guardado_fallido') {
				return 'Pago recibido'
			}
			if (this.qr_fase == 'terminado') {
				return 'El cobro no se completó'
			}
			return 'Esperando el pago'
		},
		/**
		 * Nombre del QR donde quedó cargado el total.
		 *
		 * @returns {String}
		 */
		nombre_del_qr() {
			return this.qr_cobro && this.qr_cobro.qr ? this.qr_cobro.qr.name : ''
		},
		/**
		 * Imagen del QR (por si el cliente lo escanea de la pantalla).
		 *
		 * @returns {String}
		 */
		imagen_del_qr() {
			return this.qr_cobro && this.qr_cobro.qr ? this.qr_cobro.qr.qr_image_url : ''
		},
		/**
		 * Texto del estado final (vencido, cancelado o error).
		 *
		 * @returns {String}
		 */
		texto_del_final() {
			if (!this.qr_cobro) {
				return ''
			}
			if (this.qr_cobro.estado == 'vencido') {
				return 'El cobro venció sin que el cliente pagara.'
			}
			if (this.qr_cobro.estado == 'cancelado') {
				return 'El cobro se canceló.'
			}
			return 'Mercado Pago no pudo completar el cobro.'
		},
	},
	watch: {
		/**
		 * limpiar_vender() vuelve el id a null recién cuando la venta quedó guardada (con el servidor
		 * o en el equipo): es la señal de que todo salió bien.
		 *
		 * @param {Number|null} nuevo
		 * @param {Number|null} anterior
		 */
		'$store.state.vender.mercado_pago_qr_cobro_id'(nuevo, anterior) {
			if (anterior && !nuevo && (this.qr_fase == 'guardando' || this.qr_fase == 'guardado_fallido')) {
				this.detener_vigilancia_del_guardado()
				this.qr_fase = null
				this.qr_cobro = null
				this.$bvModal.hide('cobro-qr-mercado-pago')
			}
		},
	},
	beforeDestroy() {
		this.detener_consulta()
		this.detener_vigilancia_del_guardado()
	},
	methods: {
		/**
		 * Al abrirse: toma el cobro que dejó el botón en el store y arranca la consulta.
		 *
		 * @returns {void}
		 */
		al_mostrar() {
			let cobro = this.$store.state.vender.mercado_pago_qr_cobro_en_curso
			if (!cobro || !cobro.id) {
				this.$bvModal.hide('cobro-qr-mercado-pago')
				return
			}
			this.qr_cobro = cobro
			this.qr_aviso_pagando = ''
			this.qr_fase = 'esperando'
			this.aplicar_estado(cobro)
		},

		/**
		 * Al cerrarse (por cualquier camino): corta la consulta. Si el cobro ya se pagó y la venta
		 * sigue sin guardar, el id queda en el store para el reintento.
		 *
		 * @returns {void}
		 */
		al_ocultar() {
			this.detener_consulta()
			if (this.qr_fase != 'guardando') {
				this.qr_fase = null
			}
		},

		/**
		 * Arranca (o reinicia) la consulta del estado cada 3 segundos.
		 *
		 * @returns {void}
		 */
		iniciar_consulta() {
			this.detener_consulta()
			this.qr_intervalo = setInterval(() => {
				this.consultar_estado()
			}, MS_ENTRE_CONSULTAS)
		},

		/**
		 * Corta la consulta del estado.
		 *
		 * @returns {void}
		 */
		detener_consulta() {
			if (this.qr_intervalo) {
				clearInterval(this.qr_intervalo)
				this.qr_intervalo = null
			}
		},

		/**
		 * Una consulta del estado del cobro. Un error (de red o del servidor) no se avisa: se sigue
		 * intentando en la próxima vuelta.
		 *
		 * @returns {void}
		 */
		consultar_estado() {
			if (this.qr_consultando || !this.qr_cobro || this.qr_fase != 'esperando') {
				return
			}

			let self = this
			let cobro_id = this.qr_cobro.id
			self.qr_consultando = true

			this.qr_consultar_cobro(cobro_id)
			.then(res => {
				self.qr_consultando = false
				let cobro = res && res.data ? res.data.cobro : null
				/* Si mientras tanto se volvió a generar, esta respuesta es del cobro viejo */
				if (cobro && self.qr_cobro && cobro.id == self.qr_cobro.id && self.qr_fase == 'esperando') {
					self.aplicar_estado(cobro)
				}
			})
			.catch(err => {
				self.qr_consultando = false
				console.log('No se pudo consultar el cobro por QR, se reintenta', err)
			})
		},

		/**
		 * Aplica el estado de un cobro recién leído.
		 *
		 * @param {Object} cobro Cobro con la forma del contrato.
		 * @returns {void}
		 */
		aplicar_estado(cobro) {
			this.qr_cobro = cobro
			this.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', cobro)

			if (cobro.estado == 'pagado') {
				this.procesar_pagado()
				return
			}

			if (cobro.estado == 'vencido' || cobro.estado == 'cancelado' || cobro.estado == 'error') {
				this.detener_consulta()
				this.qr_fase = 'terminado'
				return
			}

			/* Pendiente: se sigue consultando (y se arranca si todavía no corría) */
			if (!this.qr_intervalo) {
				this.iniciar_consulta()
			}
		},

		/**
		 * El cliente pagó: se deja el cobro en el store y se guarda la venta por el camino normal.
		 *
		 * @returns {void}
		 */
		procesar_pagado() {
			this.detener_consulta()
			this.qr_aviso_pagando = ''
			this.qr_fase = 'guardando'

			this.$toast.success('Pago recibido por Mercado Pago')

			this.$store.commit('vender/setMercadoPagoQrCobroId', this.qr_cobro.id)

			/*
				Mismo guard que el botón Guardar (BtnGuardar.vue deshabilita el click con `vendiendo`):
				si ya hay un guardado en vuelo, no se dispara otro.
			*/
			if (!this.$store.state.vender.vendiendo) {
				this.guardar_venta(false)
			}

			this.vigilar_guardado()
		},

		/**
		 * Mira si el guardado terminó. El éxito lo detecta el watcher del id (limpiar_vender lo vuelve
		 * a null); acá se detecta el fallo: el POST ya no está en vuelo (`vendiendo` en false) y el id
		 * sigue puesto.
		 *
		 * 🔴 Se espera un mínimo antes de dar por fallido porque no siempre hay POST para mirar: un
		 * chequeo que frena no prende `vendiendo`, y la venta sin conexión se escribe en el equipo sin
		 * prenderlo. Y la limpieza de una venta guardada corre un instante DESPUÉS de que `vendiendo`
		 * vuelve a false. Si el guardado en el equipo termina después del mínimo, el watcher del id
		 * cierra el modal igual.
		 *
		 * @returns {void}
		 */
		vigilar_guardado() {
			this.detener_vigilancia_del_guardado()
			this.qr_inicio_guardado = Date.now()
			this.programar_revision_del_guardado()
		},

		/**
		 * Programa la próxima revisión del guardado.
		 *
		 * @returns {void}
		 */
		programar_revision_del_guardado() {
			this.qr_temporizador_guardado = setTimeout(() => {
				this.qr_temporizador_guardado = null

				if (this.qr_fase != 'guardando' || !this.$store.state.vender.mercado_pago_qr_cobro_id) {
					return
				}

				let paso_el_minimo = Date.now() - this.qr_inicio_guardado >= MS_MINIMO_PARA_DAR_POR_FALLIDO

				if (!this.$store.state.vender.vendiendo && paso_el_minimo) {
					this.qr_fase = 'guardado_fallido'
					return
				}

				this.programar_revision_del_guardado()
			}, 500)
		},

		/**
		 * Corta la vigilancia del guardado.
		 *
		 * @returns {void}
		 */
		detener_vigilancia_del_guardado() {
			if (this.qr_temporizador_guardado) {
				clearTimeout(this.qr_temporizador_guardado)
				this.qr_temporizador_guardado = null
			}
		},

		/**
		 * "Cancelar cobro": lo cancela en Mercado Pago y cierra. Si el cliente está pagando en este
		 * momento (409 con `pagando`), lo avisa y se sigue esperando.
		 *
		 * @returns {void}
		 */
		cancelar_cobro() {
			if (this.qr_cancelando || !this.qr_cobro) {
				return
			}

			let self = this
			let cobro_id = this.qr_cobro.id
			self.qr_cancelando = true

			this.qr_cancelar_cobro(cobro_id)
			.then(res => {
				self.qr_cancelando = false

				/* Mientras se cancelaba, la consulta pudo haber visto el pago: eso manda */
				if (self.qr_fase != 'esperando') {
					return
				}

				let cobro = res && res.data ? res.data.cobro : null

				/* Pagó justo antes de que se cancelara: la venta se guarda igual */
				if (cobro && cobro.estado == 'pagado') {
					self.qr_cobro = cobro
					self.procesar_pagado()
					return
				}

				self.cerrar()
			})
			.catch(err => {
				self.qr_cancelando = false
				let data = err && err.response && err.response.data ? err.response.data : null

				if (err && err.response && err.response.status == 409 && data && data.pagando) {
					self.qr_aviso_pagando = 'El cliente está pagando en este momento, esperá unos segundos.'
					return
				}

				console.log(err)
				self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo cancelar el cobro. Probá de nuevo.'))
			})
		},

		/**
		 * "Volver a generar": carga otra vez el total actual de la venta en el QR.
		 *
		 * @returns {void}
		 */
		volver_a_generar() {
			if (this.qr_regenerando) {
				return
			}

			let self = this
			let vender = this.$store.state.vender

			/* El total del renglón actual, por si algo cambió desde el cobro anterior */
			this.setTotal()

			self.qr_regenerando = true
			this.$store.commit('auth/setMessage', 'Cargando el total en el QR de Mercado Pago')
			this.$store.commit('auth/setLoading', true)

			this.qr_crear_cobro({
				total: vender.total,
				caja_id: vender.caja_id || null,
				address_id: vender.address_id || null,
				description: 'Venta en el mostrador',
			})
			.then(res => {
				self.qr_regenerando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				let cobro = res && res.data ? res.data.cobro : null
				if (!cobro || !cobro.id) {
					self.$toast.error('No se pudo cargar el total en el QR. Probá de nuevo.')
					return
				}

				self.qr_aviso_pagando = ''
				self.qr_fase = 'esperando'
				self.detener_consulta()
				self.aplicar_estado(cobro)
			})
			.catch(err => {
				self.qr_regenerando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo cargar el total en el QR de Mercado Pago. Probá de nuevo en un rato.'), {
					duration: 10000,
				})
			})
		},

		/**
		 * Cierra el modal sin cobro en curso.
		 *
		 * @returns {void}
		 */
		cerrar() {
			this.detener_consulta()
			this.qr_fase = null
			this.qr_cobro = null
			this.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', null)
			this.$bvModal.hide('cobro-qr-mercado-pago')
		},

		/**
		 * Cierra el aviso de "el pago ya se cobró pero la venta no se guardó". El id del cobro queda
		 * en el store: el próximo "Guardar venta" lo manda.
		 *
		 * @returns {void}
		 */
		cerrar_despues_del_fallo() {
			this.detener_vigilancia_del_guardado()
			this.qr_fase = null
			this.$bvModal.hide('cobro-qr-mercado-pago')
		},
	},
}
</script>
<style lang="sass">
#cobro-qr-mercado-pago
	.cobro-qr
		display: flex
		flex-direction: column
		align-items: center
		text-align: center

	.cobro-qr__total
		display: flex
		flex-direction: column
		align-items: center
		margin-bottom: 12px

	.cobro-qr__total-etiqueta
		font-size: 13px
		color: var(--color-text-secondary)

	.cobro-qr__total-valor
		font-size: 2.4rem
		font-weight: 700
		line-height: 1.15
		color: var(--color-text-primary)
		word-break: break-word

	.cobro-qr__nombre
		margin: 0 0 10px
		font-size: 14px
		color: var(--color-text-secondary)

	// Tamaño contenido: el QR se tiene que poder escanear de la pantalla sin comerse el modal
	.cobro-qr__imagen
		width: 100%
		max-width: 220px
		height: auto
		margin-bottom: 12px
		padding: 8px
		background: #fff
		border: 1px solid var(--color-border)
		border-radius: 10px

	.cobro-qr__instruccion
		max-width: 380px
		margin: 0 0 12px
		font-size: 14px
		line-height: 1.5
		color: var(--color-text-primary)

	.cobro-qr__esperando
		display: inline-flex
		align-items: center
		gap: 8px
		margin-bottom: 14px
		font-size: 14px
		font-weight: 600
		color: var(--color-text-secondary)

	.cobro-qr__alerta
		width: 100%
		text-align: left
		font-size: 14px

	.cobro-qr__acciones
		display: flex
		flex-wrap: wrap
		justify-content: center
		gap: 10px
		width: 100%

		.btn
			display: inline-flex
			align-items: center
			justify-content: center
			gap: 6px
			min-width: 150px

// En el teléfono el total baja un poco y los botones van a todo el ancho, uno arriba del otro
@media (max-width: 575px)
	#cobro-qr-mercado-pago
		.cobro-qr__total-valor
			font-size: 2rem
		.cobro-qr__imagen
			max-width: 180px
		.cobro-qr__acciones
			flex-direction: column
			.btn
				width: 100%
</style>
