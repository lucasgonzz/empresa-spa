<template>
	<div>
		<slot :pendiente="pendiente" :ocupado="ocupado" :iniciar="iniciar" :descartar="descartar" :visible="marcar_visible"></slot>
		<div ref="pregunta_guardada" hidden>
			<pregunta
			v-if="activa && hasExtencion('support_chat')"
			ref="pregunta"
			v-model="pregunta"
			:error="error_pregunta"
			:bloqueada="pregunta_bloqueada"
			:enviando="enviando_pregunta"
			@cambio="refrescar_vineta"
			@enviar="enviar_pregunta"></pregunta>
		</div>
		<valoracion
		v-if="para_valorar && !modal_prioritario"
		:titulo="para_valorar.titulo"
		:guardando="guardando_valoracion"
		:error="error_valoracion"
		@guardar="guardar_valoracion"
		@cerrar="para_valorar = null"></valoracion>
	</div>
</template>

<script>
import Pregunta from './Pregunta'
import Valoracion from './Valoracion'
import { pasos_de_soporte, tema_de_soporte_conocido } from '@/tours/soporte'
import { TEMA_GUIA_DINAMICA } from '@/tours/soporte-dinamico'
import { TEMA_REVERTIR_IMPORTACION } from '@/tours/importacion-soporte'

const RUTA = '/api/support-tour/'
const OPCIONES_HTTP = { skip_navigation_cancel: true, skip_global_error_event: true, timeout: 12000 }
const CLASE_TUTORIALES = 'robotito-tour-tutoriales'
const CLASE_SIN_CHAT = 'robotito-tour-en-pantalla'
const MODALES_ANTES_DE_VALORAR = ['confirm-rollback-import', 'export-history']

