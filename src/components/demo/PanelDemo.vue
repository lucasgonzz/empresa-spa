<template>
	<div class="panel-demo" :class="{ 'panel-demo--colapsado': colapsado }">

		<!--
			Tirador ("alita") a media altura sobre el borde del panel. Es la unica forma de que
			el lead llegue a la parte de la pantalla que el panel tapa, asi que vive afuera del
			panel y sigue visible cuando esta colapsado.
		-->
		<button
		type="button"
		class="panel-demo__tirador"
		:class="{ 'panel-demo__tirador--llamando': llamando_la_atencion }"
		:aria-label="colapsado ? 'Abrir los tutoriales' : 'Cerrar los tutoriales'"
		@click="alternar_colapso">
			<span class="panel-demo__tirador-icono">{{ colapsado ? '‹' : '›' }}</span>
		</button>

		<aside class="panel-demo__hoja">

			<header class="panel-demo__encabezado">
				<h2 class="panel-demo__titulo">Tu recorrido</h2>
				<p class="panel-demo__bajada">Mirá el video y probalo en el sistema.</p>
			</header>

			<div class="panel-demo__cuerpo">

				<!--
					Esqueleto de carga: el panel esta montado y el plan todavia no volvio.

					Se ve en dos casos:

					1. Durante el propio ingreso por el link. `DemoIngreso.vue` prende
					`demo/setEsDemo` ANTES de esperar el plan, y ese commit ya hace true al
					getter `demo/panel_visible`, asi que App.vue monta el panel enseguida. Queda
					detras del overlay del ingreso, pero montado y con el esqueleto puesto.

					2. Si en ese ingreso salta el techo de espera (TECHO_ESPERA_PLAN): el lead
					entra al sistema con el plan todavia en vuelo y ve el esqueleto de verdad. Es
					el caso que este esqueleto existe para cubrir.

					El caso "F5 con la sesion viva" ya no esta en la lista, y no por olvido: desde
					el 25/8/2026 el panel sale unicamente si se entro con el token en la URL, asi
					que despues de una recarga no se monta (ver el getter en store/demo.js).
				-->
				<div
				v-if="cargando"
				class="panel-demo__esqueleto"
				role="status"
				aria-label="Cargando tu recorrido">
					<span
					v-for="n in 4"
					:key="n"
					class="panel-demo__esqueleto-barra"></span>
				</div>

				<!--
					El plan volvio vacio: un 204 (instancia sin canal) o una caida. Antes acá no
					quedaba nada y el panel se veia roto; el lead no tiene por que deducir que
					eso era un estado previsto.
				-->
				<p v-else-if="sin_recorrido" class="panel-demo__vacio">
					Tu recorrido todavía no está listo. Mientras tanto podés recorrer el sistema
					por tu cuenta, y anotar acá abajo cualquier duda.
				</p>

				<!--
					Carrusel horizontal de secciones (una por pantalla), en vez del scroll
					vertical con todas juntas que había antes. `seccion_actual` nunca es null
					acá adentro: este bloque solo se dibuja con secciones.length > 0.
				-->
				<template v-else-if="secciones.length > 0">

					<div class="panel-demo__carrusel-nav">
						<button
						type="button"
						class="panel-demo__carrusel-flecha"
						:disabled="seccion_actual_index === 0"
						aria-label="Sección anterior"
						@click="anterior">‹</button>

						<div class="panel-demo__carrusel-info">
							<span class="panel-demo__carrusel-insignia" aria-hidden="true">
								<i :class="['bi', icono_de(seccion_actual)]"></i>
							</span>
							<h3 class="panel-demo__carrusel-titulo">{{ seccion_actual.titulo }}</h3>
						</div>

						<button
						type="button"
						class="panel-demo__carrusel-flecha"
						:disabled="seccion_actual_index === secciones.length - 1"
						aria-label="Siguiente sección"
						@click="siguiente">›</button>
					</div>

					<!-- Progreso del carrusel: qué sección es esta dentro del total. -->
					<div class="panel-demo__carrusel-progreso" role="status" aria-live="polite">
						<span class="panel-demo__carrusel-numero">{{ seccion_actual_index + 1 }} de {{ secciones.length }}</span>
						<div v-if="secciones.length > 1" class="panel-demo__carrusel-puntos">
							<span
							v-for="(seccion, indice) in secciones"
							:key="seccion.id"
							class="panel-demo__carrusel-punto"
							:class="{ 'panel-demo__carrusel-punto--activo': indice === seccion_actual_index }"
							aria-hidden="true"></span>
						</div>
					</div>

					<div class="panel-demo__carrusel-viewport">
						<div
						class="panel-demo__carrusel-riel"
						:style="{ transform: 'translateX(-' + (seccion_actual_index * 100) + '%)' }">

							<section
							v-for="seccion in secciones"
							:key="seccion.id"
							class="panel-demo__seccion">

								<div class="panel-demo__seccion-encabezado">
									<!--
										El titulo de la seccion ya se muestra arriba, en la franja
										del carrusel. Acá adentro de la tarjeta se mantiene el
										contador y la barra de progreso, sin duplicar el titulo.
									-->
									<!-- El denominador es lo que le toco a ESTE lead, nunca un total global. -->
									<span class="panel-demo__progreso">{{ vistos_de(seccion) }}/{{ nucleo_de(seccion).length }} vistos</span>
									<div class="panel-demo__medidor">
										<div
										class="panel-demo__medidor-relleno"
										:style="{ width: porcentaje_de(seccion) + '%' }"></div>
									</div>
								</div>

								<ul class="panel-demo__lista">
									<li
									v-for="clip in nucleo_de(seccion)"
									:key="clip.id"
									class="panel-demo__item"
									:class="{ 'panel-demo__item--abierto': esta_abierto(clip) }">
										<button
										type="button"
										class="panel-demo__item-boton"
										:class="{ 'panel-demo__item-boton--hecho': fue_visto(clip) }"
										:aria-expanded="esta_abierto(clip) ? 'true' : 'false'"
										@click="alternar_clip(clip)">
											<span
											class="panel-demo__item-marca"
											:class="{ 'panel-demo__item-marca--hecha': fue_visto(clip) }"
											aria-hidden="true"></span>
											<span class="panel-demo__item-titulo">{{ clip.titulo }}</span>
											<span class="panel-demo__item-flecha" aria-hidden="true"></span>
										</button>

										<tarjeta-clip
										v-if="esta_abierto(clip)"
										ref="tarjeta"
										:clip="clip"
										:grande="video_grande"
										:puede_probar="puede_probar(clip)"
										@reproducir="al_reproducir"
										@pausar="al_pausar"
										@terminado="al_terminar(clip)"
										@probar="probar"></tarjeta-clip>
									</li>
								</ul>

								<!-- Los de biblioteca van abajo y NO suman al progreso. -->
								<div v-if="biblioteca_de(seccion).length > 0" class="panel-demo__biblioteca">
									<h4 class="panel-demo__biblioteca-titulo">Recursos adicionales</h4>
									<ul class="panel-demo__lista">
										<li
										v-for="clip in biblioteca_de(seccion)"
										:key="clip.id"
										class="panel-demo__item"
										:class="{ 'panel-demo__item--abierto': esta_abierto(clip) }">
											<button
											type="button"
											class="panel-demo__item-boton panel-demo__item-boton--secundario"
											:aria-expanded="esta_abierto(clip) ? 'true' : 'false'"
											@click="alternar_clip(clip)">
												<span class="panel-demo__item-marca panel-demo__item-marca--suelta" aria-hidden="true"></span>
												<span class="panel-demo__item-titulo">{{ clip.titulo }}</span>
												<span class="panel-demo__item-flecha" aria-hidden="true"></span>
											</button>

											<tarjeta-clip
											v-if="esta_abierto(clip)"
											ref="tarjeta"
											:clip="clip"
											:grande="video_grande"
											:puede_probar="puede_probar(clip)"
											@reproducir="al_reproducir"
											@pausar="al_pausar"
											@terminado="al_terminar(clip)"
											@probar="probar"></tarjeta-clip>
										</li>
									</ul>
								</div>
							</section>
						</div>
					</div>
				</template>
			</div>

			<!--
				Copiloto pasivo (§3.13): no es un chat y no responde nada. Solo guarda lo que el
				lead escribe para que el closer lo tenga antes de la llamada.
			-->
			<footer class="panel-demo__notas">
				<!--
					El maxlength no es cosmético: el emisor descarta `datos` por encima de 2 KB
					serializados, así que sin tope el lead podía escribir un texto que después
					no se le restauraba nunca. 1500 caracteres dejan margen para el JSON.
				-->
				<label class="panel-demo__notas-texto" for="panel-demo-notas">
					Anotá acá cualquier duda que te surja: las repasamos en la llamada
				</label>
				<textarea
				id="panel-demo-notas"
				v-model="notas"
				class="panel-demo__notas-campo"
				rows="3"
				maxlength="1500"
				@input="al_escribir_nota"></textarea>
				<!--
					El contador aparece solo cerca del tope. Mostrarlo siempre seria ruido: el
					lead escribe dos renglones y no le importa. Cuando esta por chocarse con el
					limite, sin aviso, parece que el campo se rompio.
				-->
				<p v-if="cerca_del_tope" class="panel-demo__notas-restante">
					Te quedan {{ caracteres_restantes }} caracteres
				</p>
			</footer>
		</aside>

		<!-- Fondo difuminado detrás del video agrandado. Solo aparece con el video reproduciendo. -->
		<div v-if="video_grande" class="panel-demo__fondo" @click="pausar_video"></div>
	</div>
