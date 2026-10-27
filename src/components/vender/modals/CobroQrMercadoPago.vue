<template>
<!--
	Modal "Esperando el pago" del cobro con el QR de Mercado Pago (misión cobro-qr-mercado-pago,
	26/10/2026). Lo abre el botón "Cobrar con QR" de la barra de acciones (CobrarConQr.vue) después de
	cargar el total en el QR del mostrador.

	Mientras el cobro está pendiente (o la venta se está guardando) no se cierra con un clic afuera ni
	con Esc: la salida es "Cancelar cobro", que también lo cancela en Mercado Pago, o "Cerrar sin
	cancelar" cuando cancelar no se puede (sin red, Mercado Pago lo rechaza) o la consulta lleva rato
	fallando. Si se pudiera cerrar a ciegas, el cliente podría pagar un cobro que nadie está mirando.
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

			<b-alert
			:show="puede_cerrar_sin_cancelar"
			variant="warning"
			class="cobro-qr__alerta"
			data-testid="vender-cobro-qr-aviso-cerrar-sin-cancelar">
				{{ qr_cancelar_fallo ? 'No se pudo cancelar el cobro.' : 'No se puede consultar el cobro: revisá la conexión.' }}
				Podés cerrar sin cancelarlo. Si el cliente paga igual, el pago va a aparecer en Vender como
				pago QR sin venta para que lo uses.
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
				<b-button
				v-if="puede_cerrar_sin_cancelar"
				variant="outline-secondary"
				:disabled="qr_cancelando"
				data-testid="vender-cobro-qr-cerrar-sin-cancelar"
				@click="cerrar_sin_cancelar">
					Cerrar sin cancelar
				</b-button>
			</div>
		</template>

		<!-- ============================== VENCIDO / CANCELADO / ERROR ============================== -->
		<template v-else-if="qr_fase == 'terminado'">
			<b-alert
			show
			:variant="qr_cobro.estado == 'error' ? 'danger' : 'warning'"
			class="cobro-qr__alerta"
			data-testid="vender-cobro-qr-terminado">
				<strong>{{ texto_del_final }}</strong>
				<!-- El motivo que da la API (por ejemplo: "Otro cobro usó este mismo QR y reemplazó a este.") -->
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
				@click="cerrar_aviso">
					Entendido
				</b-button>
			</div>
		</template>

		<!-- ============================== PAGADO, PERO YA NO HAY VENTA EN PANTALLA ============================== -->
		<template v-else-if="qr_fase == 'sin_venta'">
			<b-alert
			show
			variant="warning"
			class="cobro-qr__alerta"
			data-testid="vender-cobro-qr-sin-venta">
				<strong>El pago se recibió por Mercado Pago</strong>, pero la venta ya no está en pantalla.
				<br>
				Va a aparecer en Vender como <strong>Pago QR sin venta</strong> para que lo uses al cargarla
				de nuevo. <strong>No lo vuelvas a cobrar.</strong>
			</b-alert>
			<div class="cobro-qr__acciones">
				<b-button
				variant="primary"
				@click="cerrar_aviso">
					Entendido
				</b-button>
			</div>
		</template>
	</div>
</b-modal>
</template>
<script>
/*
	Foto y restauración del cobro de la venta y pagos QR sin venta (trae adentro los pedidos de
	mixins/mercado_pago_qr.js).
*/
import cobro_qr from '@/mixins/vender/cobro_qr'
/*
	El mismo camino que "Guardar venta" para una venta nueva: BtnGuardar.vue::saveSale() termina en
	guardar_venta(false) cuando no es presupuesto ni edición (su check() para ese caso es el del
	artículo pendiente de agregar, que checkear_vender() ya corre adentro).
*/
import guardar_venta, { hay_guardado_offline_en_curso } from '@/mixins/vender/guardar_venta/index'
/*
	🔴 Los chequeos que corre guardar_venta() leen `this.address_id`, `this.sale_type_id`, el cliente y
	el total, que BtnGuardar.vue recibe de este mixin (y del de mixins/vender.js que trae adentro). Sin
	él quedan undefined y los chequeos de sucursal y de tipo de venta no frenan nunca.
*/
import vender_presupuestos from '@/mixins/vender_presupuestos'

