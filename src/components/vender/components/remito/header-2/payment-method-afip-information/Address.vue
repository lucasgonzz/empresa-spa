<template>
	<b-input-group
	v-if="addresses.length >= 1"
	prepend="Sucursal">

		<b-form-select
		:disabled="disabled"
		v-model="address_id"
		dusk="address_id"
		:options="getOptions({key: 'address_id', text: 'Direccion'})"></b-form-select>

		<!-- Ayuda contextual: append nativo del input-group para alineación perfecta -->
		<template
		v-if="show_help"
		#append>
			<b-input-group-text
			:id="help_button_id"
			class="vender-address-help-btn"
			role="button"
			tabindex="0"
			aria-label="Información sobre sucursal">
				<i class="icon-info"></i>
			</b-input-group-text>
			<b-popover
			:target="help_button_id"
			triggers="hover focus click"
			placement="bottom">
				<template #title><strong>Sucursal</strong></template>
				La sucursal define el depósito de stock utilizado para la venta.
			</b-popover>
		</template>

	</b-input-group>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	props: {
		/* Muestra el ícono de ayuda con popover (usado en etapa 1) */
		show_help: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/* ID único para el botón de ayuda y su popover */
		help_button_id() {
			return 'vender-address-hint-' + this._uid
		},
		addresses() {
			return this.$store.state.address.models
		},
		disabled() {
			if (this.index_previus_sales > 0) {
				return true
			}

			if (
				this.is_admin
				|| this.can('vender.cambiar_address_id')
			) {
				return false
			}

			return true
		}
	},
}
</script>
<style lang="sass">
/* Botón de ayuda dentro del append — mismo alto que el prepend */
.vender-address-help-btn
	cursor: help
	color: var(--color-text-secondary, #6c757d)
	transition: color 0.15s ease, background 0.15s ease

	&:hover
		color: var(--color-primary, #007bff)
		background: #e9ecef

	i
		font-size: 0.95rem
</style>
