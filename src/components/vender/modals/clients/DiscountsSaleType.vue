<template>
	<b-card no-body>
		<div
		class="m-b-15"
		v-if="sale_types.length">
			<p>Seleccionar tipo de venta</p>
			<b-form-group
			v-for="sale_type in sale_types"
			:key="'sale-type-'+sale_type.id">
				<b-form-radio
				:value="sale_type.id"
				v-model="sale_sale_type">
					{{ sale_type.name }}
				</b-form-radio>
			</b-form-group>
		</div>
		<div
		class="m-b-15"
		v-if="client_discounts.length || common_discounts.length">
			<p>
				<strong>Seleccionar descuentos</strong>
			</p>
			<b-form-group
			v-if="client_discounts.length"
			:label="'Descuentos de '+client.name">
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
		</div>
		<div
		class="j-between">
			<b-button
			variant="primary"
			class="w-49"
			@click="toClient">
				Atras
			</b-button>
			<b-button
			variant="primary"
			class="w-49"
			@click="vender(false)">
				<btn-loader
				text="Vender"
				:loader="vendiendo"></btn-loader>
			</b-button>
		</div>
	</b-card>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	name: 'DiscountsSaleType',
	components: {
		BtnLoader
	},
	computed: {
		vendiendo() {
			return this.$store.state.vender.vendiendo
		},
		sale_discounts: {
			set(value) {
				this.$store.commit('vender/setDiscounts', value)
			},
			get() {
				return this.$store.state.vender.discounts
			}
		},
		sale_sale_type: {
			set(value) {
				this.$store.commit('vender/setSaleType', value)
			},
			get() {
				return this.$store.state.vender.sale_type
			}
		},
	},
	methods: {
		toClient() {
			this.$store.commit('vender/clients/decrementView')
		},
	}
}
</script>