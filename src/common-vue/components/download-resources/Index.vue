<template>
<!--
	El elemento raiz publica el estado de la descarga del arranque. Es el unico lugar donde ese
	estado esta SIEMPRE disponible: la tarjeta de progreso se esconde sola a los 3 segundos de
	terminar, y el panel lateral solo existe cuando esta abierto. Este div vive mientras viva la
	nav, asi que cualquiera que necesite saber si el sistema termino de cargar --un test end to
	end, sin ir mas lejos-- lo mira aca.
-->
<div
data-testid="recursos-estado"
:data-estado="estado_descarga"
:data-descargados="descargados_count"
:data-total="models_to_download.length">

	<b-sidebar
	right
	no-header
	width="360px"
	id="download-resources"
	v-model="visibility"
	shadow>
		<template v-slot:default="{ hide }">
			<div
			class="recursos-panel"
			data-testid="recursos-panel">

				<div class="recursos-panel__header">

					<div class="recursos-panel__titulo-linea">
						<h4 class="recursos-panel__titulo">
							Recursos
						</h4>
						<button
						type="button"
						class="recursos-panel__cerrar"
						data-testid="recursos-panel-cerrar"
						@click="hide">
							<i class="icon-cancel"></i>
						</button>
					</div>

					<p
					class="recursos-panel__subtitulo"
					data-testid="recursos-panel-subtitulo">
						{{ subtitulo }}
					</p>

					<div class="recursos-panel__barra">
						<div
						class="recursos-panel__barra-relleno"
						:style="{ width: porcentaje_descargado + '%' }"></div>
					</div>

				</div>

				<div class="recursos-panel__lista">
					<div
					class="recursos-panel__fila"
					:class="clase_fila(model)"
					data-testid="recursos-panel-fila"
					:data-recurso="model.model_name"
					:data-estado="estado_fila(model)"
					v-for="model in models_to_download"
					:key="model.model_name">
						<span class="recursos-panel__estado">
							<b-spinner
							v-if="model.downloading"></b-spinner>
							<i
							v-else-if="model.downloaded"
							class="icon-check"></i>
							<span
							v-else
							class="recursos-panel__punto"></span>
						</span>
						<span class="recursos-panel__nombre">
							{{ plural(model.model_name) }}
						</span>
					</div>
				</div>

				<div class="recursos-panel__pie">
					<button
					type="button"
					class="recursos-panel__redescargar"
					@click="$store.commit('download_resources/setStartDownload')">
						Volver a descargar
					</button>
				</div>

			</div>
		</template>
	</b-sidebar>

	<recursos-progress
	:models_to_download="models_to_download"
	@abrir_panel="abrir_panel"></recursos-progress>
</div>
</template>
<script>
import call_methods from '@/mixins/call_methods'
import { mark_dynamic_dependency_ready } from '@/common-vue/helpers/dynamic_column_dependencies_status'
import { reconcile_article_dynamic_columns_if_needed } from '@/common-vue/helpers/column_preferences_helper'

/**
 * Modelos del arranque que NO entran en la llamada masiva.
 *
 * Son los que la mision 41 dejo afuera de la whitelist de POST /api/recursos-iniciales, y el
 * motivo es del backend en todos los casos:
 *
 * - column_position, pdf_column_option, pdf_column_profile: su index() recibe la Request y
 *   resuelve en funcion de ella, asi que el masivo no podria devolver el mismo payload que el
 *   endpoint individual -- que es lo unico que ese endpoint promete.
 * - table_column_preference: no tiene index(); su ruta es show/{model_name}/{preference_type}.
 *
 * Se piden con el getModels de siempre, pero todos juntos en paralelo: la razon por la que antes
 * iban encadenados era el `for` con `await` adentro, no una dependencia entre ellos.
 *
 * 🔴 Esta lista NO hay que mantenerla sincronizada a mano con la whitelist del backend. Lo que el
 * endpoint no reconoce vuelve en `no_soportados` y se pide igual, de a uno (ver pedir_masivo).
 * La lista existe para ahorrarse el viaje al pedo, no para que la cosa funcione: si alguien saca
 * un modelo de la whitelist alla, aca sigue llegando por el repliegue en vez de quedar vacio.
 */
