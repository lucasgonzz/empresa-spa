<template>
	<div
	class="meli-form__seccion"
	data-testid="meli-atributos">
		<p class="meli-form__titulo">Datos que pide la categoría</p>

		<p
		v-if="!atributos.length"
		class="meli-form__texto m-b-0">
			Esta categoría no pide datos extra.
		</p>

		<template v-else>
			<!-- Resumen: si faltan datos obligatorios, cuántos -->
			<p
			v-if="faltantes > 0"
			class="meli-form__aviso meli-form__aviso--alerta"
			data-testid="meli-atributos-faltan">
				Te {{ faltantes == 1 ? 'falta 1 dato obligatorio' : 'faltan ' + faltantes + ' datos obligatorios' }} para poder publicar.
			</p>
			<p
			v-else-if="obligatorios.length"
			class="meli-form__aviso meli-form__aviso--ok">
				Están todos los datos obligatorios.
			</p>

			<!-- Obligatorios (y obligatorios en algunos casos), en el orden de la API -->
			<div
			v-if="obligatorios.length"
			class="meli-atributos__grilla">
				<attribute-input
				v-for="atributo in obligatorios"
				:key="'atributo-' + atributo.id"
				:atributo="atributo"
				:valor="valores[atributo.id] || null"
				:fuente="fuente(atributo)"
				@cambio="reenviar_cambio"></attribute-input>
			</div>

			<!-- Opcionales: plegados, porque una categoría puede pedir decenas -->
			<div
			v-if="opcionales.length"
			class="meli-atributos__opcionales">
				<b-button
				size="sm"
				variant="link"
				class="p-0"
				data-testid="meli-atributos-opcionales-toggle"
				@click="ver_opcionales = !ver_opcionales">
					{{ ver_opcionales ? 'Ocultar los datos opcionales' : 'Ver los datos opcionales (' + opcionales.length + ')' }}
				</b-button>
				<p
				v-if="!ver_opcionales"
				class="meli-form__texto m-t-5 m-b-0">
					No son obligatorios, pero completarlos ayuda a que la publicación aparezca en más búsquedas.
				</p>

				<div
				v-if="ver_opcionales"
				class="meli-atributos__grilla">
					<attribute-input
					v-for="atributo in opcionales"
					:key="'atributo-' + atributo.id"
					:atributo="atributo"
					:valor="valores[atributo.id] || null"
					:fuente="fuente(atributo)"
					@cambio="reenviar_cambio"></attribute-input>
				</div>
			</div>
		</template>
	</div>
</template>
<script>
/**
 * Datos que pide la categoría de Mercado Libre (misión mercado-libre-integracion, 27/10/2026).
 * Parte de mercado-libre-form/Index.vue.
 *
 * Recibe los atributos del resolve de la categoría, cada uno {id (local), meli_id, name,
 * value_type, required, conditional_required, auto, values: [{id, name}], hint, tooltip,
 * value_max_length}, ya ordenados con los requeridos primero. Muestra arriba los obligatorios
 * (con su marca) y plegados los opcionales; cada dato lo dibuja AttributeInput.vue.
 *
 * No guarda nada: reenvía `cambio` {atributo, value_id, value_name} y el padre arma
 * `model.meli_attributes`, que viaja con el artículo. Los estilos viven en
 * mercado-libre-form/Index.vue.
 */
export default {
	name: 'MeliAttributesForm',
	components: {
		AttributeInput: () => import('@/components/listado/components/mercado-libre-form/AttributeInput'),
	},
	props: {
		atributos: {
			type: Array,
			default: () => [],
		},
		// Valores por id local del atributo: {value_id, value_name}
		valores: {
			type: Object,
			default: () => ({}),
		},
		// {brand, bar_code, sku}: lo que la API usa para los atributos automáticos
		fuentes_automaticas: {
			type: Object,
			default: () => ({}),
		},
	},
	data() {
		return {
			ver_opcionales: false,
		}
	},
	computed: {
		// Requeridos y requeridos en algunos casos, en el orden de la API (requeridos primero)
		obligatorios() {
			return this.atributos.filter(atributo => atributo.required || atributo.conditional_required)
		},
		opcionales() {
			return this.atributos.filter(atributo => !atributo.required && !atributo.conditional_required)
		},
		// Cantidad de requeridos sin valor (los automáticos con dato en el artículo no cuentan)
		faltantes() {
			return this.atributos.filter(atributo => {
				let valor = this.valores[atributo.id]
				let tiene_valor = !!(valor && (valor.value_id || valor.value_name))
				return !!atributo.required && !tiene_valor && !this.fuente(atributo)
			}).length
		},
	},
	methods: {
		/**
		 * Lo que la API va a usar para un atributo automático si queda vacío (o null).
		 *
		 * @param {Object} atributo
		 * @returns {String|null}
		 */
		fuente(atributo) {
			if (!atributo.auto) {
				return null
			}
			let fuente = this.fuentes_automaticas[atributo.auto]
			return fuente ? String(fuente) : null
		},
		/**
		 * Reenvía al padre el cambio de un dato.
		 *
		 * @param {Object} cambio {atributo, value_id, value_name}
		 * @returns {void}
		 */
		reenviar_cambio(cambio) {
			this.$emit('cambio', cambio)
		},
	},
}
</script>
