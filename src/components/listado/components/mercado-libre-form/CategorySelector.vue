<template>
	<div class="meli-form__seccion">
		<!-- Sin título propio: arriba ya está la etiqueta del campo ("Categoría de Mercado Libre") -->

		<!-- Mientras se trae la categoría que el artículo ya tenía -->
		<p
		v-if="cargando && !categoria"
		class="meli-form__texto">
			Cargando la categoría guardada…
		</p>

		<!-- Categoría elegida -->
		<div
		v-else-if="categoria && !cambiando"
		class="meli-categoria-elegida"
		data-testid="meli-categoria-elegida">
			<div>
				<span class="meli-categoria-elegida__nombre">{{ categoria.meli_category_name }}</span>
				<span
				v-if="categoria.path"
				class="meli-categoria-elegida__ruta">
					{{ categoria.path }}
				</span>
			</div>
			<b-button
			size="sm"
			variant="outline-primary"
			data-testid="meli-cambiar-categoria"
			@click="empezar_a_cambiar">
				Cambiar categoría
			</b-button>
		</div>

		<!-- Elegir la categoría: sugeridas, buscador o árbol -->
		<div v-else>
			<p class="meli-form__texto">
				Elegí en qué categoría de Mercado Libre va este artículo. Tiene que ser la más específica: Mercado Libre solo publica en la última categoría de cada rama.
			</p>

			<div class="meli-modos">
				<b-button
				size="sm"
				:variant="modo == 'sugeridas' ? 'primary' : 'outline-primary'"
				data-testid="meli-modo-sugeridas"
				@click="cambiar_modo('sugeridas')">
					Sugeridas
				</b-button>
				<b-button
				size="sm"
				:variant="modo == 'buscar' ? 'primary' : 'outline-primary'"
				data-testid="meli-modo-buscar"
				@click="cambiar_modo('buscar')">
					Buscar
				</b-button>
				<b-button
				size="sm"
				:variant="modo == 'explorar' ? 'primary' : 'outline-primary'"
				data-testid="meli-modo-explorar"
				@click="cambiar_modo('explorar')">
					Ver todas
				</b-button>
				<b-button
				v-if="cambiando"
				size="sm"
				variant="outline-secondary"
				@click="cambiando = false">
					Dejar la que estaba
				</b-button>
			</div>

			<!-- Sugeridas según el nombre del artículo -->
			<div v-if="modo == 'sugeridas'">
				<div class="meli-form__fila m-b-10">
					<span class="meli-form__texto m-b-0">
						<span v-if="consulta_sugerida">Según el nombre «{{ consulta_sugerida }}»:</span>
						<span v-else>Escribí el nombre del artículo (en «Datos generales») y el sistema te sugiere la categoría.</span>
					</span>
					<b-button
					size="sm"
					variant="link"
					class="p-0"
					data-testid="meli-sugerir-de-nuevo"
					@click="pedir_sugerencias">
						Sugerir de nuevo
					</b-button>
				</div>
				<div
				v-if="sugerencias.length"
				class="meli-resultados">
					<button
					v-for="sugerencia in sugerencias"
					:key="'sugerida-' + sugerencia.category_id"
					type="button"
					class="meli-resultado"
					data-testid="meli-sugerencia"
					@click="elegir(sugerencia.category_id)">
						<span class="meli-resultado__nombre">{{ sugerencia.category_name }}</span>
						<span class="meli-resultado__ruta">{{ sugerencia.path || sugerencia.domain_name }}</span>
					</button>
				</div>
				<p
				v-else-if="sugerencias_pedidas && consulta_sugerida"
				class="meli-form__texto">
					Mercado Libre no sugirió ninguna categoría para ese nombre. Probá con «Buscar» o con «Ver todas».
				</p>
			</div>

			<!-- Buscador de texto libre -->
			<div v-if="modo == 'buscar'">
				<div class="meli-form__fila m-b-10">
					<b-form-input
					v-model="texto_busqueda"
					size="sm"
					class="meli-buscador__input"
					placeholder="Ej: taladro percutor, remera algodón"
					data-testid="meli-buscar-categoria-input"
					@keydown.enter.prevent="buscar"></b-form-input>
					<b-button
					size="sm"
					variant="primary"
					data-testid="meli-buscar-categoria-btn"
					@click="buscar">
						Buscar
					</b-button>
				</div>
				<div
				v-if="resultados_busqueda.length"
				class="meli-resultados">
					<button
					v-for="resultado in resultados_busqueda"
					:key="'buscada-' + resultado.category_id"
					type="button"
					class="meli-resultado"
					data-testid="meli-resultado-busqueda"
					@click="elegir(resultado.category_id)">
						<span class="meli-resultado__nombre">{{ resultado.category_name }}</span>
						<span class="meli-resultado__ruta">{{ resultado.path || resultado.domain_name }}</span>
					</button>
				</div>
				<p
				v-else-if="busqueda_hecha"
				class="meli-form__texto">
					No se encontró ninguna categoría para «{{ ultima_busqueda }}». Probá con otras palabras o con «Ver todas».
				</p>
			</div>

			<!-- Navegación por el árbol de categorías -->
			<div v-if="modo == 'explorar'">
				<div class="meli-arbol__migas">
					<button
					type="button"
					class="meli-arbol__miga"
					@click="explorar(null)">
						Todas
					</button>
					<template v-for="(paso, index) in arbol.path">
						<span :key="'separador-' + paso.id">›</span>
						<button
						v-if="index < arbol.path.length - 1"
						:key="'miga-' + paso.id"
						type="button"
						class="meli-arbol__miga"
						@click="explorar(paso.id)">
							{{ paso.name }}
						</button>
						<strong
						v-else
						:key="'miga-' + paso.id">
							{{ paso.name }}
						</strong>
					</template>
				</div>

				<!-- Llegó a la última categoría de la rama: se puede elegir -->
				<div
				v-if="arbol.hoja && categoria_del_arbol"
				class="meli-form__aviso meli-form__aviso--ok">
					<p class="m-b-5">
						«{{ categoria_del_arbol.name }}» es la última categoría de esta rama.
					</p>
					<b-button
					size="sm"
					variant="primary"
					data-testid="meli-usar-categoria-del-arbol"
					@click="elegir(categoria_del_arbol.id)">
						Usar esta categoría
					</b-button>
				</div>

				<div
				v-if="arbol.categories.length"
				class="meli-arbol__lista">
					<button
					v-for="hija in arbol.categories"
					:key="'hija-' + hija.id"
					type="button"
					class="meli-resultado"
					data-testid="meli-categoria-del-arbol"
					@click="explorar(hija.id)">
						<span class="meli-resultado__nombre">{{ hija.name }}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
