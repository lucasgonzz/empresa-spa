<template>
<div class="article-properties">

	<p class="article-properties__title">
		Propiedades
	</p>

	<!-- Card por cada propiedad ya asignada al articulo (tipo + chips de valores) -->
	<div
	v-for="property in article_properties"
	:key="property.id"
	class="article-properties__card">

		<div class="article-properties__card-header">
			<span class="article-properties__property-name">
				{{ property_type_name(property) }}
			</span>

			<button
			type="button"
			class="article-properties__icon-btn"
			title="Eliminar propiedad"
			@click="deleteProperty(property)">
				<i class="icon-trash"></i>
			</button>
		</div>

		<!-- Chips de los valores ya asignados a esta propiedad, con boton para quitarlos -->
		<div class="article-properties__chips">
			<span
			v-for="value in property.article_property_values"
			:key="value.id"
			class="article-properties__chip">
				{{ value.name }}
				<i
				class="icon-cancel article-properties__chip-remove"
				title="Quitar valor"
				@click="removeValue(property, value)"></i>
			</span>
		</div>

		<!-- Autocomplete (reutiliza el search-component comun) para agregar valores existentes o crearlos al vuelo -->
		<search-component
		:id="'article-property-'+property.id+'-values'"
		:model="property"
		:prop="values_prop"
		model_name="article_property_value"
		placeholder="Agregar valor (ej: Rojo, XL)"
		:show_selected="false"
		:clear_query="true"
		:show_btn_create="false"
		@setSelected="onValueSelected(property, $event)"></search-component>
	</div>

	<!-- Alta de una nueva propiedad: elegir un tipo del catalogo o crear uno nuevo al vuelo -->
	<div class="article-properties__add">
		<search-component
		v-if="adding_property"
		id="new-article-property-type"
		model_name="article_property_type"
		placeholder="Elegi o crea una propiedad (ej: Talle, Color)"
		:show_selected="false"
		:show_btn_create="false"
		@setSelected="onPropertyTypeSelected"></search-component>

		<button
		v-else
		type="button"
		class="article-properties__add-btn"
		@click="adding_property = true">
			<i class="icon-plus"></i>
			Agregar propiedad
		</button>
	</div>

</div>
</template>
<script>
// Modelo declarativo de article_property: se reutiliza la definicion de la prop
// "article_property_values" (belongs_to_many + depends_on) para no duplicar la
// configuracion del autocomplete de valores en este componente.
import article_property_model from '@/models/article_property'

