<template>
	<div
	class="cont-inputs card p-10 j-start"
	v-if="article_price_type">

		<price-type-monedas
		v-if="hasExtencion('ventas_en_dolares')"
		:ref="'ptMonedas-'+price_type.id"
		:article_price_type="article_price_type"></price-type-monedas>

		<div
		v-else>
			
			<cont-price-type
			:article_price_type="article_price_type"></cont-price-type>

			<options-price-type
			:price_type_store="price_type_store"
			:article_price_type="article_price_type"></options-price-type>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		price_type: Object,
	},
	components: {
		PriceTypeMonedas: () => import('@/components/listado/components/price-type-input/PriceTypeMonedas'),
		ContPriceType: () => import('@/components/listado/components/price-type-input/ContPriceType'),
		OptionsPriceType: () => import('@/components/listado/components/price-type-input/OptionsPriceType'),
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		article_price_type() {
			return this.local_article_price_type
		},
		price_type_store() {
			return this.$store.state.price_type.models.find(p => p.id == this.price_type.id)
		},
		indicar_percentage() {
			if (this.article_price_type.pivot.setear_precio_final) {
				return false
			}
			return true
		},
		indicar_final_price() {
			if (this.article_price_type.pivot.setear_precio_final) {
				return true
			}
			return false
		},
		
	},
	data() {
		return {
			local_article_price_type: null
		}
	},
	watch: {
		article: {
			handler: 'init_article_price_type',
			immediate: true
		},
		local_article_price_type: {
			handler(new_val) {
				if (!this.article.id) {
					const index = this.article.price_types.findIndex(pt => pt.id == this.price_type.id)

					if (index !== -1) {
						this.article.price_types.splice(index, 1, JSON.parse(JSON.stringify(new_val)))
					} else {
						this.article.price_types.push(JSON.parse(JSON.stringify(new_val)))
					}
				}
			},
			deep: true
		}
	},
	methods: {
		init_article_price_type() {
			if (this.article.id) {
				this.local_article_price_type = this.article.price_types.find(price_type => price_type.id == this.price_type.id)
			} else {
				this.local_article_price_type = {
					id: this.price_type.id,
					pivot: {
						price_type_id: this.price_type.id,
						percentage: '',
						final_price: '',
						setear_precio_final: this.price_type_store.setear_precio_final,
						incluir_en_excel_para_clientes: 1
					}
				}
			}
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
// Tarjeta de una lista de precio dentro del modal del articulo. El nombre de la lista NO se dibuja
// aca: lo pone el label del form-group de ModelForm, por fuera del slot (verificado el 5/8/2026,
// build_price_type_modal_extra_properties le pasa price_type.name como text).
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
		color: #28a745
		word-break: break-word
		@if ($theme == 'dark')
			color: #5dd879

	// De donde salio ese precio, en una linea.
	.price-type-card__origen
		font-size: 0.85em
		color: rgba(0, 0, 0, .55)
		margin-bottom: 8px
		@if ($theme == 'dark')
			color: rgba(255, 255, 255, .6)

	.price-type-card__campos
		display: flex
		flex-direction: column
		width: 100%

		.price-type-card__campo
			margin-bottom: 8px

		// El campo que manda: se lee como el editable de la tarjeta.
		.price-type-card__campo--manda
			.input-group-text
				background: #28a745
				border-color: #28a745
				color: #FFF
				font-weight: bold

		// El derivado: el valor lo calcula el sistema. Ademas del disabled propio del input, se
		// atenua el grupo entero, para que la relacion entre los dos campos se vea de un vistazo.
		.price-type-card__campo--derivado
			opacity: 0.65

			.input-group-text
				background: transparent
				border-style: dashed
				color: rgba(0, 0, 0, .5)
				@if ($theme == 'dark')
					color: rgba(255, 255, 255, .5)

	.price-type-card__opciones
		width: 100%
		display: flex
		flex-direction: column

	// El interruptor que decide cual de los dos campos manda, con su explicacion al lado.
	.price-type-card__interruptor
		padding: 6px 8px
		border-radius: 6px
		background: rgba(0, 0, 0, .04)
		@if ($theme == 'dark')
			background: rgba(255, 255, 255, .06)

		.price-type-card__interruptor-ayuda
			font-size: 0.75em
			color: rgba(0, 0, 0, .55)
			margin-top: 2px
			@if ($theme == 'dark')
				color: rgba(255, 255, 255, .6)

	// Datos calculados: subordinados, en una fila que envuelve si no entra.
	.price-type-card__datos
		display: flex
		flex-direction: row
		flex-wrap: wrap
		margin-top: 8px

		.price-type-card__dato
			font-size: 0.85em
			margin-right: 10px
			color: rgba(0, 0, 0, .8)
			@if ($theme == 'dark')
				color: rgba(255, 255, 255, .8)

			.price-type-card__dato-label
				display: block
				font-size: 0.85em
				color: rgba(0, 0, 0, .5)
				@if ($theme == 'dark')
					color: rgba(255, 255, 255, .5)

		.price-type-card__dato--ganancia
			font-weight: bold

	.price-type-card__excel
		margin-top: 8px
		padding-top: 8px
		border-top: 1px solid rgba(0, 0, 0, .08)
		@if ($theme == 'dark')
			border-top-color: rgba(255, 255, 255, .12)

</style>