<template>
	<div
	v-if="puede_usar_discount_surchages"
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
				v-if="client_discounts.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Del cliente {{ client.name }}
					</span>
					<div class="vender-client-block__checkbox-list">
						<vender-toggle
						v-for="discount in client_discounts"
						:key="discount.id"
						mode="array"
						:option_value="discount.id"
						v-model="sale_discounts">
							{{ discount.name }} {{ discount.percentage }}%
						</vender-toggle>
					</div>
				</div>

				<!-- Descuentos comunes del negocio -->
				<div
				v-if="common_discounts.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Comunes
					</span>
					<div class="vender-client-block__checkbox-list">
						<vender-toggle
						v-for="discount in common_discounts"
						:key="discount.id"
						mode="array"
						:option_value="discount.id"
						row_class="vender-toggle-row--multiline"
						v-model="sale_discounts">

							<div
							class="vender-client-block__item-detail"
							:id="'discount_'+discount.id">
								{{ discount.name }} {{ discount.percentage }}%

								<span
								v-if="discount.deleted_at">
									(actualmente eliminado)
								</span>

								<span
								v-else-if="discount.updated_percentage">
									({{ discount.updated_percentage }}% en este momento)
								</span>

								<p
								class="text-muted"
								v-if="!discount.deleted_at && discount.updated_percentage">
									En caso de querer usar el valor actual del descuento ({{ discount.updated_percentage }}%), desmarcar para quitar el descuento, guardar la venta sin el descuento, y editar la venta para agregarle el descuento con el valor actualizado.
								</p>

							</div>
						</vender-toggle>
					</div>
				</div>

				<!-- Opción global: descuentos en servicios -->
				<div class="vender-rate-panel__section vender-rate-panel__section--footer">
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
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Discounts,
		VenderToggle,
	},
	computed: {
		discounts() {
			return this.$store.state.discount.models
		},
		client_discounts() {
			return this.discounts.filter(discount => {
				return this.client && (discount.client_id == this.client.id)
			})
		},
		common_discounts() {
			return this.discounts.filter(discount => {
				return !discount.client_id
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
