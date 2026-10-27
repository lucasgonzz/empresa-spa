<template>
	<div
	class="meli-form"
	data-testid="meli-form">

		<category-selector
		:categoria="categoria"
		:cargando="cargando_categoria"
		:nombre_articulo="model.name"
		@elegida="al_elegir_categoria"></category-selector>

		<!-- Recién con los valores guardados ya cargados: si se pudiera escribir antes, la respuesta de la API pisaría lo escrito -->
		<attributes-form
		v-if="categoria && valores_inicializados"
		:atributos="atributos"
		:valores="valores"
		:fuentes_automaticas="fuentes_automaticas"
		@cambio="al_cambiar_valor"></attributes-form>

		<!-- Estado de la publicación (solo artículo ya guardado): al final, como resumen de lo que falta -->
		<estado-publicacion
		v-if="model.id"
		:article_id="model.id"></estado-publicacion>
	</div>
</template>
<script>
/**
 * Bloque "Mercado Libre" del formulario del artículo (misión mercado-libre-integracion,
 * 27/10/2026). Listado.vue lo monta en el lugar de la prop `meli_category_id` con
 * `<template #meli_category_id>`.
 *
 * Orquesta tres partes:
 * - CategorySelector: elegir la categoría de Mercado Libre (sugerencias según el nombre del
 *   artículo, buscador libre y navegación por el árbol). Devuelve la categoría ya resuelta por
 *   `POST meli-category/resolve`, con sus atributos.
 * - AttributesForm: los datos que pide esa categoría (requeridos primero).
 * - EstadoPublicacion: el estado de la publicación en Mercado Libre (solo artículo guardado).
 *
 * 🔴 Cómo viaja lo que se elige acá: en el MISMO POST/PUT del artículo. El formulario genérico
 * (common-vue/components/model/Index.vue, `getModelToSend()`) manda una copia del modelo entero
 * (`{...this.model}`), y el modelo del formulario es `$store.state.article.model` (el artículo
 * tiene full_reactivity). Así que alcanza con dejar en ese objeto:
 * - `meli_category_id`: id LOCAL de la categoría (el `id` que devuelve el resolve).
 * - `meli_attributes`: [{meli_attribute_id, value_id, value_name}], con `meli_attribute_id` = id
 *   local del atributo (el `id` de cada atributo del resolve). Solo los que tienen valor: la API
 *   reemplaza los atributos del artículo con esta lista.
 * Por eso funciona igual al CREAR un artículo (sin id): no hace falta guardar nada aparte.
 *
 * `meli_attributes` se agrega recién cuando el usuario toca un atributo o cambia la categoría.
 * Un artículo abierto y guardado sin tocar esta solapa no manda la clave y la API no pisa sus
 * atributos (la API solo los toca si el pedido trae la clave). Listado.vue la saca del modelo al
 * cerrarse el formulario, para que una edición cancelada no viaje en el próximo guardado.
 *
 * Este componente se destruye y se vuelve a montar cada vez que el usuario cambia de solapa en
 * el formulario: lo editado en esta sesión se recupera de `model.meli_attributes`, y la
 * categoría resuelta, del cache del store `meli`.
 */
