<template>
<div class="variant-grid">

	<div class="variant-grid__header">
		<p class="variant-grid__title">
			Variantes
		</p>

		<div class="variant-grid__actions">
			<!--
				Toggle: por defecto se muestran TODAS las variantes posibles (disponibles o no), para
				poder ir activando las que el negocio realmente tiene sin que las demas desaparezcan.
				Este boton las filtra a solo las disponibles. Si ninguna esta disponible la grilla ya
				muestra todas (ver showing_all), asi que no tendria nada que alternar.
			-->
			<button
			v-if="!none_available && hidden_count"
			type="button"
			class="variant-grid__link-btn"
			@click="show_all = !show_all">
				{{ show_all ? 'Ver solo disponibles' : 'Ver todas las posibles ('+hidden_count+' sin habilitar)' }}
			</button>

			<!-- Acciones masivas de disponibilidad (prompt 519/521), extraidas a sub-componente en el 543 -->
			<bulk-availability
			ref="bulk_availability"
			:article_id="article.id"
			@disponibilidad-actualizada="onDisponibilidadActualizada"></bulk-availability>
		</div>
	</div>

	<!--
		Aviso: las variantes se generan ocultas (no disponibles) a proposito, para que no salgan en Vender
		ni en la tienda sin precio ni stock. Se explica y se ofrece habilitarlas, en vez de dejar la grilla vacia.
	-->
	<div
	v-if="none_available"
	class="variant-grid__notice">
		<span>
			Se generaron {{ variants.length }} variante{{ variants.length == 1 ? '' : 's' }}, pero todavia ninguna esta disponible:
			no se ve en Vender ni en la tienda. Activa las que quieras vender o habilitalas todas.
		</span>
		<button
		type="button"
		class="variant-grid__notice-btn"
		@click="habilitarTodas">
			Habilitar todas
		</button>
	</div>

	<!-- Estado vacio: todavia no hay ninguna variante generada -->
	<p
	v-if="!variants_to_show.length"
	class="variant-grid__empty">
		{{ empty_message }}
	</p>

	<div
	v-else
	class="variant-grid__table-wrapper">
		<table class="variant-grid__table">
			<thead>
				<tr>
					<th>Imagen</th>
					<th>Variante</th>
					<th>Disponible</th>
					<th>Precio</th>
					<!-- Sin depositos (negocio sin sucursales) el stock es uno solo por variante -->
					<th v-if="!addresses.length">Stock</th>
					<th
					v-for="address in addresses"
					:key="address.id">
						{{ address.street }}
					</th>
				</tr>
			</thead>
			<tbody>
				<variant-row
				v-for="variant in variants_to_show"
				:key="variant.id"
				:variant="variant"
				:addresses="addresses"
				@editImage="openImagePicker"></variant-row>
			</tbody>
		</table>
	</div>

	<!--
		Modal unico compartido por todas las filas para cambiar la imagen de una variante: subir
		una desde el equipo o buscarla en Google (mismas piezas que el modal de imagenes del
		listado de articulos).
	-->
	<variant-image-modal :variant_id="editing_variant_id"></variant-image-modal>

	<btn-save></btn-save>
</div>
</template>
<script>
import VariantImageModal from '@/components/listado/modals/article-variants/variant-grid/ImageModal'

