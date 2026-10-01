<template>
	<div
	class="form-moneda"
	v-if="show">
		<b-input-group prepend="Moneda">
			<b-form-select
			class="select-moneda"
			:disabled="disabled"
			v-model="moneda_id"
			@change="set_total"
			:options="getOptions({key: 'moneda_id', text: 'Moneda'}, null, null, false)"></b-form-select>
		</b-input-group>

		<b-input-group
		v-if="mostrar_input_dolar"
		class="m-t-10"
		prepend="USD">
			<b-form-input
			type="number"
			:disabled="disabled"
			class="input-dolar"
			@input="set_valor_dolar"
			@blur="restaurar_dolar_si_falta"
			v-model="input_dolar_valor"></b-form-input>
		</b-input-group>

	</div>
</template>
<script>
import vender_set_total from '@/mixins/vender_set_total'
import cotizacion_dolar_por_defecto from '@/mixins/vender/cotizacion_dolar_por_defecto'
export default {
	mixins: [vender_set_total, cotizacion_dolar_por_defecto],
	computed: {
		show() {
			return this.user && this.hasExtencion('ventas_en_dolares')
		},
		/*
			El campo de la cotizacion se ve siempre, salvo en las cuentas con listas de precio por
			moneda (los precios ya vienen en su moneda y el campo no pinta nada)... y salvo que el
			comercio NO tenga dolar cargado en el sistema: sin dolar por defecto el vendedor no tiene
			otro lugar donde ponerlo, y una venta en dolares sin cotizacion la API la rechaza.
		*/
		mostrar_input_dolar() {
			return !this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')
				|| this.valor_dolar_por_defecto === null
		},
		valor_dolar: {
			get() {
				return this.$store.state.vender.valor_dolar
			},
			set(value) {
				this.$store.commit('vender/set_valor_dolar', value)
			}
		},
		moneda_id: {
			get() {
				return this.$store.state.vender.moneda_id
			},
			set(value) {
				this.$store.commit('vender/set_moneda_id', value)
			}
		},
		disabled() {
			if (
				this.editando_venta_previa
				|| this.budget
			) {
				return true
			}
			return false
		},
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		budget() {
			return this.$store.state.vender.budget
		},
	},
	data() {
	    return {
	        input_dolar_valor: null  // Este será el input editable
	    }
	},
	created() {
		this.iniciar_dolar()
	},
	watch: {
		/*
			El input es una copia local del valor del store y solo se sincronizaba al montarse
			(iniciar_dolar). Desde que limpiar_vender restaura la cotizacion del dueño al terminar
			cada comprobante, el store cambia sin que este componente se vuelva a montar, y el
			input seguia mostrando la cotizacion de la venta anterior (o la de la venta editada)
			mientras el store --que es lo que viaja en el POST-- ya tenia la del dueño.

			Se compara por valor numerico y no por igualdad a secas para no pisar lo que el
			vendedor esta tipeando: cada keyup manda Number(input) al store, y si el store
			devolviera "1250" sobre un "1250." a medio escribir, le comeria el punto.
		*/
		valor_dolar(valor) {
			if (valor === null || typeof valor === 'undefined') {
				this.iniciar_dolar()
				return
			}

			if (Number(this.input_dolar_valor) !== Number(valor)) {
				this.input_dolar_valor = valor
			}
		},
	},
	methods: {
		/**
		 * Deja la cotizacion de la venta cargada: la que ya tiene (la de la venta que se edita, o la que
		 * el vendedor tipeo) y, si no hay ninguna, el dolar del sistema.
		 *
		 * 🔴 Decision de Lucas (30/9/2026): una venta en dolares sin cotizacion la API la rechaza (422),
		 * asi que Vender tiene que arrancar SIEMPRE con el dolar que el comercio tiene cargado. Antes
		 * solo se sembraba cuando el store estaba en `null`: una cotizacion en CERO (el vendedor borro
		 * el campo) se quedaba en cero y la venta en dolares salia sin con que convertir. Ahora
		 * null, 0 o vacio se tratan igual: sin cotizacion -> la del sistema.
		 *
		 * Sin dolar configurado en el comercio no se inventa nada: queda vacio y el campo USD se ve
		 * (`mostrar_input_dolar`) para que el vendedor lo cargue.
		 */
		iniciar_dolar() {

			if (!this.user) {
				setTimeout(() => {
					this.iniciar_dolar()
				}, 500)
				return
			}

			if (Number(this.valor_dolar) > 0) {
				this.input_dolar_valor = this.valor_dolar
				return
			}

			if (!this.cargar_dolar_por_defecto()) {
				console.log('El dueño no tiene dolar configurado')
				return
			}

			this.input_dolar_valor = this.valor_dolar_por_defecto
			this.setTotal()
		},
		set_total() {
			this.setTotal()
		},
		/**
		 * Cada cambio del campo (`input`, y no `keyup`: el campo es numerico y un valor pegado o movido con
		 * las flechitas del propio campo no dispara ninguna tecla, asi que el store se quedaba con la
		 * cotizacion anterior mientras el campo mostraba otra): el valor va al store (es lo que viaja en el POST) y se recalcula el total.
		 * Si el campo queda vacio o en cero NO se restaura el dolar del sistema acá, porque el vendedor
		 * puede estar borrando para escribir otro valor: eso lo hace `restaurar_dolar_si_falta` cuando
		 * sale del campo.
		 */
		set_valor_dolar() {
			this.valor_dolar = Number(this.input_dolar_valor)

			this.setTotal()
		},
		/**
		 * Al salir del campo: si quedo vacio o en cero, vuelve el dolar del sistema.
		 */
		restaurar_dolar_si_falta() {
			if (Number(this.input_dolar_valor) > 0) {
				return
			}

			if (this.cargar_dolar_por_defecto()) {
				this.input_dolar_valor = this.valor_dolar_por_defecto
				this.setTotal()
			}
		}
	}
}
</script>
<style lang="sass">
.select-moneda, .input-dolar
	font-size: 15px !important

.form-moneda
	
	.input-group
		
		.input-group-prepend
			height: 36.6px !important
</style>