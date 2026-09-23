<template>
	<!--
		🔴 Sin el permiso `sale.discount_surchage.aplicar` el panel igual aparece si el cliente
		elegido tiene descuentos vinculados, pero con SOLO el grupo "Del cliente" (misión
		descuentos-recargos-por-cliente, 23/9/2026). Esos descuentos se prenden solos al elegir el
		cliente, aunque el vendedor no tenga el permiso, y el aviso le dice que los puede apagar acá:
		esconderle el panel era dejarle aplicado algo que no ve ni puede sacar. Los comunes, el
		"Ver todos" y la opción de servicios siguen siendo solo para quien tiene el permiso.
	-->
	<div
	v-if="puede_usar_discount_surchages || client_discounts_visibles.length"
	class="vender-rate-panel vender-rate-panel--discount">

		<discounts
		v-if="puede_crear_discount_surchages"></discounts>

		<div class="vender-rate-panel__box">

			<!-- Cabecera del panel de descuentos -->
			<div class="vender-rate-panel__header">
				<div class="vender-rate-panel__header-text">
					<span class="vender-rate-panel__title">Descuentos</span>
					<span class="vender-rate-panel__subtitle">Seleccionar descuentos a aplicar</span>
				</div>
				<b-button
				v-if="puede_usar_discount_surchages"
				size="sm"
				variant="outline-primary"
				v-b-modal="'discounts'">
					<i class="icon-eye"></i>
					Ver todos
				</b-button>
			</div>

			<div class="vender-rate-panel__body">

				<!-- Descuentos asignados al cliente -->
				<div
				v-if="client_discounts_visibles.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Del cliente {{ client.name }}
					</span>
					<div class="vender-client-block__checkbox-list">
						<toggle-de-ajuste-de-venta
						v-for="discount in client_discounts_visibles"
						:key="discount.id"
						:ajuste="discount"
						tipo="descuento"
						:input_id="'venta-descuento-'+discount.id"
						id_prefix="discount_"
						v-model="sale_discounts"></toggle-de-ajuste-de-venta>
					</div>
				</div>

				<!-- Descuentos comunes del negocio -->
				<div
				v-if="puede_usar_discount_surchages && common_discounts.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Comunes
					</span>
					<div class="vender-client-block__checkbox-list">
						<toggle-de-ajuste-de-venta
						v-for="discount in common_discounts"
						:key="discount.id"
						:ajuste="discount"
						tipo="descuento"
						:input_id="'venta-descuento-'+discount.id"
						id_prefix="discount_"
						v-model="sale_discounts"></toggle-de-ajuste-de-venta>
					</div>
				</div>

				<!-- Opción global: descuentos en servicios -->
				<div
				v-if="puede_usar_discount_surchages"
				class="vender-rate-panel__section vender-rate-panel__section--footer">
					<span class="vender-rate-panel__section-label">
						Servicios
					</span>
					<vender-toggle
					v-model="discounts_in_services"
					input_id="aplicar_descuentos_a_servicios">
						Aplicar descuentos en los servicios
					</vender-toggle>
				</div>

			</div>
		</div>
	</div>
</template>
<script>
import Discounts from '@/components/vender/modals/clients/Discounts'
import VenderToggle from '@/components/vender/components/VenderToggle'
import ToggleDeAjusteDeVenta from './ToggleDeAjusteDeVenta'
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Discounts,
		VenderToggle,
		ToggleDeAjusteDeVenta,
	},
	methods: {
		es_descuento_del_cliente(discount) {
			if (!this.client) {
				return false
			}
			return discount.client_id == this.client.id
				|| this.ids_de_descuentos_del_cliente.indexOf(discount.id) != -1
		},
	},
	computed: {
		discounts() {
			return this.$store.state.discount.models
		},
		/*
			Ids de los descuentos vinculados al cliente desde su ficha (`client.discounts`, misión
			descuentos-recargos-por-cliente, 23/9/2026).
		*/
		ids_de_descuentos_del_cliente() {
			if (!this.client || !Array.isArray(this.client.discounts)) {
				return []
			}
			return this.client.discounts.map(discount => discount.id)
		},
		/*
			"Del cliente" = vinculado desde la ficha O con la columna vieja `discounts.client_id`
			apuntando a este cliente. La columna vieja ya no la escribe nadie, pero hay descuentos
			guardados así y se siguen mostrando en este grupo.
		*/
		client_discounts() {
			return this.discounts.filter(discount => {
				return this.es_descuento_del_cliente(discount)
			})
		},
		/*
			Lo que se dibuja en el grupo "Del cliente". Sin el permiso de aplicar descuentos, solo los
			vinculados desde la ficha —los que VENDER prende solo y el vendedor tiene que poder
			apagar—; los de la columna vieja `client_id` no se prenden solos, y mostrárselos sería
			darle a ese vendedor un descuento para aplicar que su permiso no le da.
		*/
		client_discounts_visibles() {
			if (this.puede_usar_discount_surchages) {
				return this.client_discounts
			}
			return this.discounts.filter(discount => {
				return this.ids_de_descuentos_del_cliente.indexOf(discount.id) != -1
			})
		},
		/*
			Los comunes excluyen a los del cliente: el mismo descuento en los dos grupos serían dos
			toggles con el mismo `input_id`.
		*/
		common_discounts() {
			return this.discounts.filter(discount => {
				return !discount.client_id && !this.es_descuento_del_cliente(discount)
			})
		},
		sale_discounts: {
			get() {
				return this.$store.state.vender.discounts_id
			},
			set(value) {
				console.log('value')
				console.log(value)
				this.$store.commit('vender/setDiscountsId', value)
				this.setTotal()
				// this.$store.commit('vender/setTotal')
			}
		}
	}
}
</script>
