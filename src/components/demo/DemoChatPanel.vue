<template>
	<div class="demo-ai">
		<aside v-show="!colapsado || en_modulo" class="demo-ai__panel" :aria-label="prueba ? 'Asistente de la prueba' : 'Asistente de la demo'">
			<div ref="hilo" class="demo-ai__hilo" role="log" aria-live="polite" :aria-label="prueba ? 'Conversación de la prueba' : 'Conversación de la demo'">
				<div v-if="cargando && !mensajes.length" class="demo-ai__inicio"><span class="demo-ai__orb">✦</span><p>{{ prueba ? 'Conectando con tu asistente' : 'Preparando tu recorrido' }}</p></div>
				<button v-if="guia_pausada" type="button" class="demo-ai__seccion" @click="retomar_guia">Retomar guía de Vender</button>
				<article v-for="mensaje in mensajes" :key="mensaje.id" :data-demo-mensaje="mensaje.id" class="demo-ai__mensaje" :class="{ 'demo-ai__mensaje--lead': mensaje.rol === 'lead' }">
					<small>{{ mensaje.rol === 'lead' ? 'Vos' : 'Asistente' }}</small>
					<p v-if="mensaje.contenido">{{ mensaje.contenido }}</p>
					<section v-for="video in (prueba ? [] : mensaje.videos || [])" :key="video.clave" class="demo-ai__video" :class="{ 'demo-ai__video--hecho': video.completado }">
						<div class="demo-ai__video-heading"><span>{{ video.origen === 'recurso' ? 'Centro de recursos' : 'Tu recorrido' }}</span><i v-if="video.completado" class="bi bi-check-circle-fill" aria-label="Video completado"></i></div>
						<h3>{{ video.titulo }}</h3>
						<button v-if="video_abierto !== mensaje.id + ':' + video.clave" class="demo-ai__ver" type="button" @click="abrir_video(mensaje, video)"><i class="bi bi-play-fill"></i>{{ video.completado ? 'Volver a ver' : 'Ver video' }}</button>
						<tarjeta-clip v-else ref="tarjeta_chat" :clip="clip_de(video)" :rastrear_segundos="true" :con_tour="tiene_tour(video)" :puede_probar="video.completado || !video.url" :probado="fue_probado(video)" @segundos="registrar_segundos(video, $event)" @probar="probar(video)" @terminado="refrescar"></tarjeta-clip>
						<div class="demo-ai__avance" role="progressbar" :aria-valuenow="video.porcentaje || 0" aria-valuemin="0" aria-valuemax="100" :aria-label="'Progreso de ' + video.titulo"><span :style="{ width: (video.porcentaje || 0) + '%' }"></span></div>
						<div class="demo-ai__video-pie"><span>{{ video.porcentaje || 0 }}% visto<span v-if="video.completado"> · Listo</span></span><button v-if="!video.completado && !video.omitido" type="button" @click="omitir(video)">Saltear</button><span v-else-if="video.omitido">Para después</span></div>
						<button v-if="ubicacion_video(video)" type="button" class="demo-ai__seccion" aria-haspopup="dialog" @click="abrir_selector(video)">{{ ubicacion_video(video) }} <i class="bi bi-chevron-down" aria-hidden="true"></i></button>
					</section>
				</article>
				<div v-if="pensando" class="demo-ai__pensando" role="status"><span class="demo-ai__constelacion" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ estado === 'listo' ? 'Preparando tu respuesta' : 'Pensando' }}<small>{{ estado === 'esperando' ? 'Te leo. Podés seguir escribiendo.' : 'Buscando cómo ayudarte' }}</small></span></div>
			</div>
			<footer class="demo-ai__footer">
				<p v-if="prueba && !disponible && !cargando && !error" class="demo-ai__error" role="status">El asistente no está disponible en este momento. <button type="button" @click="reintentar">Reintentar</button></p>
				<p v-else-if="error" class="demo-ai__error" role="alert">{{ error }} <button type="button" @click="reintentar">Reintentar</button></p>
				<p v-else-if="estado === 'error'" class="demo-ai__error" role="alert">No pude preparar la respuesta. Probá enviando tu consulta de nuevo.</p>
				<form class="demo-ai__composer" @submit.prevent="enviar">
					<textarea ref="entrada" v-model="texto" rows="2" maxlength="4000" placeholder="¿Qué querés probar?" :aria-label="'Preguntale al ' + nombre_asistente" @keydown.enter.exact.prevent="enviar"></textarea>
					<button type="submit" :disabled="!texto.trim() || enviando || (prueba && !disponible)" aria-label="Enviar mensaje"><i class="bi bi-arrow-up"></i></button>
				</form>
				<small class="demo-ai__ayuda">Preguntá lo que necesites. Vamos a tu ritmo.</small>
			</footer>
		</aside>
		<div v-if="!prueba" ref="guia_guardada" hidden>
			<demo-guia-robot ref="guia" v-model="texto_guia" :texto="guia_texto" :aviso="guia_aviso" :pensando="Boolean(solicitud_guia)" :enviando="enviando" @enviar="enviar_desde_guia" @cerrar="cerrar_desde_guia" @pausar="pausar_guia"></demo-guia-robot>
		</div>
		<selector-videos-demo v-if="!prueba" ref="selector" :catalogo="catalogo" :seleccionando="seleccionando" :error="error_seleccion" @seleccionar="seleccionar_video" @cerrado="selector_cerrado"></selector-videos-demo>
	</div>