</template>
<script>
import TarjetaClip from '@/components/demo/TarjetaClip'

/**
 * Espeja el `maxlength="1500"` del template, que NO es cosmetico: el emisor descarta `datos`
 * por encima de 2 KB serializados. El literal se deja tambien en el HTML a proposito, para que
 * quien busque "maxlength" lo encuentre donde se aplica.
 */
const TOPE_NOTAS = 1500

/** A partir de aca aparece el contador de caracteres restantes. */
const AVISO_TOPE_NOTAS = 1200

/**
 * Panel lateral de tutoriales de la demo (misión 51).
 *
 * Este componente solo se monta cuando se entró a la demo con el token en la URL: `App.vue` lo
 * condiciona al getter `demo/panel_visible`, que mira únicamente el marcador que prende el
 * ingreso. Un cliente real nunca lo crea ni ejecuta, y un lead que vuelve a abrir la demo sin el
 * `?t=` entra sin panel (pedido de Lucas, 25/8/2026). No confundirlo con `demo/activa`, que sigue
 * mirando las dos fuentes y es el que gatea el plan y los eventos.
 *
 * 🔴 El panel NO marca nada como `completo`. `clip.terminado` lleva el hito del roadmap a
 * `parcial` del lado del admin; a `completo` lo lleva el evento de negocio que dispara el lead
 * haciendo la acción de verdad en el sistema. Eso no es un defecto y no hay que "arreglarlo".
 */
