<template>
	<!--
		El ancla aparece solo en la lista que el recorrido señala. Listado elige la misma lista
		para la tarjeta y sus opciones, aunque haya varias.
	-->
	<div
	:data-tour="es_primera_lista ? 'listado.tarjeta_lista_precio' : null"
	class="cont-inputs card article-price-list-card">
		<h3 class="article-price-list-card__nombre">{{ price_type.name }}</h3>

		<div v-if="es_precio_final" class="price-type-card__campos">
			<price-type-monedas
			v-if="mostrar_precio_final_por_moneda"
			:article_price_type="article_price_type"
			solo_lectura></price-type-monedas>
			<final-price v-else en_tarjeta></final-price>
			<div
			class="price-type-card__interruptor"
			:data-tour="precio_final_manual ? null : 'listado.campo_precio_manual'">
				<b-form-checkbox
				switch
				:checked="precio_final_manual"
				:disabled="!puede_cambiar_modo_precio_final"
				@change="cambiar_modo_precio_final">
					Setear precio final
				</b-form-checkbox>
				<div class="price-type-card__interruptor-ayuda">
					{{ precio_final_manual ? 'Cargá el precio a mano.' : 'El sistema calcula el precio a partir del margen.' }}
				</div>
			</div>
			<b-form-group
			v-if="precio_final_manual"
			class="price-type-card__campo"
			label="Precio final">
				<price-input></price-input>
			</b-form-group>
			<b-form-group
			v-else-if="can('article.percentage_gain')"
			class="price-type-card__campo"
			label="Margen de ganancia">
				<percentage-gain-input></percentage-gain-input>
			</b-form-group>

			<options-price-type
			v-if="article_price_type"
			:price_type_store="price_type"
			:article_price_type="article_price_type"
			:mostrar_interruptor="false"></options-price-type>
		</div>

		<price-type-monedas
		v-else-if="article_price_type && hasExtencion('ventas_en_dolares')"
		:ref="'ptMonedas-'+price_type.id"
		:anclar_opciones="anclar_opciones"
		:article_price_type="article_price_type"></price-type-monedas>

		<div
		v-else-if="article_price_type"
		class="w-100">
			
			<cont-price-type
			:article_price_type="article_price_type"></cont-price-type>

			<options-price-type
			:price_type_store="price_type"
			:es_primera_lista="anclar_opciones"
			:article_price_type="article_price_type"></options-price-type>
		</div>

		<p
		v-if="!es_precio_final && article.id && !lista_en_articulo"
		class="price-type-card__origen mb-0 mt-2"
		role="status">
			{{ pedido_precio ? 'Cargando el precio de esta lista…' : 'El precio se calcula al guardar el artículo.' }}
		</p>

		<!--
			Mision catalogo-por-lista-tienda (5/10/2026): "Visible en la tienda para esta lista".
			Escribe `pivot.visible_en_tienda` del articulo para ESTA lista (columna
			`article_price_type.visible_en_tienda`, contrato C1): con la lista restringida, la
			tienda le muestra el articulo a los compradores de esta lista solo si esta en 1.

			🔴 Va aca, DESPUES del v-if/v-else, y no adentro de OptionsPriceType: asi el mismo bloque
			cubre las dos ramas, la normal y la de `ventas_en_dolares` (PriceTypeMonedas, que ni
			siquiera recibe `price_type_store` y no se toca).

			Solo aparece con la extension `online` Y la lista restringida (ver
			`mostrar_visible_en_tienda`): una cuenta sin tienda, o una lista sin restriccion, ve la
			tarjeta exactamente como antes.

			🔴 El `data-testid` va en el div envolvente y NO en el b-form-checkbox: ese componente
			baja los atributos sueltos al <input>, que en Bootstrap 4 es el control invisible detras
			del label (mismo problema que se midio con el `data-tour` de PriceTypeMonedas). El
			discriminante va ADELANTE y el id de la lista al final: la tarjeta se dibuja una vez por
			lista, asi que cada valor sale una sola vez en pantalla.
		-->
		<div
		v-if="mostrar_visible_en_tienda"
		:data-testid="'visible-en-tienda-lista-'+price_type.id"
		class="price-type-card__tienda"
		:class="{ 'price-type-card__tienda--separada': tienda_lleva_separador }">
			<b-form-checkbox
			variant="success"
			:value="1"
			:unchecked-value="0"
			v-model="article_price_type.pivot.visible_en_tienda"
			size="sm">
				Visible en la tienda para esta lista
			</b-form-checkbox>
			<div class="price-type-card__tienda-ayuda">
				Esta lista muestra en la tienda solo los artículos habilitados. El artículo también tiene que estar «Disponible en la tienda» (solapa Tienda online) para verse.
			</div>
		</div>
	</div>
