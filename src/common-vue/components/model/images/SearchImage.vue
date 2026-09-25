<template>
<b-modal
hide-footer
size="lg"
id="search-image"
@hide="on_modal_hide"
@shown="get_current_geocoder_counter">

	<!-- Título con el nombre del artículo: en el flujo automático el modal se abre solo y sin esto no se sabe para cuál se busca. -->
	<template #modal-title>
		<span class="si-title">
			<span class="si-title__text">Buscar imágenes</span>
			<span
			v-if="article_name"
			class="si-title__sub">
				{{ article_name }}
			</span>
		</span>
	</template>

	<div class="si">

		<!-- Buscador: una sola cápsula con lupa, texto, borrar y el botón de buscar. -->
		<div class="si-search">
			<i class="bi bi-search si-search__icon"></i>

			<input
			id="search-image-input"
			class="si-search__input"
			type="text"
			autocomplete="off"
			aria-label="Buscar imágenes"
			placeholder="¿Qué imagen buscás?"
			@keyup.enter="search_manually"
			v-model="query">

			<button
			v-if="query"
			type="button"
			class="si-search__clear"
			title="Borrar"
			@click="clear_query">
				<i class="bi bi-x-circle-fill"></i>
			</button>

			<button
			type="button"
			class="si-search__go"
			:disabled="!can_search"
			@click="search_manually">
				Buscar
			</button>
		</div>

		<!-- Criterios: con qué dato del artículo se arma la búsqueda. Se apagan si el artículo no lo tiene. -->
		<div class="si-criteria">
			<span class="si-criteria__label">Buscar por</span>

			<div class="si-criteria__list">
				<button
				v-for="criterion in criteria"
				:key="criterion.key"
				type="button"
				class="si-chip"
				:class="{ 'is-active': active_criterion_key === criterion.key }"
				:disabled="!criterion.value || loading"
				:title="criterion.value ? 'Buscar con el '+criterion.label.toLowerCase() : criterion.missing"
				@click="search_by_criterion(criterion)">
					<i :class="criterion.icon"></i>

					<span class="si-chip__body">
						<span class="si-chip__name">{{ criterion.label }}</span>
						<span class="si-chip__value">{{ criterion.value ? criterion.value : 'Sin dato' }}</span>
					</span>
				</button>
			</div>
		</div>

		<!-- Cuánto queda del cupo de Google y cuánto espera la selección automática. -->
		<div class="si-meta">
			<span
			v-if="has_quota_info"
			class="si-quota"
			:class="{ 'is-low': quota_is_low }">
				{{ quota_text }}
			</span>

			<label
			class="si-timeout"
			for="search-image-timeout"
			title="Segundos que espera la selección automática antes de elegir sola una imagen">
				<i class="bi bi-stopwatch"></i>
				<span>Autoselección en</span>
				<input
				id="search-image-timeout"
				class="si-timeout__input"
				type="number"
				min="1"
				:value="auto_select_timeout"
				@change="save_auto_select_timeout">
				<span>s</span>
			</label>
		</div>

		<!-- Selección automática en curso: cuenta regresiva y salida. -->
		<div
		v-if="flow_mode === 'auto'"
		class="si-auto"
		:style="{ '--progress': auto_select_progress }">
			<div class="si-auto__row">
				<span class="si-auto__text">
					<i class="bi bi-magic"></i>
					{{ auto_status_text }}
				</span>

				<button
				type="button"
				class="si-auto__cancel"
				@click="cancel_auto_by_user">
					Cancelar
				</button>
			</div>

			<div class="si-auto__bar">
				<div class="si-auto__fill"></div>
			</div>
		</div>

		<!-- Cargando: esqueleto con la forma de lo que va a aparecer. -->
		<div
		v-if="loading"
		class="si-loading">
			<div class="si-loading__status">
				<b-spinner
				small
				variant="primary"></b-spinner>
				Buscando imágenes…
			</div>

			<div class="si-grid">
				<div
				v-for="n in 10"
				:key="'skeleton-'+n"
				class="si-skeleton"></div>
			</div>
		</div>

		<!-- Resultados -->
		<div
		v-else-if="images_result && images_result.length"
		class="si-results">
			<div class="si-results__head">
				<span class="si-results__title">
					<strong>{{ images_result.length }}</strong>
					{{ images_result.length == 1 ? 'resultado' : 'resultados' }}
					para “{{ last_query }}”
				</span>
				<span class="si-results__hint">Tocá una imagen para elegirla</span>
			</div>

			<div
			class="si-grid"
			:style="{ '--progress': auto_select_progress }">
				<vue-load-image
				class="si-card"
				:class="card_classes(image, index)"
				v-for="(image, index) in images_result"
				:key="image+'-'+index"
				role="button"
				:tabindex="is_image_failed(image) ? -1 : 0"
				:aria-label="'Elegir la imagen '+(index + 1)"
				@onError="on_image_error(image)"
				@keyup.enter.native="choose_image(image)"
				@click.native="choose_image(image)">
					<img
					slot="image"
					class="si-card__img"
					alt=""
					:src="image">

					<div
					slot="preloader"
					class="si-card__state">
						<b-spinner
						small
						variant="primary"></b-spinner>
					</div>

					<div
					slot="error"
					class="si-card__state">
						<i class="bi bi-image-alt"></i>
						<span>No se pudo cargar</span>
					</div>
				</vue-load-image>
			</div>
		</div>

		<!-- La búsqueda falló (cupo agotado, key rechazada, sin conexión). -->
		<div
		v-else-if="search_error"
		class="si-empty si-empty--error">
			<div class="si-empty__icon">
				<i class="bi bi-exclamation-triangle"></i>
			</div>
			<p class="si-empty__title">No pudimos completar la búsqueda</p>
			<p class="si-empty__detail">{{ search_error_detail }}</p>
		</div>

		<!-- Se buscó y Google no devolvió nada. -->
		<div
		v-else-if="has_searched"
		class="si-empty">
			<div class="si-empty__icon">
				<i class="bi bi-emoji-frown"></i>
			</div>
			<p class="si-empty__title">No encontramos imágenes</p>
			<p class="si-empty__detail">
				No hay resultados para “{{ last_query }}”. Probá con otro criterio o con otras palabras.
			</p>
		</div>

		<!-- Todavía no se buscó nada. -->
		<div
		v-else
		class="si-empty">
			<div class="si-empty__icon">
				<i class="bi bi-images"></i>
			</div>
			<p class="si-empty__title">Buscá imágenes para este artículo</p>
			<p class="si-empty__detail">
				Elegí un criterio de arriba o escribí lo que necesites y tocá Buscar.
			</p>
		</div>

	</div>