export default {
	components: {
		TarjetaClip,
	},
	data() {
		return {
			// El panel arranca abierto: es lo primero que el lead tiene que ver al entrar.
			colapsado: false,
			// El tirador late para invitar a volver, después de que "Probar" colapsó el panel.
			llamando_la_atencion: false,
			// Id del clip cuya tarjeta está desplegada. Uno solo a la vez.
			clip_abierto_id: null,
			// El video crece mientras reproduce y vuelve al pausar. No es fullscreen del navegador.
			video_grande: false,
			// Handle del debounce de las notas. 3 segundos, por la pieza 3.
			temporizador_nota: null,
			// Sección visible del carrusel horizontal. Un solo índice para todas las secciones.
			indice_seccion: 0,
		}
	},
	computed: {
		secciones() {
			return this.$store.state.demo.secciones
		},
		cargando() {
			return this.$store.state.demo.cargando
		},
		clips_vistos() {
			return this.$store.state.demo.clips_vistos
		},
		/**
		 * Vive en el store, no en `data()`, para que sobreviva al F5 igual que `clips_vistos`
		 * (misión 52). Si sólo sobreviviera uno de los dos, `seccion.completada` se re-emitiría
		 * en cada recarga: volvería el estado que dispara el evento y no el que lo frena.
		 */
		secciones_reportadas() {
			return this.$store.state.demo.secciones_reportadas
		},
		/**
		 * Las notas viven en el store y no en `data()` porque tienen que sobrevivir al F5
		 * (misión 52): el store las siembra con el texto del último `nota.escrita` al cargar
		 * el plan. El `set` no despacha nada — el reporte sigue yendo por el debounce.
		 */
		notas: {
			get() {
				return this.$store.state.demo.notas
			},
			set(texto) {
				this.$store.commit('demo/setNotas', texto)
			},
		},
		/**
		 * El plan ya volvió y no trajo secciones. No es lo mismo que "todavía no volvió": eso
		 * es el esqueleto.
		 *
		 * @returns {Boolean}
		 */
		sin_recorrido() {
			return this.$store.state.demo.plan_cargado && this.secciones.length === 0
		},
		/**
		 * Clampeado contra el total de secciones: defensivo por si el plan llega con menos
		 * secciones de las que había cuando se movió el carrusel (no debería pasar en la
		 * práctica, el plan no cambia en vivo, pero un índice fuera de rango rompe el render).
		 *
		 * @returns {Number}
		 */
		seccion_actual_index() {
			if (this.secciones.length === 0) {
				return 0
			}

			return Math.min(this.indice_seccion, this.secciones.length - 1)
		},
		/**
		 * @returns {Object|null}
		 */
		seccion_actual() {
			return this.secciones[this.seccion_actual_index] || null
		},
		/**
		 * @returns {Number}
		 */
		caracteres_restantes() {
			return TOPE_NOTAS - this.notas.length
		},
		/**
		 * @returns {Boolean}
		 */
		cerca_del_tope() {
			return this.notas.length >= AVISO_TOPE_NOTAS
		},
	},
	mounted() {
		// Única llamada del panel, y solo ocurre dentro de una demo. Entrando por el link el
		// ingreso ya la despachó y el store memorizó la promesa, así que acá no se paga un
		// segundo GET: se reusa el mismo. Después de un F5 este es el que la dispara.
		this.$store.dispatch('demo/cargar_plan')
	},
	beforeDestroy() {
		// Sin esto, un debounce en vuelo dispara sobre un componente que ya no existe.
		if (this.temporizador_nota) {
			clearTimeout(this.temporizador_nota)
		}
	},
	methods: {
		/**
		 * @param {Object} seccion
		 * @returns {Array} Clips de núcleo, que son los que cuentan para el progreso.
		 */
		nucleo_de(seccion) {
			return (seccion.clips || []).filter(function (clip) {
				return clip.tipo !== 'biblioteca'
			})
		},
		/**
		 * @param {Object} seccion
		 * @returns {Array} Clips de biblioteca, que van abajo y no suman al progreso.
		 */
		biblioteca_de(seccion) {
			return (seccion.clips || []).filter(function (clip) {
				return clip.tipo === 'biblioteca'
			})
		},
		/**
		 * @param {Object} clip
		 * @returns {Boolean}
		 */
		fue_visto(clip) {
			return this.clips_vistos.indexOf(clip.id) !== -1
		},
		/**
		 * @param {Object} clip
		 * @returns {Boolean}
		 */
		esta_abierto(clip) {
			return this.clip_abierto_id === clip.id
		},
		/**
		 * @param {Object} seccion
		 * @returns {Number} Clips de núcleo de esta sección que el lead ya terminó.
		 */
		vistos_de(seccion) {
			let self = this
			return this.nucleo_de(seccion).filter(function (clip) {
				return self.fue_visto(clip)
			}).length
		},
		/**
		 * Ancho del medidor de la sección. Es el mismo dato del numerito, en porcentaje.
		 *
		 * @param {Object} seccion
		 * @returns {Number}
		 */
		porcentaje_de(seccion) {
			const total = this.nucleo_de(seccion).length

			if (total === 0) {
				return 0
			}

			return Math.round((this.vistos_de(seccion) / total) * 100)
		},
		/**
		 * Ícono de la franja del carrusel. Por título y no por id: el catálogo no trae un
		 * campo `icono` (agregarlo es cambio de `empresa-api`, fuera de esta misión), pero los
		 * siete títulos de sección son fijos y conocidos.
		 *
		 * @param {Object} seccion
		 * @returns {String} Clase de Bootstrap Icons, ya instalado en el proyecto.
		 */
		icono_de(seccion) {
			if (!seccion || !seccion.titulo) {
				return 'bi-circle'
			}

			const titulo = seccion.titulo.toLowerCase()

			// Cortado antes de la tilde a propósito, como 'tesorer': `toLowerCase()` no saca
			// los acentos, y así matchea "Introducción" e "Introduccion" por igual.
			if (titulo.indexOf('introducci') !== -1) {
				return 'bi-compass'
			}
			if (titulo.indexOf('listado') !== -1) {
				return 'bi-boxes'
			}
			if (titulo.indexOf('vender') !== -1) {
				return 'bi-cart-check'
			}
			if (titulo.indexOf('ventas') !== -1) {
				return 'bi-receipt'
			}
			if (titulo.indexOf('compras') !== -1) {
				return 'bi-truck'
			}
			if (titulo.indexOf('tesorer') !== -1 || titulo.indexOf('reportes') !== -1) {
				return 'bi-graph-up-arrow'
			}
			if (titulo.indexOf('ecommerce') !== -1) {
				return 'bi-shop'
			}

			return 'bi-circle'
		},
		/**
		 * Mueve el carrusel a una sección puntual. Cierra cualquier clip abierto: cambiar de
		 * sección con un video reproduciendo lo dejaría reproduciendo detrás del `translateX`,
		 * fuera de pantalla.
		 *
		 * @param {Number} indice
		 * @returns {void}
		 */
		cambiar_seccion(indice) {
			this.pausar_video()
			this.clip_abierto_id = null
			this.video_grande = false
			this.indice_seccion = indice
		},
		anterior() {
			if (this.seccion_actual_index === 0) {
				return
			}

			this.cambiar_seccion(this.seccion_actual_index - 1)
		},
		siguiente() {
			if (this.seccion_actual_index === this.secciones.length - 1) {
				return
			}

			this.cambiar_seccion(this.seccion_actual_index + 1)
		},
		/**
		 * "Probar" se desbloquea cuando el video llegó al final —adelantar vale— o cuando el
		 * clip no tiene video cargado.
		 *
		 * @param {Object} clip
		 * @returns {Boolean}
		 */
		puede_probar(clip) {
			return !clip.url || this.fue_visto(clip)
		},
		/**
		 * Abre o cierra la tarjeta de un clip. Solo el que se abre reporta `clip.abierto`.
		 *
		 * @param {Object} clip
		 * @returns {void}
		 */
		alternar_clip(clip) {
			if (this.clip_abierto_id === clip.id) {
				this.clip_abierto_id = null
				this.video_grande = false
				return
			}

			this.clip_abierto_id = clip.id
			this.video_grande = false

			this.$store.dispatch('demo/reportar', { nombre: 'clip.abierto', clip_id: clip.id })
		},
		al_reproducir() {
			this.video_grande = true
		},
		al_pausar() {
			this.video_grande = false
		},
		/**
		 * Pausa el video desde el fondo difuminado, que es la forma natural de "salir".
		 *
		 * La tarjeta abierta es una sola, pero el `ref` está adentro de un `v-for`, así que Vue
		 * lo entrega como arreglo. Se contemplan las dos formas por las dudas.
		 *
		 * @returns {void}
		 */
		pausar_video() {
			const tarjetas = this.$refs.tarjeta

			if (!tarjetas) {
				return
			}

			const tarjeta = Array.isArray(tarjetas) ? tarjetas[0] : tarjetas

			if (tarjeta && typeof tarjeta.pausar === 'function') {
				tarjeta.pausar()
			}
		},
		/**
		 * El video llegó al final: se marca el clip y se desbloquea "Probar".
		 *
		 * @param {Object} clip
		 * @returns {void}
		 */
		al_terminar(clip) {
			this.video_grande = false

			// Se marca ANTES de reportar: el botón se desbloquea aunque el reporte falle.
			this.$store.commit('demo/agregarClipVisto', clip.id)

			this.$store.dispatch('demo/reportar', { nombre: 'clip.terminado', clip_id: clip.id })

			this.revisar_seccion_completada(clip)
		},
		/**
		 * Reporta `seccion.completada` la primera vez que todos los clips de núcleo de la
		 * sección quedaron vistos.
		 *
		 * @param {Object} clip Clip que se acaba de terminar, para ubicar su sección.
		 * @returns {void}
		 */
		revisar_seccion_completada(clip) {
			let self = this

			const seccion = this.secciones.find(function (una_seccion) {
				return (una_seccion.clips || []).some(function (un_clip) {
					return un_clip.id === clip.id
				})
			})

			if (!seccion || this.secciones_reportadas.indexOf(seccion.id) !== -1) {
				return
			}

			const nucleo = this.nucleo_de(seccion)

			if (nucleo.length === 0) {
				return
			}

			const todos_vistos = nucleo.every(function (un_clip) {
				return self.fue_visto(un_clip)
			})

			if (!todos_vistos) {
				return
			}

			this.$store.commit('demo/agregarSeccionReportada', seccion.id)

			this.$store.dispatch('demo/reportar', {
				nombre: 'seccion.completada',
				datos: { seccion_id: seccion.id },
			})
		},
		/**
		 * "Probar": colapsa el panel y le deja el sistema libre al lead. No arranca ningún
		 * recorrido guiado — el motor de tour es otra misión.
		 *
		 * @returns {void}
		 */
		probar() {
			this.pausar_video()
			this.colapsado = true
			this.llamando_la_atencion = true
		},
		alternar_colapso() {
			this.colapsado = !this.colapsado

			if (!this.colapsado) {
				this.llamando_la_atencion = false
				return
			}

			this.pausar_video()
		},
		/**
		 * Debounce de 3 segundos sobre las notas: dos teclas seguidas son un solo evento.
		 *
		 * @returns {void}
		 */
		al_escribir_nota() {
			let self = this

			if (this.temporizador_nota) {
				clearTimeout(this.temporizador_nota)
			}

			this.temporizador_nota = setTimeout(function () {
				self.temporizador_nota = null
				self.$store.dispatch('demo/reportar', {
					nombre: 'nota.escrita',
					datos: { texto: self.notas },
				})
			}, 3000)
		},
	},
}
</script>
<style lang="sass">
$panel-demo-ancho: 500px
// Paleta de marca de ComercioCity: la del logo y la de la pagina de experiencia.
$panel-demo-celeste: #0B84F8
$panel-demo-violeta: #3A31FC
$panel-demo-tinta: #111827
$panel-demo-gris: #6b7280
$panel-demo-linea: rgba(17, 24, 39, 0.07)