</template>
<script>
import TarjetaClip from '@/components/demo/TarjetaClip'
import SelectorVideosDemo from '@/components/demo/SelectorVideosDemo'
import DemoGuiaRobot from '@/components/demo/DemoGuiaRobot'
import { tour_habilitado } from '@/tours/habilitados'
import { iniciar_tour, cortar_tour } from '@/tours/motor'
import { ajustar_guia_a_vender, pasos_de_guia } from '@/tours/guia-vender'

const LUGAR_EN_AGENTES = 'agentes-guia-lugar'

export default {
	components: { TarjetaClip, SelectorVideosDemo, DemoGuiaRobot },
	props: { colapsado: { type: Boolean, default: false }, prueba: { type: Boolean, default: false } },
	data() {
		return {
			mensajes: [], catalogo: [], conversacion: {}, texto: '', error: '', error_seleccion: '', seleccionando: '', seleccion_pendiente: null, foco_seleccion: null, cargando: true, enviando: false, esperando_local: false, video_abierto: null, temporizador: null, consultando: false, destruido: false, pendiente_envio: null, pendientes_video: {}, enviando_video: {}, revision: -1,
			texto_guia: '', guia_texto: '', guia_aviso: '', guia_activa: null, guia_pausada: null,
			solicitud_guia: null, envio_desde_guia: false, disponible: false,
		}
	},
	computed: {
		nombre_asistente() { return this.prueba ? 'asistente de la prueba' : 'asistente de la demo' },
		ruta_chat() { return this.prueba ? '/api/prueba/chat' : '/api/demo/chat' },
		en_modulo() { return this.$route.name === 'agentes' },
		guia_a_la_vista() {
			let chat = this.$store.state.ai_chat
			return chat.agente === 'guia' && (chat.panel_abierto || this.en_modulo)
		},
		plegada_a_la_vista() { return this.colapsado && this.guia_a_la_vista && !this.en_modulo },
		estado() { return this.esperando_local ? 'esperando' : this.conversacion.estado },
		pensando() { return ['esperando', 'pensando', 'listo'].indexOf(this.estado) !== -1 },
		en_vender() { return this.$route.name === 'vender' && this.$route.params.view === 'remito' },
	},
	watch: {
		// El lateral abre y cierra la guía: acá se le avisa al padre para que `colapsado` no quede viejo.
		// 🔴 Este watcher tiene que quedar declarado ANTES que `plegada_a_la_vista`, y `alternar` tiene
		// que seguir siendo sincrónico en PanelDemo y PanelAsistente: al abrir desde la barra con la guía
		// plegada cambian los dos juntos, y así el padre baja `colapsado=false` antes de que se evalúe
		// `plegada_a_la_vista`. Al revés, el lateral se abriría y se cerraría en el mismo tick.
		guia_a_la_vista(visible) {
			if (!visible) this.pausar()
			if (visible === this.colapsado) this.$emit('alternar')
		},
		colapsado(colapsado) {
			if (!colapsado) {
				if (!this.guia_a_la_vista) this.abrir_en_agentes()
				this.al_final()
			}
		},
		/**
		 * Plegada pero con el lateral mostrándola: se cierra el lateral. Es un watcher aparte, y no
		 * una rama del de `colapsado`, porque también se llega saliendo del módulo: «Probar» adentro
		 * de /agentes pliega sin cerrar (el tour saca de ahí solo) y, si quedaba `panel_abierto`,
		 * al irse aparecía el lateral en «Tu guía» con el panel vacío.
		 */
		plegada_a_la_vista(plegada) {
			if (plegada) this.$store.commit('ai_chat/setPanelAbierto', false)
		},
		'$route.fullPath'() {
			this.guia_pausada = null
			this.cerrar_guia()
		},
	},
	created() {
		// Se guarda el objeto propio para limpiar solo lo que puso ESTA instancia: al cambiar el :key de
		// App.vue, Vue crea la nueva antes de destruir la vieja, y la vieja le borraba la guía a la nueva.
		this._guia_registrada = { prueba: this.prueba }
		this.$store.commit('ai_chat/setGuia', this._guia_registrada)
	},
	mounted() {
		this._origen = this.$el.parentNode
		this.acomodar_en_agentes()
		this.$root.$on('agentes:guia-lugar', this.acomodar_en_agentes)
		this.$root.$on('agentes:guia-lugar-sale', this.soltar_lugar)
		this.$root.$on('agentes:guia-pausar', this.pausar)
		if (!this.colapsado) this.abrir_en_agentes()
		this.iniciar()
		let self = this
		this.temporizador = setInterval(function () {
			if (!self.prueba || self.pensando || Date.now() >= self._refrescar_prueba_en) self.refrescar()
		}, 3000)
	},
	beforeDestroy() {
		this.destruido = true
		this.cerrar_guia()
		clearInterval(this.temporizador)
		this.pausar()
		this.$root.$off('agentes:guia-lugar', this.acomodar_en_agentes)
		this.$root.$off('agentes:guia-lugar-sale', this.soltar_lugar)
		this.$root.$off('agentes:guia-pausar', this.pausar)
		if (this.$store.state.ai_chat.guia === this._guia_registrada) {
			if (this.guia_a_la_vista && !this.en_modulo) this.$store.commit('ai_chat/setPanelAbierto', false)
			if (this.$store.state.ai_chat.agente === 'guia') this.$store.commit('ai_chat/setAgente', 'asistente')
			this.$store.commit('ai_chat/setGuia', null)
		}
		// Vue no saca un hijo que movimos a mano cuando desarma a su padre: quedaría huérfano en el lateral.
		const lugar = this.$el.parentNode
		if (lugar && lugar.id === LUGAR_EN_AGENTES) lugar.removeChild(this.$el)
	},
	methods: {
		/**
		 * Se dibuja adentro del lateral de Agentes moviendo el $el, en lugar de montarse allá
		 * (misión agentes-entrada-unica, 10/11/2026), igual que `guardar_vineta` hace con la viñeta.
		 *
		 * 🔴 El lateral es `v-if="abierto"`: si este componente viviera adentro, se destruiría al
		 * cerrarlo y se cortarían el polling, el progreso del video y la guía de Vender.
		 */
		acomodar_en_agentes() {
			const lugar = document.getElementById(LUGAR_EN_AGENTES)
			if (lugar && this.$el.parentNode !== lugar) lugar.appendChild(this.$el)
		},
		soltar_lugar(elemento) {
			if (elemento && this.$el.parentNode === elemento) this.devolver_a_origen()
		},
		devolver_a_origen() {
			if (this._origen && this.$el.parentNode !== this._origen) this._origen.appendChild(this.$el)
		},
		abrir_en_agentes() {
			this.$store.commit('ai_chat/setAgente', 'guia')
			// En el módulo ya está a la vista; prender el lateral lo dejaría abierto al salir de ahí.
			if (!this.en_modulo) this.$store.commit('ai_chat/setPanelAbierto', true)
		},
		/**
		 * 🔴 Antes de avisar, el $el vuelve a su lugar. PanelDemo responde cambiando el `v-if` por el
		 * panel de respaldo, y Vue lo inserta tomando este $el de referencia: si sigue en otro padre,
		 * el respaldo no se inserta nunca. En la prueba nadie reemplaza el chat, y se queda donde está.
		 */
		avisar_no_disponible() {
			if (!this.prueba) this.devolver_a_origen()
			this.$emit('no-disponible')
		},
		// El panel vive entre módulos: sus pedidos no pertenecen a la pantalla que se abandona.
		iniciar() {
			let self = this
			if (this.prueba) {
				this.cargando = true
				this.error = ''
				this._refrescar_prueba_en = Date.now() + 30000
			}
			this.$axios.post(this.ruta_chat + '/iniciar', {}, { skip_navigation_cancel: true }).then(function (res) { self.aplicar_respuesta(res); self.error = '' }).catch(function (e) { self.fallar(e) }).then(function () { self.cargando = false })
		},
		refrescar() {
			if (this.consultando || this.destruido) return
			let self = this
			this.consultando = true
			if (this.prueba) this._refrescar_prueba_en = Date.now() + 30000
			this.$axios.get(this.ruta_chat, { skip_navigation_cancel: true }).then(function (res) {
				self.aplicar_respuesta(res)
				if (!self.pendiente_envio) self.error = ''
				Object.keys(self.pendientes_video).forEach(function (clave) { self.enviar_progreso(clave) })
			}).catch(function (e) { self.fallar(e) }).then(function () { self.consultando = false })
		},
		aplicar_respuesta(res) {
			if (this.prueba && res.status === 204) {
				this.$emit('sin-acceso')
				return false
			}
			return this.aplicar(res.data)
		},
		aplicar(snapshot) {
			if (this.destruido) return false
			if (!snapshot || snapshot.disponible === false) {
				this.disponible = false
				this.avisar_no_disponible()
				return false
			}
			this.disponible = true
			let revision = Number(snapshot.conversacion && snapshot.conversacion.revision) || 0
			if (revision < this.revision) return true
			let nuevos = Array.isArray(snapshot.mensajes) ? snapshot.mensajes : []
			let anterior = this.mensajes.length ? this.mensajes[this.mensajes.length - 1].id : null
			this.revision = revision
			this.conversacion = snapshot.conversacion || {}
			// Una API anterior no anuncia el selector: el chat y su progreso siguen disponibles.
			this.catalogo = Array.isArray(snapshot.catalogo) ? snapshot.catalogo : []
			this.mensajes = nuevos
			if (!this.prueba) {
				this.aplicar_guia(nuevos)
				let self = this
				nuevos.forEach(function (mensaje) { (mensaje.videos || []).forEach(function (video) {
					if (video.origen === 'demo' && video.completado && self.$store.state.demo.clips_vistos.indexOf(video.clip_id) === -1) self.$emit('terminado', self.clip_de(video))
				}) })
			}
			if (nuevos.length && nuevos[nuevos.length - 1].id !== anterior) this.al_final()
			return true
		},
		enviar() {
			this.enviar_consulta(this.texto, false)
		},
		enviar_desde_guia() {
			this.enviar_consulta(this.texto_guia, true)
		},
		enviar_consulta(texto, desde_guia) {
			const contenido = texto.trim()
			if (!contenido || this.enviando || (this.prueba && !this.disponible)) return
			this.guia_pausada = null
			if (!this.pendiente_envio || this.pendiente_envio.contenido !== contenido || this.envio_desde_guia !== desde_guia) {
				this.pendiente_envio = { contenido: contenido, cliente_uuid: this.uuid() }
				this.envio_desde_guia = desde_guia
			}
			const envio = this.pendiente_envio
			if (!this.prueba && this.en_vender && (!desde_guia || this.guia_activa)) {
				envio.guia = { version: 1, pantalla: 'vender' }
				if (this.guia_activa && this.guia_activa.paso) envio.guia.paso = this.guia_activa.paso
				if (!this.solicitud_guia || this.solicitud_guia.uuid !== envio.cliente_uuid) {
					const ultimo = this.mensajes[this.mensajes.length - 1]
					this.solicitud_guia = { uuid: envio.cliente_uuid, desde: ultimo ? ultimo.id : 0, revision: null }
				}
			} else {
				delete envio.guia
				this.solicitud_guia = null
			}
			let self = this
			this.enviando = true
			this.esperando_local = true
			this.error = ''
			this.guia_aviso = ''
			this.al_final()
			this.$axios.post(this.ruta_chat + '/mensajes', envio, { skip_navigation_cancel: true }).then(function (res) {
				if (self.solicitud_guia && self.solicitud_guia.uuid === envio.cliente_uuid) {
					self.solicitud_guia.revision = Number(res.data && res.data.conversacion && res.data.conversacion.revision) || 0
				}
				const aplicada = self.aplicar_respuesta(res)
				if (self.prueba && !aplicada) return
				const campo = desde_guia ? 'texto_guia' : 'texto'
				if (self[campo].trim() === contenido) self[campo] = ''
				self.pendiente_envio = null
			}).catch(function (e) {
				self.fallar(e)
				if (self.solicitud_guia && self.solicitud_guia.uuid === envio.cliente_uuid) self.solicitud_guia = null
				if (desde_guia && self.guia_activa) self.guia_aviso = self.error
			}).then(function () { self.enviando = false; self.esperando_local = false })
		},
		aplicar_guia(mensajes) {
			const solicitud = this.solicitud_guia
			if (!solicitud || solicitud.revision === null || this.revision < solicitud.revision || !this.en_vender) return
			const respuesta = mensajes.find(function (mensaje) {
				return mensaje.rol === 'asistente' && mensaje.guia && mensaje.guia.version === 1 && mensaje.guia.solicitud_uuid === solicitud.uuid
			})
			if (respuesta) {
				this.solicitud_guia = null
				if (respuesta.guia.accion === 'cerrar') {
					this.cerrar_guia()
					this.mostrar_chat()
				} else if (respuesta.guia.accion === 'iniciar') {
					const pasos = pasos_de_guia(respuesta.guia.pasos)
					if (pasos.length) this.iniciar_guia(pasos)
					else this.guia_aviso = respuesta.contenido
				}
				return
			}
			if (['esperando', 'pensando', 'listo'].indexOf(this.conversacion.estado) !== -1) return
			this.solicitud_guia = null
			if (!this.guia_activa) return
			const ultima = mensajes.slice().reverse().find(function (mensaje) {
				return mensaje.rol === 'asistente' && mensaje.id > solicitud.desde
			})
			this.guia_aviso = ultima ? ultima.contenido : 'No pude actualizar la guía. Podés probar de nuevo.'
		},
		iniciar_guia(pasos) {
			this.guia_pausada = null
			this.guia_aviso = ''
			const ajustados = ajustar_guia_a_vender(pasos)
			if (!ajustados.length) {
				this.cerrar_guia()
				this.mostrar_chat()
				return
			}
			const guia = { pasos: ajustados, paso: null, indice: 0, iniciada: false }
			this.guia_activa = guia
			if (!this.colapsado) this.minimizar()
			this.$nextTick(() => {
				if (this.guia_activa !== guia || !this.en_vender) return
				guia.iniciada = iniciar_tour({ id: 'guia-vender', pasos: guia.pasos }, {
					router: this.$router,
					root: this.$root,
					renderizar_guia: (viñeta, paso, indice) => {
						guia.paso = paso.id || 'codigo_barras'
						guia.indice = indice
						this.guia_texto = paso.texto
						viñeta.appendChild(this.$refs.guia.$el)
					},
					al_terminar: () => {
						if (this.guia_activa !== guia) return
						this.guia_activa = null
						this.solicitud_guia = null
						this.guardar_vineta()
					},
				})
			})
		},
		guardar_vineta() {
			if (this.$refs.guia && this.$refs.guia_guardada) this.$refs.guia_guardada.appendChild(this.$refs.guia.$el)
		},
		cerrar_guia() {
			const guia = this.guia_activa
			this.guia_activa = null
			this.solicitud_guia = null
			if (guia && guia.iniciada) cortar_tour()
			this.guardar_vineta()
		},
		mostrar_chat() {
			if (this.colapsado) this.$emit('alternar')
		},
		cerrar_desde_guia() {
			this.cerrar_guia()
			this.mostrar_chat()
		},
		pausar_guia() {
			if (!this.guia_activa) return
			this.guia_pausada = this.guia_activa.pasos.slice(this.guia_activa.indice).filter(function (paso) { return paso.id })
			this.cerrar_guia()
			this.mostrar_chat()
		},
		retomar_guia() {
			if (this.guia_pausada && this.guia_pausada.length && this.en_vender) this.iniciar_guia(this.guia_pausada)
		},
		uuid() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { let r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16) })
		},
		fallar(error) {
			if (this.destruido) return
			if (error.response && [404, 405].indexOf(error.response.status) !== -1) { this.avisar_no_disponible(); return }
			this.error = 'Se cortó la conexión. Tu mensaje queda acá para reintentarlo.'
		},
		reintentar() {
			if (!this.pendiente_envio || (this.prueba && !this.disponible)) this.iniciar()
			else if (this.envio_desde_guia) this.enviar_desde_guia()
			else this.enviar()
		},
		al_final() {
			let self = this
			this.$nextTick(function () { if (self.$refs.hilo) self.$refs.hilo.scrollTop = self.$refs.hilo.scrollHeight })
		},
		clip_de(video) {
			let encontrado = null
			this.$store.state.demo.secciones.forEach(function (seccion) { (seccion.clips || []).forEach(function (clip) { if (clip.id === video.clip_id) encontrado = clip }) })
			return Object.assign({}, encontrado || {}, { id: video.clip_id || video.codigo, titulo: video.titulo, url: video.url, practica: video.origen === 'demo' && (!encontrado || encontrado.practica !== false) })
		},
		tiene_tour(video) { return video.origen === 'demo' && tour_habilitado(this.clip_de(video)) },
		fue_probado(video) { return this.$store.state.demo.clips_probados.indexOf(video.clip_id) !== -1 },
		ubicacion_video(video) {
			let actual = this.catalogo.find(item => item.clave === video.clave)
			return actual && actual.seccion && actual.posicion > 0 && actual.cantidad > 0 ? actual.seccion + ' · ' + actual.posicion + ' de ' + actual.cantidad : ''
		},
		abrir_selector(video) {
			let actual = this.catalogo.find(item => item.clave === video.clave)
			if (!actual) return
			this.pausar()
			this.error_seleccion = ''
			this.foco_seleccion = null
			this.$refs.selector.abrir(actual)
		},
		selector_cerrado() {
			this.error_seleccion = ''
			let id = this.foco_seleccion
			this.foco_seleccion = null
			if (id === null) return
			let self = this
			// BootstrapVue restaura el foco al disparador en su nextTick de hidden. Después
			// llevamos la elección al chat; al cancelar se conserva el retorno al origen.
			this.$nextTick(function () {
				if (self.destruido || !self.$refs.hilo) return
				let articulo = Array.from(self.$refs.hilo.querySelectorAll('[data-demo-mensaje]')).find(item => item.getAttribute('data-demo-mensaje') === String(id))
				if (!articulo) return
				let boton = articulo.querySelector('.demo-ai__ver')
				if (boton) boton.focus({ preventScroll: true })
				articulo.scrollIntoView({ block: 'nearest' })
			})
		},
		seleccionar_video(video) {
			if (this.seleccionando) return
			// El mismo intento conserva UUID ante una respuesta perdida; no duplica la tarjeta.
			if (!this.seleccion_pendiente || this.seleccion_pendiente.clave !== video.clave) this.seleccion_pendiente = { clave: video.clave, cliente_uuid: this.uuid() }
			let self = this
			this.seleccionando = video.clave
			this.error_seleccion = ''
			this.$axios.post('/api/demo/chat/videos/seleccionar', this.seleccion_pendiente, { skip_navigation_cancel: true }).then(function (res) {
				if (self.destruido) return
				self.aplicar(res.data)
				self.seleccion_pendiente = null
				let elegido = self.mensajes.slice().reverse().find(mensaje => (mensaje.videos || []).some(item => item.clave === video.clave))
				self.foco_seleccion = elegido ? elegido.id : null
				self.$refs.selector.cerrar()
			}).catch(function (e) {
				if (self.destruido) return
				self.error_seleccion = e.response && e.response.status === 422 ? 'Este video ya no está disponible. Elegí otro.' : 'No pudimos enviar el video. Volvé a intentarlo.'
			}).then(function () { self.seleccionando = '' })
		},
		abrir_video(mensaje, video) {
			this.pausar()
			this.video_abierto = mensaje.id + ':' + video.clave
			if (video.origen === 'demo') this.$store.dispatch('demo/reportar', { nombre: 'clip.abierto', clip_id: video.clip_id })
		},
		pausar() { (this.$refs.tarjeta_chat || []).forEach(function (tarjeta) { tarjeta.pausar() }) },
		minimizar() { this.pausar(); this.$emit('alternar') },
		probar(video) {
			this.pausar()
			// Un tour navega solo; sin tour, el módulo ocuparía la pantalla que se quiere probar.
			if (this.en_modulo && !this.tiene_tour(video)) this.$root.$emit('agentes:cerrar')
			this.$emit('probar', this.clip_de(video))
		},
		registrar_segundos(video, datos) {
			let cola = this.pendientes_video[video.clave] || []
			let segundos = datos.segundos_vistos.slice()
			if (!segundos.length && datos.terminado !== true) return
			// Cada evento conserva su frontera: un ended previo no puede incorporar segundos
			// de una reproducción posterior mientras todavía hay un pedido en vuelo.
			for (let inicio = 0; inicio < segundos.length || inicio === 0; inicio += 600) {
				cola.push({ video: video, segundos: segundos.slice(inicio, inicio + 600), duracion: datos.duracion, terminado: datos.terminado === true && inicio + 600 >= segundos.length })
			}
			this.pendientes_video[video.clave] = cola
			this.enviar_progreso(video.clave)
		},
		enviar_progreso(clave) {
			if (this.enviando_video[clave]) return
			let cola = this.pendientes_video[clave]
			if (!cola || !cola.length) return
			let pendiente = cola[0]
			let self = this
			this.enviando_video[clave] = true
			this.$axios.post('/api/demo/chat/videos/progreso', { clave: clave, segundos_vistos: pendiente.segundos, duracion: pendiente.duracion, terminado: pendiente.terminado }, { skip_navigation_cancel: true }).then(function (res) {
				cola.shift()
				self.aplicar(res.data)
				if (pendiente.video.origen === 'demo') {
					let video = self.buscar_video(clave)
					if (video && !video.completado) self.$store.dispatch('demo/reportar', { nombre: 'clip.progreso', clip_id: video.clip_id, datos: { porcentaje: video.porcentaje || 0 } })
				}
				self.enviando_video[clave] = false
				self.enviar_progreso(clave)
			}).catch(function (e) { self.enviando_video[clave] = false; self.fallar(e) })
		},
		buscar_video(clave) {
			let encontrado = null
			this.mensajes.forEach(function (mensaje) { (mensaje.videos || []).forEach(function (video) { if (video.clave === clave) encontrado = video }) })
			return encontrado
		},
		omitir(video) {
			this.pausar()
			let self = this
			this.$axios.post('/api/demo/chat/videos/omitir', { clave: video.clave }, { skip_navigation_cancel: true }).then(function (res) { self.aplicar(res.data) }).catch(function (e) { self.fallar(e) })
		},
	},
}
</script>
<style lang="sass">
@import '@/components/demo/_estetica-asistente'