</template>
<script>
import { usa_algun_margen, usa_precio_manual } from '@/utils/criterio_de_precio'

export default {
	props: {
		price_type: Object,
		es_primera_lista: Boolean,
		anclar_opciones: Boolean,
	},
	components: {
		PriceTypeMonedas: () => import('@/components/listado/components/price-type-input/PriceTypeMonedas'),
		ContPriceType: () => import('@/components/listado/components/price-type-input/ContPriceType'),
		OptionsPriceType: () => import('@/components/listado/components/price-type-input/OptionsPriceType'),
		FinalPrice: () => import('@/components/listado/components/modal-props/FinalPrice'),
		PercentageGainInput: () => import('@/components/listado/components/modal-props/PercentageGainInput'),
		PriceInput: () => import('@/components/listado/components/modal-props/PriceInput'),
	},
	computed: {
		es_precio_final() {
			return Number(this.price_type.es_precio_final) === 1
		},
		article() {
			return this.$store.state.article.model
		},
		precio_final_manual() {
			return this.modo_precio_final === null ? usa_precio_manual(this.article) : this.modo_precio_final
		},
		puede_cambiar_modo_precio_final() {
			return this.can('article.percentage_gain') || !usa_algun_margen(this.article)
		},
		article_price_type() {
			return this.lista_en_articulo || this.local_article_price_type
		},
		lista_en_articulo() {
			return (this.article.price_types || []).find(price_type => price_type.id == this.price_type.id)
		},
		mostrar_precio_final_por_moneda() {
			return this.article.id && this.article_price_type
				&& this.hasExtencion('ventas_en_dolares')
				&& this.$store.state.moneda.models.length
				&& (this.article.price_type_monedas || []).some(item => item.price_type_id == this.price_type.id)
		},
		recalculo_de_precios() {
			return this.$store.state.global_notification.price_stats
		},
		/**
		 * ¿Se muestra el check "Visible en la tienda para esta lista"? (mision catalogo-por-lista-tienda)
		 *
		 * Solo si la cuenta tiene tienda (`online`) y ESTA lista esta restringida en la tienda. Con
		 * cualquiera de las dos en falso la tarjeta queda como estaba.
		 *
		 * 🔴 Comparacion SUELTA (`== 1`) a proposito: la columna llega de la API como 0/1, null o
		 * string ("1") segun el driver. Con `=== 1` un "1" string esconderia el check. Nunca
		 * `!= 0`: NULL tambien es "sin restriccion" (contrato C1).
		 *
		 * @returns {Boolean}
		 */
		mostrar_visible_en_tienda() {
			return this.article_price_type
				&& this.hasExtencion('online')
				&& this.price_type.catalogo_restringido_en_tienda == 1
		},
		/**
		 * ¿El bloque de la tienda lleva su propia linea separadora arriba?
		 *
		 * Se busca no apilar dos separadores ni dejar el check pegado a los datos calculados:
		 * - con `ventas_en_dolares` lo que queda arriba es el <hr> con el que PriceTypeMonedas
		 *   cierra cada moneda: ya hay separador;
		 * - con "Incluir en Excel" visible (OptionsPriceType, extension
		 *   `elegir_si_incluir_lista_de_precios_de_excel`), ese bloque ya trae su linea arriba y
		 *   los dos checks quedan juntos debajo de ella, como un solo grupo de opciones;
		 * - si no hay ninguna de las dos, arriba quedan los datos calculados y la linea hace falta.
		 *
		 * @returns {Boolean}
		 */
		tienda_lleva_separador() {
			if (this.hasExtencion('ventas_en_dolares')) {
				return this.es_precio_final && !this.mostrar_precio_final_por_moneda
			}
			return !this.hasExtencion('elegir_si_incluir_lista_de_precios_de_excel')
		},
	},
	data() {
		return {
			local_article_price_type: null,
			modo_precio_final: null,
			precio_manual_anterior: null,
			margen_anterior: null,
			pedido_precio: null,
		}
	},
	watch: {
		article: {
			handler: 'init_article_price_type',
			immediate: true
		},
		recalculo_de_precios(corrida) {
			if (corrida && corrida.origen === 'tipo_de_precio') {
				this.cargar_precio_pendiente()
			}
		},
		local_article_price_type: {
			handler(lista, anterior) {
				// En una ficha existente, la fila provisional solo viaja si alguien la edita.
				if (lista && !this.lista_en_articulo && (!this.article.id || lista === anterior)) {
					this.$set(this.article, 'price_types', (this.article.price_types || []).concat(lista))
				}
			},
			deep: true
		}
	},
	methods: {
		cambiar_modo_precio_final(manual) {
			this.modo_precio_final = manual
			if (manual) {
				this.margen_anterior = {
					valor: this.article.percentage_gain,
					usar_proveedor: this.article.apply_provider_percentage_gain,
				}
				this.$set(this.article, 'percentage_gain', null)
				this.$set(this.article, 'apply_provider_percentage_gain', 0)
				if (this.precio_manual_anterior !== null) {
					this.$set(this.article, 'price', this.precio_manual_anterior)
				}
			} else {
				this.precio_manual_anterior = this.article.price
				this.$set(this.article, 'price', null)
				if (this.margen_anterior) {
					this.$set(this.article, 'percentage_gain', this.margen_anterior.valor)
					this.$set(this.article, 'apply_provider_percentage_gain', this.margen_anterior.usar_proveedor)
				}
			}
		},
		init_article_price_type() {
			this.modo_precio_final = null
			this.precio_manual_anterior = null
			this.margen_anterior = null
			this.local_article_price_type = this.lista_en_articulo ? null : {
				id: this.price_type.id,
				pivot: {
					price_type_id: this.price_type.id,
					incluir_en_excel_para_clientes: this.price_type.incluir_en_lista_de_precios_de_excel,
					visible_en_tienda: 0,
					...(!this.es_precio_final && {
						percentage: this.price_type.percentage ?? '',
						final_price: '',
						setear_precio_final: this.price_type.setear_precio_final,
					}),
				},
			}
			this.cargar_precio_pendiente()
		},
		cargar_precio_pendiente() {
			if (!this.article.id || this.lista_en_articulo || this.pedido_precio === this.article) {
				return
			}
			const article = this.article
			this.pedido_precio = article
			this.$api.get('article/' + article.id, { skip_global_error_event: true })
			.then(res => {
				// Se incorpora solo la lista que faltaba. La ficha puede tener cambios sin guardar.
				if (this._isDestroyed || this.article !== article || this.lista_en_articulo) {
					return
				}
				let actualizado = res.data.model
				let lista = (actualizado.price_types || []).find(item => item.id == this.price_type.id)
				if (lista) {
					let monedas_del_articulo = article.price_type_monedas || []
					let monedas_nuevas = (actualizado.price_type_monedas || []).filter(item => {
						return item.price_type_id == lista.id
							&& !monedas_del_articulo.some(moneda => moneda.price_type_id == lista.id && moneda.moneda_id == item.moneda_id)
					})
					this.$set(article, 'price_types', (article.price_types || []).concat(lista))
					this.$set(article, 'price_type_monedas', monedas_del_articulo.concat(monedas_nuevas))
				}
			})
			.catch(() => {})
			.finally(() => {
				if (this.pedido_precio === article) this.pedido_precio = null
			})
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
// 🔴 Toda esta hoja tenia su version oscura escrita adentro de `@if ($theme == 'dark')`, que es
// codigo muerto: `$theme` es una variable de COMPILACION fijada en 'light' en _custom.scss, asi que
// esa rama no se compilo nunca. El resultado era el que Lucas reporto el 7/9/2026: en la solapa de
// Precios "todo el texto extra aparece oscuro", porque los rgba(0, 0, 0, ...) seguian ahi sobre la
// tarjeta oscura. Se convierte a los tokens de _dark_theme.sass, que si cambian con la clase
// `html.dark-mode`, dejando como fallback el literal claro de HOY: el modo claro no se mueve.

// El verde del precio de la lista no tiene token global --los de _dark_theme.sass son de superficie
// y de texto, no de acento-- asi que se declara aca con la misma mecanica que usa
// _desglose_precio.sass para sus acentos. El valor claro es exactamente el de hoy y el oscuro es el
// que ya estaba escrito en la rama muerta: no se elige nada nuevo, se rescata lo que habia.
:root
	--price-type-precio: #28a745

html.dark-mode
	--price-type-precio: #5dd879

.article-price-list-card
	min-width: 0
	padding: 16px
	border-color: var(--color-border-secondary, #dce1e7)
	border-radius: 14px
	box-shadow: 0 1px 3px rgba(0, 0, 0, .08)

.article-price-list-card__nombre
	font-size: 1rem
	font-weight: 700
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere
	margin-bottom: 12px

.cont-inputs
	display: flex
	flex-direction: column
	align-items: flex-start
	justify-content: flex-start

	// Los inputs no llevan ancho fijo: varias listas se dibujan una al lado de la otra y con 140px
	// duros la tarjeta desbordaba en el telefono.
	input
		width: 100%
		min-width: 0

	.cont-price-types
		display: flex
		flex-direction: column
		width: 100%

	// Encabezado de la tarjeta: el precio y, al lado, el boton que explica como se llego a el.
	.price-type-card__encabezado
		display: flex
		flex-direction: row
		align-items: center
		justify-content: space-between
		width: 100%

		.price-type-card__info
			flex: 0 0 auto
			margin-left: 8px

	// El precio de la lista, que es a lo que el usuario le mira primero.
	.price-type-card__precio
		font-size: 1.8em
		font-weight: bold
		line-height: 1.1
		color: var(--price-type-precio, #28a745)
		word-break: break-word

	// De donde salio ese precio, en una linea. Es parte del "texto extra" que quedaba negro sobre
	// la tarjeta oscura.
	.price-type-card__origen
		font-size: 0.85em
		color: var(--color-text-secondary, rgba(0, 0, 0, .55))
		margin-bottom: 8px

	.price-type-card__campos
		display: flex
		flex-direction: column
		width: 100%

	.price-type-card__campo
		margin: 8px 0 0

		// El campo que manda: se lee como el editable de la tarjeta.
		// El verde de este badge NO va por el token: es un color de ACCION (fondo pleno con texto
		// blanco encima), y esos se mantienen iguales en los dos modos, igual que hace
		// _dark_theme.sass con los .btn-primary/.btn-success. Con el verde claro del modo oscuro
		// encima habria texto blanco sobre verde claro, que es justamente lo que no se lee.
		.price-type-card__campo--manda
			.input-group-text
				background: #28a745
				border-color: #28a745
				color: #FFF
				font-weight: bold

	.price-type-card__opciones
		width: 100%
		display: flex
		flex-direction: column

	// El interruptor que decide cual de los dos campos manda, con su explicacion al lado.
	.price-type-card__interruptor
		padding: 8px 10px
		border-radius: 10px
		// Va con --bg-hover y NO con --bg-section, que seria el candidato obvio: la tarjeta es una
		// .card, o sea --bg-card, y en oscuro --bg-section queda MAS oscuro que la tarjeta --el
		// interruptor se hundiria en vez de despegarse--. --bg-hover es el unico de los tres que
		// esta por encima de --bg-card en oscuro, que es lo que buscaba el rgba(255,255,255,.06)
		// de la rama muerta. En claro vale #f1f3f5, practicamente el gris que se ve hoy.
		background: var(--bg-hover, rgba(0, 0, 0, .04))

		.custom-switch .custom-control-input:checked ~ .custom-control-label::before
			background-color: #28a745
			border-color: #28a745

		.price-type-card__interruptor-ayuda
			font-size: 0.75em
			color: var(--color-text-secondary, rgba(0, 0, 0, .55))
			margin-top: 2px

	// Datos calculados: subordinados, en una fila que envuelve si no entra.
	.price-type-card__datos
		display: flex
		flex-direction: row
		flex-wrap: wrap
		margin-top: 8px

		.price-type-card__dato
			font-size: 0.85em
			margin-right: 10px
			color: var(--color-text-primary, rgba(0, 0, 0, .8))

			.price-type-card__dato-label
				display: block
				font-size: 0.85em
				color: var(--color-text-secondary, rgba(0, 0, 0, .5))

		.price-type-card__dato--ganancia
			font-weight: bold

	// Una moneda de la lista en una cuenta con `ventas_en_dolares` (PriceTypeMonedas.vue): la misma
	// tarjeta que la de una cuenta sin dolares, repetida una vez por moneda. El nombre de la moneda
	// hace de titulo chico de cada bloque.
	.moneda-block
		width: 100%

	.price-type-moneda__nombre
		font-size: 0.8em
		font-weight: bold
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary, rgba(0, 0, 0, .55))
		margin-bottom: 4px

	// Con dolares hay dos interruptores en la misma tarjeta (setear precio final y cotizar desde la
	// otra moneda): se separan entre si.
	.price-type-card__interruptor + .price-type-card__interruptor
		margin-top: 8px

	.price-type-card__excel
		margin-top: 8px
		padding-top: 8px
		border-top: 1px solid var(--color-border-secondary, rgba(0, 0, 0, .08))

	// "Visible en la tienda para esta lista" (mision catalogo-por-lista-tienda). Hermano de
	// __excel pero SIN linea propia por defecto: la lleva solo con el modificador --separada, que
	// decide `tienda_lleva_separador` (con "Incluir en Excel" arriba o con el <hr> de las monedas
	// ya hay una, y dos seguidas se leen como un corte de mas).
	.price-type-card__tienda
		width: 100%
		margin-top: 8px

		.price-type-card__tienda-ayuda
			font-size: 0.75em
			color: var(--color-text-secondary, rgba(0, 0, 0, .55))
			margin-top: 2px

	.price-type-card__tienda--separada
		padding-top: 8px
		border-top: 1px solid var(--color-border-secondary, rgba(0, 0, 0, .08))

</style>