.panel-demo
	position: fixed
	top: 0
	right: 0
	height: 100vh
	width: $panel-demo-ancho
	max-width: 100%
	z-index: 1040
	display: flex
	transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)

.panel-demo--colapsado
	transform: translateX(100%)

.panel-demo__hoja
	position: relative
	// 🔴 La hoja NO lleva z-index, y eso NO es un olvido.
	//
	// Con `z-index: 1` la hoja abria un contexto de apilamiento propio, y adentro de un
	// contexto los z-index de los hijos se resuelven CONTRA ESE 1, no contra el panel. El
	// video agrandado (`.tarjeta-clip__marco--grande`, z-index 1060) quedaba encerrado ahi
	// y no podia subir por encima de `.panel-demo__fondo` (z-index 1050), que es hermano de
	// la hoja: medido el 17/8/2026, el video agrandado salia DEBAJO del vidrio esmerilado,
	// borroso y oscurecido, y sus controles nativos no recibian un solo click
	// (`elementFromPoint` sobre el boton de play devolvia `.panel-demo__fondo`).
	//
	// El z-index estaba puesto para que el halo del borde no le pasara por encima al
	// tirador. Eso sigue valiendo sin el: los pseudo-elementos del halo son posicionados con
	// z-index `auto` y el tirador tiene z-index 2, asi que el tirador pinta arriba igual.
	// Verificado con captura del tirador en los tres anchos.
	//
	// El `text-align` va declarado por el mismo motivo por el que no va el z-index: el panel
	// no puede depender del CSS global del ERP. `#app` trae `text-align: center` y de ahi lo
	// heredaba todo el panel; solo se notaba cuando un texto envolvia (un titulo de seccion
	// largo en tablet salia centrado en la segunda linea, contra la lista que va a la
	// izquierda). Los dos lugares donde el centrado SI se busca se vuelven a declarar abajo.
	text-align: left
	display: flex
	flex-direction: column
	width: 100%
	height: 100%
	background: #ffffff
	border-left: 1px solid $panel-demo-linea
	// 20% menos intensa que antes (pedido del 18/8: "un poco mas tranquilo el color"). Era
	// rgba(17, 24, 39, 0.06).
	box-shadow: -8px 0 24px rgba(17, 24, 39, 0.048)