.tour-demo--guia
	max-width: min(300px, calc(100vw - 24px))
	> .driver-popover-title, > .driver-popover-description, > .driver-popover-close-btn, > .driver-popover-footer
		display: none !important

.demo-ai
	--demo-ink: #e8edf8
	--demo-muted: #a3aec6
	// Fuera del lateral no se dibuja: ahí solo espera a que se abra con su estado intacto.
	display: none
	flex: 1
	flex-direction: column
	min-height: 0
	width: 100%
	color: var(--demo-ink)
	font-family: inherit
	text-align: left
	.agentes-guia-lugar &
		display: flex
	button, textarea
		font: inherit
	button
		cursor: pointer
	button:focus-visible, textarea:focus-visible
		outline: 2px solid #8fc7ff
		outline-offset: 3px
.demo-ai__panel
	position: relative
	display: flex
	flex-direction: column
	flex: 1
	min-height: 0
	overflow: hidden
.demo-ai__orb
	+asistente-orb
.demo-ai__hilo
	flex: 1
	min-height: 0
	padding: 20px 16px
	background: $asistente-hilo
	overflow-y: auto
	overscroll-behavior: contain
	scrollbar-width: thin
	scrollbar-color: #3b4664 transparent
.demo-ai__inicio
	text-align: center
	padding: 40px 0
	p
		margin-top: 18px
		color: var(--demo-muted)