export default {
	components: {
		VariantRow: () => import('@/components/listado/modals/article-variants/variant-grid/VariantRow'),
		BtnSave: () => import('@/components/listado/modals/article-variants/variant-grid/BtnSave'),
		// Modal de imagen de la variante (subir desde el equipo / buscar en Google). Se importa en
		// forma sincronica porque se abre con $bvModal.show por id y tiene que estar montado ya.
		VariantImageModal,
		// Acciones masivas de disponibilidad: extraido del orquestador en el prompt 543 para
		// que este no tenga llamadas directas a $api (regla de CLAUDE.md).
		BulkAvailability: () => import('@/components/listado/modals/article-variants/variant-grid/BulkAvailability'),
	},
	data() {
		return {
			// Si es true se muestran TODAS las variantes posibles (incluidas las no disponibles). Es el
			// default: el usuario va activando solo las que tiene y las demas no tienen que desaparecer.
			// En false se muestran solo las disponibles (oculta = false).
			show_all: true,
			// Id de la variante que se esta editando en el modal de imagen compartido (una sola
			// instancia de modal reutilizada por todas las filas, en vez de una por fila).
			editing_variant_id: null,
		}
	},
	computed: {
		/** Articulo cuyas variantes se estan configurando. */
		article() {
			return this.$store.state.article.model
		},
		/** Depositos (address) globales del negocio: definen las columnas de stock. */
		addresses() {
			return this.$store.state.address.models
		},
		/** Propiedades del articulo con sus valores: definen que combinaciones son validas hoy. */
		article_properties() {
			return this.$store.state.article_property.models
		},
		/** Todas las variantes que hay en la base para el articulo (cargadas en showVariants, ver Buttons.vue). */
		stored_variants() {
			return this.$store.state.article_variant.models
		},
		/**
		 * Firmas ("3-8": ids de valor ordenados) de las combinaciones validas hoy, o sea el cartesiano
		 * de las propiedades que tienen al menos un valor. Misma firma que arma el back en
		 * ArticleVariantGeneratorHelper.
		 *
		 * @return {Object} Mapa firma => true.
		 */
		valid_signatures() {
			let groups = this.article_properties
				.filter(property => property.article_property_values && property.article_property_values.length)
				.map(property => property.article_property_values.map(value => value.id))

			let combinations = []

			if (groups.length) {
				combinations = [[]]
				groups.forEach(group => {
					let next_combinations = []
					combinations.forEach(combination => {
						group.forEach(value_id => {
							next_combinations.push(combination.concat([value_id]))
						})
					})
					combinations = next_combinations
				})
			}

			let signatures = {}
			combinations.forEach(combination => {
				signatures[this.signature(combination)] = true
			})
			return signatures
		},
		/**
		 * Variantes que corresponden a las propiedades actuales. El back nunca borra una variante
		 * cuya combinacion dejo de ser valida (puede estar en ventas): solo la oculta. Esas "huerfanas"
		 * (ej: "Plata" de cuando solo existia Color, una vez agregado Talle) no se muestran: la grilla
		 * lista exactamente las combinaciones que anuncia el contador ("Se van a generar 4 variantes").
		 * Una variante sin valores de propiedad (no se puede juzgar) se muestra igual.
		 */
		variants() {
			return this.stored_variants.filter(variant => {
				let values = variant.article_property_values || []
				if (!values.length) {
					return true
				}
				return !!this.valid_signatures[this.signature(values.map(value => value.id))]
			})
		},
		/** Cantidad de variantes no disponibles (oculta = true). */
		hidden_count() {
			return this.variants.filter(variant => variant.oculta).length
		},
		/** Hay variantes generadas pero ninguna disponible: caso tipico recien generadas (nacen ocultas). */
		none_available() {
			return this.variants.length > 0 && this.hidden_count == this.variants.length
		},
		/** Se muestran todas si el usuario lo pidio, o si no hay ninguna disponible (si no, la grilla quedaria vacia). */
		showing_all() {
			return this.show_all || this.none_available
		},
		/** Listado a renderizar segun el filtro "ver todas" vs "solo disponibles". */
		variants_to_show() {
			if (this.showing_all) {
				return this.variants
			}
			return this.variants.filter(variant => !variant.oculta)
		},
		/** Mensaje de estado vacio, distinto segun si hay variantes ocultas para descubrir con "ver todas". */
		empty_message() {
			if (!this.variants.length) {
				return 'Este articulo todavia no tiene variantes generadas. Agrega valores a las propiedades de arriba.'
			}
			return 'No hay variantes disponibles todavia. Proba "Ver todas las posibles" para habilitar alguna.'
		},
	},
	watch: {
		/**
		 * Cuando el back devuelve una variante (al habilitarla, cambiar el precio o la imagen) el
		 * store la reemplaza por una copia nueva, que trae el stock de la base y no lo que el usuario
		 * ya tipeo y todavia no guardo con "Actualizar Stock". Se vuelve a volcar lo pendiente sobre
		 * la copia nueva para que el input no "se borre" delante del usuario.
		 */
		stored_variants() {
			this.reapplyPendingStock()
		},
	},
	created() {
		// Variantes tal como las vio la ultima corrida de reapplyPendingStock (id => objeto). No es
		// reactivo a proposito: solo sirve para detectar que objetos reemplazo el store.
		let known = {}
		this.stored_variants.forEach(variant => {
			known[variant.id] = variant
		})
		this.known_variant_objects = known
	},
	methods: {
		/**
		 * Firma de una combinacion: ids de valor ordenados ascendente y unidos por "-". Igual a la que
		 * arma ArticleVariantGeneratorHelper en el back, para comparar combinaciones sin importar el orden.
		 *
		 * @param {Array} value_ids Ids de article_property_value de la combinacion.
		 * @return {String}
		 */
		signature(value_ids) {
			return value_ids.slice().sort((a, b) => a - b).join('-')
		},
		/**
		 * Abre el modal de imagen para una variante puntual.
		 *
		 * El store de variantes necesita la variante como `model` para borrar su imagen
		 * (article_variant/deleteImageProp lee state.model).
		 *
		 * @param {Object} variant Variante (article_variant) cuya imagen se va a cambiar.
		 */
		openImagePicker(variant) {
			this.$store.commit('article_variant/setModel', {
				model: variant,
				properties: [],
			})
			this.editing_variant_id = variant.id
			this.$bvModal.show('variant-image-modal')
		},
		/**
		 * Vuelca sobre las variantes del store el stock que el usuario ya cargo y todavia no guardo
		 * (la cola variants_to_update del store del articulo): stock global y/o stock por deposito.
		 */
		reapplyPendingStock() {
			let pending = this.$store.state.article.edit_variants_stock.variants_to_update

			// Solo se toca la variante cuyo objeto CAMBIO desde la ultima vez (la que el back devolvio y
			// el store reemplazo). Las demas siguen siendo las mismas que el usuario esta editando: pisarlas
			// le cambiaria el numero mientras escribe.
			let replaced_ids = []
			let known = {}
			this.stored_variants.forEach(variant => {
				if (this.known_variant_objects[variant.id] !== variant) {
					replaced_ids.push(variant.id)
				}
				known[variant.id] = variant
			})
			this.known_variant_objects = known

			pending.forEach(pending_variant => {
				if (replaced_ids.indexOf(pending_variant.id) == -1) {
					return
				}

				let variant = known[pending_variant.id]

				if (typeof pending_variant.stock != 'undefined') {
					variant.stock = pending_variant.stock
				}

				if (!variant.addresses) {
					return
				}

				let pending_addresses = pending_variant.addresses || []

				pending_addresses.forEach(pending_address => {
					let variant_address = variant.addresses.find(_address => _address.id == pending_address.id)

					if (!variant_address) {
						// Variante recien generada: todavia no tiene fila de ese deposito en la base.
						variant_address = {
							id: pending_address.id,
							pivot: {
								amount: 0,
								on_display: 0,
							},
						}
						variant.addresses.push(variant_address)
					}

					if (variant_address.pivot) {
						variant_address.pivot.amount = pending_address.amount
						variant_address.pivot.on_display = pending_address.on_display
					}
				})
			})
		},
		/**
		 * Recarga la grilla de variantes cuando el sub-componente BulkAvailability termina una
		 * accion masiva de disponibilidad (habilitar todas / segun stock / deshabilitar todas).
		 * El orquestador ya no llama al endpoint directamente (prompt 543): solo toma los modelos
		 * actualizados que le pasa el evento y los guarda en el store, igual que antes.
		 *
		 * @param {Array} updated_models Variantes actualizadas devueltas por el endpoint de disponibilidad masiva.
		 */
		onDisponibilidadActualizada(updated_models) {
			this.$store.commit('article_variant/setModels', updated_models)
			// La fila del listado comparte el articulo con el store: se la deja al dia para que, al
			// cerrar y volver a abrir el modal, no cargue las variantes viejas.
			this.$set(this.article, 'article_variants', updated_models)
		},
		/**
		 * Boton "Habilitar todas" del aviso. Delega en BulkAvailability (que es quien pega al endpoint
		 * masivo) para que este orquestador siga sin llamadas directas a $api.
		 */
		habilitarTodas() {
			this.$refs.bulk_availability.setDisponibilidadMasiva('todas')
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.variant-grid
	width: 100%
	&__header
		display: flex
		flex-direction: row
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 10px
		margin-bottom: 12px
	&__title
		font-size: 0.95em
		font-weight: 600
		letter-spacing: 0.02em
		text-transform: uppercase
		color: var(--color-text-secondary, rgba(0, 0, 0, .45))
		margin-bottom: 0
	&__actions
		display: flex
		flex-direction: row
		align-items: center
		gap: 10px
	&__link-btn
		border: none
		background: transparent
		color: var(--color-primary, $blue)
		font-weight: 500
		font-size: 0.9em
		padding: 4px 6px
		cursor: pointer
		&:hover
			text-decoration: underline
	&__notice
		display: flex
		flex-direction: row
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 10px
		background: rgba(0, 122, 255, .08)
		color: #1d1d1f
		border-radius: 12px
		padding: 12px 16px
		margin-bottom: 12px
		font-size: 0.9em
	&__notice-btn
		border: none
		background: $blue
		color: #FFF
		font-weight: 500
		padding: 6px 14px
		border-radius: 10px
		cursor: pointer
		white-space: nowrap
		&:hover
			opacity: .9
	&__empty
		text-align: center
		color: var(--color-text-secondary, rgba(0, 0, 0, .45))
		background: var(--bg-section, #F0F0F3)
		border-radius: 12px
		padding: 18px
		margin: 0
	&__table-wrapper
		width: 100%
		overflow-x: auto
		border-radius: 14px
		border: 1px solid var(--color-border-secondary, rgba(0, 0, 0, .06))
	&__table
		width: 100%
		border-collapse: collapse
		th
			text-align: left
			font-size: 0.8em
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.02em
			color: var(--color-text-secondary, rgba(0, 0, 0, .45))
			background: var(--bg-section, #F7F7F9)
			padding: 10px 12px
			white-space: nowrap
		td
			padding: 10px 12px
			border-top: 1px solid var(--color-border-secondary, rgba(0, 0, 0, .06))
			vertical-align: middle
</style>