// ---------------------------------------------------------------------------------------
// El halo del borde izquierdo (punto 4 de la mision del 17/8, atenuado el 18/8).
//
// Son dos capas sobre el mismo borde: `::before` es el filo nitido de 3px y `::after` el
// resplandor difuso que se derrama hacia el sistema. Las dos miden el DOBLE de alto que el
// panel y se mueven con `transform`, no con `background-position`: transform lo resuelve el
// compositor y no repinta nada, y el degradado tiene periodo 1/2 de su alto, asi que correrlo
// -50% deja la imagen identica y el ciclo no se ve.
//
// Es el unico momento animado del panel a proposito. La estetica de referencia es Apple, y
// Apple no significa mas animaciones: significa pocos momentos, bien elegidos.
// ---------------------------------------------------------------------------------------
.panel-demo__hoja::before,
.panel-demo__hoja::after
	content: ''
	position: absolute
	top: 0
	height: 200%
	pointer-events: none
	background: linear-gradient(180deg, $panel-demo-celeste, $panel-demo-violeta, $panel-demo-celeste, $panel-demo-violeta, $panel-demo-celeste)
	animation: panel-demo-halo 9s linear infinite
	will-change: transform

// Con el panel colapsado el halo esta fuera de pantalla: que siga corriendo es gastar
// bateria del lead para nada.
.panel-demo--colapsado .panel-demo__hoja::before,
.panel-demo--colapsado .panel-demo__hoja::after
	animation-play-state: paused

.panel-demo__hoja::before
	left: -1px
	width: 3px

.panel-demo__hoja::after
	left: -13px
	width: 14px
	filter: blur(9px)
	// 20% menos llamativo que antes (era 0.45). El filo nitido de `::before` no se toca: es
	// el que marca el borde, este es solo el resplandor que se derrama.
	opacity: 0.36

.panel-demo__tirador
	position: absolute
	top: 50%
	left: -36px
	// Arriba del halo del borde.
	z-index: 2
	transform: translateY(-50%)
	width: 36px
	height: 72px
	border: 1px solid $panel-demo-linea
	border-right: none
	border-radius: 10px 0 0 10px
	background: #ffffff
	color: $panel-demo-tinta
	cursor: pointer
	display: flex
	align-items: center
	justify-content: center
	box-shadow: -4px 0 12px rgba(17, 24, 39, 0.08)
	transition: color 0.2s ease

.panel-demo__tirador:hover
	color: $panel-demo-celeste

.panel-demo__tirador--llamando
	animation: panel-demo-latido 1.6s ease-in-out infinite

.panel-demo__tirador-icono
	font-size: 1.5rem
	line-height: 1