/*
	Cada cuántos milisegundos se consulta el estado del cobro; cuánto tiene que llevar fallando la
	consulta para ofrecer "Cerrar sin cancelar"; y cuánto se espera, como mínimo, a que el guardado
	termine antes de decir que falló (ver vigilar_guardado()).
*/
const MS_ENTRE_CONSULTAS = 3000
const MS_CONSULTA_CAIDA = 20000
const MS_MINIMO_PARA_DAR_POR_FALLIDO = 5000

/**
 * Modal "Esperando el pago" del cobro por QR de Mercado Pago.
 *
 * Consulta `GET /api/mercado-pago/qr/cobros/{id}` cada 3 segundos (sin el indicador global de
 * carga: taparía la pantalla cada 3 segundos) y:
 * - `pagado`: deja el id del cobro en el store (`vender/setMercadoPagoQrCobroId`) y guarda la venta
 *   por el camino normal. Si se guarda, limpiar_vender() vuelve el id a null y el modal se cierra; si
 *   no, avisa que el pago YA se cobró y que reintente con "Guardar venta" (el id sigue en el store).
 *   Si mientras tanto la venta se vació, no se le ata el cobro a nada: queda como pago QR sin venta.
 * - `vencido` / `cancelado` / `error`: lo muestra (con el motivo de la API) y ofrece volver a
 *   generar el cobro o cerrar.
 *
 * Al cerrar sin pago (cancelar, cerrar, cerrar sin cancelar) la venta vuelve al cobro que tenía
 * antes del QR (la foto de mixins/vender/cobro_qr.js).
 *
 * 🔴 El intervalo se limpia SIEMPRE: al terminar, al cerrar el modal y en beforeDestroy. Y no se
 * dispara una consulta si la anterior todavía no volvió.
 */
