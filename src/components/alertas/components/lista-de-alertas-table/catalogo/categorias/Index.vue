<template>
<div
class="cat-sistemas"
data-testid="alertas-categorias"
:data-vista="vista">

	<!-- Primera carga: todavia no hay nada para mostrar. -->
	<div
	v-if="vista === 'cargando'"
	class="cat-sistemas__cargando"
	data-testid="categorias-cargando">
		<b-spinner
		small
		variant="primary"></b-spinner>
		<span>{{ textos.cargando }}</span>
	</div>

	<!--
		Una API que todavia no tiene estas rutas (404): estado discreto, sin ningun cartel de error y
		sin tocar el resto de Alertas. Se resuelve solo cuando el negocio recibe la actualizacion.
	-->
	<empty-state
	v-else-if="vista === 'no_disponible'"
	data-testid="categorias-no-disponible"
	icon_class="bi bi-info-circle"
	:title="textos.no_disponible.titulo"
	:hint="textos.no_disponible.pista"></empty-state>

	<empty-state
	v-else-if="vista === 'error'"
	data-testid="categorias-error"
	icon_class="bi bi-cloud-slash"
	:title="textos.error.titulo"
	:hint="textos.error.pista">
		<b-button
		class="btn-modulo"
		variant="outline-primary"
		data-testid="categorias-reintentar"
		@click="cargar">
			Reintentar
		</b-button>
	</empty-state>

	<empty-state
	v-else-if="vista === 'sin_propuestas'"
	data-testid="categorias-sin-propuestas"
	icon_class="bi bi-diagram-3"
	:title="textos.sin_propuestas.titulo"
	:hint="textos.sin_propuestas.pista"></empty-state>

	<!--
		La corrida existe pero todavia no se puede elegir (la estan cargando, o se esta aplicando una
		eleccion): se dice y se ofrece actualizar. Mientras esta en este estado la pantalla tambien se
		refresca sola cada tanto (ver `programar_refresco`).
	-->
	<empty-state
	v-else-if="vista === 'preparando' || vista === 'aplicando' || vista === 'otro_estado'"
	:data-testid="'categorias-' + vista"
	icon_class="bi bi-hourglass-split"
	:title="textos[vista].titulo"
	:hint="textos[vista].pista">
		<b-button
		class="btn-modulo"
		variant="outline-primary"
		data-testid="categorias-actualizar"
		:disabled="actualizando"
		@click="actualizar">
			<b-spinner
			v-if="actualizando"
			small
			class="m-r-5"></b-spinner>
			Actualizar
		</b-button>
	</empty-state>

	<!-- Hay sistemas para elegir. -->
	<template v-else-if="vista === 'lista'">

		<p
		class="cat-sistemas__intro"
		data-testid="categorias-intro">
			Elegí cómo querés organizar tu catálogo. Armamos {{ propuestas.length === 1 ? 'este sistema' : 'estos sistemas' }} mirando tus {{ entero(run.articulos_total) }} artículos; hasta que elijas, no cambia nada en tu catálogo.
		</p>
		<p
		class="cat-sistemas__nota"
		data-testid="categorias-nota-dudosos">
			<i
			class="bi bi-info-circle"
			aria-hidden="true"></i>
			{{ textos.nota_dudosos }}
		</p>

		<div
		class="cat-sistemas__grilla"
		data-testid="categorias-tarjetas">
			<tarjeta-sistema
			v-for="propuesta in propuestas"
			:key="propuesta.id"
			:propuesta="propuesta"
			:bloqueada="esta_bloqueada(propuesta)"
			:motivos_de_bloqueo="motivos_de_bloqueo"
			:nombre_de_mantener="nombre_de_mantener"
			:puede_gestionar="run.puede_gestionar"
			:ocupado="trabajando"
			@elegir="pedir_eleccion"></tarjeta-sistema>
		</div>

	</template>

	<!-- Ya se eligio uno: lo que paso, y la revision de lo dudoso. -->
	<template v-else-if="vista === 'elegida'">

		<resumen-de-eleccion
		:run="run"
		:propuesta="propuesta_elegida"
		:conteos="conteos"
		:ocupado="trabajando"
		@cambiar="cambiar_de_sistema"></resumen-de-eleccion>

		<revision-de-dudosos
		:run_id="run.id"
		:conteos="conteos"
		:puede_gestionar="run.puede_gestionar"
		@revisado="al_revisar"></revision-de-dudosos>

	</template>

	<!-- La confirmacion de "Elegir este" (un solo modal para todas las tarjetas). -->
	<modal-elegir
	:propuesta="propuesta_a_elegir"
	:advertencias="advertencias"
	:tiene_categorias_previas="tiene_categorias_previas"
	:ocupado="elegiendo"
	@confirmar="elegir"></modal-elegir>