.panel-demo__encabezado
	// Declarado, no heredado: el titulo del panel va centrado a proposito, y con la hoja
	// alineada a la izquierda hay que decirlo acá o cambia sin que nadie lo haya pedido.
	text-align: center
	padding: 1.5rem 1.5rem 1.125rem
	border-bottom: 1px solid $panel-demo-linea
	// Lavado de marca muy sutil (pedido del 18/8: mas contraste, menos "colores de sistema").
	// Un solo momento de color arriba de todo, no un fondo entero — restraint, no saturacion.
	background: linear-gradient(180deg, rgba(11, 132, 248, 0.05), rgba(58, 49, 252, 0.015) 70%, transparent)

.panel-demo__titulo
	font-size: 1.25rem
	font-weight: 600
	// Tracking negativo: los titulos grandes se leen separados si se los deja en cero.
	letter-spacing: -0.02em
	line-height: 1.2
	color: $panel-demo-tinta
	margin: 0

.panel-demo__bajada
	font-size: 0.875rem
	line-height: 1.45
	color: $panel-demo-gris
	margin: 0.25rem 0 0

// El cuerpo ya no es gris de sistema plano (pedido del 18/8: mas contraste, fondo al estilo
// de la pagina de experiencia). Es un lavado de marca fijo —no animado, no es el halo del
// borde— que da caracter sin competir con la tarjeta blanca de la seccion de encima.
.panel-demo__cuerpo
	flex: 1 1 auto
	overflow-y: auto
	padding: 1rem 1.25rem 1.25rem
	background: linear-gradient(160deg, rgba(11, 132, 248, 0.05) 0%, rgba(58, 49, 252, 0.025) 45%, #f6f6f8 75%)

.panel-demo__esqueleto
	display: flex
	flex-direction: column
	gap: 0.75rem
	padding: 1rem 1.125rem
	border-radius: 14px
	background: #ffffff
	border: 1px solid $panel-demo-linea

.panel-demo__esqueleto-barra
	height: 12px
	border-radius: 999px
	background: #ececee
	animation: panel-demo-respirar 1.5s ease-in-out infinite

.panel-demo__esqueleto-barra:nth-child(1)
	width: 55%

.panel-demo__esqueleto-barra:nth-child(2)
	width: 88%

.panel-demo__esqueleto-barra:nth-child(3)
	width: 76%

.panel-demo__esqueleto-barra:nth-child(4)
	width: 62%

.panel-demo__vacio
	margin: 0
	padding: 1rem 1.125rem
	border-radius: 14px
	background: #ffffff
	border: 1px solid $panel-demo-linea
	font-size: 0.875rem
	line-height: 1.5
	color: $panel-demo-gris

// ---------------------------------------------------------------------------------------
// Carrusel horizontal de secciones (punto 1-2 de la mision del 18/8). El viewport recorta
// lo que no es la seccion activa; el riel es el que se desplaza, con `transform` (mismo
// motivo que el halo del borde: lo resuelve el compositor, no repinta el resto del panel).
// ---------------------------------------------------------------------------------------
.panel-demo__carrusel-nav
	display: flex
	align-items: center
	justify-content: space-between
	gap: 0.5rem
	margin-bottom: 0.75rem

.panel-demo__carrusel-flecha
	flex: 0 0 auto
	display: flex
	align-items: center
	justify-content: center
	width: 32px
	height: 32px
	border-radius: 50%
	border: 1px solid $panel-demo-linea
	background: #ffffff
	color: $panel-demo-tinta
	font-size: 1.125rem
	line-height: 1
	cursor: pointer
	transition: border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease

.panel-demo__carrusel-flecha:hover:not(:disabled)
	border-color: $panel-demo-celeste
	color: $panel-demo-celeste

.panel-demo__carrusel-flecha:focus-visible
	outline: 2px solid $panel-demo-celeste
	outline-offset: 2px

.panel-demo__carrusel-flecha:disabled
	opacity: 0.35
	cursor: default

// El titulo va centrado entre las dos flechas, con el icono de la seccion arriba: es el
// pedido explicito de Lucas (titulo centrado, flechas a los dos margenes).
.panel-demo__carrusel-info
	flex: 1 1 auto
	min-width: 0
	display: flex
	flex-direction: column
	align-items: center
	gap: 0.25rem
	text-align: center

.panel-demo__carrusel-insignia
	display: flex
	align-items: center
	justify-content: center
	width: 30px
	height: 30px
	border-radius: 50%
	background: linear-gradient(135deg, rgba(11, 132, 248, 0.12), rgba(58, 49, 252, 0.12))
	color: $panel-demo-celeste
	font-size: 0.9375rem

.panel-demo__carrusel-titulo
	font-size: 0.9375rem
	font-weight: 600
	letter-spacing: -0.01em
	color: $panel-demo-tinta
	margin: 0
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis
	max-width: 100%

// Progreso del carrusel: el numero "N de M" y, si hay mas de una seccion, los puntos. Dos
// formas de leer lo mismo, como pidio Lucas — el numero es preciso, los puntos son de un
// vistazo.
.panel-demo__carrusel-progreso
	display: flex
	flex-direction: column
	align-items: center
	gap: 0.375rem
	margin-bottom: 0.875rem

.panel-demo__carrusel-numero
	font-size: 0.6875rem
	font-weight: 600
	letter-spacing: 0.04em
	text-transform: uppercase
	color: $panel-demo-gris
	font-variant-numeric: tabular-nums

.panel-demo__carrusel-puntos
	display: flex
	align-items: center
	gap: 0.375rem

.panel-demo__carrusel-punto
	width: 6px
	height: 6px
	border-radius: 50%
	background: #d4d4d8
	transition: background 0.2s ease, transform 0.2s ease

.panel-demo__carrusel-punto--activo
	background: linear-gradient(135deg, $panel-demo-celeste, $panel-demo-violeta)
	transform: scale(1.35)

.panel-demo__carrusel-viewport
	overflow: hidden

.panel-demo__carrusel-riel
	display: flex
	transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)

