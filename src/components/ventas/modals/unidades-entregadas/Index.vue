<template>
	<b-modal
	title="Articulos en acopio"
	hide-footer
	size="lg"
	@shown="set_local_items"
	id="unidades-entregadas">

		<b-button
		variant="primary"
		class="m-b-15"
		v-b-modal="'acopio-article-deliveries'">
			Historial
		</b-button>

		<b-table
		head-variant="dark"
		:fields="fields"
		:items="local_items">
			<template #cell(add_delivered_amount)="data">
				<b-form-input
				type="number"
				placeholder="unidades a entregar"
				v-model="local_items[data.index].add_delivered_amount"></b-form-input>
			</template>
		</b-table>

		<b-button
		variant="outline-primary"
		@click="marcar_todo_como_entregado">
			Marcaro todo como entregado
		</b-button>

		<b-button
		class="m-l-15"
		variant="primary"
		@click="save">
			Guardar
		</b-button>
	</b-modal>
</template>
<script>
export default {
	components: {
		// TableComponent: () => import('@/common-vue/components/display/TableComponent'),
	},
	computed: {
		fields() {
			let fields = [
				{
					key: 'id',
					label: 'N°'
				},
				{
					key: 'bar_code',
					label: 'Codigo barras'
				},
				{
					key: 'provider_code',
					label: 'Codigo proveedor'
				},
				{
					key: 'name',
					label: 'Nombre'
				},
			]

			/*
				Columna "Variante" solo si algun renglon tiene variante: con el mismo articulo
				vendido en dos variantes hay dos renglones con el mismo N° y el mismo nombre, y sin
				esta columna no se sabe a cual se le entregan unidades. En una venta sin variantes
				la tabla queda como siempre.

				Se decide por article_variant_id y no por la descripcion: una variante borrada sin
				descripcion en el pivot dejaba la columna escondida (descripcion_de_variante le pone
				"#<id>" en ese caso).
			*/
			let hay_variantes = this.local_items.some(item => Number(item.article_variant_id || 0) !== 0)

			if (hay_variantes) {
				fields.push({
					key: 'variant_description',
					label: 'Variante'
				})
			}

			fields.push({
				key: 'amount',
				label: 'U vendidas'
			})
			fields.push({
				key: 'delivered_amount',
				label: 'U Entregadas'
			})
			fields.push({
				key: 'add_delivered_amount',
				label: 'Agregar U Entregadas'
			})

			return fields
		},
		sale() {
			return this.$store.state.sale.model
		},
	},
	data() {
		return {
			local_items: [],
		}
	},

	methods: {
		/**
		 * Rearma los renglones editables con los articulos de la venta. La dispara el @shown del
		 * propio <b-modal>.
		 *
		 * Antes colgaba de un this.$root.$on('bv::modal::shown') registrado en mounted y nunca
		 * desenganchado: el bus global vive toda la sesion, asi que cada montaje del componente
		 * dejaba otro listener vivo y la apertura N del modal corria N veces este mismo armado.
		 *
		 * @returns {void}
		 */
		set_local_items() {
			let items = []

			this.sale.articles.forEach(article => {

				/*
					Variante del renglon (mision variantes-mismo-articulo-en-vender, 8/10/2026).
					sale.articles trae una entrada por fila del pivot: el mismo articulo en dos
					variantes ya son dos renglones, pero viajaban a la API solo con el id y la entrega
					se escribia en todas las filas del articulo. article_variant_id va siempre (0 = sin
					variante); la API vieja no la lee y hace lo de siempre.
				*/
				let article_variant_id = Number(article.pivot.article_variant_id || 0)

				items.push({
					id: article.id,
					article_variant_id: article_variant_id,
					variant_description: this.descripcion_de_variante(article, article_variant_id),
					bar_code: article.bar_code,
					provider_code: article.provider_code,
					name: article.name,
					amount: Number(article.pivot.amount),
					delivered_amount: Number(article.pivot.delivered_amount),
					add_delivered_amount: '',
				})
			})

			this.local_items = items
		},
		/**
		 * La descripcion de la variante de un renglon ("Azul 36"), o null si no tiene: la del pivot
		 * (article_sale.variant_description) o, si no la trae, la de las variantes del articulo. Si
		 * no esta en ningun lado (variante borrada), "#<id>": algo neutro para que el renglon no se
		 * vea como uno sin variante.
		 *
		 * @param {Object} article Articulo de sale.articles, con su pivot.
		 * @param {Number} article_variant_id Variante del renglon (0 = sin variante).
		 * @returns {String|null}
		 */
		descripcion_de_variante(article, article_variant_id) {

			if (!article_variant_id) {
				return null
			}

			if (article.pivot.variant_description) {
				return article.pivot.variant_description
			}

			let variante = null

			if (Array.isArray(article.article_variants)) {
				variante = article.article_variants.find(variant => variant.id == article_variant_id)
			}

			if (variante && variante.variant_description) {
				return variante.variant_description
			}

			return '#' + article_variant_id
		},
		marcar_todo_como_entregado() {
			this.local_items.forEach((item, index) => {
				let add_delivered_amount = item.amount
				if (item.delivered_amount) {
					add_delivered_amount -= item.delivered_amount 
				}
				this.$set(this.local_items, index, {
					...item,
					add_delivered_amount: add_delivered_amount
				});
			});
			console.log('listo')
		},
		save() {
			this.$store.commit('auth/setMessage', 'Guardando')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('sale/unidades-entregadas/'+this.sale.id, {
				articles: this.local_items 
			})
			.then(res => {
				this.$store.commit('sale/add', res.data.model)
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Actualizado')
				this.$bvModal.hide('unidades-entregadas')
				this.$bvModal.hide('sale')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error(err)
			})
		}
	}
}
</script>