</div>
</template>
<script>
import EmptyState from '@/common-vue/components/display/EmptyState'
import TarjetaSistema from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/TarjetaSistema'
import ModalElegir from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/ModalElegir'
import ResumenDeEleccion from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/ResumenDeEleccion'
import { TEXTOS, cantidad_de, entero_es, texto_de_motivo_de_bloqueo } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'
import { avisar } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/avisos'
import { es_cancelacion } from '@/store/category_proposal'

/** Cada cuánto se refresca sola la pantalla mientras la corrida se está preparando o aplicando. */
const REFRESCO_MS = 30000

/**
 * Espera antes de pedir los números frescos después de aprobar o rechazar: quien está revisando
 * aprueba varios seguidos, y con esto se pide una sola vez al final de la racha.
 */
const ESPERA_SINCRONIZACION_MS = 600

/**
 * Las acciones de Vuex que vuelven a traer las categorías y las subcategorías del negocio a la sesión (las
 * mismas que pide `update_articles_after_import` de mixins/global_notification_functions.js).
 */
const ACCIONES_QUE_RECARGAN_CATEGORIAS = ['category/getModels', 'sub_category/getModels']

/**
 * Sub-solapa Categorías de Alertas → Catálogo (misión categorizacion-tres-modelos, 5/10/2026): el
 * dueño ve los sistemas de categorías que ComercioCity armó con IA para su catálogo, elige el que más
 * le gusta y revisa lo que la IA no tenía claro.
 *
 * Este componente orquesta; no dibuja los datos. Según lo que diga la API (`actual`) muestra:
 *
 *   cargando · todavía no disponible (API sin estas rutas) · error con reintento · sin sistemas
 *   (nadie los preparó) · preparando · lista (las tarjetas para elegir) · elegida (lo que se hizo
 *   y la revisión)
 *
 * y se encarga de lo que no es de ninguno de sus hijos:
 *
 *  1. Pedir `actual` al entrar (silencioso: el 404 de una API vieja no muestra nada) y, con la
 *     corrida lista, avisarle a la API que el dueño la vio (`sin_ver` baja).
 *  2. "Elegir este": abre la confirmación y, al confirmar, pide la elección con el cargando global
 *     (la API aplica todo en un solo pedido y puede tardar). Mientras dura, todos los botones de
 *     elegir quedan apagados; elegir dos veces es inofensivo (la API es idempotente), pero no hace
 *     falta darle la oportunidad.
 *  3. "Cambiar de sistema": confirma y pide volver atrás. Si la API dice 409, el interceptor global
 *     muestra el motivo y acá se vuelve a pedir `actual` para dibujar lo real.
 *  4. Mantener al día el número rojo y el cartel de la elección cuando se revisa algo.
 *
 * 🔴 Esta pantalla no decide nada de plata ni de permisos: si un sistema nuevo está bloqueado, si se
 * puede volver atrás, qué advertencias van en el cartel de confirmar y quién puede elegir, lo dice la
 * API y acá solo se dibuja (el store lo normaliza). Por eso no hay ni una cuenta de márgenes acá.
 *
 * Los errores de lo que dispara una persona los muestra el interceptor global de main.js (un 4xx con
 * `message` sale como aviso): esta pantalla NO repite el toast, solo apaga el cargando global si lo
 * prendió.
 */