export default {
	name: 'CobroQrMercadoPago',
	mixins: [cobro_qr, guardar_venta, vender_presupuestos],
	data() {
		return {
			// Copia local del cobro que se muestra (forma del contrato `Cobro`)
			qr_cobro: null,
			// 'esperando' | 'terminado' | 'guardando' | 'guardado_fallido' | 'sin_venta' (null con el modal cerrado)
			qr_fase: null,
			// Id del setInterval de la consulta del estado
			qr_intervalo: null,
			// true mientras hay una consulta en vuelo (evita apilar pedidos si la red está lenta)
			qr_consultando: false,
			// Momento (ms) de la primera consulta fallida de la racha actual (0 = la última anduvo)
			qr_fallando_desde: 0,
			// true si la consulta lleva más de MS_CONSULTA_CAIDA fallando
			qr_consulta_caida: false,
			// true mientras se está cancelando el cobro
			qr_cancelando: false,
			// true si el último intento de cancelar falló (sin red, Mercado Pago lo rechazó, etc.)
			qr_cancelar_fallo: false,
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
		 * Si se ofrece "Cerrar sin cancelar": cancelar falló, o la consulta lleva rato fallando.
		 *
		 * @returns {Boolean}
		 */
		puede_cerrar_sin_cancelar() {
			return this.qr_fase == 'esperando' && (this.qr_cancelar_fallo || this.qr_consulta_caida)
		},
		/**
		 * Título del modal según la fase.
		 *
		 * @returns {String}
		 */
		titulo() {
			if (this.qr_fase == 'guardando' || this.qr_fase == 'guardado_fallido' || this.qr_fase == 'sin_venta') {
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
		 * o en el equipo): con la venta guardándose (o con el aviso de que falló a la vista), que el id
		 * esté en null es la señal de que todo salió bien. No se mira el valor anterior: lo único que
		 * importa es que en esas dos fases el id ya no está.
		 *
		 * @param {Number|null} nuevo
		 */
		'$store.state.vender.mercado_pago_qr_cobro_id'(nuevo) {
			if (!nuevo && (this.qr_fase == 'guardando' || this.qr_fase == 'guardado_fallido')) {
				this.detener_vigilancia_del_guardado()
				this.qr_fase = null
				this.qr_cobro = null
				this.$bvModal.hide('cobro-qr-mercado-pago')
			}
		},
	},
	mounted() {
		/*
			Si se salió de Vender con un cobro pendiente (el botón Atrás del navegador, que el modal no
			frena) el cobro sigue en el store y guardar está frenado. Al volver se reabre el modal para
			seguir esperándolo o cancelarlo.
		*/
		let en_curso = this.$store.state.vender.mercado_pago_qr_cobro_en_curso
		if (en_curso && en_curso.id && en_curso.estado !== 'pagado') {
			this.$nextTick(() => {
				this.$bvModal.show('cobro-qr-mercado-pago')
			})
		}
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
			this.reiniciar_avisos()
			this.qr_fase = 'esperando'
			this.aplicar_estado(cobro)
		},

		/**
		 * Al cerrarse (por cualquier camino): corta la consulta. Si se cerró con Esc o con la cruz en
		 * un cobro terminado (vencido, cancelado, error), es lo mismo que "Cerrar": la venta vuelve a
		 * como estaba y el cobro deja de estar en curso (si no, guardar quedaría frenado).
		 *
		 * @returns {void}
		 */
		al_ocultar() {
			this.detener_consulta()
			if (this.qr_fase == 'terminado') {
				this.soltar_cobro_sin_pago()
			}
			if (this.qr_fase != 'guardando') {
				this.qr_fase = null
			}
		},

		/**
		 * Apaga los avisos de la espera (cliente pagando, cancelar falló, consulta caída).
		 *
		 * @returns {void}
		 */
		reiniciar_avisos() {
			this.qr_aviso_pagando = ''
			this.qr_cancelar_fallo = false
			this.qr_consulta_caida = false
			this.qr_fallando_desde = 0
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
		 * intentando en la próxima vuelta. Si la racha de errores pasa de 20 segundos, se ofrece
		 * cerrar sin cancelar.
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
				self.qr_fallando_desde = 0
				self.qr_consulta_caida = false
				let cobro = res && res.data ? res.data.cobro : null
				/* Si mientras tanto se volvió a generar, esta respuesta es del cobro viejo */
				if (cobro && self.qr_cobro && cobro.id == self.qr_cobro.id && self.qr_fase == 'esperando') {
					self.aplicar_estado(cobro)
				}
			})
			.catch(err => {
				self.qr_consultando = false
				console.log('No se pudo consultar el cobro por QR, se reintenta', err)
				if (!self.qr_fallando_desde) {
					self.qr_fallando_desde = Date.now()
				} else if (Date.now() - self.qr_fallando_desde >= MS_CONSULTA_CAIDA) {
					self.qr_consulta_caida = true
				}
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
		 * 🔴 Si la venta ya no tiene renglones (se limpió mientras se esperaba), el cobro NO se le ata:
		 * el id quedaría colgado y viajaría con la venta SIGUIENTE. Queda como pago QR sin venta.
		 *
		 * @returns {void}
		 */
		procesar_pagado() {
			this.detener_consulta()
			this.reiniciar_avisos()

			this.$toast.success('Pago recibido por Mercado Pago')

			if (!this.$store.state.vender.items.length) {
				this.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', null)
				this.qr_fase = 'sin_venta'
				this.qr_refrescar_pagados_sin_venta()
				return
			}

			this.qr_fase = 'guardando'

			this.$store.commit('vender/setMercadoPagoQrCobroId', this.qr_cobro.id)

			/*
				Mismo guard que el botón Guardar (BtnGuardar.vue deshabilita el click con `vendiendo`):
				si ya hay un guardado en vuelo, no se dispara otro. guardar_venta() deja pasar porque el
				cobro en curso ya está `pagado` (aplicar_estado() lo commiteó).
			*/
			if (!this.$store.state.vender.vendiendo) {
				this.guardar_venta(false)
			}

			this.vigilar_guardado()
		},

		/**
		 * Mira si el guardado terminó. El éxito lo detecta el watcher del id (limpiar_vender lo vuelve
		 * a null); acá se detecta el fallo: no hay POST en vuelo (`vendiendo` en false), no hay una
		 * venta escribiéndose en el equipo, pasó el mínimo y el id sigue puesto.
		 *
		 * 🔴 El mínimo existe porque no siempre hay algo que mirar: un chequeo que frena no prende
		 * nada, y la limpieza de una venta guardada corre un instante DESPUÉS de que `vendiendo` vuelve
		 * a false. La venta sin conexión sí se mira (hay_guardado_offline_en_curso): con IndexedDB
		 * lento, el aviso de "no se guardó" saltaba en falso. Si igual termina después, el watcher del
		 * id cierra el modal.
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
				let sigue_guardando = this.$store.state.vender.vendiendo || hay_guardado_offline_en_curso()

				if (!sigue_guardando && paso_el_minimo) {
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
		 * momento (409 con `pagando`), lo avisa y se sigue esperando. Si falla por otra cosa, se
		 * ofrece cerrar sin cancelar.
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
					self.aplicar_estado(cobro)
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
				self.qr_cancelar_fallo = true
				self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo cancelar el cobro.'))
			})
		},

		/**
		 * "Volver a generar": carga otra vez el total actual de la venta en el QR. La foto del cobro
		 * de antes del QR se conserva (es la primera, ver qr_sacar_foto_del_pago()).
		 *
		 * @returns {void}
		 */
		volver_a_generar() {
			if (this.qr_regenerando) {
				return
			}

			let self = this
			let vender = this.$store.state.vender

			/* El total de los renglones actuales, por si algo cambió desde el cobro anterior */
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

				self.reiniciar_avisos()
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
		 * El cobro deja de ser de esta venta sin haberse pagado: sale del store y la venta vuelve al
		 * cobro que tenía antes del QR.
		 *
		 * @returns {void}
		 */
		soltar_cobro_sin_pago() {
			this.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', null)
			this.qr_restaurar_foto_del_pago()
		},

		/**
		 * Cierra el modal sin pago (cobro cancelado o terminado).
		 *
		 * @returns {void}
		 */
		cerrar() {
			this.detener_consulta()
			this.soltar_cobro_sin_pago()
			this.qr_fase = null
			this.qr_cobro = null
			this.$bvModal.hide('cobro-qr-mercado-pago')
		},

		/**
		 * "Cerrar sin cancelar": cierra el modal SIN tocar el cobro en el servidor (no se pudo
		 * cancelar, o no hay forma de consultarlo). Si el cliente paga igual, la API lo deja como pago
		 * QR sin venta y Vender lo ofrece para usarlo.
		 *
		 * @returns {void}
		 */
		cerrar_sin_cancelar() {
			this.detener_consulta()
			this.soltar_cobro_sin_pago()
			this.qr_fase = null
			this.qr_cobro = null
			this.$bvModal.hide('cobro-qr-mercado-pago')
			this.$toast.info('Se cerró sin cancelar el cobro. Si el cliente paga, el pago aparece en Vender como "Pago QR sin venta".', {
				duration: 10000,
			})
			this.qr_refrescar_pagados_sin_venta()
		},

		/**
		 * Cierra los avisos de después del pago ("no se guardó" y "ya no hay venta"). En el primero el
		 * id del cobro queda en el store: el próximo "Guardar venta" lo manda.
		 *
		 * @returns {void}
		 */
		cerrar_aviso() {
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
