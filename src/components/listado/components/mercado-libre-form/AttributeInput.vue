<template>
	<div
	class="meli-atributo"
	:class="{ 'meli-atributo--falta': falta }"
	:data-testid="'meli-atributo-' + atributo.meli_id">
		<label
		:for="id_del_input"
		class="meli-atributo__nombre"
		:title="atributo.tooltip || null">
			{{ atributo.name }}
			<span
			v-if="atributo.required"
			class="meli-atributo__marca">Obligatorio</span>
			<span
			v-else-if="atributo.conditional_required"
			class="meli-atributo__marca meli-atributo__marca--condicional">Obligatorio en algunos casos</span>
		</label>

		<b-form-select
		v-if="usa_select"
		:id="id_del_input"
		size="sm"
		:value="valor_id"
		:options="opciones"
		@change="elegir_valor"></b-form-select>

		<template v-else>
			<b-form-input
			:id="id_del_input"
			size="sm"
			autocomplete="off"
			:value="valor_texto"
			:list="tiene_valores ? id_de_la_lista : null"
			:maxlength="atributo.value_max_length || null"
			:placeholder="placeholder"
			@input="escribir_valor"></b-form-input>
			<datalist
			v-if="tiene_valores"
			:id="id_de_la_lista">
				<option
				v-for="opcion in atributo.values"
				:key="'valor-' + atributo.id + '-' + opcion.id"
				:value="opcion.name"></option>
			</datalist>
		</template>

		<small
		v-if="atributo.auto"
		class="meli-atributo__ayuda">
			{{ texto_automatico }}
		</small>
		<small
		v-if="atributo.hint"
		class="meli-atributo__ayuda">
			{{ atributo.hint }}
		</small>
	</div>
</template>
<script>
/**
 * Un dato (atributo) que pide la categoría de Mercado Libre (misión mercado-libre-integracion,
 * 27/10/2026). Lo usa AttributesForm.vue para los obligatorios y para los opcionales.
 *
 * - Con lista cerrada (`value_type` list o boolean, con valores) → select.
 * - Si no → campo de texto con los valores de Mercado Libre como sugerencias (datalist): se
 *   puede elegir uno o escribir otro. Si lo escrito coincide con un valor de la lista, se manda
 *   también su id.
 * - `auto` ('brand' | 'bar_code' | 'sku'): la API lo completa sola con la marca, el código de
 *   barras o el SKU del artículo si queda vacío; escribiendo un valor se lo pisa.
 *
 * No guarda nada: emite `cambio` {atributo, value_id, value_name}. Los estilos viven en
 * mercado-libre-form/Index.vue.
 */
export default {
	name: 'MeliAttributeInput',
	props: {
		// {id (local), meli_id, name, value_type, required, conditional_required, auto, values, hint, tooltip, value_max_length}
		atributo: {
			type: Object,
			required: true,
		},
		// {value_id, value_name} o null
		valor: {
			type: Object,
			default: null,
		},
		// Lo que la API va a usar si el atributo es automático y queda vacío (o null)
		fuente: {
			type: String,
			default: null,
		},
	},
	computed: {
		id_del_input() {
			return 'meli-atributo-input-' + this.atributo.id
		},
		id_de_la_lista() {
			return 'meli-atributo-valores-' + this.atributo.id
		},
		tiene_valores() {
			return Array.isArray(this.atributo.values) && this.atributo.values.length > 0
		},
		// Select solo para las listas cerradas: sí/no y listas de Mercado Libre con valores
		usa_select() {
			return (this.atributo.value_type == 'boolean' || this.atributo.value_type == 'list') && this.tiene_valores
		},
		opciones() {
			let opciones = [{ value: null, text: 'Elegí una opción' }]
			this.atributo.values.forEach(opcion => {
				opciones.push({ value: opcion.id, text: opcion.name })
			})
			return opciones
		},
		// Id del valor elegido para el select (si solo hay texto guardado, se lo busca por nombre)
		valor_id() {
			if (!this.valor) {
				return null
			}
			if (this.valor.value_id) {
				return this.valor.value_id
			}
			let por_nombre = this.buscar_por_nombre(this.valor.value_name)
			return por_nombre ? por_nombre.id : null
		},
		valor_texto() {
			return this.valor && this.valor.value_name ? this.valor.value_name : ''
		},
		tiene_valor() {
			return !!(this.valor && (this.valor.value_id || this.valor.value_name))
		},
		// Un requerido sin valor y sin dato automático en el artículo
		falta() {
			return !!this.atributo.required && !this.tiene_valor && !this.fuente
		},
		// Explicación de un atributo automático, con el valor que se va a usar
		texto_automatico() {
			let de_donde = {
				brand: 'la marca del artículo',
				bar_code: 'el código de barras del artículo',
				sku: 'el SKU del artículo (o su código de proveedor)',
			}
			let texto = 'Si lo dejás vacío, se completa solo con ' + (de_donde[this.atributo.auto] || 'un dato del artículo')
			if (this.fuente) {
				return texto + ': ' + this.fuente + '.'
			}
			return texto + ', pero el artículo todavía no lo tiene cargado.'
		},
		// El valor automático que se va a usar, o una pista del formato
		placeholder() {
			if (this.fuente) {
				return this.fuente
			}
			if (this.atributo.value_type == 'number_unit') {
				return 'Número y unidad, ej: 10 cm'
			}
			if (this.tiene_valores) {
				return 'Elegí o escribí'
			}
			return ''
		},
	},
	methods: {
		/**
		 * El usuario eligió una opción del select.
		 *
		 * @param {String|null} value_id
		 * @returns {void}
		 */
		elegir_valor(value_id) {
			let opcion = value_id ? this.atributo.values.find(v => v.id == value_id) : null
			this.$emit('cambio', {
				atributo: this.atributo,
				value_id: opcion ? opcion.id : null,
				value_name: opcion ? opcion.name : null,
			})
		},
		/**
		 * El usuario escribió en el campo de texto.
		 *
		 * @param {String} texto
		 * @returns {void}
		 */
		escribir_valor(texto) {
			let opcion = this.buscar_por_nombre(texto)
			this.$emit('cambio', {
				atributo: this.atributo,
				value_id: opcion ? opcion.id : null,
				value_name: texto,
			})
		},
		/**
		 * Busca un valor de la lista de Mercado Libre por su nombre (sin importar mayúsculas).
		 *
		 * @param {String|null} nombre
		 * @returns {Object|null}
		 */
		buscar_por_nombre(nombre) {
			if (!nombre || !this.tiene_valores) {
				return null
			}
			let buscado = String(nombre).trim().toLowerCase()
			let opcion = this.atributo.values.find(v => String(v.name).trim().toLowerCase() == buscado)
			return opcion || null
		},
	},
}
</script>
