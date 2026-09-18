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
		/*
			🔴 En edicion se deshabilita SOLO si la venta que se esta editando YA TENIA lista.

			Desde esta mision, abrir una venta guardada sin lista en una cuenta que vende con
			listas le resuelve la lista por defecto (previus_sale/index.js) y el PUT la persiste.
			Eso es lo pedido --una venta editada no puede quedar sin lista--, pero con el selector
			deshabilitado esa lista quedaba asignada sin que el vendedor la viera como una
			decision: la venta pasaba a decir "lista X" con renglones que se cobraron sin ella.
			Habilitado, la ve ya elegida y la confirma o la cambia. Cambiarla no re-precia lo que
			ya estaba (from_pivot): solo un articulo nuevo de esta edicion toma la lista.

			"Tenia lista" es tenerla RESUELTA contra el catalogo (la relacion embebida, o un
			price_type_id que exista): un id colgado --la lista se borro-- no es una lista, y
			bloquear el selector ahi seria fijar sin decision justo lo que se quiere evitar.

			Los otros dos motivos (presupuesto cargado, permiso de no cambiar la lista) no cambian.
		*/
		is_disabled() {
			if (this.editando_venta_previa && this.venta_editada_tenia_lista) {
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
		/*
			La venta cargada para editar, tal cual vino del servidor
			(store/vender/previus_sales.js, `previus_sale`; es {} mientras se esta abriendo).
		*/
		venta_editada_tenia_lista() {
			let venta = this.$store.state.vender.previus_sales.previus_sale

			if (!venta || !venta.id) {
				return false
			}

			if (venta.price_type && venta.price_type.id) {
				return true
			}

			return !!this.lista_del_catalogo(venta.price_type_id)
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