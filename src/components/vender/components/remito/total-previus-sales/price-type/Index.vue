<template>
	<b-input-group
	v-if="show"
	prepend="Lista de precios">
		<!--
			🔴 Con la lista en null el select se dibuja igual, VACIO. Que el vendedor vea el
			prepend "Lista de precios" sin nada elegido es la unica señal de que la venta esta por
			salir sin lista: hasta esta mision el grupo entero desaparecia y nada se veia raro.
		-->
		<b-form-select
		:disabled="is_disabled"
		data-testid="venta-lista-de-precios"
		v-model="price_type_id"
		@change="set_price_type"
		:options="getOptions({key: 'price_type_id', text: 'Lista de precios'}, null, null, false)"></b-form-select>

		<!-- <h5
		v-else
		class="price-type-name text-success">
		    Lista {{ price_type_vender.name }}
		</h5> -->
	</b-input-group>
</template>
<script>
import vender from '@/mixins/vender'
/*
	Trae requiere_lista_de_precios(): la regla de "esta cuenta vende con lista" vive ahi y en
	ningun otro lado. El mixin vender no la incluye.
*/
import price_types from '@/mixins/vender/price_types'
export default {
	mixins: [vender, price_types],
	created() {
		setTimeout(() => {
			this.price_type_id = this.price_type_vender ? this.price_type_vender.id : null
		}, 500)
	},
	watch: {
		/*
			Se espeja tambien el null, no solo un valor: si la lista se limpia, el select tiene
			que quedar vacio y no seguir mostrando la anterior como si estuviera elegida.
		*/
		price_type_vender() {
			this.price_type_id = this.price_type_vender ? this.price_type_vender.id : null
		},
	},
	computed: {
		/*
			Se muestra cuando la cuenta REQUIERE lista, tenga o no una elegida: es lo que deja
			ver el hueco. Y ademas cuando hay una lista puesta aunque la cuenta no la requiera
			(un comprobante guardado con lista en una cuenta que despues apago las listas, o con
			la extension de rangos), que es lo que se mostraba hasta ahora.
		*/
		show() {
			return this.requiere_lista_de_precios() || !!this.price_type_vender
		},
		is_disabled() {
			if (this.editando_venta_previa) {
				return true
			}

			if (this.budget) {
				return true
			}

			if (!this.is_admin && this.can('vender.prohibir_camibar_lista_de_precios')) {
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
			/*
				null y no 0: el select no tiene opcion "0" (getOptions va sin la opcion vacia), y
				un 0 se leia como "una lista con id 0" en vez de "ninguna".
			*/
			price_type_id: null,
		}
	},
	methods: {
		set_price_type() {
			this.price_type_vender = this.price_type_id
		}
	}
}
</script>