export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	data() {
		return {
			// Muestra el buscador/creador de tipo de propiedad para dar de alta una nueva fila.
			adding_property: false,
		}
	},
	computed: {
		/** Articulo cuyas variantes se estan configurando. */
		article() {
			return this.$store.state.article.model
		},
		/** Propiedades ya asignadas al articulo (cargadas al abrir el modal, ver mixins/call_methods.js -> showVariants). */
		article_properties() {
			return this.$store.state.article_property.models
		},
		/** Variantes ya generadas para el articulo (se usan solo para decidir si vale la pena volver a pedir el diff al back). */
		article_variants() {
			return this.$store.state.article_variant.models
		},
		/** Catalogo global de tipos de propiedad (talle, color, etc), precargado en mixins/call_methods.js. */
		property_types() {
			return this.$store.state.article_property_type.models
		},
		/**
		 * Definicion declarativa de la prop "article_property_values" tomada de models/article_property.js.
		 * Trae el depends_on ('article_property_type_id') que necesita el search-component para filtrar
		 * los valores por tipo y para saber que propiedad setear al crear un valor nuevo al vuelo.
		 */
		values_prop() {
			return article_property_model.properties.find(prop => prop.key == 'article_property_values')
		},
	},
	methods: {
		/**
		 * Nombre visible del tipo de propiedad de una fila (ej: "Talle", "Color").
		 *
		 * @param {Object} property Instancia de article_property.
		 * @return {String}
		 */
		property_type_name(property) {
			if (property.article_property_type) {
				return property.article_property_type.name
			}
			let type = this.property_types.find(_type => _type.id == property.article_property_type_id)
			return type ? type.name : ''
		},
		/**
		 * Se dispara al elegir (o crear al vuelo) un tipo de propiedad para agregarlo al articulo.
		 * Crea el article_property en el back (sin valores todavia) y lo agrega al store local.
		 *
		 * @param {Object} result Payload emitido por search-component: { model, prop, query, ... }.
		 */
		onPropertyTypeSelected(result) {
			// Tipo de propiedad elegido (existente o recien creado por save_if_not_exist).
			let property_type = result.model

			let ya_asignada = this.article_properties.find(property => {
				return property.article_property_type_id == property_type.id
			})
			if (ya_asignada) {
				this.$toast.error('Esa propiedad ya esta asignada a este articulo')
				return
			}

			this.$store.commit('auth/setMessage', 'Agregando propiedad')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('article-property', {
				article_id: this.article.id,
				article_property_type_id: property_type.id,
				article_property_values: [],
			})
			.then(res => {
				this.$store.commit('article_property/add', res.data.model)
				this.adding_property = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudo agregar la propiedad')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
		/**
		 * Se dispara al elegir (o crear al vuelo) un valor para agregarlo a una propiedad puntual.
		 *
		 * @param {Object} property Propiedad (article_property) a la que se le agrega el valor.
		 * @param {Object} result Payload emitido por search-component: { model, prop, ... }.
		 */
		onValueSelected(property, result) {
			// Valor elegido (existente o recien creado por save_if_not_exist).
			let value = result.model

			let ya_agregado = property.article_property_values.find(_value => _value.id == value.id)
			if (ya_agregado) {
				this.$toast.error('Ese valor ya estaba agregado')
				return
			}

			property.article_property_values.push(value)
			this.updatePropertyValues(property)
		},
		/**
		 * Quita un valor de una propiedad (chip con X) y persiste el cambio.
		 *
		 * @param {Object} property Propiedad (article_property) de la que se quita el valor.
		 * @param {Object} value Valor (article_property_value) a quitar.
		 */
		removeValue(property, value) {
			let index = property.article_property_values.findIndex(_value => _value.id == value.id)
			if (index != -1) {
				property.article_property_values.splice(index, 1)
			}
			this.updatePropertyValues(property)
		},
		/**
		 * Persiste los valores actuales de una propiedad (PUT article-property/{id}) y, si corresponde,
		 * le pide al back que recalcule el set de variantes (diff incremental, no destructivo).
		 *
		 * @param {Object} property Propiedad (article_property) ya modificada localmente.
		 */
		updatePropertyValues(property) {
			this.$store.commit('auth/setMessage', 'Guardando valores')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article-property/'+property.id, {
				article_property_type_id: property.article_property_type_id,
				article_property_values: property.article_property_values,
			})
			.then(res => {
				this.$store.commit('article_property/add', res.data.model)
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.maybeRegenerateVariants()
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudieron guardar los valores')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
		/**
		 * Elimina una propiedad completa del articulo. Las variantes que dependian de ella
		 * no se borran: el back (ArticleVariantGeneratorHelper) las marca ocultas en el diff.
		 *
		 * @param {Object} property Propiedad (article_property) a eliminar.
		 */
		deleteProperty(property) {
			this.$store.commit('auth/setMessage', 'Eliminando propiedad')
			this.$store.commit('auth/setLoading', true)

			this.$api.delete('article-property/'+property.id)
			.then(() => {
				let index = this.article_properties.findIndex(_property => _property.id == property.id)
				if (index != -1) {
					this.article_properties.splice(index, 1)
				}
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.maybeRegenerateVariants()
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudo eliminar la propiedad')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
		/**
		 * Le pide al back que recalcule el cartesiano solo cuando tiene sentido: si ya hay alguna
		 * propiedad con valores asignados, o si ya existian variantes generadas antes de este cambio
		 * (en ese caso el diff puede necesitar ocultar combinaciones que dejaron de ser validas).
		 * Corrige el bug historico de este archivo: antes se chequeaba "this.se_asignaron_property_values"
		 * (la referencia a la funcion, siempre truthy) en lugar de invocarla con "()".
		 */
		maybeRegenerateVariants() {
			if (this.se_asignaron_property_values() || this.article_variants.length) {
				this.regenerateVariants()
			}
		},
		/**
		 * Indica si al menos una de las propiedades del articulo tiene algun valor asignado.
		 *
		 * @return {Boolean}
		 */
		se_asignaron_property_values() {
			let se_asignaron_property_values = false

			this.article_properties.forEach(article_property => {
				if (article_property.article_property_values.length) {
					se_asignaron_property_values = true
				}
			})

			return se_asignaron_property_values
		},
		/**
		 * Manda la intencion al back (solo el article_id): el cartesiano y el diff incremental
		 * no destructivo los calcula ArticleVariantGeneratorHelper (prompt 519) a partir de las
		 * article_properties ya persistidas en la base. El front ya no arma ni postea el listado
		 * completo de variantes.
		 */
		regenerateVariants() {
			this.$store.commit('auth/setMessage', 'Generando variantes')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('article-variant', {
				article_id: this.article.id,
			})
			.then(res => {
				this.$store.commit('article_variant/setModels', res.data.models)
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudieron generar las variantes')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.article-properties
	width: 100%
	&__title
		font-size: 0.95em
		font-weight: 600
		letter-spacing: 0.02em
		text-transform: uppercase
		color: rgba(0, 0, 0, .45)
		margin-bottom: 10px
	&__card
		background: #FFF
		border: 1px solid rgba(0, 0, 0, .06)
		border-radius: 14px
		padding: 14px 16px
		margin-bottom: 12px
		box-shadow: 0 1px 2px rgba(0, 0, 0, .04)
	&__card-header
		display: flex
		flex-direction: row
		align-items: center
		justify-content: space-between
		margin-bottom: 10px
	&__property-name
		font-size: 1.05em
		font-weight: 600
		color: #1d1d1f
	&__icon-btn
		border: none
		background: transparent
		color: rgba(0, 0, 0, .35)
		padding: 4px 6px
		border-radius: 8px
		cursor: pointer
		transition: color .15s ease, background .15s ease
		&:hover
			color: #e53935
			background: rgba(229, 57, 53, .08)
	&__chips
		display: flex
		flex-wrap: wrap
		gap: 8px
		margin-bottom: 10px
	&__chip
		display: inline-flex
		align-items: center
		background: #F0F0F3
		color: #1d1d1f
		font-size: 0.9em
		font-weight: 500
		padding: 6px 10px
		border-radius: 999px
	&__chip-remove
		margin-left: 8px
		font-size: 0.8em
		color: rgba(0, 0, 0, .4)
		cursor: pointer
		&:hover
			color: #e53935
	&__add
		margin-top: 4px
	&__add-btn
		display: inline-flex
		align-items: center
		gap: 8px
		border: 1px dashed rgba(0, 122, 255, .4)
		background: rgba(0, 122, 255, .05)
		color: $blue
		font-weight: 500
		padding: 8px 14px
		border-radius: 12px
		cursor: pointer
		transition: background .15s ease
		&:hover
			background: rgba(0, 122, 255, .1)
</style>