/**
 * Elección de la categoría de Mercado Libre del artículo (misión mercado-libre-integracion,
 * 27/10/2026). Parte de mercado-libre-form/Index.vue.
 *
 * Tres maneras de llegar a la categoría:
 * - Sugeridas: el predictor de Mercado Libre según el nombre del artículo
 *   (`GET meli-category-predictor?q=<nombre>` → {categories: [{category_id, category_name,
 *   domain_name, path}]}). Se piden cuando el bloque pasa a verse (IntersectionObserver: al
 *   abrir la solapa o el modal) si no hay sugerencias para el nombre actual, y con "Sugerir de
 *   nuevo"; si cambia el nombre mientras se ve, se vuelven a pedir con una espera (debounce). El
 *   nombre es `model.name` o lo escrito en el campo del nombre (ver `nombre_para_sugerir`).
 * - Buscar: el mismo endpoint con el texto que escribe el usuario.
 * - Ver todas: el árbol de categorías (`GET meli-category-children/{id?}` → {categories: [{id,
 *   name}], path: [{id, name}], hoja}); sin id trae las de primer nivel.
 *
 * Al elegir: `POST meli-category/resolve` {meli_category_id} → {model: categoría con sus
 * atributos} y se emite `elegida` con ese model. Si la categoría no es la última de su rama, la
 * API responde 422 con un mensaje legible, que se muestra tal cual.
 *
 * Los estilos viven en mercado-libre-form/Index.vue.
 */
