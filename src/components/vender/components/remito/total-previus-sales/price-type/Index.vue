<template>
	<div
	v-if="price_type_vender">
		<b-form-select
		class="m-l-15"
		:disabled="is_disabled"
		v-if="hasExtencion('cambiar_price_type_en_vender')"
		v-model="price_type_id"
		@change="set_price_type"
		:options="getOptions({key: 'price_type_id', text: 'Lista de precios'}, null, null, false)"></b-form-select>

		<h5
		v-else
		class="price-type-name text-success">
		    Lista {{ price_type_vender.name }}
		</h5>
	</div>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	created() {
		setTimeout(() => {
			this.price_type_id = this.price_type_vender.id
		}, 500)
	},
	watch: {
		price_type_vender() {
			this.price_type_id = this.price_type_vender.id
		},
	},
	computed: {
		is_disabled() {
			return this.index_previus_sales != 0
		},
		price_types() {
			return this.$store.state.price_type.models 
		},
        price_type_vender: {
        	set(value) {

        		let price_type = this.price_types.find(model => {
        			return model.id == value
        		})

        		this.$store.commit('vender/setPriceType', price_type)
        		this.setTotal()
        	},
        	get() {
            	return this.$store.state.vender.price_type
        	}
        },
	},
	data() {
		return {
			price_type_id: 0,
		}
	},
	methods: {
		set_price_type() {
			this.price_type_vender = this.price_type_id
		}
	}
}
</script>