.demo-ai__mensaje
	margin-bottom: 22px
	font-size: 14px
	line-height: 1.6
	> small
		display: block
		color: #929eb8
		font-size: 10px
		font-weight: 700
		letter-spacing: .08em
		text-transform: uppercase
		margin-bottom: 7px
	> p
		margin: 0
		white-space: pre-wrap
		overflow-wrap: anywhere
	&--lead
		margin-left: 34px
		padding: 11px 15px
		border-radius: 17px 17px 3px 17px
		background: $asistente-burbuja
.demo-ai__video
	margin-top: 12px
	padding: 14px
	border: 1px solid #3a435e
	border-radius: 17px
	background: linear-gradient(150deg, #232b44, #192136)
	h3
		font-size: 15px
		line-height: 1.4
		font-weight: 600
		color: #f3f5ff
		margin: 8px 0 12px
	.tarjeta-clip__video
		max-height: 310px
	&--hecho
		border-color: #74d7b478
		.demo-ai__video-heading i
			color: #90e9c4
			animation: demo-ai-hecho .5s ease both
.demo-ai__video-heading, .demo-ai__video-pie
	display: flex
	justify-content: space-between
	align-items: center
	font-size: 11px
	color: #b9c5dc
.demo-ai__video-heading
	text-transform: uppercase
	letter-spacing: .06em
.demo-ai__ver
	border: 1px solid #8299da55
	width: 100%
	padding: 10px
	border-radius: 10px
	color: #f5f6ff
	background: #49598955
	i
		margin-right: 6px
.demo-ai__avance
	height: 3px
	background: #ffffff15
	border-radius: 9px
	margin: 14px 0 7px
	overflow: hidden
	span
		display: block
		height: 100%
		background: linear-gradient(90deg, #98a1ff, #75e6d0)
		transition: width .4s
.demo-ai__video-pie button
	border: 0
	background: transparent
	color: #c3c9f7
	padding: 3px
	text-decoration: underline
.demo-ai__seccion
	display: inline-flex
	align-items: center
	gap: 7px
	max-width: 100%
	margin-top: 9px
	padding: 6px 8px
	border: 1px solid #8299da55
	border-radius: 8px
	background: #ffffff08
	color: #cbd4f5
	font-size: 11px !important
	text-align: left
	overflow-wrap: anywhere
	&:hover
		background: #ffffff12
.demo-ai__footer
	background: $asistente-cabecera
	padding: 14px
.demo-ai__composer
	position: relative
	display: flex
	gap: 8px
	align-items: flex-end
	padding: 10px
	border-radius: 16px
	border: 1px solid transparent
	background: linear-gradient($asistente-compositor, $asistente-compositor) padding-box, linear-gradient(120deg, #76d8ff, #a49dff, #ed8bc5, #76d8ff) border-box
	background-size: 100% 100%, 300% 300%
	animation: demo-ai-onda 7s ease infinite
	box-shadow: inset 0 0 14px #a49dff09, 0 0 16px #83bdff0e
	textarea
		width: 100%
		resize: none
		border: 0
		outline: 0
		background: transparent
		color: #f4f5ff
		font-size: 14px
		line-height: 1.5
		min-height: 43px
		&::placeholder
			color: #a6b2ca
	button
		flex-shrink: 0
		width: 34px
		height: 34px
		border: 0
		border-radius: 11px
		color: #151b2e
		background: #c2c4ff
		&:disabled
			opacity: .35
.demo-ai__ayuda
	display: block
	text-align: center
	font-size: 10px
	color: #a6b2ca
	margin-top: 10px
.demo-ai__error
	font-size: 12px
	color: #ffcccb
	button
		border: 0
		background: transparent
		color: #ddd9ff
		text-decoration: underline
.demo-ai__pensando
	display: flex
	align-items: center
	gap: 12px
	font-size: 12px
	color: #d7ddfa
	padding: 8px 0 16px
	small
		display: block
		font-size: 10px
		color: #a5b0cb
.demo-ai__constelacion
	position: relative
	width: 32px
	height: 32px
	flex-shrink: 0
	animation: demo-ai-orbita 5s linear infinite
	i
		position: absolute
		width: 8px
		height: 8px
		border-radius: 50%
		background: #adc4ff
		box-shadow: 0 0 10px #adc4ff
		&:nth-child(1)
			left: 12px
			top: 1px
		&:nth-child(2)
			left: 1px
			top: 21px
			background: #b39bff
		&:nth-child(3)
			right: 1px
			top: 21px
			background: #93e0db
@keyframes demo-ai-onda
	0%, 100%
		background-position: 0% 50%
	50%
		background-position: 100% 50%
@keyframes demo-ai-orbita
	to
		transform: rotate(360deg)
@keyframes demo-ai-hecho
	0%
		transform: scale(.45)
	60%
		transform: scale(1.25)
	100%
		transform: scale(1)
@media (max-width: 600px)
	.demo-ai__hilo
		padding: 16px 12px
@media (prefers-reduced-motion: reduce)
	.demo-ai__composer, .demo-ai__constelacion, .demo-ai__video-heading i
		animation: none !important
	.demo-ai__avance span
		transition: none
</style>