export default {
	components: {
		EmptyState,
		TarjetaSistema,
		ModalElegir,
		ResumenDeEleccion,
		// Solo se necesita con un sistema ya elegido: no viaja en el chunk de las tarjetas.
		RevisionDeDudosos: () => import('@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/RevisionDeDudosos'),
	},
	data() {
		return {
			/** Los textos de cada estado, en un solo lugar (textos.js). */
			textos: TEXTOS,
			/** El sistema que se está por elegir (lo lee el modal de confirmación), o null. */
			propuesta_a_elegir: null,
			/** true desde que se confirma "Elegir este" hasta que termina de actualizarse la pantalla. */
			elegiendo: false,
			/** true desde que se confirma "Cambiar de sistema" hasta que termina de actualizarse. */
			volviendo: false,
			/** true mientras un "Actualizar" explícito está en vuelo. */
			actualizando: false,
			/** true mientras hay una caja de confirmación abierta (anti doble clic). */
			confirmacion_abierta: false,
			/** Id de la corrida para la que ya se avisó que el dueño la vio (una sola vez por corrida). */
			visto_enviado_para: null,
			/** Timer del refresco mientras la corrida se prepara o se aplica. */
			timer_refresco: null,
			/** Timer de la sincronización después de revisar (ver `al_revisar`). */
			timer_sincronizacion: null,
			/**
			 * true si se aprobó algo y todavía no se volvieron a pedir las categorías de la sesión (ver
			 * `refrescar_categorias_de_la_sesion`): aprobar puede crear categorías y subcategorías.
			 */
			categorias_por_refrescar: false,
		}
	},
	computed: {
		/** Estado de la carga de `actual` (sin_cargar | cargando | listo | no_disponible | error). */
		estado_de_actual() {
			return this.$store.state.category_proposal.estado_de_actual
		},
		/** La corrida vigente normalizada por el store, o null. */
		actual() {
			return this.$store.state.category_proposal.actual
		},
		/** El objeto `run` de la corrida, o null si no hay ninguna. */
		run() {
			return this.actual ? this.actual.run : null
		},
		/** Los sistemas de la corrida, en el orden que manda la API (`orden`). */
		propuestas() {
			return this.actual ? this.actual.propuestas : []
		},
		/** Los conteos vivos de la revisión (los mantiene el store con cada respuesta). */
		conteos() {
			return this.actual ? this.actual.conteos : { a_revisar: 0, asignados: 0, sin_categoria: 0 }
		},
		advertencias() {
			return this.actual ? this.actual.advertencias : []
		},
		tiene_categorias_previas() {
			return !!this.actual && this.actual.tiene_categorias_previas
		},
		/**
		 * Qué se dibuja. Todo sale de lo que dice la API; un estado de corrida que esta pantalla no
		 * conoce cae en `otro_estado` (se dice y se ofrece actualizar) antes que en una pantalla en
		 * blanco.
		 *
		 * @returns {String}
		 */
		vista() {
			let estado = this.estado_de_actual
			if (estado === 'sin_cargar' || estado === 'cargando') {
				return 'cargando'
			}
			if (estado === 'no_disponible') {
				return 'no_disponible'
			}
			if (estado === 'error' || !this.actual) {
				return 'error'
			}
			if (!this.run) {
				return 'sin_propuestas'
			}
			if (this.run.estado === 'preparando') {
				return 'preparando'
			}
			if (this.run.estado === 'aplicando') {
				return 'aplicando'
			}
			if (this.run.estado === 'lista') {
				// Una corrida lista sin ninguna tarjeta no tiene nada para elegir.
				return this.propuestas.length ? 'lista' : 'sin_propuestas'
			}
			if (this.run.estado === 'elegida') {
				return 'elegida'
			}
			return 'otro_estado'
		},
		/** true mientras hay una acción grande en curso: los botones de elegir y cambiar se apagan. */
		trabajando() {
			return this.elegiendo || this.volviendo
		},
		/**
		 * Los motivos por los que un sistema nuevo está bloqueado, ya traducidos a frases (los mismos
		 * para todas las tarjetas nuevas).
		 *
		 * @returns {Array<String>}
		 */
		motivos_de_bloqueo() {
			let frases = []
			if (!this.actual) {
				return frases
			}
			this.actual.bloqueo.motivos.forEach(function (motivo) {
				let texto = texto_de_motivo_de_bloqueo(motivo)
				if (texto) {
					frases.push(texto)
				}
			})
			return frases
		},
		/**
		 * El nombre de la tarjeta que mantiene las categorías del negocio, si hay una: las tarjetas
		 * bloqueadas la sugieren como salida.
		 *
		 * @returns {String|null}
		 */
		nombre_de_mantener() {
			let nombre = null
			this.propuestas.forEach(function (propuesta) {
				if (nombre === null && propuesta.tipo === 'mantener') {
					nombre = propuesta.nombre
				}
			})
			return nombre
		},
		/**
		 * El sistema que se eligió, o null si no se encuentra entre las tarjetas.
		 *
		 * @returns {Object|null}
		 */
		propuesta_elegida() {
			let run = this.run
			let elegida = null
			if (!run) {
				return null
			}
			this.propuestas.forEach(function (propuesta) {
				if (elegida === null && (propuesta.id === run.propuesta_elegida_id || propuesta.elegida)) {
					elegida = propuesta
				}
			})
			return elegida
		},
	},
	watch: {
		/**
		 * Mientras la corrida se prepara (o se aplica) la pantalla se refresca sola; con cualquier otra
		 * vista, no. Y al llegar la corrida lista, se avisa que el dueño la vio.
		 */
		vista(nueva) {
			this.programar_refresco()
			if (nueva === 'lista') {
				this.avisar_que_se_vio()
			}
		},
	},
	created() {
		this.cargar()
	},
	beforeDestroy() {
		clearInterval(this.timer_refresco)
		this.timer_refresco = null
		// Si se sale con una sincronización en espera (por ejemplo, se aprobó algo hace un instante y
		// se cambió de solapa), los números se piden igual: si no, el número rojo quedaría contando
		// artículos que ya se resolvieron.
		if (this.timer_sincronizacion) {
			clearTimeout(this.timer_sincronizacion)
			this.timer_sincronizacion = null
			this.sincronizar()
		}
	},
	methods: {
		entero(valor) {
			return entero_es(valor)
		},
		/**
		 * Pide `actual`. Es silencioso y resuelve siempre: si hay un error o la API es vieja, queda
		 * dicho en `estado_de_actual` y la pantalla lo muestra. Con la corrida lista, avisa que el
		 * dueño la vio.
		 *
		 * 🔴 El pedido puede volver DESPUÉS de que la persona salió de la pantalla (B-07): en ese caso
		 * este componente ya está destruido y no tiene que armar nada. Si armara el refresco acá,
		 * nadie volvería a limpiarlo (`beforeDestroy` ya corrió) y quedaría pidiendo `actual` cada 30
		 * segundos hasta recargar la página.
		 *
		 * @returns {Promise<String>} Lo que pasó (ver la acción `get_actual`).
		 */
		cargar() {
			let self = this
			return self.$store.dispatch('category_proposal/get_actual')
			.then(resultado => {
				if (self._isDestroyed) {
					return resultado
				}
				if (resultado === 'listo') {
					self.avisar_que_se_vio()
					self.programar_refresco()
				}
				return resultado
			})
		},
		/**
		 * "Actualizar" de la pantalla de "preparando": pide `actual` y el número rojo. Es una acción de
		 * la persona, así que si no se pudo se lo dice (el pedido de fondo no muestra nada por sí solo).
		 */
		actualizar() {
			let self = this
			if (self.actualizando) {
				return
			}
			self.actualizando = true
			Promise.all([
				self.$store.dispatch('category_proposal/get_actual'),
				self.$store.dispatch('category_proposal/get_resumen'),
			])
			.then(resultados => {
				self.actualizando = false
				if (resultados[0] === 'error' || resultados[0] === 'no_disponible') {
					avisar(self, 'warning', 'No pudimos actualizar. Probá de nuevo en un rato.')
				}
			})
			.catch(err => {
				console.log(err)
				self.actualizando = false
			})
		},
		/**
		 * Le avisa a la API que el dueño abrió la solapa con la corrida lista. Una sola vez por
		 * corrida y solo si quien mira puede gestionarla. Silencioso.
		 */
		avisar_que_se_vio() {
			let run = this.run
			if (!run || run.estado !== 'lista' || !run.puede_gestionar) {
				return
			}
			if (this.visto_enviado_para === run.id) {
				return
			}
			this.visto_enviado_para = run.id
			this.$store.dispatch('category_proposal/marcar_visto', run.id)
			.then(() => this.$store.dispatch('category_proposal/get_resumen'))
		},
		/**
		 * ¿Tiene sentido refrescar sola la pantalla? Solo mientras la corrida se prepara o se aplica.
		 *
		 * @returns {Boolean}
		 */
		refresco_hace_falta() {
			return this.vista === 'preparando' || this.vista === 'aplicando'
		},
		/**
		 * Arma o desarma el refresco automático: solo mientras la corrida se prepara o se aplica, y
		 * solo si la pestaña del navegador está a la vista.
		 *
		 * 🔴 Cierra el hueco de B-07, en dos puntos:
		 *  - Un componente destruido no arma nada: `beforeDestroy` ya limpió y nadie volvería a hacerlo.
		 *    (`vista` es un computed que Vue deja congelado al destruir el componente, así que no
		 *    sirve para darse cuenta: se mira `_isDestroyed`.)
		 *  - Cada vuelta del intervalo vuelve a mirar si el componente sigue vivo y si el refresco
		 *    sigue haciendo falta; si no, se apaga solo en vez de pedir `actual` para siempre.
		 *
		 * Este refresco hoy casi no se ve: con la API nueva el dueño no recibe la corrida mientras se
		 * prepara (`actual` contesta `run: null`) ni mientras se aplica (es transitorio). Se deja,
		 * seguro, por si la API vuelve a mostrar esos estados.
		 */
		programar_refresco() {
			if (this._isDestroyed) {
				return
			}
			if (!this.refresco_hace_falta()) {
				clearInterval(this.timer_refresco)
				this.timer_refresco = null
				return
			}
			if (this.timer_refresco) {
				return
			}
			this.timer_refresco = setInterval(() => {
				if (this._isDestroyed || !this.refresco_hace_falta()) {
					clearInterval(this.timer_refresco)
					this.timer_refresco = null
					return
				}
				if (typeof document !== 'undefined' && document.hidden) {
					return
				}
				this.$store.dispatch('category_proposal/get_actual')
			}, REFRESCO_MS)
		},
		/**
		 * Vuelve a pedir lo que cambia con una elección o un cambio de sistema: la corrida vigente, el
		 * número rojo y las categorías de la sesión. Las dos primeras acciones resuelven siempre.
		 *
		 * Las categorías de la sesión se piden de fondo y no se esperan (ver
		 * `refrescar_categorias_de_la_sesion`): el cargando global no tiene por qué seguir prendido por
		 * ellas. Se piden también después de un pedido que falló, porque si falló por tiempo de espera o
		 * por un error del servidor puede haberse aplicado igual.
		 *
		 * @returns {Promise}
		 */
		recargar_todo() {
			this.refrescar_categorias_de_la_sesion()
			return Promise.all([
				this.$store.dispatch('category_proposal/get_actual'),
				this.$store.dispatch('category_proposal/get_resumen'),
			])
		},
		/**
		 * Vuelve a pedir las categorías y subcategorías de la sesión (los stores `category` y
		 * `sub_category`).
		 *
		 * 🔴 B-08: elegir, volver atrás y aprobar crean o quitan categorías y subcategorías REALES, pero
		 * esos stores se cargan una sola vez y no se enteran: los filtros del Listado y los selects de la
		 * ficha de un artículo seguían mostrando lo de antes (faltaban las nuevas y sobraban las que
		 * fueron a la papelera). Es el mismo pedido que hace `update_articles_after_import` después de
		 * importar artículos.
		 *
		 * Es silencioso y de fondo: no espera la respuesta, no muestra ningún aviso y, si algo falla, no
		 * rompe la pantalla (las acciones del store atrapan sus errores; el `catch` es por si un store no
		 * tuviera la acción).
		 */
		refrescar_categorias_de_la_sesion() {
			let self = this
			ACCIONES_QUE_RECARGAN_CATEGORIAS.forEach(function (accion) {
				Promise.resolve(self.$store.dispatch(accion)).catch(function (err) {
					console.log(err)
				})
			})
		},
		/**
		 * Se tocó "Elegir este" en una tarjeta: abre la confirmación con los números. Si ya hay una
		 * elección en curso (doble clic), no hace nada.
		 *
		 * @param {Object} propuesta La tarjeta elegida.
		 */
		pedir_eleccion(propuesta) {
			if (this.trabajando || !propuesta) {
				return
			}
			this.propuesta_a_elegir = propuesta
			this.$bvModal.show('categorias-elegir')
		},
		/**
		 * Se confirmó "Elegir este": la API crea (o reutiliza) las categorías, asigna los artículos
		 * seguros y deja lo dudoso en "A revisar", todo en un pedido. Con el cargando global, que no se
		 * apaga hasta que la pantalla terminó de mostrar lo nuevo (si no, quedaría un instante con las
		 * tarjetas y los botones de elegir habilitados sobre una corrida ya elegida).
		 *
		 * Si falla, el motivo (403, 404, 409, 422 con su `message`) ya lo mostró el interceptor: acá se
		 * apaga el cargando y se vuelve a pedir `actual` para dibujar lo real.
		 *
		 * @param {Object} decision `{propuesta_id, eliminar_categorias_vacias}` del modal.
		 */
		elegir(decision) {
			let self = this
			if (self.trabajando || !self.run || !decision) {
				return
			}
			let nombre = self.propuesta_a_elegir ? self.propuesta_a_elegir.nombre : ''
			self.elegiendo = true
			self.$store.commit('auth/setMessage', 'Aplicando el sistema de categorías')
			self.$store.commit('auth/setLoading', true)

			self.$store.dispatch('category_proposal/elegir', {
				run_id: self.run.id,
				propuesta_id: decision.propuesta_id,
				eliminar_categorias_vacias: decision.eliminar_categorias_vacias,
			})
			.then(respuesta => {
				if (respuesta.ya_estaba) {
					avisar(self, 'success', 'Ese sistema ya estaba elegido.')
				} else {
					let asignados = respuesta.resultado ? respuesta.resultado.articulos_asignados : 0
					// 🔴 `nombre` lo escribió la IA: el toast lo interpreta como HTML, así que el mensaje
					// pasa por `avisar()`, que lo escapa entero (B-01; ver avisos.js).
					avisar(
						self,
						'success',
						'Listo: elegiste «' + nombre + '».' + (asignados > 0 ? ' Se ubicaron ' + cantidad_de(asignados, 'artículo', 'artículos') + ' en su categoría.' : ''),
						{ duration: 6000 }
					)
				}
				return self.recargar_todo()
			})
			.then(() => {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.elegiendo = false
				self.propuesta_a_elegir = null
			})
			.catch(err => {
				console.log(err)
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.elegiendo = false
				if (!es_cancelacion(err)) {
					self.recargar_todo()
				}
			})
		},
		/**
		 * Abre una caja de confirmación de a una por vez: mientras hay una abierta, un segundo clic (el
		 * doble clic de siempre) no abre otra. Resuelve true solo si la persona confirmó; cerrar con
		 * Escape o tocando afuera cuenta como no.
		 *
		 * @param {String} texto
		 * @param {Object} opciones Las de $bvModal.msgBoxConfirm.
		 * @returns {Promise<Boolean>}
		 */
		confirmar(texto, opciones) {
			let self = this
			if (self.confirmacion_abierta) {
				return Promise.resolve(false)
			}
			self.confirmacion_abierta = true
			return self.$bvModal.msgBoxConfirm(texto, opciones)
			.then(confirmado => {
				self.confirmacion_abierta = false
				return confirmado === true
			})
			.catch(err => {
				console.log(err)
				self.confirmacion_abierta = false
				return false
			})
		},
		/**
		 * "Cambiar de sistema": confirma y le pide a la API que vuelva la corrida a `lista`. Los
		 * artículos vuelven a la categoría que tenían, las categorías que se crearon se quitan y se puede
		 * elegir otro sistema. La API solo lo permite mientras nadie haya revisado ni editado nada a
		 * mano; si ya no se puede (409), el interceptor global muestra el motivo y acá se vuelve a pedir
		 * `actual` para dibujar lo real.
		 */
		cambiar_de_sistema() {
			let self = this
			if (self.trabajando || !self.run) {
				return
			}
			let id_de_la_corrida = self.run.id
			self.confirmar('¿Cambiar de sistema? Los artículos vuelven a la categoría que tenían, las categorías que se crearon al elegir se quitan y vas a poder elegir otro sistema.', {
				title: 'Cambiar de sistema',
				okTitle: 'Cambiar',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				// Se vuelve a mirar después de la caja (doble clic, u otra acción que haya salido mientras
				// estaba abierta).
				if (!confirmado || self.trabajando) {
					return
				}
				self.volviendo = true
				self.$store.commit('auth/setMessage', 'Volviendo al estado anterior')
				self.$store.commit('auth/setLoading', true)

				return self.$store.dispatch('category_proposal/volver_atras', id_de_la_corrida)
				.then(() => {
					avisar(self, 'success', 'Listo: volviste atrás. Ya podés elegir otro sistema.')
					return self.recargar_todo()
				})
				.then(() => {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.volviendo = false
				})
				.catch(err => {
					console.log(err)
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.volviendo = false
					if (!es_cancelacion(err)) {
						self.recargar_todo()
					}
				})
			})
		},
		/**
		 * La revisión aprobó o rechazó algo: se piden los números frescos (número rojo y, si todavía se
		 * podía cambiar de sistema, la corrida: la API deja de permitirlo con la primera revisión). Un
		 * rato después de la última acción, para pedirlo una sola vez al final de la racha.
		 *
		 * Si lo que se hizo fue aprobar, también se anota que hay que volver a pedir las categorías de la
		 * sesión: aprobar crea la categoría o subcategoría sugerida si todavía no existía. Rechazar no
		 * crea nada, así que no lo pide. Con el mismo retraso, de a muchos o de a uno, se pide UNA sola
		 * vez al final.
		 *
		 * @param {Object} [detalle] `{accion}` de lo que se hizo (aprobar | rechazar), como lo manda la revisión.
		 */
		al_revisar(detalle) {
			if (detalle && detalle.accion === 'aprobar') {
				this.categorias_por_refrescar = true
			}
			clearTimeout(this.timer_sincronizacion)
			this.timer_sincronizacion = setTimeout(() => {
				this.timer_sincronizacion = null
				this.sincronizar()
			}, ESPERA_SINCRONIZACION_MS)
		},
		/**
		 * Pide el número rojo y, solo si el cartel todavía ofrece "Cambiar de sistema", la corrida (que
		 * es lo único que puede cambiar ahí). Después de la primera revisión `puede_cambiar` es false y
		 * deja de pedirse: la corrida entera trae todos los árboles y no hace falta repetirla. Si se
		 * aprobó algo, también vuelve a pedir las categorías de la sesión (B-08).
		 */
		sincronizar() {
			this.$store.dispatch('category_proposal/get_resumen')
			if (this.run && this.run.puede_cambiar) {
				this.$store.dispatch('category_proposal/get_actual')
			}
			if (this.categorias_por_refrescar) {
				this.categorias_por_refrescar = false
				this.refrescar_categorias_de_la_sesion()
			}
		},
		/**
		 * True si un sistema no se puede elegir: es nuevo y la API dice que los nuevos están
		 * bloqueados (`bloqueo`). "Mantener las mías" nunca se bloquea. Esto solo lee lo que dice la
		 * API.
		 *
		 * @param {Object} propuesta
		 * @returns {Boolean}
		 */
		esta_bloqueada(propuesta) {
			return !!this.actual && this.actual.bloqueo.nuevo_modelo_bloqueado && propuesta.tipo === 'nueva'
		},
	},
}
</script>
<style lang="sass">
// Sin scope a proposito: las etiquetas (.cat-etiqueta) las usan tambien los hijos y el cuerpo de un
// b-modal cuelga de <body>. Todo color va por token con el literal de :root como respaldo.
.cat-sistemas
	text-align: left