export default {
	name: 'MeliCategorySelector',
	props: {
		// Categoría ya elegida (model del resolve) o null
		categoria: {
			type: Object,
			default: null,
		},
		// true mientras el padre trae la categoría que el artículo ya tenía
		cargando: {
			type: Boolean,
			default: false,
		},
		// Nombre del artículo, para las sugerencias
		nombre_articulo: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			// true cuando el usuario tocó "Cambiar categoría" sobre una ya elegida
			cambiando: false,
			// 'sugeridas' | 'buscar' | 'explorar'
			modo: 'sugeridas',
			sugerencias: [],
			sugerencias_pedidas: false,
			// Nombre con el que se pidieron las sugerencias que están en pantalla
			consulta_sugerida: null,
			texto_busqueda: '',
			ultima_busqueda: '',
			resultados_busqueda: [],
			busqueda_hecha: false,
			// Nivel del árbol que se está mirando
			arbol: {
				categories: [],
				path: [],
				hoja: false,
			},
			arbol_cargado: false,
			// Espera para volver a sugerir cuando cambia el nombre
			timer_nombre: null,
			// IntersectionObserver que avisa cuando el bloque se ve en pantalla (null si el navegador no lo tiene)
			observador: null,
			// true mientras el bloque está a la vista
			visible: false,
		}
	},
	computed: {
		// true cuando se está mostrando el selector (no hay categoría, o se la está cambiando)
		eligiendo() {
			return !this.cargando && (!this.categoria || this.cambiando)
		},
		// Categoría en la que está parado el árbol (la última de la ruta)
		categoria_del_arbol() {
			if (!this.arbol.path || !this.arbol.path.length) {
				return null
			}
			return this.arbol.path[this.arbol.path.length - 1]
		},
	},
	watch: {
		// Si el nombre cambia mientras se eligen sugeridas, se vuelven a pedir después de una pausa
		nombre_articulo() {
			if (!this.eligiendo || this.modo != 'sugeridas' || !this.se_ve()) {
				return
			}
			clearTimeout(this.timer_nombre)
			this.timer_nombre = setTimeout(() => {
				this.pedir_sugerencias()
			}, 800)
		},
		// Cuando el selector se abre (terminó de cargar sin categoría), se piden las sugerencias si ya se ve
		eligiendo(valor) {
			if (valor && this.se_ve()) {
				this.sugerir_si_hace_falta()
			}
		},
		// Con una categoría nueva elegida, el selector se cierra
		categoria(valor) {
			if (valor) {
				this.cambiando = false
			}
		},
	},
	mounted() {
		/*
			Las sugerencias se piden cuando el bloque SE VE, no cuando se monta. El componente puede
			montarse con el formulario todavía sin nombre (por ejemplo, si el modal abre directo en la
			solapa "Mercado Libre") y el usuario recién escribe el nombre después, en "Datos
			generales". El IntersectionObserver avisa cada vez que el bloque pasa a verse (también al
			volver a esta solapa o al abrirse el modal) y ahí se pide con el nombre de ese momento.
			Sin IntersectionObserver (navegador muy viejo) se pide al montar, como antes.
		*/
		if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function') {
			this.observador = new window.IntersectionObserver(this.al_cambiar_visibilidad, { threshold: 0 })
			this.observador.observe(this.$el)
		} else if (this.eligiendo) {
			this.sugerir_si_hace_falta()
		}
	},
	beforeDestroy() {
		clearTimeout(this.timer_nombre)
		if (this.observador) {
			this.observador.disconnect()
			this.observador = null
		}
	},
	methods: {
		/**
		 * El IntersectionObserver avisó un cambio: si el bloque pasó a verse, se piden las
		 * sugerencias que falten.
		 *
		 * @param {Array} entradas IntersectionObserverEntry del bloque.
		 * @returns {void}
		 */
		al_cambiar_visibilidad(entradas) {
			let visible = entradas.filter(entrada => entrada.isIntersecting).length > 0
			let recien_visible = visible && !this.visible
			this.visible = visible
			if (recien_visible && this.eligiendo) {
				this.sugerir_si_hace_falta()
			}
		},

		/**
		 * true si el bloque está a la vista (o si no hay cómo saberlo).
		 *
		 * @returns {Boolean}
		 */
		se_ve() {
			return !this.observador || this.visible
		},

		/**
		 * Pide las sugerencias si se está eligiendo en "Sugeridas" y todavía no hay sugerencias para
		 * el nombre actual (o nunca se pidieron, para mostrar el aviso de que falta el nombre).
		 *
		 * @returns {void}
		 */
		sugerir_si_hace_falta() {
			if (!this.eligiendo || this.modo != 'sugeridas') {
				return
			}
			let nombre = this.nombre_para_sugerir()
			if (!this.sugerencias_pedidas || (nombre && nombre != this.consulta_sugerida)) {
				this.pedir_sugerencias()
			}
		},

		/**
		 * Nombre con el que se piden las sugerencias: `model.name` o, si está vacío, lo que está
		 * escrito en el campo del nombre.
		 *
		 * 🔴 Por qué se lee el campo: en un artículo NUEVO sin código de barras, el nombre se escribe
		 * en el buscador de NameInput.vue (common-vue/components/search) y vive en la `query` de ese
		 * buscador, no en el modelo. Pasa a `model.name` recién con Enter o al guardar (rama
		 * `set_model_on_click_or_prop_with_query_if_null` de ModelForm.vue). Sin leer el campo,
		 * "Sugeridas" decía "Escribí el nombre…" con el nombre escrito (medido en la verificación
		 * del 27/10/2026). El campo es `#article-name` (el input del buscador) y, si el usuario
		 * escribió en el modal de búsqueda, `#article-name-search-modal-input`. Solo se lee: no se
		 * escribe nada en el modelo, el nombre sigue pasando al artículo como siempre.
		 *
		 * @returns {String}
		 */
		nombre_para_sugerir() {
			let nombre = (this.nombre_articulo || '').trim()
			if (nombre) {
				return nombre
			}
			let campos = ['article-name', 'article-name-search-modal-input']
			let escrito = ''
			campos.forEach(id => {
				if (escrito) {
					return
				}
				let campo = document.getElementById(id)
				if (campo && typeof campo.value == 'string' && campo.value.trim()) {
					escrito = campo.value.trim()
				}
			})
			return escrito
		},

		/**
		 * Abre el selector sobre una categoría ya elegida.
		 *
		 * @returns {void}
		 */
		empezar_a_cambiar() {
			this.cambiando = true
			this.sugerir_si_hace_falta()
		},

		/**
		 * Cambia entre sugeridas, buscador y árbol; el árbol se carga la primera vez que se abre.
		 *
		 * @param {String} modo
		 * @returns {void}
		 */
		cambiar_modo(modo) {
			this.modo = modo
			if (modo == 'explorar' && !this.arbol_cargado) {
				this.explorar(null)
			}
			if (modo == 'sugeridas') {
				this.sugerir_si_hace_falta()
			}
		},

		/**
		 * Pide al predictor de Mercado Libre las categorías sugeridas para el nombre del artículo.
		 *
		 * @returns {void}
		 */
		pedir_sugerencias() {
			let nombre = this.nombre_para_sugerir()
			this.sugerencias_pedidas = true
			if (!nombre) {
				this.sugerencias = []
				this.consulta_sugerida = null
				return
			}

			this.consultar_predictor(nombre)
			.then(categorias => {
				this.consulta_sugerida = nombre
				this.sugerencias = categorias
			})
			.catch(() => {
				this.consulta_sugerida = nombre
				this.sugerencias = []
			})
		},

		/**
		 * Busca categorías con el texto que escribió el usuario.
		 *
		 * @returns {void}
		 */
		buscar() {
			let texto = (this.texto_busqueda || '').trim()
			if (texto.length < 2) {
				this.$toast.info('Escribí al menos dos letras para buscar')
				return
			}

			this.consultar_predictor(texto)
			.then(categorias => {
				this.ultima_busqueda = texto
				this.busqueda_hecha = true
				this.resultados_busqueda = categorias
			})
			.catch(() => {
				this.ultima_busqueda = texto
				this.busqueda_hecha = true
				this.resultados_busqueda = []
			})
		},

		/**
		 * `GET meli-category-predictor?q=` (sugeridas y buscador usan el mismo endpoint).
		 *
		 * @param {String} texto
		 * @returns {Promise<Array>} Resuelve con las categorías; rechaza si falló (ya avisado).
		 */
		consultar_predictor(texto) {
			this.$store.commit('auth/setMessage', 'Buscando categorías en Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			return this.$api.get('meli-category-predictor', {
				params: { q: texto },
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				return Array.isArray(res.data.categories) ? res.data.categories : []
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error(this.mensaje_de_error(err, 'No se pudieron traer las categorías de Mercado Libre'))
				throw err
			})
		},

		/**
		 * Muestra un nivel del árbol de categorías (`null` = primer nivel).
		 *
		 * @param {String|null} meli_category_id
		 * @returns {void}
		 */
		explorar(meli_category_id) {
			let url = meli_category_id
				? 'meli-category-children/' + encodeURIComponent(meli_category_id)
				: 'meli-category-children'

			this.$store.commit('auth/setMessage', 'Cargando categorías de Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			this.$api.get(url, {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.arbol_cargado = true
				this.arbol = {
					categories: Array.isArray(res.data.categories) ? res.data.categories : [],
					path: Array.isArray(res.data.path) ? res.data.path : [],
					hoja: !!res.data.hoja,
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error(this.mensaje_de_error(err, 'No se pudieron traer las categorías de Mercado Libre'))
			})
		},

		/**
		 * Resuelve la categoría elegida (la crea en el sistema con sus atributos si hacía falta) y
		 * se la pasa al padre.
		 *
		 * @param {String} meli_category_id Id de Mercado Libre (ej. MLA5232).
		 * @returns {void}
		 */
		elegir(meli_category_id) {
			this.$store.commit('auth/setMessage', 'Trayendo los datos que pide la categoría')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('meli-category/resolve', {
				meli_category_id: meli_category_id,
			}, {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				if (res.data && res.data.model) {
					this.cambiando = false
					this.$emit('elegida', res.data.model)
				} else {
					this.$toast.error('No se pudo usar esa categoría de Mercado Libre')
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error(this.mensaje_de_error(err, 'No se pudo usar esa categoría de Mercado Libre'))
			})
		},

		/**
		 * Texto legible de un error: el `message` de la API (ej. el 422 de "elegí una categoría
		 * más específica") o uno genérico.
		 *
		 * @param {Object} err Error de axios.
		 * @param {String} generico
		 * @returns {String}
		 */
		mensaje_de_error(err, generico) {
			if (err && err.response && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return generico
		},
	},
}
</script>