</b-modal>
</template>
<script>
import VueLoadImage from 'vue-load-image'
import { env } from '@/runtime_config'
export default {
	components: {
		VueLoadImage,
	},
	/*
	 * 🔴 El contador NO se pide desde `$root.$on('bv::modal::shown')`, se pide desde el `@shown`
	 * del propio `<b-modal>` (arriba, en el template).
	 *
	 * Este componente vive adentro de `images/Index.vue`, que renderiza `ModelForm.vue` para los
	 * props de tipo imagen: se monta de nuevo con cada apertura del modal de articulo y con cada
	 * navegacion ‹ › entre articulos. Un listener sobre el bus global de Vue sobrevive a la
	 * instancia que lo registro, asi que cada montaje dejaba uno mas escuchando, y la apertura N
	 * del buscador de imagenes disparaba N requests simultaneas a `google/get-current`.
	 *
	 * Eso le tiro 429 "Too Many Attempts." al cliente ferretotal el 16/9/2026: 501 requests a ese
	 * endpoint en un dia (contra 138 del siguiente mas pedido), en rafagas de ~124 con UNA sola
	 * busqueda real de por medio. El evento del propio modal muere con el componente, asi que el
	 * problema no puede volver por esta puerta.
	 *
	 * Lo que estaba parqueado adentro de aquel handler, por si alguna vez se retoma (iba junto con
	 * el flow_mode = 'auto' que sigue comentado en data()):
	 *
	 *   if (this.article.bar_code) {
	 *       this.query = this.article.bar_code
	 *       setTimeout(() => { this.search() }, 300)
	 *   }
	 */
	data() {
		return {
			query: '',
			images_result: null,
			loading: false,
			current_geocoder_counter: null,
			/* URLs de resultados que no pudieron cargarse en el navegador. */
			failed_image_urls: [],

			/* Se hizo al menos una busqueda desde que se abrio el modal (distingue "nunca busque" de "no hubo resultados"). */
			has_searched: false,
			/* La ultima busqueda fallo (cupo, key rechazada, sin conexion): tiene su propio estado, no es "sin resultados". */
			search_error: false,
			/* Texto que explica el fallo de arriba. */
			search_error_detail: '',
			/* Lo que se busco de verdad, tal como salio hacia Google: el input puede seguir cambiando despues. */
			last_query: '',

	        flow_mode: 'idle',               // 'idle' | 'auto' | 'manual'
	        // flow_mode: 'auto',               // 'idle' | 'auto' | 'manual'
	        auto_select_timer: null,
	        auto_select_start: null,
	        auto_select_progress: 0, // 0 → 1
	        /* Índice actual candidato para selección automática (para feedback visual). */
	        auto_select_target_index: 0,
	        /* Queries candidatas para el flujo automático (ej: bar_code y fallback a name). */
	        auto_flow_queries: [],
	        /* Posición actual dentro de `auto_flow_queries`. */
	        auto_flow_query_index: 0,
	        // auto_select_progress: 0.6, // 0 → 1
	        raf_id: null,
		}
	},
	computed: {
		auto_select_timeout: {
	        get() {
	            // fallback por si el usuario aún no tiene el valor
	            if (this.user) {
	            	return this.owner.img_auto_timeout || 5
	            }
	            return 5
	        },
	        set(value) {
	            const seconds = Math.round(Number(value))

	            if (isNaN(seconds) || seconds <= 0) return

	            this.$api.put('user/set-img-auto-timeout/'+seconds)
	        	.then(() => {
	        		this.set_owner_img_auto_timeout(seconds)
	        	})
	        	.catch(() => {
	        		this.$toast.error('No se pudo guardar el tiempo de espera')
	        	})
	        }
	    },
		article() {
			return this.$store.state.article.model
		},
		/**
		* Nombre del artículo para el subtítulo del modal ('' si todavía no tiene).
		*
		* @return {String}
		*/
		article_name() {
			if (this.article && this.article.name) {
				return String(this.article.name).trim()
			}
			return ''
		},
		/**
		* Los datos del artículo con los que se puede armar la búsqueda, en el orden en que se ofrecen.
		*
		* `value` sale vacío cuando el artículo no tiene ese dato: el botón se apaga y `missing`
		* explica por qué. Antes "Con el Código" no hacía nada, sin avisar, si el artículo no tenía uno.
		*
		* El código de proveedor se ofrece acá y NO se suma a la cadena del flujo automático
		* (`prepare_auto_flow_queries`): cada consulta extra gasta de las 100 diarias que da Google por
		* proyecto, y el lote del backend (ProcessArticleBatchImagesJob) replica esa cadena tal cual —
		* sumarlo solo de este lado los dejaría distintos.
		*
		* @return {Array<Object>} { key, label, icon, value, missing }
		*/
		criteria() {
			const article = this.article || {}
			const clean = (value) => {
				if (value === null || typeof value === 'undefined') {
					return ''
				}
				return String(value).trim()
			}
			return [
				{
					key: 'bar_code',
					label: 'Código de barras',
					icon: 'bi bi-upc-scan',
					value: clean(article.bar_code),
					missing: 'El artículo no tiene código de barras',
				},
				{
					key: 'provider_code',
					label: 'Código de proveedor',
					icon: 'bi bi-truck',
					value: clean(article.provider_code),
					missing: 'El artículo no tiene código de proveedor',
				},
				{
					key: 'name',
					label: 'Nombre',
					icon: 'bi bi-type',
					value: clean(article.name),
					missing: 'El artículo todavía no tiene nombre',
				},
			]
		},
		/**
		* Criterio que coincide con lo que hay escrito en el buscador (para resaltarlo).
		*
		* Se deduce del texto y no se guarda aparte: así también se enciende cuando el flujo automático
		* arma la consulta solo, y se apaga apenas el usuario la edita.
		*
		* @return {String|null} key del criterio, o null si el texto es libre.
		*/
		active_criterion_key() {
			const typed = String(this.query || '').trim()
			if (!typed) {
				return null
			}
			for (let index = 0; index < this.criteria.length; index++) {
				if (this.criteria[index].value && this.criteria[index].value === typed) {
					return this.criteria[index].key
				}
			}
			return null
		},
		/* Hay texto para buscar y no hay otra búsqueda en curso. */
		can_search() {
			return !this.loading && String(this.query || '').trim() !== ''
		},
		google_api_key() {
			if (this.owner.google_custom_search_api_key) {
				return this.owner.google_custom_search_api_key
			}
			/*
			 * Repositorio publico: la API key de fallback de Google Custom Search se saca del
			 * codigo fuente y se toma de una variable de entorno del build. Esto NO la vuelve
			 * secreta: sigue viajando igual dentro del bundle que se le descarga a cualquier
			 * visitante. Sirve para poder rotarla sin tocar codigo y para que no quede escrita
			 * en el repo. La proteccion real es restringirla en Google Cloud Console (limitarla
			 * a la Custom Search API y por dominio/referrer HTTP) porque consume cuota
			 * facturable, a diferencia de una key de Firebase que esta pensada para ser publica.
			 */
			return env('VUE_APP_GOOGLE_SEARCH_API_KEY')
		},
		busquedas_disponibles() {
			if (this.current_geocoder_counter) {
				return this.owner.google_cuota - this.current_geocoder_counter.counter
			}
		},
		/* El contador ya llegó y es un número usable (antes de llegar es undefined; con cuota sin cargar puede dar NaN). */
		has_quota_info() {
			return Number.isFinite(this.busquedas_disponibles)
		},
		/* Quedan pocas búsquedas: se avisa en rojo suave. */
		quota_is_low() {
			return this.has_quota_info && this.busquedas_disponibles <= 5
		},
		quota_text() {
			if (this.busquedas_disponibles <= 0) {
				return 'Sin búsquedas disponibles hoy'
			}
			if (this.busquedas_disponibles == 1) {
				return '1 búsqueda disponible hoy'
			}
			return this.busquedas_disponibles+' búsquedas disponibles hoy'
		},
		/* Segundos que faltan para que la selección automática elija sola. */
		auto_select_seconds_left() {
			const timeout = Number(this.auto_select_timeout)
			return Math.max(0, Math.ceil(timeout * (1 - this.auto_select_progress)))
		},
		/* Texto del banner de selección automática según en qué punto del ciclo está. */
		auto_status_text() {
			if (this.loading) {
				return 'Buscando imágenes para elegir una automáticamente…'
			}
			if (this.images_result && this.images_result.length) {
				if (this.auto_select_progress >= 1) {
					return 'Verificando que la imagen cargue…'
				}
				return 'Se elegirá una imagen automáticamente en '+this.auto_select_seconds_left+' s'
			}
			return 'Buscando imágenes…'
		},
	},
	methods: {
		/**
		* Registra una URL de imagen que falló al cargar para evitar seleccionarla en automático.
		*
		* Lo dispara el evento `onError` de <vue-load-image> (ver el template) y `validate_image_url`.
		* Antes estaba colgado del `@error` del <img>, que <vue-load-image> no llega a renderizar
		* cuando la carga falla: mostraba el slot de error en su lugar, así que nunca se disparaba.
		*
		* @param {String} image_url URL de la imagen fallida.
		* @return {void}
		*/
		on_image_error(image_url) {
			if (!image_url) {
				return
			}
			if (this.failed_image_urls.indexOf(image_url) === -1) {
				this.failed_image_urls.push(image_url)
			}
			/* Si falló la candidata actual en modo auto, mover borde enseguida a la siguiente. */
			if (this.flow_mode === 'auto') {
				const failed_index = this.images_result ? this.images_result.indexOf(image_url) : -1
				if (failed_index === this.auto_select_target_index) {
					this.move_auto_select_target_to_next_available(failed_index + 1)
				}
			}
		},
		/**
		* Mueve el índice visual de selección automática a la próxima imagen disponible.
		*
		* @param {Number} start_index Índice desde donde buscar la siguiente candidata.
		* @return {void}
		*/
		move_auto_select_target_to_next_available(start_index = 0) {
			if (!this.images_result || !this.images_result.length) {
				return
			}
			for (let index = start_index; index < this.images_result.length; index++) {
				const image_url = this.images_result[index]
				if (this.failed_image_urls.indexOf(image_url) === -1) {
					this.auto_select_target_index = index
					return
				}
			}
			/* Si no hay candidatas válidas, deja el índice en el último para evitar saltos raros. */
			this.auto_select_target_index = this.images_result.length - 1
		},
		/**
		* Deja el tiempo de selección automática en la sesión, que es de donde sale `owner`.
		*
		* Antes el setter de `auto_select_timeout` hacía `commit('user/setModel', ...)`: ese es el store del
		* ABM de usuarios y no el de la sesión, así que el valor nuevo nunca llegaba a `owner` y la cuenta
		* regresiva seguía con el viejo hasta recargar la página. `Carrousel.vue` (save_timeout_config)
		* ya lo hacía bien, con `auth/setUser`: acá se hace igual.
		*
		* @param {Number} seconds Segundos nuevos.
		* @return {void}
		*/
		set_owner_img_auto_timeout(seconds) {
			let auth_user = this.user ? {...this.user} : null
			if (!auth_user) {
				return
			}
			/* Si es empleado el valor vive en su dueño (`owner`); si es el dueño, en el propio usuario. */
			if (auth_user.owner_id) {
				let owner = {...(auth_user.owner || {})}
				owner.img_auto_timeout = seconds
				auth_user.owner = owner
			} else {
				auth_user.img_auto_timeout = seconds
			}
			this.$store.commit('auth/setUser', auth_user)
		},
		/**
		* Si esa URL ya se sabe que no sirve (no cargó en el navegador o el servidor no pudo bajarla).
		*
		* @param {String} image_url URL a consultar.
		* @return {Boolean}
		*/
		is_image_failed(image_url) {
			return this.failed_image_urls.indexOf(image_url) !== -1
		},
		/**
		* Elige una tarjeta de la grilla. Las que no cargaron no se eligen: el CSS ya les saca el clic
		* (`pointer-events: none`), pero con el teclado (Enter) llegaban igual.
		*
		* @param {String} image_url URL de la imagen elegida.
		* @return {void}
		*/
		choose_image(image_url) {
			if (this.is_image_failed(image_url)) {
				return
			}
			this.setImage(image_url)
		},
		/**
		* Clases de estado de una tarjeta de resultado.
		*
		* @param {String} image_url URL de la imagen de la tarjeta.
		* @param {Number} index Posición de la tarjeta en la grilla.
		* @return {Object} Clases para `:class`.
		*/
		card_classes(image_url, index) {
			return {
				/* No cargó (o el servidor no pudo bajarla): se atenúa y no se puede elegir. */
				'is-broken': this.is_image_failed(image_url),
				/* La que va a elegir la selección automática cuando se cumpla el tiempo. */
				'is-target': this.flow_mode === 'auto' && index === this.auto_select_target_index,
			}
		},
		startAutoSelectProgress() {
		    this.auto_select_start = performance.now()

		    const animate = (now) => {
		        const elapsed = now - this.auto_select_start
		        this.auto_select_progress = Math.min(
		            Math.max(elapsed / (this.auto_select_timeout * 1000), 0),
		            1
		        )

		        if (this.auto_select_progress < 1 && this.flow_mode === 'auto') {
		            this.raf_id = requestAnimationFrame(animate)
		        }
		    }

		    this.raf_id = requestAnimationFrame(animate)
		},
		/**
		* Verifica programáticamente si una URL de imagen carga correctamente.
		*
		* @param {String} image_url URL a validar.
		* @return {Promise<Boolean>} true si carga, false si falla o timeout.
		*/
		validate_image_url(image_url) {
			return new Promise(resolve => {
				/* Imagen auxiliar en memoria para comprobar carga real antes de seleccionar. */
				const test_image = new Image()
				let resolved = false
				let timeout_id = null

				const finalize_validation = (result) => {
					if (resolved) {
						return
					}
					resolved = true
					/*
					 * Sin esto el temporizador de abajo seguia vivo aunque la imagen ya hubiera cargado y, a
					 * los 4 s, la marcaba como fallida (on_image_error). Antes era invisible; ahora esa marca
					 * atenua la tarjeta y la vuelve no elegible.
					 */
					clearTimeout(timeout_id)
					resolve(result)
				}

				test_image.onload = () => {
					finalize_validation(true)
				}

				test_image.onerror = () => {
					this.on_image_error(image_url)
					finalize_validation(false)
				}

				/* Evita quedar esperando indefinidamente cuando el host no responde. */
				timeout_id = setTimeout(() => {
					this.on_image_error(image_url)
					finalize_validation(false)
				}, 4000)

				test_image.src = image_url
			})
		},
		/**
		* Recorre resultados en orden y selecciona la primera imagen que realmente carga.
		*
		* @return {Promise<Boolean>} true si logró seleccionar una imagen válida.
		*/
		async select_first_available_image() {
			if (!this.images_result || !this.images_result.length) {
				return false
			}
			/* Arranca desde el índice visual actual para respetar el feedback mostrado al usuario. */
			for (let index = this.auto_select_target_index; index < this.images_result.length; index++) {
				/* Mantiene sincronizado el borde animado con el candidato actual. */
				this.auto_select_target_index = index
				const image_url = this.images_result[index]
				if (this.failed_image_urls.indexOf(image_url) !== -1) {
					continue
				}
				const image_is_valid = await this.validate_image_url(image_url)
				/* Si mientras se verificaba el usuario canceló o eligió a mano, no se pisa su decisión. */
				if (this.flow_mode !== 'auto') {
					return false
				}
				if (image_is_valid) {
					this.setImage(image_url)
					return true
				}
			}
			return false
		},
		/**
		* Reintenta la seleccion automatica cuando el servidor no pudo guardar la imagen elegida.
		*
		* El navegador si podia mostrarla (por eso paso validate_image_url), pero el servidor no
		* pudo bajarla. Se marca esa URL como fallida y se sigue con la proxima candidata de la
		* misma busqueda; si no queda ninguna, se prueba el siguiente criterio de busqueda.
		*
		* @param {String} failed_image_url URL que el servidor rechazo.
		* @return {void}
		*/
		retry_after_server_failure(failed_image_url) {
			if (failed_image_url && this.failed_image_urls.indexOf(failed_image_url) === -1) {
				this.failed_image_urls.push(failed_image_url)
			}

			/* setImage() habia dejado el flujo en 'manual'; para el reintento vuelve a automatico. */
			this.flow_mode = 'auto'

			/* Se arranca en la posicion siguiente a la que fallo, no desde el principio. */
			let next_index = 0
			if (this.images_result) {
				const failed_index = this.images_result.indexOf(failed_image_url)
				if (failed_index !== -1) {
					next_index = failed_index + 1
				}
			}
			this.auto_select_target_index = next_index

			this.select_first_available_image()
			.then(image_selected => {
				if (image_selected) {
					return
				}
				/* Cancelado durante la verificación: no se sigue probando ni se avisa. */
				if (this.flow_mode !== 'auto') {
					return
				}
				/* Sin candidatas en esta busqueda: se prueba el siguiente criterio (bar_code -> name). */
				if (this.try_next_auto_query()) {
					return
				}
				this.flow_mode = 'idle'
				this.$toast.error('No se pudo guardar ninguna de las imágenes encontradas')
				this.$emit('no-image-available')
			})
		},
		/**
		* Valida el dígito verificador GS1 (módulo 10) para códigos de 8, 12, 13 o 14 dígitos.
		*
		* @param {String} code Cadena solo numérica incluyendo el dígito de control al final.
		* @return {Boolean} true si el dígito verificador es correcto.
		*/
		validate_gs1_check_digit(code) {
			const len = code.length
			if ([8, 12, 13, 14].indexOf(len) === -1) {
				return false
			}
			const digits = code.split('').map(digit => {
				return parseInt(digit, 10)
			})
			const check_digit = digits[len - 1]
			let sum = 0
			for (let i = len - 2; i >= 0; i--) {
				const position_from_right = len - 1 - i
				const weight = position_from_right % 2 === 1 ? 3 : 1
				sum += digits[i] * weight
			}
			const calculated = (10 - (sum % 10)) % 10
			return calculated === check_digit
		},
		/**
		* Determina si el valor puede usarse como código de barras de producto en búsqueda automática.
		* Solo acepta GTIN numérico (EAN-8, UPC/EAN-12, EAN-13, GTIN-14) con dígito verificador válido.
		*
		* @param {String} normalized Valor ya normalizado con getBarCode (sin espacios).
		* @return {Boolean}
		*/
		is_valid_product_bar_code(normalized) {
			if (!normalized || normalized.length === 0) {
				return false
			}
			if (!/^\d+$/.test(normalized)) {
				return false
			}
			return this.validate_gs1_check_digit(normalized)
		},
		/**
		* Prepara el orden de búsqueda automática priorizando código de barras y fallback por nombre.
		*
		* @param {Boolean} use_bar_code indica si el código pasó validaciones GS1.
		* @param {String} normalized_bar_code código normalizado para consulta.
		* @return {void}
		*/
		prepare_auto_flow_queries(use_bar_code, normalized_bar_code) {
			/* Reinicio explícito para evitar arrastre de búsquedas automáticas previas. */
			this.auto_flow_queries = []
			this.auto_flow_query_index = 0

			/* Prioridad 1: código de barras válido. */
			if (use_bar_code) {
				this.auto_flow_queries.push(normalized_bar_code)
			}

			/* Prioridad 2: nombre, solo si existe y no duplica la query previa. */
			if (this.article.name) {
				const normalized_name = String(this.article.name).trim()
				if (normalized_name !== '' && this.auto_flow_queries.indexOf(normalized_name) === -1) {
					this.auto_flow_queries.push(normalized_name)
				}
			}
		},
		/**
		* Avanza al siguiente criterio automático si quedan opciones por intentar.
		*
		* @return {Boolean} true si disparó una nueva búsqueda.
		*/
		try_next_auto_query() {
			/* Solo aplica en modo automático con estrategia inicializada. */
			if (this.flow_mode !== 'auto' || !this.auto_flow_queries.length) {
				return false
			}

			const next_index = this.auto_flow_query_index + 1
			if (next_index >= this.auto_flow_queries.length) {
				return false
			}

			this.auto_flow_query_index = next_index
			this.query = this.auto_flow_queries[this.auto_flow_query_index]
			this.search()
			return true
		},
		luckyFlow() {
			console.log('luckyFlow')
			/* Reinicia el candidato visual al primer resultado para un nuevo flujo auto. */
			this.auto_select_target_index = 0

			/* Código de barras solo en automático si existe y cumple formato GS1 con dígito verificador. */
			let normalized_bar_code = ''
			if (this.article.bar_code != null && this.article.bar_code !== '') {
				normalized_bar_code = this.getBarCode(String(this.article.bar_code))
			}

			console.log('codigo validado: '+this.is_valid_product_bar_code(normalized_bar_code))
			const use_bar_code = normalized_bar_code.length > 0 && this.is_valid_product_bar_code(normalized_bar_code)

			/* Define secuencia de búsqueda automática: bar_code => name. */
			this.prepare_auto_flow_queries(use_bar_code, normalized_bar_code)
			if (!this.auto_flow_queries.length) {
				console.log('no se busco')
				return
			}

			/* Primera query automática de la secuencia preparada. */
			this.query = this.auto_flow_queries[this.auto_flow_query_index]
	        this.flow_mode = 'auto'
	        this.search()
	    },
	    /**
	     * Espera el timeout configurado y luego selecciona la primera imagen disponible.
	     * Si ninguna imagen carga correctamente, emite `no-image-available` para que el
	     * componente padre pueda saltar al siguiente artículo del batch.
	     *
	     * @return {void}
	     */
	    seleccionar_imagen_automaticamente() {
			this.startAutoSelectProgress()
	        this.auto_select_timer = setTimeout(async () => {
	            if (this.flow_mode === 'auto') {
	            	if (this.images_result && this.images_result.length) {
	            		/* Valida cada resultado en orden para evitar seleccionar enlaces rotos. */
	            		const image_selected = await this.select_first_available_image()
	            		if (image_selected) {
	            			return
	            		}
	            		/* Cancelado durante la verificación: no es un fallo, así que no se avisa ni se cierra el ciclo. */
	            		if (this.flow_mode !== 'auto') {
	            			return
	            		}
	            		this.$toast.error('No se pudo cargar ninguna imagen para seleccionar automáticamente')
	            	}
	            	/* Ninguna imagen disponible: notifica al padre para saltar al siguiente artículo. */
	            	this.finish_auto_without_image()
	            }
	        }, this.auto_select_timeout * 1000)
	    },
		/**
		* El flujo automático se quedó sin candidatas: baja el banner y le avisa al padre.
		*
		* Antes solo se emitía `no-image-available` y `flow_mode` seguía en 'auto', así que el bloque de
		* "Cancelar selección automática" quedaba en pantalla para siempre aunque ya no hubiera nada que
		* seleccionar. El banner nuevo cuenta hacia atrás según `flow_mode`: dejarlo en 'auto' lo
		* mostraría girando sin fin.
		*
		* @return {void}
		*/
		finish_auto_without_image() {
			cancelAnimationFrame(this.raf_id)
			clearTimeout(this.auto_select_timer)
			this.flow_mode = 'idle'
			this.$emit('no-image-available')
		},
		/**
		* Muestra el estado de error de la búsqueda y avisa con un toast.
		*
		* @param {String} message Qué pasó, en criollo (va al toast y al estado de error).
		* @return {void}
		*/
		on_search_error(message) {
			this.loading = false
			this.search_error = true
			this.search_error_detail = message
			this.images_result = null
			this.$toast.error(message)
			/* En automático no hay nada más para probar: se cierra el ciclo como cuando no quedan candidatas. */
			if (this.flow_mode === 'auto') {
				this.finish_auto_without_image()
			}
		},
		/**
		* Si el `{ error }` que devolvió Google es de cuota agotada.
		*
		* Google la informa de dos maneras: 429 (RESOURCE_EXHAUSTED) o 403 con un `reason` de la familia
		* dailyLimitExceeded / rateLimitExceeded / quotaExceeded.
		*
		* @param {Object} body Cuerpo de la respuesta.
		* @return {Boolean}
		*/
		is_google_quota_error(body) {
			if (!body || !body.error) {
				return false
			}
			if (body.error.code == 429 || body.error.status === 'RESOURCE_EXHAUSTED') {
				return true
			}
			const details = body.error.errors || []
			for (let index = 0; index < details.length; index++) {
				if (/limitExceeded|quotaExceeded/i.test(String(details[index].reason || ''))) {
					return true
				}
			}
			return false
		},
		/**
		* Texto del error cuando Google contesta con un cuerpo `{ error }` en vez de resultados.
		*
		* @param {Object} body Cuerpo de la respuesta.
		* @return {String}
		*/
		google_error_message(body) {
			if (this.is_google_quota_error(body)) {
				return 'Se alcanzó el límite diario de búsquedas de Google. Probá de nuevo mañana.'
			}
			return 'Google no pudo completar la búsqueda. Probá de nuevo en un momento.'
		},
		/**
		* Busca en Google Imágenes lo que hay escrito en el buscador.
		*
		* @return {Promise|void}
		*/
		search() {
			/* Sin texto no hay nada que buscar: Google contestaba 400 y el modal quedaba mudo. */
			if (!String(this.query || '').trim()) {
				return
			}
			if (this.busquedas_disponibles <= 0) {
				this.on_search_error('Ha alcanzado su límite de '+this.owner.google_cuota+' búsquedas diarias')
				return
			}
			if (this.loading) {
				return
			}

			const searched_text = String(this.query).trim()
			/*
			 * La consulta va con encodeURIComponent: antes se pegaba tal cual, y un `#`, un `&` o un `+`
			 * cortaba o deformaba el pedido. Con el código de proveedor pasa seguido (`AB/12#3`).
			 *
			 * La URL se arma ANTES de subir `loading`: si esto lanzara (un `owner` nulo al leer la key), un
			 * `loading` en true dejaría al modal sin poder buscar nunca más.
			 */
			const url = 'https://www.googleapis.com/customsearch/v1?key='+this.google_api_key+'&cx=c442e5f346f314951&searchType=image&q='+encodeURIComponent(searched_text)

			this.images_result = null
			/* El avance de la selección automática vuelve a cero: si no, el banner mostraba la barra llena mientras se busca. */
			this.auto_select_progress = 0
			/* Reinicia el tracking de errores para la nueva búsqueda actual. */
			this.failed_image_urls = []
			/* Reinicia índice visual de selección automática. */
			this.auto_select_target_index = 0
			this.has_searched = true
			this.search_error = false
			this.search_error_detail = ''
			this.last_query = searched_text
			this.loading = true

			return fetch(url)
			.then(res => {
				return res.json()
			})
			.then(body => {
				/*
				 * `loading` se baja acá y no apenas llega la respuesta: así el esqueleto dura hasta que
				 * hay algo para mostrar y no parpadea "sin resultados" mientras se lee el cuerpo. Y tiene
				 * que ir ANTES de try_next_auto_query(), porque search() no hace nada con loading en true.
				 */
				this.loading = false

				/* Google contesta con { error } cuando se pasó de cuota o rechaza la key: no trae searchInformation. */
				if (!body || body.error || !body.searchInformation) {
					this.on_search_error(this.google_error_message(body))
					return
				}

				this.sumar_contador_de_busqueda()

				if (body.searchInformation.totalResults == 0 || !body.items || !body.items.length) {
					/* En automático, si no hubo resultados, intentar siguiente criterio antes de cancelar. */
					if (this.try_next_auto_query()) {
						return
					}
					/*
					 * Agotadas todas las queries automáticas sin resultados: notifica para saltar artículo.
					 * Acá sí va un toast (en manual alcanza con el estado vacío del modal): por el reintento
					 * de `retry_after_server_failure` esto puede pasar con el modal ya cerrado.
					 */
					if (this.flow_mode === 'auto') {
						this.$toast.error('No se encontraron resultados, prueba con otras palabras por favor')
						this.finish_auto_without_image()
					}
					return
				}

				this.images_result = []
				body.items.forEach(item => {
					this.images_result.push(item.link)
				})

				if (this.flow_mode == 'auto') {
					this.seleccionar_imagen_automaticamente()
				}
			})
			.catch(error => {
				console.error('SearchImage: fallo la busqueda de imagenes', error)
				this.on_search_error('No se pudo completar la búsqueda. Probá de nuevo en un momento.')
			})
		},
		get_current_geocoder_counter() {

			this.$api.get('google/get-current')
			.then(res => {
				this.current_geocoder_counter = res.data.model
			})
			.catch(err => {
				console.log('error al actualizar contador de google')
			})
		},
		sumar_contador_de_busqueda() {
			this.$api.get('google/custom-search/aumentar-contador')
			.then(res => {
				this.current_geocoder_counter = res.data.model
			})
			.catch(err => {
				console.log('error al actualizar contador de google')
			})
		},
		setImage(image_url) {
			 if (this.flow_mode === 'auto') {
			 	this.cancel_flow_model()
		    }
			this.$bvModal.hide('search-image')
			this.$emit('setImageUrl', image_url)
		},
		cancel_flow_model() {
	        this.flow_mode = 'manual'
	        cancelAnimationFrame(this.raf_id)
	        clearTimeout(this.auto_select_timer)
		},
		/**
		* El modal se está cerrando: si la selección automática seguía contando, se cancela.
		*
		* Sin esto, cerrar con la ✕ o con Esc no frenaba nada: a los N segundos elegía sola una imagen y
		* abría el recorte con el modal ya cerrado. Va en `@hide` y NO en `@hidden`: `hide` salta al
		* empezar a cerrar, con el flujo todavía en el estado que dejó `setImage()` (que ya lo pasó a
		* 'manual'); `hidden` salta ~300 ms después y podía llegar cuando `retry_after_server_failure()`
		* ya había vuelto a poner 'auto', cortando el reintento silencioso que corre con el modal cerrado.
		*
		* @return {void}
		*/
		on_modal_hide() {
			if (this.flow_mode === 'auto') {
				this.cancel_auto_by_user()
			}
		},
		/**
		* El usuario frena la selección automática (botón "Cancelar", cierre del modal o búsqueda a mano).
		*
		* Además de cortar el temporizador le avisa al padre con `no-image-available`, que es lo que baja
		* su `auto_crop` (images/Index.vue, on_no_image_available). Sin eso el padre seguía creyendo que
		* el ciclo automático estaba vivo, y el primer recorte MANUAL que el usuario hiciera después se
		* guardaba solo a los N segundos (Cropper.vue: "Guardado automático").
		*
		* No se hace adentro de `cancel_flow_model()` porque `setImage()` también lo llama cuando la
		* selección automática ELIGE una imagen, y ahí `auto_crop` tiene que seguir en true.
		*
		* @return {void}
		*/
		cancel_auto_by_user() {
			this.cancel_flow_model()
			this.$emit('no-image-available')
		},
		/**
		* Busca con el dato del artículo que eligió el usuario (código de barras, de proveedor o nombre).
		*
		* @param {Object} criterion Entrada de `criteria`.
		* @return {void}
		*/
		search_by_criterion(criterion) {
			if (!criterion.value) {
				return
			}
			this.query = criterion.value
			this.search_manually()
		},
		/**
		* Búsqueda pedida por el usuario (Enter, "Buscar" o un criterio).
		*
		* Si la selección automática estaba contando, la cancela: el usuario tomó el control y, si no,
		* el temporizador seguía vivo y elegía sola una imagen de la búsqueda nueva. La búsqueda que
		* arma el propio flujo automático (`try_next_auto_query`) llama a `search()` directo.
		*
		* @return {void}
		*/
		search_manually() {
			if (this.loading || !String(this.query || '').trim()) {
				return
			}
			if (this.flow_mode === 'auto') {
				this.cancel_auto_by_user()
			}
			this.search()
		},
		/**
		* Vacía el buscador y deja el cursor adentro para escribir de nuevo.
		*
		* @return {void}
		*/
		clear_query() {
			this.query = ''
			this.$nextTick(() => {
				const input = document.getElementById('search-image-input')
				if (input) {
					input.focus()
				}
			})
		},
		/**
		* Guarda los segundos de la selección automática al terminar de editarlos (`change`, no `input`).
		*
		* Con `input` se mandaba un PUT por cada tecla: escribir "10" pegaba dos veces. Si el valor no
		* sirve (vacío, cero o negativo) el setter no hace nada y acá se vuelve a mostrar el vigente.
		*
		* @param {Event} event Evento `change` del input.
		* @return {void}
		*/
		save_auto_select_timeout(event) {
			const seconds = Number(event.target.value)
			if (isNaN(seconds) || seconds <= 0) {
				event.target.value = this.auto_select_timeout
				return
			}
			this.auto_select_timeout = seconds
		},
	}
}
</script>
<style lang="sass">
// ══════════════════════════════════════════════════════════════════════════════
// Modal "Buscar imágenes" — rediseñado el 24/9/2026.
//
// Mismo lenguaje que el campo de imágenes (images/Index.vue, 13/8/2026) y que el resto del
// sistema: todo por token con su fallback, íconos bi-*, cápsulas de 999px y tarjetas de 12px.
// Los colores salen SIEMPRE de tokens: el modal cuelga de <body>, fuera de #app, y con un hex
// suelto queda blanco en modo oscuro (ver el encabezado de _dark_theme.sass).
//
// Todo va scopeado por el id del modal. Es a propósito y no una preferencia: los `input` tienen
// una regla global de etiqueta pelada (_inputs.sass: borde de 3px + halo azul fuerte en foco) y
// un id + una clase le ganan sin necesitar !important — es el patrón de
// contexto/estilo_interfaz_empresa.md §3.
// ══════════════════════════════════════════════════════════════════════════════
#search-image

	// ─── Título ──────────────────────────────────────────────────────────────
	// El h5 del header es un ítem flex sin `min-width: 0`: con un nombre largo (`nowrap` abajo) no
	// se achicaba, ensanchaba el header y empujaba la ✕ fuera de la pantalla en teléfono.
	.modal-title
		min-width: 0

	.si-title
		display: flex
		flex-direction: column
		min-width: 0

	.si-title__text
		font-weight: 600

	.si-title__sub
		max-width: 100%
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font-size: 0.8rem
		font-weight: 400
		color: var(--color-text-secondary, #6c757d)

	// ─── Buscador ────────────────────────────────────────────────────────────
	.si-search
		display: flex
		align-items: center
		gap: 8px
		height: 48px
		padding: 0 5px 0 16px
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 999px
		background: var(--bg-card, #fff)
		box-shadow: 0 1px 3px var(--shadow-color, rgba(99, 99, 99, 0.2))
		transition: border-color 0.15s ease, box-shadow 0.15s ease

		&:focus-within
			border-color: var(--color-primary, #007bff)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, 0.15))

	.si-search__icon
		flex: 0 0 auto
		font-size: 1rem
		color: var(--color-text-secondary, #6c757d)

	// El input pisa la regla global de `input` (borde de 3px + halo en foco): acá el foco lo
	// dibuja la cápsula entera (:focus-within), no el campo.
	.si-search__input
		flex: 1 1 auto
		min-width: 0
		height: 100%
		padding: 0
		border: 0
		border-radius: 0
		background: transparent
		color: var(--color-text-primary, #212529)
		font-size: 1rem
		box-shadow: none
		outline: none

		&:focus
			border: 0
			background: transparent
			box-shadow: none
			outline: none

		&::placeholder
			color: var(--color-text-secondary, #6c757d)
			opacity: 0.8

	.si-search__clear
		flex: 0 0 auto
		display: flex
		align-items: center
		justify-content: center
		width: 28px
		height: 28px
		padding: 0
		border: 0
		border-radius: 50%
		background: transparent
		color: var(--color-text-secondary, #6c757d)
		cursor: pointer
		transition: color 0.15s ease, background 0.15s ease

		&:hover,
		&:focus
			color: var(--color-text-primary, #212529)
			background: var(--bg-hover, #f1f3f5)
			outline: none

		&:focus-visible
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, 0.15))

	.si-search__go
		flex: 0 0 auto
		height: 38px
		padding: 0 20px
		border: 0
		border-radius: 999px
		// #007bff fijo y no --color-primary: en modo oscuro el token pasa a #4da3ff y el texto blanco
		// queda en ~2,6:1. Los botones de acción del sistema (.btn-primary) se mantienen idénticos en
		// los dos modos justamente por eso (_dark_theme.sass).
		background: #007bff
		color: #fff
		font-size: 0.9rem
		font-weight: 600
		line-height: 1
		cursor: pointer
		transition: filter 0.15s ease, opacity 0.15s ease

		&:hover:not(:disabled)
			filter: brightness(0.94)

		&:focus-visible
			outline: none
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, 0.15))

		&:disabled
			opacity: 0.45
			cursor: not-allowed

	// ─── Criterios ───────────────────────────────────────────────────────────
	.si-criteria
		display: flex
		align-items: center
		flex-wrap: wrap
		gap: 8px 12px
		margin-top: 14px

	.si-criteria__label
		font-size: 0.72rem
		font-weight: 600
		letter-spacing: 0.05em
		text-transform: uppercase
		color: var(--color-text-secondary, #6c757d)

	.si-criteria__list
		display: flex
		flex-wrap: wrap
		gap: 8px
		min-width: 0

	.si-chip
		display: inline-flex
		align-items: center
		gap: 9px
		max-width: 100%
		min-height: var(--toolbar-control-h, 36px)
		padding: 4px 16px 4px 12px
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 999px
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		text-align: left
		cursor: pointer
		transition: background 0.15s ease, border-color 0.15s ease

		> i
			flex: 0 0 auto
			font-size: 1.05rem
			line-height: 1
			color: var(--color-text-secondary, #6c757d)

		&:hover:not(:disabled)
			background: var(--bg-hover, #f1f3f5)

		&:focus-visible
			outline: none
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, 0.15))

		// Es el criterio que coincide con lo escrito: azul suave, el mismo que el hover del nav.
		&.is-active
			border-color: var(--color-primary, #007bff)
			background: var(--bg-nav-hover, #e7f1ff)

			> i
				color: var(--color-primary, #007bff)

		&:disabled
			opacity: 0.5
			cursor: not-allowed

	.si-chip__body
		display: flex
		flex-direction: column
		min-width: 0

	.si-chip__name
		font-size: 0.8rem
		font-weight: 600
		line-height: 1.2

	.si-chip__value
		max-width: 150px
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font-size: 0.72rem
		line-height: 1.2
		color: var(--color-text-secondary, #6c757d)

	// ─── Cupo y tiempo de la selección automática ────────────────────────────
	.si-meta
		display: flex
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 8px 16px
		margin-top: 14px

	.si-quota
		display: inline-flex
		align-items: center
		padding: 3px 11px
		border-radius: 999px
		background: var(--bg-section, #f8f9fa)
		color: var(--color-text-secondary, #6c757d)
		font-size: 0.75rem
		font-weight: 600

		// Rojo suave del sistema (--btn-peligro-*): quedan pocas búsquedas, o ninguna.
		&.is-low
			background: var(--btn-peligro-fondo, #fdf3f2)
			color: var(--btn-peligro-texto, #9c3a36)

	// `margin-left: auto` lo deja a la derecha aunque el cupo todavía no haya llegado (el v-if lo
	// oculta hasta que responde google/get-current) y no haya nada a su izquierda.
	.si-timeout
		display: inline-flex
		align-items: center
		gap: 6px
		margin: 0 0 0 auto
		font-size: 0.75rem
		font-weight: 400
		color: var(--color-text-secondary, #6c757d)

		i
			font-size: 0.95rem
			line-height: 1

	.si-timeout__input
		width: 56px
		height: 28px
		padding: 0 6px
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 8px
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		font-size: 0.8rem
		font-weight: 600
		text-align: center
		box-shadow: none

		&:focus
			border: 1px solid var(--color-primary, #007bff)
			background: var(--bg-card, #fff)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, 0.15))
			outline: none

	// ─── Selección automática en curso ───────────────────────────────────────
	// Reemplaza al botón gigante con degradé cónico y texto con contorno negro: ahora es una franja
	// que dice qué pasa, cuánto falta y cómo salir, con la barra de avance abajo.
	.si-auto
		margin-top: 16px
		padding: 12px 14px 0
		overflow: hidden
		border: 1px solid var(--color-primary, #007bff)
		border-radius: 12px
		background: var(--bg-nav-hover, #e7f1ff)

	.si-auto__row
		display: flex
		align-items: center
		justify-content: space-between
		gap: 12px
		padding-bottom: 12px

	.si-auto__text
		display: flex
		align-items: center
		gap: 8px
		min-width: 0
		font-size: 0.85rem
		font-weight: 600
		color: var(--color-text-primary, #212529)

		i
			flex: 0 0 auto
			color: var(--color-primary, #007bff)

	.si-auto__cancel
		flex: 0 0 auto
		height: 30px
		padding: 0 14px
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 999px
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		font-size: 0.8rem
		font-weight: 600
		line-height: 1
		cursor: pointer
		transition: background 0.15s ease

		&:hover,
		&:focus
			background: var(--bg-hover, #f1f3f5)
			outline: none

		&:focus-visible
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, 0.15))

	.si-auto__bar
		height: 3px
		margin: 0 -14px

	.si-auto__fill
		height: 100%
		width: calc(var(--progress, 0) * 100%)
		border-radius: 0 3px 3px 0
		background: var(--color-primary, #007bff)

	// ─── Resultados ──────────────────────────────────────────────────────────
	.si-results,
	.si-loading
		margin-top: 18px

	.si-results__head
		display: flex
		align-items: baseline
		justify-content: space-between
		flex-wrap: wrap
		gap: 2px 12px
		margin-bottom: 10px
		font-size: 0.85rem
		color: var(--color-text-primary, #212529)

		strong
			font-weight: 700

	.si-results__hint
		font-size: 0.75rem
		color: var(--color-text-secondary, #6c757d)

	// 130px de mínimo y no más: con 150 la grilla del teléfono (~312px útiles) no entraba en dos
	// columnas y pasaba a una sola, con cada foto del ancho de la pantalla.
	.si-grid
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr))
		gap: 12px

	// Tarjeta de resultado. El propio <vue-load-image> es la tarjeta: solo renderiza el slot que
	// corresponde a su estado (imagen / preloader / error), así que lo que no cabe en un slot
	// —el cartel "Se elegirá esta" y la barra de avance— va en pseudo-elementos.
	.si-card
		position: relative
		overflow: hidden
		aspect-ratio: 1 / 1
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 12px
		background: var(--bg-section, #f8f9fa)
		cursor: pointer
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease

		&:hover,
		&:focus
			transform: translateY(-2px)
			border-color: var(--color-primary, #007bff)
			box-shadow: 0 6px 16px var(--shadow-color, rgba(99, 99, 99, 0.2))
			outline: none

		// No cargó, o el servidor no pudo bajarla: queda a la vista pero apagada y sin clic.
		&.is-broken
			opacity: 0.5
			pointer-events: none
			cursor: default

		// La que elige la selección automática cuando se cumple el tiempo.
		// Azul fijo y no el token: el cartel de abajo lleva texto blanco y necesita el #007bff para tener
		// contraste en modo oscuro; anillo, cartel y barra usan el mismo para que la tarjeta no se vea
		// con dos azules distintos.
		&.is-target
			border-color: #007bff
			box-shadow: 0 0 0 2px #007bff

			&::before
				content: 'Se elegirá esta'
				position: absolute
				top: 8px
				left: 8px
				z-index: 2
				padding: 3px 9px
				border-radius: 999px
				// Mismo motivo que el botón "Buscar": texto blanco, así que azul fijo.
				background: #007bff
				color: #fff
				font-size: 0.65rem
				font-weight: 600
				line-height: 1.2

			&::after
				content: ''
				position: absolute
				left: 0
				bottom: 0
				z-index: 2
				height: 4px
				width: calc(var(--progress, 0) * 100%)
				background: #007bff

	// `contain` y no `cover`: son fotos de producto, y recortarlas esconde justo lo que se quiere ver.
	.si-card__img
		position: absolute
		top: 0
		left: 0
		width: 100%
		height: 100%
		padding: 8px
		box-sizing: border-box
		object-fit: contain

	.si-card__state
		position: absolute
		top: 0
		left: 0
		width: 100%
		height: 100%
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		gap: 6px
		font-size: 0.75rem
		color: var(--color-text-secondary, #6c757d)

		i
			font-size: 1.4rem
			line-height: 1

	// ─── Cargando ────────────────────────────────────────────────────────────
	.si-loading__status
		display: flex
		align-items: center
		gap: 8px
		margin-bottom: 10px
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)

	.si-skeleton
		aspect-ratio: 1 / 1
		border-radius: 12px
		background: linear-gradient(90deg, var(--bg-section, #f8f9fa) 25%, var(--bg-hover, #f1f3f5) 50%, var(--bg-section, #f8f9fa) 75%)
		background-size: 200% 100%
		animation: si-shimmer 1.4s ease-in-out infinite

	// ─── Estados vacíos: inicial, sin resultados y error ─────────────────────
	// Mismo lenguaje que el estado vacío del campo de imágenes: ícono en círculo, título, detalle.
	.si-empty
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		margin-top: 18px
		padding: 40px 20px
		text-align: center
		border: 1px dashed var(--color-border, #dee2e6)
		border-radius: 12px
		background: var(--bg-section, #f8f9fa)

	.si-empty__icon
		display: flex
		align-items: center
		justify-content: center
		width: 56px
		height: 56px
		margin-bottom: 12px
		border-radius: 50%
		background: var(--bg-card, #fff)
		color: var(--color-text-secondary, #6c757d)
		box-shadow: 0 1px 3px var(--shadow-color, rgba(99, 99, 99, 0.2))

		i
			font-size: 1.5rem
			line-height: 1

	.si-empty--error
		.si-empty__icon
			background: var(--btn-peligro-fondo, #fdf3f2)
			color: var(--btn-peligro-texto, #9c3a36)

	.si-empty__title
		margin: 0
		font-size: 1rem
		font-weight: 600
		color: var(--color-text-primary, #212529)

	.si-empty__detail
		max-width: 380px
		margin: 6px 0 0
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)

	// ─── Teléfono ────────────────────────────────────────────────────────────
	@media (max-width: 575px)
		.si-search__go
			padding: 0 16px

		.si-chip__value
			max-width: 110px

		.si-timeout
			margin-left: 0

		.si-empty
			padding: 32px 16px

// Va en la raíz y no adentro de #search-image: un @keyframes anidado no es portable entre
// compiladores de sass.
@keyframes si-shimmer
	0%
		background-position: 200% 0
	100%
		background-position: -200% 0

// Navegadores sin `aspect-ratio` (Chrome < 88, Safari < 15): las tarjetas tienen hijos absolutos y
// sin esto colapsarían a 0 de alto, sin ninguna imagen a la vista. Se recurre al truco del padding.
@supports not (aspect-ratio: 1 / 1)
	#search-image
		.si-card,
		.si-skeleton
			height: 0
			padding-bottom: 100%

// Quien tenga reducción de movimiento pedida en el sistema no ve el brillo del esqueleto.
@media (prefers-reduced-motion: reduce)
	#search-image
		.si-skeleton
			animation: none

		.si-card
			transition: none
</style>
