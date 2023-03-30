<template>
	<div>
		<discounts></discounts>	
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
					{{ discount.name }} {{ discount.percentage }}%
				</b-form-checkbox>
			</b-form-group>
			<hr>
			<b-form-group
			label="Descuentos en los servicios">
				<b-form-checkbox
				:value="1"
				:unchecked-value="0"
				v-model="discounts_in_services">
					Aplicar descuentos en los servicios
				</b-form-checkbox>
			</b-form-group>
		</b-card>
	</div>
</template>
<script>
import Discounts from '@/components/vender/modals/clients/Discounts'
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
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
				this.$store.commit('vender/setDiscountsId', value)
				this.$store.commit('vender/setTotal')
			}
		}
	}
}
</script>