const MODELOS_FUERA_DE_LA_LLAMADA_MASIVA = [
	'column_position',
	'pdf_column_option',
	'pdf_column_profile',
	'table_column_preference',
]

export default {
	mixins: [call_methods],
	components: {
		RecursosProgress: () => import('@/common-vue/components/download-resources/Progress'),
	},
	computed: {
		visibility: {
			get() {
				if (this.testing_dusk) {
					return false
				}
				return this.$store.state.download_resources.visibility
			},
			/**
			 * 🔴 Este setter estaba vacio y no es cosmetico que ahora escriba.
			 *
			 * b-sidebar tiene estado interno propio, asi que cerrar con la X o con Escape lo
			 * escondia en pantalla igual, pero el store se quedaba en `true` para siempre. A
			 * partir de ahi la mutacion que abre el panel ya no cambiaba nada --el valor que
			 * commiteaba era el que el store ya tenia-- y el panel no se volvia a abrir en toda
			 * la sesion: el segundo clic en la tarjeta no hacia nada.
			 */
			set(value) {
				this.$store.commit('download_resources/' + (value ? 'abrir_panel' : 'cerrar_panel'))
			}
		},
		start_download() {
			return this.$store.state.download_resources.start_download
		},
		// Cantidad de recursos que ya terminaron de descargar. La lista ya viene
		// filtrada desde setModels(), asi que alcanza con contar.
		descargados_count() {
			return this.models_to_download.filter(model => model.downloaded).length
		},
		// Indica si ya terminaron de bajar todos los recursos de la lista.
		todo_listo() {
			return this.models_to_download.length > 0 && this.descargados_count == this.models_to_download.length
		},
		// Porcentaje de avance para la barra de progreso del header.
		porcentaje_descargado() {
			if (!this.models_to_download.length) {
				return 0
			}
			return Math.round(this.descargados_count * 100 / this.models_to_download.length)
		},
		// Texto de estado que se muestra debajo del titulo "Recursos".
		subtitulo() {
			if (this.todo_listo) {
				return 'Todo listo'
			}
			return this.descargados_count + ' de ' + this.models_to_download.length + ' listos'
		},
		/**
		 * Estado de la descarga del arranque, publicado como data-estado en el elemento raiz.
		 *
		 * Los tres valores y que significan:
		 *  - 'pendiente':   la lista todavia no se armo (setModels corre a los 1000 ms de montar).
		 *  - 'descargando': hay recursos en vuelo.
		 *  - 'listo':       ya no queda ninguno esperando.
		 *
		 * ⚠️ 'listo' significa "no se espera mas a nadie", NO "llegaron todos los datos": una
		 * descarga que falla se marca igual (ver marcar_descargado). Es la misma semantica que ya
		 * tenian la barra de progreso y la tarjeta; aca solo se le pone nombre.
		 *
		 * @returns {string}
		 */
		estado_descarga() {
			if (!this.models_to_download.length) {
				return 'pendiente'
			}
			return this.todo_listo ? 'listo' : 'descargando'
		},
	},
	created() {
		setTimeout(() => {
			this.setModels()
			this.downloadModels()
		}, 1000)
	},
	watch: {
		start_download() {
			console.log('watch de start_download')
			this.setModels()
			this.downloadModels()
		}
	},
	data() {
		return {
			models_to_download: [],
		}
	},
	methods: {
		/**
		 * Abre el panel lateral con el detalle de los recursos.
		 *
		 * Lo dispara la tarjeta de progreso de arriba a la derecha, que es la unica puerta de
		 * entrada al panel desde que el arranque dejo de abrirlo solo (ver el comentario de
		 * callMethods en common-vue/mixins/app.js).
		 *
		 * @return {void}
		 */
		abrir_panel() {
			this.$store.commit('download_resources/abrir_panel')
		},
		/**
		 * Clase de la fila segun en que estado esta ese recurso.
		 *
		 * @param {object} model
		 * @returns {string}
		 */
		clase_fila(model) {
			if (model.downloading) {
				return 'recursos-panel__fila--descargando'
			}
			if (model.downloaded) {
				return 'recursos-panel__fila--listo'
			}
			return 'recursos-panel__fila--pendiente'
		},
		/**
		 * Lo mismo que clase_fila pero como dato, para publicarlo en data-estado. La clase es
		 * presentacion y puede cambiar de nombre con el diseño; esto es el estado del recurso.
		 *
		 * @param {object} model
		 * @returns {string} 'pendiente' | 'descargando' | 'listo'
		 */
		estado_fila(model) {
			if (model.downloading) {
				return 'descargando'
			}
			return model.downloaded ? 'listo' : 'pendiente'
		},
		setModels() {
			// Se vacia la lista antes de armarla porque setModels() tambien se llama cuando cambia
			// start_download (el boton de volver a descargar). Sin este reset los recursos quedaban
			// duplicados y el porcentaje de la tarjeta de progreso se calculaba sobre el doble.
			this.models_to_download = []

			call_methods.forEach(model => {

				let model_name = typeof model == 'object' ? model.model_name : model
				let if_has_extencion = typeof model == 'object' ? model.if_has_extencion : null

				if (model_name == 'article') {
					return
				}

				// No entran a la lista los recursos que esta sesion no va a descargar: los que
				// dependen de una extencion que el comercio no tiene contratada, y los que estan
				// marcados para no bajarse en celular. Antes se agregaban igual y se quedaban para
				// siempre con el icono de reloj, como si la descarga hubiera quedado colgada.
				if (if_has_extencion && !this.hasExtencion(if_has_extencion)) {
					return
				}

				// El orden importa: downloadOnMobile() accede a this.$store.state[model_name] sin
				// guarda, asi que solo se evalua cuando de verdad estamos en celular.
				if (this.is_mobile && !this.downloadOnMobile(model_name)) {
					return
				}

				this.models_to_download.push({
					downloaded: false,
					downloading: false,
					model_name: model_name,
					if_has_extencion: if_has_extencion,
				})
			})
		},
		/**
		 * Descarga los recursos del arranque.
		 *
		 * 🔴 Antes esto era un `for` con `await` adentro: las ~70 requests salian UNA DETRAS DE
		 * OTRA, cada una esperando a la anterior. Con 100 ms de ida y vuelta por request eso son
		 * ~7 segundos de espera pura antes de que el sistema quede usable, y un endpoint lento
		 * taponeaba a todos los que venian atras. Ahora sale una sola llamada
		 * (POST /api/recursos-iniciales, mision 41) mas los pocos que ese endpoint no soporta,
		 * todos juntos.
		 *
		 * Lo que NO cambio y no se puede perder:
		 * - El filtrado de la lista (extencion no contratada, celular) sigue viviendo en
		 *   setModels(), que corre siempre antes que esto. Aca no se vuelve a filtrar.
		 * - yaSeDescargaron() se aplica ANTES de armar la lista que se manda.
		 * - mark_dynamic_dependency_ready() se sigue llamando por cada modelo.
		 * - bootstrap_module_preferences se dispara DESPUES de commitear todo, no en el medio: el
		 *   bootstrap calcula las columnas dinamicas de articulo con address, price_type y
		 *   current_acount_payment_method_discount, y si corre con alguna vacia esas columnas
		 *   quedan afuera de props_to_show para toda la sesion. Con una sola llamada llegan todas
		 *   juntas, asi que el orden de la lista ya no importa -- pero el momento del bootstrap si.
		 * - reconcile_article_dynamic_columns_if_needed() al final.
		 *
		 * @returns {Promise}
		 */
		downloadModels() {
			console.log('downloadModels:')

			/** Modelos que van en la llamada masiva. */
			let para_masivo = []
			/** Modelos que hay que pedir por su endpoint individual. */
			let sueltos = []

			this.models_to_download.forEach(model => {
				if (this.yaSeDescargaron(model.model_name)) {
					// Ya estaba en el store: no se vuelve a pedir, pero la dependencia se marca
					// igual (ver dynamic_column_dependencies_status.js).
					model.downloaded = true
					mark_dynamic_dependency_ready(model.model_name)
					return
				}

				model.downloading = true

				if (MODELOS_FUERA_DE_LA_LLAMADA_MASIVA.indexOf(model.model_name) == -1) {
					para_masivo.push(model.model_name)
				} else {
					sueltos.push(model.model_name)
				}
			})

			/** Todo lo que hay en vuelo, para saber cuando esta commiteado todo. */
			let promesas = []

			if (para_masivo.length) {
				promesas.push(this.pedir_masivo(para_masivo))
			}
			if (sueltos.length) {
				promesas.push(this.pedir_sueltos(sueltos))
			}

			return Promise.all(promesas)
			.then(() => {
				// Recien aca: el bootstrap lee table_column_preference.models y calcula con las
				// tres colecciones dinamicas, y todas ya estan commiteadas.
				//
				// Se dispara siempre, tambien cuando table_column_preference ya estaba descargado
				// de antes (antes solo corria si se acababa de bajar). Es idempotente: no pisa los
				// modulos que ya tienen props_to_show fijado.
				this.$store.dispatch('table_column_preference/bootstrap_module_preferences')

				// Reconciliación: sana un props_to_show de article que haya quedado corto (por la
				// guarda del prompt 460, o por staleness de una preferencia guardada antes de que
				// exista una sucursal nueva). Ver reconcile_article_dynamic_columns_if_needed.
				reconcile_article_dynamic_columns_if_needed(this.$store)
			})
		},
		/**
		 * Pide en UNA sola llamada todos los catalogos que el endpoint de la mision 41 soporta.
		 *
		 * @param {Array} model_names
		 * @returns {Promise}
		 */
		pedir_masivo(model_names) {
			return this.$api.post('recursos-iniciales', {models: model_names})
			.then(res => {
				/** Cuerpo de la respuesta: {models, no_soportados, con_error}. */
				let respuesta = res.data ? res.data : {}
				/** Diccionario model_name -> cuerpo del index() individual de ese modelo. */
				let recibidos = respuesta.models ? respuesta.models : {}
				/** Los que hay que pedir de a uno igual. */
				let a_replegar = []

				if (respuesta.no_soportados) {
					a_replegar = a_replegar.concat(respuesta.no_soportados)
				}
				if (respuesta.con_error) {
					a_replegar = a_replegar.concat(respuesta.con_error)
				}

				model_names.forEach(model_name => {
					let cuerpo = recibidos[model_name]

					// El backend devuelve el cuerpo tal cual lo devolvia el endpoint individual,
					// o sea {models: [...]}. Si por lo que sea no vino asi, se pide de a uno en
					// vez de commitear cualquier cosa.
					if (!cuerpo || typeof cuerpo.models == 'undefined') {
						if (a_replegar.indexOf(model_name) == -1) {
							a_replegar.push(model_name)
						}
						return
					}

					this.commitear_modelos(model_name, cuerpo.models)
				})

				if (a_replegar.length) {
					console.log('recursos-iniciales: se piden de a uno ' + a_replegar.join(', '))
					return this.pedir_sueltos(a_replegar)
				}
			})
			.catch(err => {
				// 🔴 Si la llamada masiva entera se cae (red, 500, sesion vencida) NO se puede
				// dejar la sesion sin catalogos: se cae al camino viejo, cada modelo por su
				// endpoint individual, y la sesion arranca igual.
				//
				// Ojo con una diferencia que NO es menor: el camino viejo mandaba esas requests en
				// serie, o sea con contrapresion natural. Este repliegue las manda todas juntas, asi
				// que si la masiva fallo justamente porque el servidor esta saturado, la SPA le tira
				// encima ~70 requests en el mismo instante. Es el precio de no dejar la pantalla
				// vacia, pero conviene saberlo antes de tocar esto: si algun dia hay que amortiguarlo,
				// se hace de a tandas aca, no volviendo a encadenar el camino feliz.
				console.log(err)
				return this.pedir_sueltos(model_names)
			})
		},
		/**
		 * Pide cada modelo por su endpoint individual. Salen todos juntos: ya no hay motivo para
		 * encadenarlos.
		 *
		 * @param {Array} model_names
		 * @returns {Promise}
		 */
		pedir_sueltos(model_names) {
			let promesas = []

			model_names.forEach(model_name => {
				// Guarda contra un nombre que no tenga modulo Vuex. Hoy no puede pasar --los
				// nombres salen de nuestra propia lista o de lo que el backend devolvio en
				// no_soportados, que es lo que le mandamos-- pero sin esto un dispatch a una accion
				// inexistente devuelve undefined y el .then de abajo tira un TypeError SINCRONO,
				// adentro del forEach, que se lleva puesto el .then de pedir_masivo y hace que se
				// vuelvan a pedir de a uno los 69 que ya se habian commiteado.
				if (!this.$store._actions[model_name + '/getModels']) {
					console.log('recursos-iniciales: no hay store para ' + model_name + ', se saltea')
					this.marcar_descargado(model_name)
					return
				}

				promesas.push(
					this.$store.dispatch(model_name + '/getModels')
					.then(() => {
						this.marcar_descargado(model_name)
					})
					.catch(err => {
						// Se marca igual: si falla uno, su fila no puede quedarse con el spinner
						// girando para siempre y la barra de progreso trabada.
						console.log(err)
						this.marcar_descargado(model_name)
					})
				)
			})

			return Promise.all(promesas)
		},
		/**
		 * Deja los modelos que trajo la llamada masiva en el store de ese modulo.
		 *
		 * Equivale a lo que hace el getModels individual al terminar (`setModels` con
		 * `res.data.models`): ninguno de los stores de la lista transforma nada en el medio.
		 *
		 * @param {string} model_name
		 * @param {Array} models
		 * @return {void}
		 */
		commitear_modelos(model_name, models) {
			this.$store.commit(model_name + '/setModels', models)
			this.marcar_descargado(model_name)
		},
		/**
		 * Marca la fila del panel como lista y avisa que la dependencia ya esta disponible.
		 *
		 * ⚠️ "Lista" quiere decir "ya no se esta esperando", NO "los datos llegaron". El
		 * `_getModels` de __base_store se come el error HTTP y resuelve igual, asi que un catalogo
		 * que fallo llega hasta aca por el `.then` y queda con el tilde puesto. Si el que fallo es
		 * address, price_type o current_acount_payment_method_discount,
		 * article_dynamic_dependencies_ready() da true con la coleccion vacia y las columnas
		 * dinamicas de articulo quedan afuera de props_to_show para toda la sesion.
		 *
		 * Esto NO lo introdujo la mision 43 --el codigo viejo marcaba igual despues del await-- y
		 * arreglarlo de raiz es del lado de los stores, que esta fuera del alcance de esta mision.
		 * Queda dicho aca para que el proximo no lea los comentarios de arriba y crea que hay una
		 * proteccion que no existe. Hallazgo:
		 * prompts/hallazgos/20260812-una-descarga-fallida-del-arranque-queda-marcada-como-lista.json
		 *
		 * @param {string} model_name
		 * @return {void}
		 */
		marcar_descargado(model_name) {
			let fila = this.models_to_download.find(model => model.model_name == model_name)

			if (fila) {
				fila.downloading = false
				fila.downloaded = true
			}

			// Ignora sin romper nada los model_name que no son dependencia de columnas dinamicas
			// de article (ver dynamic_column_dependencies_status.js).
			mark_dynamic_dependency_ready(model_name)
		},
		/**
		 * Indica si un recurso ya está en store y no hace falta volver a pedirlo al inicio.
		 *
		 * @param {string} model_name
		 * @returns {boolean}
		 */
		yaSeDescargaron(model_name) {
			if (model_name === 'pdf_column_profile') {
				return this.$store.state.pdf_column_profile.all_profiles_loaded
			}
			return this.$store.state[model_name].models.length
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

#download-resources
	// El header propio reemplaza al header por defecto de b-sidebar (por eso no-header),
	// asi que el body arranca pegado al borde de arriba y el padding lo pone cada bloque.
	.b-sidebar-body
		padding: 0
		overflow-x: hidden

	.recursos-panel
		display: flex
		flex-direction: column
		min-height: 100%
		background: #FFF
		color: #1d1d1f
		text-align: left

		// La regla global de _inputs.sass le pone box-shadow a input, button, textarea y select.
		// Adentro del panel no queremos ningun relieve.
		button
			box-shadow: none

	.recursos-panel__header
		position: sticky
		top: 0
		z-index: 2
		background: rgba(255, 255, 255, .88)
		backdrop-filter: saturate(180%) blur(20px)
		-webkit-backdrop-filter: saturate(180%) blur(20px)
		padding: 18px 20px 0 20px
		box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .06)

	.recursos-panel__titulo-linea
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center

	.recursos-panel__titulo
		margin: 0
		font-size: 21px
		font-weight: 600
		letter-spacing: -0.02em
		color: #1d1d1f

	.recursos-panel__cerrar
		border: 0
		background: rgba(0, 0, 0, .04)
		color: rgba(0, 0, 0, .5)
		width: 28px
		height: 28px
		border-radius: 50%
		display: flex
		align-items: center
		justify-content: center
		font-size: 13px
		padding: 0
		transition: background .15s ease, color .15s ease

		&:hover
			background: rgba(0, 0, 0, .08)
			color: rgba(0, 0, 0, .75)

	.recursos-panel__subtitulo
		margin: 2px 0 12px 0
		font-size: 13px
		color: rgba(0, 0, 0, .45)

	.recursos-panel__barra
		height: 3px
		border-radius: 999px
		background: rgba(0, 0, 0, .07)
		overflow: hidden
		margin-bottom: 14px

	.recursos-panel__barra-relleno
		height: 100%
		border-radius: 999px
		background: $blue
		transition: width .4s cubic-bezier(.22, .61, .36, 1)

	.recursos-panel__lista
		flex: 1 1 auto
		padding: 4px 8px 8px 8px

	.recursos-panel__fila
		display: flex
		flex-direction: row
		align-items: center
		gap: 10px
		padding: 8px 12px
		border-radius: 8px
		font-size: 14px
		line-height: 1.2
		transition: background .15s ease, color .2s ease

		&:hover
			background: rgba(0, 0, 0, .03)

	.recursos-panel__fila--pendiente
		color: rgba(0, 0, 0, .38)

	.recursos-panel__fila--descargando
		color: #1d1d1f
		font-weight: 500

	.recursos-panel__fila--listo
		color: rgba(0, 0, 0, .8)

	.recursos-panel__estado
		flex: 0 0 18px
		width: 18px
		height: 18px
		display: flex
		align-items: center
		justify-content: center

		.spinner-border
			width: 14px
			height: 14px
			border-width: 2px
			color: $blue

		.icon-check
			font-size: 13px
			color: $blue
			// Aparece con un escalado corto cuando el recurso termina de bajar. Es el unico
			// momento animado de la fila: el resto se mantiene quieto a proposito.
			animation: recursos-check-in .28s cubic-bezier(.22, .61, .36, 1)

	.recursos-panel__punto
		width: 6px
		height: 6px
		border-radius: 50%
		background: rgba(0, 0, 0, .18)

	.recursos-panel__nombre
		flex: 1 1 auto
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	.recursos-panel__pie
		position: sticky
		bottom: 0
		background: rgba(255, 255, 255, .88)
		backdrop-filter: saturate(180%) blur(20px)
		-webkit-backdrop-filter: saturate(180%) blur(20px)
		box-shadow: inset 0 1px 0 rgba(0, 0, 0, .06)
		padding: 10px 20px

	.recursos-panel__redescargar
		border: 0
		background: transparent
		padding: 0
		font-size: 13px
		color: $blue
		transition: opacity .15s ease

		&:hover
			opacity: .65

@keyframes recursos-check-in
	from
		opacity: 0
		transform: scale(.6)
	to
		opacity: 1
		transform: scale(1)

@if ($theme == 'dark')
	#download-resources
		.recursos-panel
			background: #1d1d1d
			color: rgba(255, 255, 255, .92)

		.recursos-panel__header, .recursos-panel__pie
			background: rgba(29, 29, 29, .88)

		.recursos-panel__titulo
			color: rgba(255, 255, 255, .95)

		.recursos-panel__subtitulo
			color: rgba(255, 255, 255, .5)

		.recursos-panel__fila--pendiente
			color: rgba(255, 255, 255, .4)

		.recursos-panel__fila--descargando, .recursos-panel__fila--listo
			color: rgba(255, 255, 255, .92)

		.recursos-panel__fila:hover
			background: rgba(255, 255, 255, .06)

		.recursos-panel__punto
			background: rgba(255, 255, 255, .22)
</style>