.cat-sistemas__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 40px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

.cat-sistemas__intro
	margin: 0 0 6px
	font-size: 0.875rem
	line-height: 1.45
	color: var(--color-text-primary, #212529)

.cat-sistemas__nota
	display: flex
	align-items: flex-start
	gap: 8px
	margin: 0 0 16px
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

	i
		flex-shrink: 0
		line-height: 1.4

// La grilla de tarjetas cambia de columnas en los tres anchos de la guia de estilo: una columna en
// telefono, dos en tablet (768 a 1199 px) y tres en escritorio (desde 1200 px). `minmax(0, 1fr)` y
// no `1fr` a secas: sin el cero, una tarjeta con un nombre largo ensancha su columna mas alla de la
// pantalla. Las tarjetas de una fila quedan a la misma altura (stretch) y sus botones alineados.
.cat-sistemas__grilla
	display: grid
	gap: 16px
	grid-template-columns: minmax(0, 1fr)

@media (min-width: 768px)
	.cat-sistemas__grilla
		grid-template-columns: repeat(2, minmax(0, 1fr))

@media (min-width: 1200px)
	.cat-sistemas__grilla
		grid-template-columns: repeat(3, minmax(0, 1fr))

// --- Etiquetas (clave del sistema, confianza, estado de un articulo) ---------------------------
// Compartidas por todos los componentes de esta carpeta. Pildora chica; el color sale de los pares
// de tokens que ya tienen contraparte oscura.
.cat-etiqueta
	display: inline-flex
	align-items: center
	max-width: 100%
	padding: 2px 8px
	border-radius: 999px
	font-size: 0.72rem
	font-weight: 600
	line-height: 1.35
	white-space: normal

.cat-etiqueta--neutro
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	box-shadow: inset 0 0 0 1px var(--color-border-secondary, #e9ecef)

// Ambar: los dos tokens existen solo en html.dark-mode; en claro manda el literal del fallback.
.cat-etiqueta--aviso
	background: var(--bg-warning-soft, rgba(255, 193, 7, 0.16))
	color: var(--color-text-warning-strong, #856404)

.cat-etiqueta--mal
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

.cat-etiqueta--ok
	background: var(--caja-abierta-fondo, #f2f7f4)
	color: var(--caja-abierta-texto, #1e6047)
</style>