@media (prefers-reduced-motion: reduce)
	.panel-demo__carrusel-riel
		transition: none

.panel-demo__seccion
	flex: 0 0 100%
	min-width: 0
	padding: 1rem 0.375rem 0.5rem
	border-radius: 14px
	background: #ffffff
	// Sin box-shadow a proposito (punto 3 de la mision del 18/8): antes esta tarjeta era la
	// que le daba sombra a los items de adentro. El borde solo ya alcanza para separarla del
	// fondo del cuerpo, que ahora tiene mas caracter (ver mas abajo).
	border: 1px solid $panel-demo-linea

.panel-demo__seccion-encabezado
	padding: 0 0.75rem
	margin-bottom: 0.75rem

.panel-demo__progreso
	display: block
	font-size: 0.75rem
	color: $panel-demo-gris
	font-variant-numeric: tabular-nums

.panel-demo__medidor
	height: 3px
	margin-top: 0.5rem
	border-radius: 999px
	background: #ececee
	overflow: hidden

.panel-demo__medidor-relleno
	height: 100%
	border-radius: 999px
	background: linear-gradient(90deg, $panel-demo-celeste, $panel-demo-violeta)
	transition: width 0.45s cubic-bezier(0.32, 0.72, 0, 1)

.panel-demo__lista
	list-style: none
	margin: 0
	padding: 0

// Cada item es su propia tarjeta (punto 3 de la mision del 18/8), no una fila dentro de una
// lista con separador de 1px: es lo que pidio Lucas como "mas separados entre ellos
// verticalmente". Sin box-shadow — el borde alcanza, y el estado abierto se lee por el color
// del borde y un lavado de fondo, no por una sombra.
.panel-demo__item
	margin: 0 0 0.625rem
	border-radius: 12px
	border: 1px solid $panel-demo-linea
	background: #ffffff
	overflow: hidden
	transition: border-color 0.2s ease, background 0.2s ease

.panel-demo__item:last-child
	margin-bottom: 0

.panel-demo__item--abierto
	border-color: rgba(11, 132, 248, 0.35)
	background: linear-gradient(180deg, rgba(11, 132, 248, 0.05), rgba(58, 49, 252, 0.02))

.panel-demo__item-boton
	display: flex
	align-items: center
	gap: 0.625rem
	width: 100%
	text-align: left
	background: transparent
	border: none
	padding: 0.75rem 0.875rem
	font-size: 0.9375rem
	line-height: 1.35
	color: $panel-demo-tinta
	cursor: pointer
	transition: background 0.15s ease

.panel-demo__item-boton:hover
	background: rgba(17, 24, 39, 0.03)

.panel-demo__item-boton:focus-visible
	outline: 2px solid $panel-demo-celeste
	outline-offset: -2px

.panel-demo__item-boton--secundario
	font-size: 0.875rem
	color: $panel-demo-gris

.panel-demo__item-boton--hecho .panel-demo__item-titulo
	color: $panel-demo-gris

.panel-demo__item-titulo
	flex: 1 1 auto

// Circulo de estado. Vacio mientras el clip no se termino, y con el tilde de marca cuando si.
.panel-demo__item-marca
	position: relative
	flex: 0 0 auto
	width: 18px
	height: 18px
	border-radius: 50%
	border: 1.5px solid #d4d4d8
	transition: border-color 0.2s ease

.panel-demo__item-marca--hecha
	border-color: transparent
	background: linear-gradient(135deg, $panel-demo-celeste, $panel-demo-violeta)

.panel-demo__item-marca--hecha::after
	content: ''
	position: absolute
	top: 3px
	left: 6px
	width: 4px
	height: 8px
	border: solid #ffffff
	border-width: 0 1.5px 1.5px 0
	transform: rotate(45deg)

// Los de biblioteca llevan un punto, no un circulo de estado: NO suman al progreso, y un
// circulo vacio al lado de otros que se tildan promete un tilde que nunca va a llegar. El
// punto ocupa el mismo lugar, asi que los titulos siguen alineados con los de arriba.
.panel-demo__item-marca--suelta
	border-color: transparent

.panel-demo__item-marca--suelta::after
	content: ''
	position: absolute
	top: 50%
	left: 50%
	width: 4px
	height: 4px
	margin: -2px 0 0 -2px
	border-radius: 50%
	background: #c4c4c8

.panel-demo__item-flecha
	flex: 0 0 auto
	width: 7px
	height: 7px
	margin-right: 2px
	border: solid #c4c4c8
	border-width: 0 1.5px 1.5px 0
	transform: rotate(-45deg)
	transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)

.panel-demo__item--abierto .panel-demo__item-flecha
	transform: rotate(45deg)
	border-color: $panel-demo-celeste

.panel-demo__biblioteca
	margin-top: 0.5rem
	padding: 0.75rem 0 0
	border-top: 1px solid $panel-demo-linea

.panel-demo__biblioteca-titulo
	// Mismo caso que el encabezado: el rotulo va centrado a proposito y se declara.
	text-align: center
	font-size: 0.6875rem
	font-weight: 600
	text-transform: uppercase
	// Tracking positivo: el texto chico y en mayusculas necesita aire para leerse.
	letter-spacing: 0.06em
	color: #9ca3af
	margin: 0 0 0.25rem
	padding: 0 0.75rem

.panel-demo__notas
	padding: 1rem 1.25rem 1.125rem
	border-top: 1px solid $panel-demo-linea
	background: #ffffff

.panel-demo__notas-texto
	display: block
	font-size: 0.8125rem
	line-height: 1.4
	color: $panel-demo-gris
	margin-bottom: 0.5rem

