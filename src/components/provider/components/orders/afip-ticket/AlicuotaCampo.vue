<template>
	<div>
		<!--
			🔴 NINGUNO DE LOS CUATRO CONTROLES SE DESHABILITA, NUNCA. Ni "porque ya escribiste en
			otro", ni por alicuota 0, ni por nada. `:disabled="false"` va literal y a proposito.

			No es cosmetico. El patron de campos excluyentes con `:disabled`, escrito con criterios
			distintos en lugares distintos, es exactamente el que dejo articulos con `price` y
			`percentage_gain` LOS DOS bloqueados y sin salida posible (ver CostInput.vue y
			CriterioDePrecioHelper en la API). Si alguna vez aparece un `:disabled` entre estos tres
			importes, vuelve ese bug.

			El bloqueo del modo de facturacion automatico NO contradice esto y no vive aca: lo
			resuelve AlicuotasIva.vue mostrando una tabla de solo lectura, con una leyenda que dice
			como salir y una salida que es un clic.
		-->
		<field-select-input
		v-if="campo == 'iva_id'"
		:prop="prop"
		model_name="provider_order_afip_ticket_iva"
		:relation_model_name="modelNameFromRelationKey(prop)"
		:value="valor_visible"
		:disabled="false"
		:options="getOptions(prop, alicuota_iva, 'provider_order_afip_ticket_iva')"
		@input="set_alicuota($event)"></field-select-input>

		<!--
			Se reusa "field-text-input" -- el mismo componente que renderiza ModelForm.vue para una
			prop `number` -- para no duplicar el formateo de precio ni el resto del comportamiento
			del campo, igual que hace CostInput.vue.
		-->
		<field-text-input
		v-else
		model_name="provider_order_afip_ticket_iva"
		:prop="prop"
		:value="valor_visible"
		:disabled="false"
		:prop_text="propText(prop)"
		:price_value="price(valor_visible)"
		:has_bar_code_scanner="false"
		@input="set_importe($event)"></field-text-input>

		<!--
			Descripcion permanente (no popover), solo debajo del ultimo de los tres importes, para
			no repetir la misma frase tres veces en el mismo formulario.
		-->
		<small
		v-if="campo == 'bruto'"
		class="text-muted d-block m-t-10">
			<span v-if="!hay_iva_aplicable">
				Esta alicuota no tiene IVA que discriminar (Exento, No Gravado o 0%): los tres
				importes muestran el mismo numero y el IVA queda en 0.
			</span>
			<span v-else>
				Escribi en el campo que tengas a mano -- Neto, Importe IVA o Bruto -- y los otros dos
				se calculan solos con la alicuota elegida ({{ porcentaje_es(alicuota) }}%). Se guardan
				el Neto y el Importe IVA; el Bruto es la suma de los dos.
			</span>
		</small>
	</div>
</template>
<script>
import Vue from 'vue'

/**
 * Cual de los tres importes esta tipeando la persona AHORA, y el texto tal cual lo escribio.
 *
 * 🔴 Por que existe y por que vive ACA AFUERA y no en el `data` del componente.
 *
 * Afuera del componente: los tres importes son tres instancias distintas de este mismo archivo
 * (una por slot), y necesitan compartir esta memoria. Si la persona escribe en Neto, la instancia
 * de Bruto tiene que saber que ella NO es la que manda para no reformatearse encima de lo que la
 * otra derivo. Un `Vue.observable` a nivel modulo alcanza porque hay un solo modal de alicuota
 * abierto a la vez en todo el sistema.
 *
 * Y existe porque sin esto el numero se le reformatea a la persona abajo del cursor. Tipear "1000."
 * en Bruto da un ida y vuelta (neto 826,45 + iva 173,55) cuya suma es 1000, y el input volveria a
 * pintar "1000" comiendose el punto recien tipeado. Con la memoria, el campo que se esta
 * editando muestra su texto crudo y los otros dos se derivan.
 *
 * 🔴 NO ES UNA COLUMNA Y NO VIAJA EN NINGUN REQUEST. Es al proposito que no se escriba en el
 * modelo: `getModelToSend()` (model/Index.vue:803) hace un spread del modelo, asi que cualquier
 * clave que le agreguemos sale para la API.
 */
