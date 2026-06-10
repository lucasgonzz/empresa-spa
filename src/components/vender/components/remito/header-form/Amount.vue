<template>
	<b-col
	v-if="user.ask_amount_in_vender"
	class="col-buttons m-b-15 m-lg-b-0"
	cols="12"
	md="2">
	<div class="d-flex w-100">
		<b-form-input
		type="number"
		dusk="article_amount"
		min="1"
		:disabled="disabled"
		id="article-amount"
		v-model="item_vender.amount"
		@keydown.enter="add_item_vender"
		placeholder="Cantidad"></b-form-input>
		<b-button 
		class="d-lg-none m-l-10"
		@click="callAddArticleToSale"
		variant="primary">
			<i class="icon-check"></i>
		</b-button>
	</div>

	<!-- Indicador de stock: global + stock de sucursal cuando hay dirección seleccionada -->
	<div
	v-if="global_stock !== ''"
	class="amount-stock">
		<span class="amount-stock__global">
			<i class="icon-box amount-stock__icon"></i>
			Stock: <strong>{{ global_stock }}</strong>
		</span>
		<span
		v-if="local_stock !== null"
		class="amount-stock__local">
			Sucursal: <strong>{{ local_stock }}</strong>
		</span>
	</div>
	</b-col>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import vender from '@/mixins/vender/index'
export default {
	components: {
		BtnLoader,
	},
	mixins: [vender],
	computed: {
		/**
		 * Stock global del artículo seleccionado (suma de todos los depósitos).
		 * Devuelve cadena vacía si no hay artículo o no es un article.
		 *
		 * @returns {string|number}
		 */
		global_stock() {
			if (this.item && this.item.is_article) {
				return this.item.stock
			}
			return ''
		},

		/**
		 * Stock en la sucursal activa. Null si no hay sucursal seleccionada
		 * o si el artículo no tiene datos para esa sucursal.
		 *
		 * @returns {number|null}
		 */
		local_stock() {
			if (this.item && this.item.is_article && this.address_id) {
				let finded = this.item.addresses.find(a => a.id == this.address_id)
				if (typeof finded != 'undefined') {
					return finded.pivot.amount
				}
			}
			return null
		},
		address_id() {
			return this.$store.state.vender.address_id
		},
		item() {
			return this.$store.state.vender.item
		},
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
        previus_sale() {
            return this.$store.state.vender.previus_sales.previus_sale
        },
        disabled() {
        	if (this.is_local) {
        		return false
        	}
        	
        	return this.item_vender == null || typeof this.item_vender == 'undefined' || (this.item_vender.name == '' && this.item_vender.bar_code == '')

        	// if (this.testing_dusk) {
        	// 	return false
        	// }
        	// return this.item_vender == null || typeof this.item_vender == 'undefined' || (this.item_vender.name == '' && this.item_vender.bar_code == '')
        }
	},
	methods: {
		callAddArticleToSale() {
			this.add_item_vender()
		}
	}
}
</script>
<style scoped lang="sass">
/* Columna de cantidad: el stock queda debajo del input */
.col-buttons
	display: flex
	flex-direction: column
	align-items: stretch
	justify-content: flex-start

/* Bloque de indicadores de stock */
.amount-stock
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 4px 8px
	margin-top: 5px

/* Stock global: texto compacto con ícono */
.amount-stock__global
	display: inline-flex
	align-items: center
	gap: 3px
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)

	strong
		color: var(--color-text-primary, #212529)
		font-weight: 700

/* Ícono del stock */
.amount-stock__icon
	font-size: 0.72rem
	flex-shrink: 0

/* Stock de sucursal: badge azul que lo diferencia del global */
.amount-stock__local
	display: inline-flex
	align-items: center
	gap: 3px
	font-size: 0.75rem
	color: var(--color-primary, #007bff)
	background: rgba(0, 123, 255, 0.07)
	border: 1px solid rgba(0, 123, 255, 0.22)
	border-radius: 10px
	padding: 1px 7px
	line-height: 1.4

	strong
		font-weight: 700
</style>