export default {
	components: { Pregunta, Valoracion },
	props: {
		usuario_id: { type: [Number, String], default: null },
	},
	data() {
		return {
			pendientes: [],
			activa: null,
			ocupado: false,
			pregunta: '',
			pregunta_bloqueada: false,
			enviando_pregunta: false,
			error_pregunta: '',
			para_valorar: null,
			modal_prioritario: null,
			guardando_valoracion: false,
			error_valoracion: '',
		}
	},
	computed: {
		pendiente() {
			return this.activa || this.para_valorar ? null : this.pendientes[0] || null
		},
	},
	watch: {
		'$route.name'(ruta, anterior) {
			// Al salir de Listado el modal se puede desmontar sin emitir hidden.
			if (anterior === 'article' && ruta !== anterior && this.modal_prioritario) {
				this.modal_prioritario = null
				this.para_valorar = null
			}
		},
	},
	created() {
		this._eventos = []
		this._vistos = new Set()
		this._retirados = new Set()
		this._carga = 0
	},
	mounted() {
		if (!this.usuario_id) return
		this.$root.$on('bv::modal::show', this.modal_mostrado)
		this.$root.$on('bv::modal::hidden', this.modal_cerrado)
		this.refrescar()
		this._consulta = setInterval(this.refrescar, 45000)
		window.addEventListener('online', this.refrescar)
		window.addEventListener('focus', this.refrescar)
		document.addEventListener('visibilitychange', this.refrescar)
	},
	beforeDestroy() {
		this._detenido = true
		this.$root.$off('bv::modal::show', this.modal_mostrado)
		this.$root.$off('bv::modal::hidden', this.modal_cerrado)
		window.removeEventListener('online', this.refrescar)
		window.removeEventListener('focus', this.refrescar)
		document.removeEventListener('visibilitychange', this.refrescar)
		if (this._canal && this.Echo) this.Echo.leave(this._canal)
		clearTimeout(this._reintento)
		clearInterval(this._consulta)
		this.guardar_pregunta()
		if (this.activa && this._motor) this._motor.cortar_tour()
		document.body.classList.remove(CLASE_TUTORIALES, CLASE_SIN_CHAT)
	},
	methods: {
		modal_mostrado(evento, id) {
			if (MODALES_ANTES_DE_VALORAR.includes(id)) this.modal_prioritario = id
		},
		modal_cerrado(evento, id) {
			if (id === this.modal_prioritario) this.modal_prioritario = null
		},
		refrescar() {
			if (!document.hidden) this.cargar()
			this.vaciar_eventos().catch(() => {})
		},
		cargar() {
			if (this._detenido || this._sin_api) return
			const self = this
			const carga = ++this._carga
			this.$axios.get(RUTA + 'pending', OPCIONES_HTTP).then(function ({ data }) {
				if (self._detenido || self._carga !== carga || !data || !Array.isArray(data.model)) return
				const pendientes = data.model.filter(guia => guia && typeof guia.uuid === 'string'
					&& tema_de_soporte_conocido(guia.tema) && !self._retirados.has(guia.uuid))
				const sin_confirmar = self._aceptacion_por_confirmar
				if (sin_confirmar && !pendientes.some(guia => guia.uuid === sin_confirmar.uuid)) pendientes.unshift(sin_confirmar)
				self.pendientes = pendientes
				self.escuchar()
			}).catch(function (error) {
				if (self._detenido || self._carga !== carga) return
				const estado = error.response && error.response.status
				if (estado === 404 || estado === 403) {
					self.pendientes = []
					self._sin_api = true
					clearInterval(self._consulta)
				}
			})
		},
		escuchar() {
			if (!this.Echo || this._canal) return
			this._canal = 'support-tour.user.' + this.usuario_id
			this.Echo.private(this._canal)
				.listen('.SupportTourOffered', this.cargar)
				.subscribed(this.cargar)
		},
		post(uuid, accion, cuerpo) {
			return this.$axios.post(RUTA + encodeURIComponent(uuid) + '/' + accion, cuerpo, OPCIONES_HTTP)
		},
		marcar_visible(uuid) {
			if (this._vistos.has(uuid)) return
			this._vistos.add(uuid)
			this.evento(uuid, { event: 'shown' })
		},
		evento(uuid, datos) {
			this._eventos.push({ uuid: uuid, datos: datos })
			this.vaciar_eventos().catch(() => {})
		},
		// Se conserva el orden incluso cuando se corta la red: cada paso viaja antes del cierre.
		vaciar_eventos() {
			if (this._envio) return this._envio
			if (this._detenido || !this._eventos.length) return Promise.resolve()
			const self = this
			const siguiente = this._eventos[0]
			this._envio = this.post(siguiente.uuid, 'event', siguiente.datos).then(function () {
				self._eventos.shift()
			}, function (error) {
				const estado = error.response && error.response.status
				if (estado && estado < 500 && estado !== 429) {
					self._eventos.shift()
					return
				}
				if (!self._detenido && navigator.onLine) {
					clearTimeout(self._reintento)
					self._reintento = setTimeout(() => self.vaciar_eventos().catch(() => {}), 5000)
				}
				throw error
			}).then(function () {
				self._envio = null
				return self.vaciar_eventos()
			}, function (error) {
				self._envio = null
				throw error
			})
			return this._envio
		},
		retirar(uuid) {
			this._retirados.add(uuid)
			if (this._aceptacion_por_confirmar && this._aceptacion_por_confirmar.uuid === uuid) this._aceptacion_por_confirmar = null
			this.pendientes = this.pendientes.filter(guia => guia.uuid !== uuid)
		},
		iniciar(guia) {
			if (this.ocupado || !this.pendiente || this.pendiente.uuid !== guia.uuid) return
			const es_recargo = guia.tema === TEMA_GUIA_DINAMICA && Array.isArray(guia.pasos)
				&& guia.pasos.some(paso => paso && paso.clave === 'vender.recargos')
			if ((es_recargo || guia.tema.indexOf('buscar_articulo_') === 0)
				&& (!this.can('sale.store') || !this.hasExtencion('comerciocity_interno'))) {
				this.$toast.error('Tu usuario necesita acceso a Vender para hacer este recorrido.')
				return
			}
			if (es_recargo && !this.can('sale.discount_surchage.aplicar')) {
				this.$toast.error('Tu usuario necesita permiso para aplicar recargos.')
				return
			}
			const self = this
			this.ocupado = true
			this.marcar_visible(guia.uuid)
			import('@/tours/motor').then(function (motor) {
				if (self._detenido) return null
				self._motor = motor
				// Si se pierde la respuesta, pending ya puede omitirla. El mismo UUID sigue disponible para reintentar.
				self._aceptacion_por_confirmar = guia
				return self.post(guia.uuid, 'accept', {})
			}).then(function (respuesta) {
				if (!self._detenido && respuesta) self.iniciar_motor(respuesta.data.model)
			}).catch(function (error) {
				if (self._detenido) return
				const estado = error.response && error.response.status
				if (estado && estado < 500 && estado !== 429) self._aceptacion_por_confirmar = null
				self.cargar()
				self.$toast.error('No pudimos iniciar el recorrido de Robotito. Volvé a intentar.')
			}).then(function () { self.ocupado = false })
		},
		iniciar_motor(guia) {
			const pasos = pasos_de_soporte(guia, Boolean(document.querySelector('[data-tour="soporte.encabezado"]')))
			const claves = guia.tema === TEMA_GUIA_DINAMICA && pasos.length ? guia.pasos.map(paso => paso.clave) : []
			this.retirar(guia.uuid)
			const corrida = { guia: guia, paso: null, mostrados: new Set(), total: pasos.length, pregunta_registrada: false, fin_pendiente: null }
			this.activa = corrida
			this.pregunta = ''
			this.pregunta_bloqueada = false
			this.error_pregunta = ''
			if (guia.tema === 'centro_recursos' || claves.includes('tutoriales.abrir')) document.body.classList.add(CLASE_TUTORIALES)
			if (guia.tema !== 'crear_ticket' && !claves.some(clave => clave.indexOf('soporte.') === 0)) document.body.classList.add(CLASE_SIN_CHAT)
			const self = this
			this.$nextTick(function () {
				if (self._detenido) return
				const iniciada = self._motor.iniciar_tour({ id: 'robotito-soporte', pasos: pasos }, {
					root: self.$root,
					router: self.$router,
					texto_plano: true,
					clase_popover: 'tour-soporte',
					reacomodar_en_resize: [TEMA_REVERTIR_IMPORTACION, TEMA_GUIA_DINAMICA].includes(guia.tema),
					al_faltar_pasos: () => {},
					al_mostrar_paso: paso => self.mostrar_paso(corrida, paso),
					decorar_popover: self.poner_pregunta,
					al_terminar: resultado => self.terminar(corrida, resultado),
				})
				if (!iniciada) self.terminar(corrida, { motivo: 'cortado' })
			})
		},
		mostrar_paso(corrida, paso) {
			corrida.paso = paso
			if (corrida.mostrados.has(paso)) return
			corrida.mostrados.add(paso)
			this.evento(corrida.guia.uuid, { event: 'step', step: paso })
		},
		poner_pregunta(popover, refrescar) {
			const pregunta = this.$refs.pregunta
			if (!pregunta) return
			popover.wrapper.appendChild(pregunta.$el)
			this._refrescar_vineta = refrescar
		},
		refrescar_vineta() {
			if (this._refrescar_vineta) this._refrescar_vineta()
		},
		guardar_pregunta() {
			this._refrescar_vineta = null
			if (this.$refs.pregunta && this.$refs.pregunta_guardada) {
				this.$refs.pregunta_guardada.appendChild(this.$refs.pregunta.$el)
			}
		},
		enviar_pregunta() {
			const corrida = this.activa
			const pregunta = this.pregunta.trim()
			if (!corrida || !pregunta || this.enviando_pregunta) return
			const self = this
			const paso = corrida.paso
			this.enviando_pregunta = true
			this.error_pregunta = ''
			return this.vaciar_eventos().then(function () {
				if (self._detenido) return null
				self.pregunta_bloqueada = true
				return self.post(corrida.guia.uuid, 'question', { question: pregunta, step: paso })
			}).then(function (respuesta) {
				if (self._detenido || !respuesta || !respuesta.data.ok) return
				self.registrar_pregunta(corrida, true)
			}).catch(function (error) {
				if (self._detenido) return
				const respuesta = error.response
				if (respuesta && respuesta.status === 502 && respuesta.data && respuesta.data.ok === false
					&& respuesta.data.code === 'question_saved') {
					self.registrar_pregunta(corrida, false)
					return
				}
				self.error_pregunta = 'Todavía no pudimos confirmar el envío. Volvé a intentar.'
				self.$nextTick(self.refrescar_vineta)
			}).then(function () {
				self.enviando_pregunta = false
				if (corrida.fin_pendiente) self.terminar(corrida, corrida.fin_pendiente)
			})
		},
		registrar_pregunta(corrida, entregada) {
			corrida.pregunta_registrada = true
			if (entregada) {
				this.$toast.success('Mandamos tu pregunta a Soporte. Si Robotito prepara otra guía, te va a esperar en la barra.')
			} else {
				this.$toast.info('Tu pregunta quedó guardada. Vamos a reintentar el envío a Soporte.')
			}
			if (!corrida.fin_pendiente) this._motor.cortar_tour()
		},
		terminar(corrida, resultado) {
			if (this._detenido || this.activa !== corrida) return
			this.guardar_pregunta()
			document.body.classList.remove(CLASE_TUTORIALES, CLASE_SIN_CHAT)
			if (this.enviando_pregunta) {
				corrida.fin_pendiente = resultado
				return
			}
			this.activa = null
			if (corrida.pregunta_registrada) return
			const completo = resultado.motivo === 'listo' && corrida.mostrados.size === corrida.total
			this.evento(corrida.guia.uuid, { event: completo ? 'completed' : 'abandoned' })
			if (completo) {
				this.error_valoracion = ''
				this.para_valorar = corrida.guia
			} else if (resultado.motivo === 'listo' || resultado.incompleto || !corrida.mostrados.size) {
				if (corrida.guia.tema === TEMA_REVERTIR_IMPORTACION && !corrida.mostrados.has(3)) {
					this.$toast.error('No pudimos ubicar el botón de esa importación. Podés retomar la consulta con Soporte.')
				} else {
					this.$toast.error('Algunos pasos del recorrido no están disponibles en esta pantalla.')
				}
			}
		},
		descartar(guia) {
			if (this.ocupado || !this.pendiente || this.pendiente.uuid !== guia.uuid) return
			this.marcar_visible(guia.uuid)
			this.retirar(guia.uuid)
			this.evento(guia.uuid, { event: 'dismissed' })
		},
		guardar_valoracion(valoracion) {
			if (this.guardando_valoracion || !this.para_valorar) return
			const uuid = this.para_valorar.uuid
			const self = this
			this.guardando_valoracion = true
			this.error_valoracion = ''
			this.vaciar_eventos().then(function () {
				if (!self._detenido) return self.post(uuid, 'feedback', valoracion)
			}).then(function () {
				if (self._detenido) return
				self.para_valorar = null
				self.$toast.success('Gracias por contarnos cómo te fue con Robotito.')
			}).catch(function () {
				self.error_valoracion = 'No pudimos guardar tu valoración. Volvé a intentar.'
			}).then(function () { self.guardando_valoracion = false })
		},
	},
}
</script>

<style lang="sass">
.robotito-tour-en-pantalla #app .support-chat-overlay
	display: none

.driver-popover.tour-soporte
	max-width: min(340px, calc(100vw - 24px))
	max-height: calc(100vh - 32px)
	overflow-wrap: anywhere
	.driver-popover-description
		white-space: pre-line
</style>