const edicion = Vue.observable({
	campo: null,
	texto: null,
})

export default {
	components: {
		FieldTextInput: () => import('@/common-vue/components/model/form/FieldTextInput'),
		FieldSelectInput: () => import('@/common-vue/components/model/form/FieldSelectInput'),
	},
	props: {
		/**
		 * Cual de los cuatro controles renderiza esta instancia: 'iva_id', 'neto', 'iva_importe'
		 * o 'bruto'.
		 */
		campo: {
			type: String,
			required: true,
		},
	},
	computed: {
		/**
		 * La alicuota en edicion, leida derecho del store, mismo patron que los componentes de
		 * "modal-props" del listado (CostInput.vue, PriceInput.vue).
		 *
		 * 🔴 ES LA MISMA REFERENCIA que la fila de la tabla del has_many: `__base_store.js` hace
		 * `state.model = value.model` sin copiar. Cualquier $set sobre este objeto le cambia el
		 * numero a la tabla de atras, por eso este componente NO le escribe nada hasta que la
		 * persona toca algo (ver set_importe / set_alicuota).
		 */
		alicuota_iva() {
			return this.$store.state.provider_order_afip_ticket_iva.model
		},
		/**
		 * Definicion declarativa de la prop que renderiza esta instancia
		 * (src/models/provider_order_afip_ticket_iva.js), necesaria para reusar los componentes de
		 * input genericos con el mismo comportamiento que les da ModelForm.
		 */
		prop() {
			let self = this
			return this.modelPropertiesFromName('provider_order_afip_ticket_iva').find(model_prop => {
				return model_prop.key == self.campo
			})
		},
		/**
		 * Alicuota de IVA, priorizando SIEMPRE el `iva_id` que hay AHORA en el formulario.
		 *
		 * 🔴 No se usa `get_item_iva_percentage()` a secas: ese helper mira primero la relacion
		 * `iva` del modelo, que viene cargada desde la API. El select escribe `iva_id` y nadie
		 * refresca la relacion, asi que el helper devolveria la alicuota VIEJA aunque la persona
		 * acabe de cambiarla, y la pantalla calcularia distinto que el backend. Es el mismo bug
		 * que ya esta documentado en CostInput.vue.
		 */
		alicuota() {
			if (this.alicuota_iva && this.alicuota_iva.iva_id) {
				return this.get_iva_percentage_from_store(this.alicuota_iva.iva_id)
			}

			return this.get_item_iva_percentage(this.alicuota_iva)
		},
		/**
		 * Si hay un IVA real que discriminar. Alicuota 0, Exento y No Gravado no cuentan
		 * (`normalize_iva_percentage` ya los devuelve como 0), mismo criterio que
		 * `hay_iva_aplicable` en CostInput.vue.
		 *
		 * Cuando da false los tres importes muestran el mismo numero y el IVA queda en 0. Los
		 * inputs NO se bloquean por esto.
		 *
		 * @returns {Boolean}
		 */
		hay_iva_aplicable() {
			return !!this.alicuota
		},
		/**
		 * Lo que se muestra en este control.
		 *
		 * 🔴 Es una computed DERIVADA, no un valor que se escriba en el store al abrir el modal.
		 * La primera version de CostInput.vue convertia adentro de un watcher y, como el modelo es
		 * la misma referencia que la fila de la tabla, el numero se multiplicaba en cada vuelta
		 * (1000 -> 1210 -> 1464,10) hasta que alguien tocaba Guardar y eso llegaba a la base.
		 *
		 * La regla, entonces: el store se toca SOLO cuando la persona tipea.
		 */
		valor_visible() {
			if (!this.alicuota_iva) {
				return null
			}

			if (this.campo == 'iva_id') {
				return this.alicuota_iva.iva_id
			}

			// El campo que la persona esta tipeando muestra su texto crudo, sin pasar por el
			// redondeo del ida y vuelta.
			if (edicion.campo == this.campo) {
				return edicion.texto
			}

			if (this.campo == 'bruto') {
				return this.bruto_derivado
			}

			return this.alicuota_iva[this.campo]
		},
		/**
		 * Bruto = neto + iva_importe. Siempre derivado: no existe la columna `bruto`.
		 *
		 * Vacio (no cero) mientras los dos importes esten vacios, para no escribir un "0" arriba de
		 * una fila recien creada que la persona todavia no cargo.
		 *
		 * @returns {Number|String}
		 */
		bruto_derivado() {
			let sin_neto = this.esta_vacio(this.alicuota_iva.neto)
			let sin_iva = this.esta_vacio(this.alicuota_iva.iva_importe)

			if (sin_neto && sin_iva) {
				return ''
			}

			let suma = this.numero(this.alicuota_iva.neto) + this.numero(this.alicuota_iva.iva_importe)

			return this.dos_decimales(suma)
		},
	},
	methods: {
		/**
		 * @param {String|Number|null} valor
		 * @returns {Boolean} true si el valor no tiene nada cargado.
		 */
		esta_vacio(valor) {
			return valor === null || valor === '' || typeof valor == 'undefined'
		},
		/**
		 * Convierte a numero tolerando la coma decimal y el campo vacio.
		 *
		 * @param {String|Number|null} valor
		 * @returns {Number} 0 si no hay nada usable.
		 */
		numero(valor) {
			if (this.esta_vacio(valor)) {
				return 0
			}

			let parseado = parseFloat(String(valor).replace(',', '.'))

			if (isNaN(parseado)) {
				return 0
			}

			return parseado
		},
		/**
		 * Redondea a dos decimales devolviendo un NUMERO, no un string.
		 *
		 * El redondeo es inevitable: el ida y vuelta entre neto, IVA y bruto corre centavos, y
		 * mostrar 826,4462809917355 arriba de un campo de precio es peor. Se prefiere el numero
		 * sobre el string de `toFixed()` porque estos dos valores se guardan, y un "826.45" con
		 * comillas es un decimal que viaja como texto.
		 *
		 * @param {Number} valor
		 * @returns {Number}
		 */
		dos_decimales(valor) {
			return Math.round(valor * 100) / 100
		},
		/**
		 * Unico punto por el que la persona cambia la alicuota.
		 *
		 * 🔴 Ademas de escribir el `iva_id`, REHACE los dos importes con la alicuota nueva, y eso
		 * no es opcional: el backend guarda `neto` e `iva_importe` tal cual se los mandan, no los
		 * recalcula. Sin este paso, cambiar de 21% a 10,5% dejaba la fila con el IVA del 21% y la
		 * alicuota del 10,5% -- dos numeros que se contradicen, guardados, y que despues arman el
		 * Total IVA de la factura y el Libro IVA Compras.
		 *
		 * Es un recalculo disparado por una accion de la persona, no un watcher: la regla de "el
		 * store se toca solo cuando la persona toca algo" sigue intacta. Un watcher sobre `iva_id`
		 * ademas se dispararia al ABRIR cada fila (la referencia del modelo cambia) y le reescribiria
		 * el IVA a una fila que nadie toco.
		 *
		 * El ancla del recalculo es el ultimo campo que la persona tipeo; si no tipeo ninguno, el
		 * Neto, que es la base imponible y lo que uno espera que quede fijo al cambiar de alicuota.
		 *
		 * @param {Number|String} iva_id
		 */
		set_alicuota(iva_id) {
			this.$set(this.alicuota_iva, 'iva_id', iva_id)

			let alicuota_nueva = this.get_iva_percentage_from_store(iva_id)

			let campo_ancla = edicion.campo ? edicion.campo : 'neto'
			let valor_ancla = edicion.campo ? edicion.texto : this.alicuota_iva.neto

			if (this.esta_vacio(valor_ancla)) {
				return
			}

			this.aplicar(campo_ancla, valor_ancla, alicuota_nueva)
		},
		/**
		 * Unico punto por el que la persona toca uno de los tres importes.
		 *
		 * @param {String|Number} valor lo que acaba de tipear.
		 */
		set_importe(valor) {
			edicion.campo = this.campo
			edicion.texto = valor

			this.aplicar(this.campo, valor, this.alicuota)
		},
		/**
		 * Escribe `neto` e `iva_importe` a partir de UNO de los tres importes.
		 *
		 *     neto        -> iva_importe = neto x alic/100 ; bruto = neto + iva_importe
		 *     iva_importe -> neto        = iva_importe x 100/alic
		 *     bruto       -> neto        = bruto / (1 + alic/100) ; iva_importe = bruto - neto
		 *
		 * Con Bruto el resultado es exacto a proposito: `iva_importe` se calcula como la RESTA
		 * contra el neto ya redondeado, asi que `neto + iva_importe` vuelve a dar el numero que la
		 * persona tipeo, sin que le baile un centavo.
		 *
		 * Sin alicuota aplicable (0 / Exento / No Gravado) los tres importes son el mismo numero y
		 * el IVA queda en 0, mismo criterio que CostInput.vue. Sin deshabilitar nada.
		 *
		 * @param {String} campo   'neto', 'iva_importe' o 'bruto'.
		 * @param {String|Number} valor
		 * @param {Number} alicuota_a_usar
		 */
		aplicar(campo, valor, alicuota_a_usar) {
			// Campo vaciado: se vacian los dos importes guardados en vez de escribir un 0 o un NaN
			// sobre lo que la persona acaba de borrar.
			if (this.esta_vacio(valor) || isNaN(parseFloat(String(valor).replace(',', '.')))) {
				this.$set(this.alicuota_iva, 'neto', valor)
				this.$set(this.alicuota_iva, 'iva_importe', '')
				return
			}

			let numero = this.numero(valor)

			if (!alicuota_a_usar) {
				this.$set(this.alicuota_iva, 'neto', numero)
				this.$set(this.alicuota_iva, 'iva_importe', 0)
				return
			}

			if (campo == 'neto') {
				this.$set(this.alicuota_iva, 'neto', numero)
				this.$set(this.alicuota_iva, 'iva_importe', this.dos_decimales(numero * alicuota_a_usar / 100))
				return
			}

			if (campo == 'iva_importe') {
				this.$set(this.alicuota_iva, 'iva_importe', numero)
				this.$set(this.alicuota_iva, 'neto', this.dos_decimales(numero * 100 / alicuota_a_usar))
				return
			}

			// bruto
			let neto = this.dos_decimales(numero / (1 + (alicuota_a_usar / 100)))
			this.$set(this.alicuota_iva, 'neto', neto)
			this.$set(this.alicuota_iva, 'iva_importe', this.dos_decimales(numero - neto))
		},
	},
	watch: {
		/**
		 * Al abrir otra alicuota (o al crear una nueva) se olvida que campo se estaba tipeando.
		 *
		 * Se dispara SOLO cuando cambia la referencia del modelo, que es lo que hace
		 * `setModel()`: tipear hace `$set` sobre el mismo objeto y no lo despierta. Por eso no
		 * convierte ni escribe nada -- de eso se ocupan las computeds derivadas.
		 */
		alicuota_iva(nuevo, viejo) {
			if (nuevo === viejo) {
				return
			}

			edicion.campo = null
			edicion.texto = null
		},
	},
}
</script>
