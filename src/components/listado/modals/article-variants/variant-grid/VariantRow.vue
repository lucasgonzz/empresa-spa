<template>
<tr class="variant-row">

	<!-- Imagen: thumbnail + click para editar (abre el selector compartido del padre) -->
	<td class="variant-row__image-cell">
		<div
		class="variant-row__thumb"
		title="Cambiar imagen"
		@click="$emit('editImage', variant)">
			<img
			v-if="variant.image_url"
			:src="variant.image_url"
			alt="Imagen de la variante">
			<i
			v-else
			class="icon-camera variant-row__thumb-icon"></i>
		</div>
	</td>

	<td class="variant-row__description">
		{{ variant.variant_description }}
	</td>

	<!-- Disponible: toggle estilo iPhone. Disponible = !oculta (ver computed). -->
	<td class="variant-row__available-cell">
		<b-form-checkbox
		switch
		v-model="disponible"></b-form-checkbox>
	</td>

	<!-- Precio override: vacio = usa el precio del articulo -->
	<td class="variant-row__price-cell">
		<b-form-input
		type="number"
		step="0.01"
		size="sm"
		placeholder="Precio del articulo"
		v-model="variant.price"
		@change="updateVariant('Guardando precio')"></b-form-input>
	</td>

	<!-- Una celda por deposito: cantidad + checkbox "En exhibicion" -->
	<td
	v-for="address in addresses"
	:key="address.id"
	class="variant-row__stock-cell">
		<b-form-input
		type="number"
		size="sm"
		v-model.number="addressPivot(address).pivot.amount"
		@change="onStockChange()"></b-form-input>

		<b-form-checkbox
		switch
		class="variant-row__on-display"
		:value="1"
		:unchecked-value="0"
		v-model="addressPivot(address).pivot.on_display"
		@change="onStockChange()">
			En exhibicion
		</b-form-checkbox>
	</td>
</tr>
</template>
<script>
export default {
	props: {
		/** Variante (article_variant) que representa esta fila. */
		variant: {
			type: Object,
			required: true,
		},
		/** Depositos (address) globales del negocio, usados para armar una columna de stock por cada uno. */
		addresses: {
			type: Array,
			default: () => [],
		},
	},
	computed: {
		/**
		 * Disponibilidad "positiva" para el toggle visible (el campo real en DB es `oculta`,
		 * disponible = !oculta). El setter persiste el cambio contra el back al vuelo.
		 */
		disponible: {
			get() {
				return !this.variant.oculta
			},
			set(value) {
				this.variant.oculta = !value
				this.updateVariant(value ? 'Habilitando variante' : 'Ocultando variante')
			},
		},
	},
	methods: {
		/**
		 * Busca el pivot de stock (addresses.pivot) de esta variante para un deposito dado.
		 * Si la variante todavia no tiene ese deposito attacheado (variante recien generada,
		 * sin movimientos de stock todavia), se agrega en memoria en 0: el back
		 * (UpdateVariantsStockHelper, sin cambios) hace el attach real recien al guardar el lote.
		 *
		 * @param {Object} address Deposito global.
		 * @return {Object} Address con .pivot.amount / .pivot.on_display listos para bindear.
		 */
		addressPivot(address) {
			let variant_address = this.variant.addresses.find(_address => _address.id == address.id)

			if (!variant_address) {
				variant_address = {
					id: address.id,
					pivot: {
						amount: 0,
						on_display: 0,
					},
				}
				this.variant.addresses.push(variant_address)
			}

			return variant_address
		},
		/**
		 * Persiste price/image_url/oculta de la variante (endpoint puntual de ArticleVariantController@update).
		 * El stock por deposito NO se toca aca: sigue el flujo de "Actualizar Stock" por lote.
		 *
		 * @param {String} mensaje Texto del indicador global de carga mientras se guarda.
		 */
		updateVariant(mensaje) {
			this.$store.commit('auth/setMessage', mensaje)
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article-variant/'+this.variant.id, {
				price: this.variant.price,
				image_url: this.variant.image_url,
				oculta: this.variant.oculta,
			})
			.then(res => {
				this.$store.commit('article_variant/add', res.data.model)
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudo actualizar la variante')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
		/**
		 * Se dispara al tocar cantidad o "En exhibicion" de cualquier deposito de esta fila. Arma
		 * el payload completo de la variante (todos los depositos conocidos, mismo contrato que
		 * antes: {id, addresses:[{id, amount, on_display}]}) y lo encola en el store para
		 * guardarse por lote con el boton "Actualizar Stock" (BtnSave -> article-update-varians-stock).
		 */
		onStockChange() {
			let article_variant = {
				id: this.variant.id,
				addresses: [],
			}

			this.addresses.forEach(_address => {
				let variant_address = this.addressPivot(_address)
				article_variant.addresses.push({
					id: _address.id,
					amount: parseFloat(variant_address.pivot.amount) || 0,
					on_display: variant_address.pivot.on_display ? 1 : 0,
				})
			})

			let variants_to_update = this.$store.state.article.edit_variants_stock.variants_to_update
			let index = variants_to_update.findIndex(_variant => _variant.id == article_variant.id)

			if (index != -1) {
				variants_to_update.splice(index, 1, article_variant)
			} else {
				variants_to_update.push(article_variant)
			}
		},
	},
}
</script>
<style lang="sass">
.variant-row
	&__image-cell
		width: 60px
	&__thumb
		width: 44px
		height: 44px
		border-radius: 10px
		background: #F0F0F3
		display: flex
		align-items: center
		justify-content: center
		overflow: hidden
		cursor: pointer
		transition: opacity .15s ease
		&:hover
			opacity: .75
		img
			width: 100%
			height: 100%
			object-fit: cover
	&__thumb-icon
		color: rgba(0, 0, 0, .3)
		font-size: 1.1em
	&__description
		font-weight: 500
		color: #1d1d1f
	&__available-cell
		text-align: center
	&__price-cell
		min-width: 130px
	&__stock-cell
		min-width: 140px
	&__on-display
		margin-top: 4px
		font-size: 0.8em
		white-space: nowrap
</style>