.panel-demo__notas-campo
	width: 100%
	border: 1px solid #e4e4e7
	border-radius: 12px
	padding: 0.625rem 0.75rem
	font-size: 0.875rem
	line-height: 1.45
	color: $panel-demo-tinta
	background: #fafafa
	resize: vertical
	transition: border-color 0.15s ease, background 0.15s ease

.panel-demo__notas-campo:focus
	outline: none
	background: #ffffff
	border-color: $panel-demo-celeste

.panel-demo__notas-restante
	margin: 0.375rem 0 0
	font-size: 0.75rem
	color: $panel-demo-gris
	text-align: right
	font-variant-numeric: tabular-nums

.panel-demo__fondo
	position: fixed
	top: 0
	left: 0
	width: 100vw
	height: 100vh
	background: rgba(17, 24, 39, 0.45)
	backdrop-filter: blur(6px)
	z-index: 1050

// Los tres anchos de la regla dura.
//
// Tablet (768-1024): el panel de 500px fijos se come mas de la mitad de la pantalla, asi que
// pasa a 55% con tope de 500px. El sistema de atras sigue usable.
@media (max-width: 1024px)
	.panel-demo
		width: 55%
		min-width: 380px
		// 🔴 El tope tiene que estar. Sin el, cruzar de 1025 a 1024px AGRANDABA el panel de
		// 500 a 563px (55% de 1024): achicar la ventana ensanchaba el panel, que es justo al
		// reves de lo que la regla busca. Medido el 17/8/2026 redimensionando en vivo.
		max-width: $panel-demo-ancho

// Telefono (< 768): 500px sobre 360px no es un panel, es una pared. Pasa a hoja completa
// sobre el sistema, y el tirador se mete adentro del borde para no quedar fuera de pantalla.
//
// El ancho del video agrandado en telefono vive en TarjetaClip.vue, que es donde quedo el marco.
@media (max-width: 767px)
	.panel-demo
		width: 100%
		min-width: 0
		// Suelta el tope de 500px que puso la media query de tablet: esta también la cumple
		// (767 < 1024) y sin esto, entre 500 y 767px la hoja quedaba en 500px en vez de
		// completa. Medido: a 767px el panel salía de 500px y no de 767.
		max-width: 100%

	// 🔴 El tirador tiene que cambiar de lado segun el panel este abierto o cerrado, y en
	// telefono NO son la misma regla.
	//
	// Con la hoja ocupando el 100% del ancho, `right: 100%` deja el tirador a la IZQUIERDA
	// del panel, o sea fuera de la pantalla: medido el 17/8/2026 a 360px y a 390px, quedaban
	// 1 de sus 36px visibles (2,8%). El lead que entraba por telefono no tenia forma de
	// cerrar el panel, y el panel le tapaba el sistema entero.
	//
	// Abierto, entonces, el tirador se mete ADENTRO del borde de la hoja (`left: 0`), que es
	// lo que el comentario de esta media query decia y el CSS no hacia. Cerrado, la hoja se
	// fue 100% a la derecha y ahi `right: 100%` si lo deja sobre la pantalla.
	.panel-demo__tirador
		left: 0
		right: auto
		margin-right: 0
		// Espeja el borde y la sombra: pegado por su izquierda, el filo va del otro lado.
		border-left: none
		border-right: 1px solid $panel-demo-linea
		border-radius: 0 10px 10px 0
		box-shadow: 4px 0 12px rgba(17, 24, 39, 0.08)

	.panel-demo--colapsado .panel-demo__tirador
		left: auto
		right: 100%
		border-right: none
		border-left: 1px solid $panel-demo-linea
		border-radius: 10px 0 0 10px
		box-shadow: -4px 0 12px rgba(17, 24, 39, 0.08)

	.panel-demo__cuerpo
		padding: 0.875rem 0.875rem 1rem

	.panel-demo__encabezado
		padding: 1.125rem 1.125rem 0.875rem

	.panel-demo__notas
		padding: 0.875rem 1.125rem 1rem

@keyframes panel-demo-latido
	0%, 100%
		transform: translateY(-50%) scale(1)
	50%
		transform: translateY(-50%) scale(1.12)

@keyframes panel-demo-halo
	from
		transform: translateY(0)
	to
		transform: translateY(-50%)

@keyframes panel-demo-respirar
	0%, 100%
		opacity: 1
	50%
		opacity: 0.55

// 🔴 Con `prefers-reduced-motion: reduce` todo esto queda en un ESTADO ESTATICO, no en una
// version suave del mismo movimiento. El halo del borde sigue estando —es identidad de marca,
// no decoracion— pero deja de viajar: un degradado fijo celeste -> violeta.
@media (prefers-reduced-motion: reduce)
	.panel-demo
		transition: none

	.panel-demo__hoja::before,
	.panel-demo__hoja::after
		height: 100%
		animation: none
		transform: none
		background: linear-gradient(180deg, $panel-demo-celeste, $panel-demo-violeta)

	.panel-demo__tirador--llamando
		animation: none
		// El equivalente estatico del latido: el tirador queda pintado con el color de marca
		// en vez de moverse. Sigue diciendo "volve por aca".
		border-color: $panel-demo-celeste
		color: $panel-demo-celeste
		box-shadow: -4px 0 14px rgba(11, 132, 248, 0.28)

	.panel-demo__esqueleto-barra
		animation: none

	.panel-demo__medidor-relleno,
	.panel-demo__item-boton,
	.panel-demo__item-flecha,
	.panel-demo__item-marca,
	.panel-demo__notas-campo,
	.panel-demo__tirador
		transition: none
</style>
