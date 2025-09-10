<template>
	<div
	v-if="show">
		<b-form-select
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
			if (this.price_type_vender) {

				this.price_type_id = this.price_type_vender.id
			}
		}, 500)
	},
	watch: {
		price_type_vender() {
			if (this.price_type_vender) {

				this.price_type_id = this.price_type_vender.id
			}
		},
	},
	computed: {
		show() {
			return this.hasExtencion('cambiar_price_type_en_vender')
			if (this.price_type_vender) {
				if (!this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')) {
					return true 
				}
			}
			return false
		},
		is_disabled() {
			if (this.index_previus_sales != 0) {
				return true 
			}

			if (this.budget) {
				return true
			}
			return false
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