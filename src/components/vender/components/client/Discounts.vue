<template>
	<div
	v-if="puede_usar_discount_surchages">
		<discounts
		v-if="puede_crear_discount_surchages"></discounts>	
		<b-card
		class="m-b-15 b-r-1 shadow">
			<div
			class="j-between align-center">
				<p
				class="m-b-0">
					<strong>
						Seleccionar descuentos
					</strong>
				</p>
				<b-button
				variant="outline-primary"
				v-b-modal="'discounts'">
					<i class="icon-eye"></i>
					Descuentos
				</b-button>
			</div>
			<b-form-group
			v-if="client_discounts.length"
			:label="'Descuentos del cliente '+client.name">
				<b-form-checkbox
				v-for="discount in client_discounts"
				:key="discount.id"
				:value="discount.id"
				v-model="sale_discounts">
					{{ discount.name }} {{ discount.percentage }}%
				</b-form-checkbox>
			</b-form-group>

			<b-form-group
			v-if="common_discounts.length"
			label="Descuentos comunes">
				<b-form-checkbox
				v-for="discount in common_discounts"
				:key="discount.id"
				:value="discount.id"
				v-model="sale_discounts">

					<div
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
				</b-form-checkbox>
			</b-form-group>

			<hr>
			<b-form-group
			label="Descuentos en los servicios">
				<b-form-checkbox
				:value="1"
				:unchecked-value="0"
				v-model="discounts_in_services">
					<span
					id="aplicar_descuentos_a_servicios">
						Aplicar descuentos en los servicios
					</span>
				</b-form-checkbox>
			</b-form-group>
		</b-card>
	</div>
</template>
<script>
import Discounts from '@/components/vender/modals/clients/Discounts'
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Discounts,
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