export default {
	name: 'MercadoLibreForm',
	components: {
		CategorySelector: () => import('@/components/listado/components/mercado-libre-form/CategorySelector'),
		AttributesForm: () => import('@/components/listado/components/mercado-libre-form/AttributesForm'),
		EstadoPublicacion: () => import('@/components/listado/components/mercado-libre-form/EstadoPublicacion'),
	},
	data() {
		return {
			// Categoría resuelta: {id, meli_category_id, meli_category_name, path, listing_allowed, max_title_length, atributos}
			categoria: null,
			// true mientras se trae la categoría que el artículo ya tenía guardada
			cargando_categoria: false,
			// Valores de los atributos por id local del atributo: {value_id, value_name}
			valores: {},
			// Valores guardados del artículo (GET article-meli-attribute), hasta que se mapean a la categoría
			guardados: null,
			// true una vez que `valores` quedó armado: desde ahí manda lo que edita el usuario
			valores_inicializados: false,
		}
	},
	computed: {
		// El artículo del formulario (mismo objeto que se manda al guardar)
		model() {
			return this.$store.state.article.model
		},
		// Atributos de la categoría elegida
		atributos() {
			if (!this.categoria || !Array.isArray(this.categoria.atributos)) {
				return []
			}
			return this.categoria.atributos
		},
		/*
			De dónde sale cada atributo que la API completa sola si el usuario no lo carga (`auto`
			del resolve): la marca, el código de barras y el SKU (o el código del proveedor). Se
			muestran en el formulario para que el usuario vea qué valor se va a usar.
		*/
		fuentes_automaticas() {
			return {
				brand: this.nombre_de_la_marca(),
				bar_code: this.model.bar_code || null,
				sku: this.model.sku || this.model.provider_code || null,
			}
		},
	},
	watch: {
		// Cuando ya están la categoría y los valores guardados, se mapean unos sobre otros
		categoria() {
			this.inicializar_valores()
		},
		guardados() {
			this.inicializar_valores()
		},
	},
	created() {
		this.cargar_categoria_guardada()
		this.cargar_valores()
	},
	methods: {
		/**
		 * Trae la categoría que el artículo ya tenía, con sus atributos.
		 *
		 * El artículo guarda el id LOCAL; el resolve pide el id de Mercado Libre (ej. MLA5232).
		 * El listado ya trae la relación `meli_category` con ese id; si no vino, se pide la
		 * categoría local (`GET meli-category/{id}`).
		 *
		 * @returns {void}
		 */
		cargar_categoria_guardada() {
			let id_local = this.model.meli_category_id
			if (!id_local) {
				return
			}

			let cache = this.$store.state.meli.categorias_resueltas[id_local]
			if (cache) {
				this.categoria = cache
				return
			}

			this.cargando_categoria = true

			let relacion = this.model.meli_category
			if (relacion && relacion.id == id_local && relacion.meli_category_id) {
				this.resolver_categoria_guardada(relacion.meli_category_id)
				return
			}

			this.$store.commit('auth/setMessage', 'Cargando la categoría de Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('meli-category/' + id_local, {
				skip_global_error_event: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				if (res.data.model && res.data.model.meli_category_id) {
					this.resolver_categoria_guardada(res.data.model.meli_category_id)
				} else {
					this.cargando_categoria = false
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.cargando_categoria = false
				console.log(err)
				this.$toast.error('No se pudo cargar la categoría de Mercado Libre del artículo. Podés elegirla de nuevo.')
			})
		},

		/**
		 * Resuelve (con sus atributos) la categoría guardada del artículo.
		 *
		 * @param {String} meli_category_id Id de Mercado Libre de la categoría.
		 * @returns {void}
		 */
		resolver_categoria_guardada(meli_category_id) {
			this.$store.commit('auth/setMessage', 'Cargando la categoría de Mercado Libre')
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
				this.cargando_categoria = false
				let categoria = res.data.model
				if (categoria) {
					this.$store.commit('meli/guardar_categoria_resuelta', categoria)
					this.categoria = categoria
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.cargando_categoria = false
				console.log(err)
				let mensaje = 'No se pudo cargar la categoría de Mercado Libre del artículo. Podés elegirla de nuevo.'
				if (err && err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje)
			})
		},

		/**
		 * Carga los valores de los atributos: los editados en esta sesión del formulario (si el
		 * usuario ya pasó por esta solapa) o, si no, los guardados del artículo.
		 *
		 * @returns {void}
		 */
		cargar_valores() {
			if (Array.isArray(this.model.meli_attributes)) {
				let guardados = []
				this.model.meli_attributes.forEach(fila => {
					guardados.push({
						meli_attribute_id: fila.meli_attribute_id,
						meli_id: null,
						value_id: fila.value_id,
						value_name: fila.value_name,
					})
				})
				this.guardados = guardados
				return
			}

			if (!this.model.id) {
				this.guardados = []
				return
			}

			this.$store.commit('auth/setMessage', 'Cargando los datos de Mercado Libre del artículo')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('article-meli-attribute/' + this.model.id, {
				skip_global_error_event: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				let guardados = []
				let filas = Array.isArray(res.data.models) ? res.data.models : []
				filas.forEach(fila => {
					guardados.push({
						meli_attribute_id: fila.meli_attribute_id,
						meli_id: fila.meli_attribute ? fila.meli_attribute.meli_id : null,
						value_id: fila.value_id,
						value_name: fila.value_name,
					})
				})
				this.guardados = guardados
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.guardados = []
				console.log(err)
				this.$toast.error('No se pudieron cargar los datos de Mercado Libre guardados del artículo')
			})
		},

		/**
		 * Arma `valores` (por id local del atributo) a partir de los guardados, cuando ya están la
		 * categoría y los guardados.
		 *
		 * Cada guardado se busca primero por id local y, si no coincide, por el id de Mercado Libre
		 * del atributo (ej. BRAND): si la categoría local se resolvió con otro id (categorías
		 * repetidas en la base), los valores se siguen viendo.
		 *
		 * @returns {void}
		 */
		inicializar_valores() {
			if (this.valores_inicializados || !this.categoria || this.guardados === null) {
				return
			}
			let valores = {}
			this.atributos.forEach(atributo => {
				let guardado = this.guardados.find(g => g.meli_attribute_id == atributo.id)
				if (!guardado) {
					guardado = this.guardados.find(g => g.meli_id && g.meli_id == atributo.meli_id)
				}
				if (guardado && (guardado.value_id || guardado.value_name)) {
					valores[atributo.id] = {
						value_id: guardado.value_id || null,
						value_name: guardado.value_name || null,
					}
				}
			})
			this.valores = valores
			this.valores_inicializados = true
		},

		/**
		 * El usuario eligió otra categoría: queda en el artículo y los valores que ya había
		 * cargados pasan a los atributos equivalentes de la categoría nueva (mismo id de Mercado
		 * Libre, ej. marca y modelo); el resto se descarta porque esa categoría no los pide.
		 *
		 * @param {Object} categoria `model` de `POST meli-category/resolve`.
		 * @returns {void}
		 */
		al_elegir_categoria(categoria) {
			let valores_por_meli_id = {}
			this.atributos.forEach(atributo => {
				if (this.valores[atributo.id]) {
					valores_por_meli_id[atributo.meli_id] = this.valores[atributo.id]
				}
			})

			this.$store.commit('meli/guardar_categoria_resuelta', categoria)

			let valores = {}
			let atributos_nuevos = Array.isArray(categoria.atributos) ? categoria.atributos : []
			atributos_nuevos.forEach(atributo => {
				if (valores_por_meli_id[atributo.meli_id]) {
					valores[atributo.id] = valores_por_meli_id[atributo.meli_id]
				}
			})

			/*
				Desde acá mandan los valores de la categoría nueva: con la bandera prendida, ni el
				watch de `categoria` ni una respuesta tardía de los valores guardados (si el usuario
				eligió antes de que llegara) vuelven a armar `valores` encima de esto.
			*/
			this.valores_inicializados = true
			this.categoria = categoria
			this.valores = valores

			this.$set(this.model, 'meli_category', {
				id: categoria.id,
				meli_category_id: categoria.meli_category_id,
				meli_category_name: categoria.meli_category_name,
			})
			this.sincronizar_modelo()
			this.$toast.success('Categoría elegida. Se guarda junto con el artículo.')
		},

		/**
		 * El usuario cambió el valor de un atributo.
		 *
		 * @param {Object} cambio {atributo, value_id, value_name}
		 * @returns {void}
		 */
		al_cambiar_valor(cambio) {
			let value_name = cambio.value_name
			if (typeof value_name == 'string') {
				value_name = value_name.trim() == '' ? null : value_name
			}
			if (!cambio.value_id && !value_name) {
				this.$delete(this.valores, cambio.atributo.id)
			} else {
				this.$set(this.valores, cambio.atributo.id, {
					value_id: cambio.value_id || null,
					value_name: value_name || null,
				})
			}
			this.sincronizar_modelo()
		},

		/**
		 * Deja en el artículo la categoría y los atributos con valor, que es lo que viaja en el
		 * POST/PUT del artículo (ver el comentario del componente).
		 *
		 * @returns {void}
		 */
		sincronizar_modelo() {
			if (!this.categoria) {
				return
			}
			if (this.model.meli_category_id != this.categoria.id) {
				this.$set(this.model, 'meli_category_id', this.categoria.id)
			}
			let lista = []
			this.atributos.forEach(atributo => {
				let valor = this.valores[atributo.id]
				if (valor && (valor.value_id || valor.value_name)) {
					lista.push({
						meli_attribute_id: atributo.id,
						value_id: valor.value_id,
						value_name: valor.value_name,
					})
				}
			})
			this.$set(this.model, 'meli_attributes', lista)
		},

		/**
		 * Nombre de la marca del artículo: de la relación que trae el artículo o, si no, del
		 * listado de marcas del store.
		 *
		 * @returns {String|null}
		 */
		nombre_de_la_marca() {
			let brand_id = this.model.brand_id
			if (!brand_id) {
				return null
			}
			if (this.model.brand && this.model.brand.id == brand_id && this.model.brand.name) {
				return this.model.brand.name
			}
			let marcas = this.$store.state.brand ? this.$store.state.brand.models : []
			let marca = Array.isArray(marcas) ? marcas.find(m => m.id == brand_id) : null
			return marca ? marca.name : null
		},
	},
}
</script>
<style lang="sass">
// Estilos del bloque de Mercado Libre del formulario del artículo y de sus tres partes
// (CategorySelector, AttributesForm, EstadoPublicacion), que no declaran estilos propios.
// Colores solo con los tokens del tema (_dark_theme.sass): queda bien en claro y en oscuro.
.meli-form
	width: 100%

	.meli-form__seccion
		margin-bottom: 16px
		padding: 14px 16px
		border: 1px solid var(--color-border)
		border-radius: 12px
		background: var(--bg-card)

	.meli-form__titulo
		margin: 0 0 8px
		font-size: 14px
		font-weight: 600
		color: var(--color-text-primary)

	.meli-form__texto
		margin: 0 0 8px
		font-size: 13px
		line-height: 1.5
		color: var(--color-text-secondary)

	.meli-form__fila
		display: flex
		align-items: center
		flex-wrap: wrap
		gap: 8px 12px

	.meli-form__aviso
		margin: 0 0 10px
		padding: 10px 12px
		border-radius: 10px
		font-size: 13px
		line-height: 1.5
		background: var(--bg-section)
		color: var(--color-text-secondary)

	.meli-form__aviso--alerta
		background: var(--bg-warning-soft)
		color: var(--color-text-warning-strong)

	.meli-form__aviso--ok
		background: var(--bg-info-soft)

	.meli-form__aviso--error
		background: var(--bg-danger-soft)
		color: var(--color-text-danger-strong)

	.meli-form__lista
		margin: 4px 0 0
		padding-left: 18px

		li
			margin-bottom: 4px

	.badge
		padding: 5px 10px
		border-radius: 999px
		font-size: 11px
		font-weight: 600

	// Categoría elegida
	.meli-categoria-elegida
		display: flex
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 10px

	.meli-categoria-elegida__nombre
		display: block
		font-size: 15px
		font-weight: 600
		color: var(--color-text-primary)

	.meli-categoria-elegida__ruta
		display: block
		font-size: 12px
		line-height: 1.4
		color: var(--color-text-secondary)
		word-break: break-word

	// Selector de modo (sugeridas / buscar / explorar)
	.meli-modos
		display: flex
		flex-wrap: wrap
		gap: 6px
		margin: 8px 0 12px

	// Buscador de categorías: el campo ocupa lo que deja el botón
	.meli-buscador__input
		flex: 1
		min-width: 180px

	// Resultados del predictor y del buscador
	.meli-resultados
		display: flex
		flex-direction: column
		gap: 6px

	.meli-resultado
		width: 100%
		padding: 10px 12px
		text-align: left
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-card)
		color: var(--color-text-primary)
		cursor: pointer
		transition: border-color .15s ease, background .15s ease

		&:hover,
		&:focus
			border-color: var(--color-primary)
			background: var(--bg-hover)
			outline: none

	.meli-resultado__nombre
		display: block
		font-size: 14px
		font-weight: 600

	.meli-resultado__ruta
		display: block
		font-size: 12px
		line-height: 1.4
		color: var(--color-text-secondary)
		word-break: break-word

	// Navegación por el árbol
	.meli-arbol__migas
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 4px
		margin-bottom: 10px
		font-size: 12px
		color: var(--color-text-secondary)

	.meli-arbol__miga
		padding: 0
		border: 0
		background: none
		color: var(--color-primary)
		cursor: pointer
		font-size: 12px

	.meli-arbol__lista
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
		gap: 6px

	// Atributos de la categoría
	.meli-atributos__grilla
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))
		gap: 12px 16px
		margin-top: 8px

	.meli-atributo
		min-width: 0

	.meli-atributo__nombre
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 6px
		margin-bottom: 4px
		font-size: 13px
		font-weight: 600
		color: var(--color-text-primary)

	.meli-atributo__marca
		padding: 1px 7px
		border-radius: 999px
		font-size: 10px
		font-weight: 600
		background: var(--bg-warning-soft)
		color: var(--color-text-warning-strong)

	.meli-atributo__marca--condicional
		background: var(--bg-section)
		color: var(--color-text-secondary)

	.meli-atributo__ayuda
		display: block
		margin-top: 3px
		font-size: 11px
		line-height: 1.4
		color: var(--color-text-secondary)

	.meli-atributo--falta
		.form-control,
		.custom-select
			border-color: var(--color-text-warning-strong)

	.meli-atributos__opcionales
		margin-top: 14px
		padding-top: 12px
		border-top: 1px solid var(--color-border-secondary)

@media (max-width: 575px)
	.meli-form
		.meli-form__seccion
			padding: 12px

		.meli-modos
			.btn
				flex: 1

		.meli-categoria-elegida
			.btn
				width: 100%
</style>
