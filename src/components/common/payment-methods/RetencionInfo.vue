<template>
	<div
	v-if="is_retencion"
	class="retencion card-moderna p-15 m-t-15 s-2 b-r-1">

		<p class="retencion__ayuda text-muted">
			Datos del certificado de retención que te dio el cliente. Solo el impuesto es obligatorio:
			si el papel te llegó incompleto, cargá lo que tengas y el cobro se registra igual.
		</p>

		<b-form-row>
			<b-col cols="12">
				<b-input-group prepend="Impuesto">
					<b-form-select
						data-testid="retencion-impuesto"
						:value="valor('retencion_impuesto')"
						:options="impuesto_options"
						@change="emit_change('retencion_impuesto', $event)"
					></b-form-select>
				</b-input-group>
			</b-col>
		</b-form-row>

		<b-form-row
		v-for="prop in props"
		:key="prop.key">
			<b-col cols="12">
				<b-input-group :prepend="prop.text">
					<b-form-input
						:data-testid="'retencion-'+prop.key"
						:placeholder="prop.text"
						:type="prop.type"
						:value="valor(prop.key)"
						@input="emit_change(prop.key, $event)"
					>
					</b-form-input>
				</b-input-group>
			</b-col>
		</b-form-row>
	</div>
</template>
<script>
/**
 * Los datos del certificado de una retención sufrida, dentro de la fila de método de pago del
 * modal de cobro (misión compras-factura-manual-alicuotas, 17/9/2026, parte C).
 *
 * 🔴 EL MONTO NO ESTA ACA Y NO TIENE QUE ESTARLO. El importe de la retención es el "Monto" de la
 * fila de método de pago, el mismo campo que usan el efectivo y la transferencia: por eso suma al
 * total del cobro y cancela la deuda entera. Si el cliente te debe $100.000 y te retiene $2.000, te
 * paga $98.000 y la deuda se cancela por $100.000. Un segundo campo de monto acá abriría la puerta
 * a que los dos números no coincidan, y ahí el cliente queda debiendo plata que ya pagó.
 *
 * Las claves viajan prefijadas con `retencion_` porque comparten la fila del payload con las del
 * cheque (`numero`, `banco`, `fecha_emision`): sin prefijo, "numero" sería el mismo campo para los
 * dos.
 *
 * Se dibuja igual que CheckInfo: mira el tipo del método de pago elegido en el store y se muestra
 * solo si es `retencion`.
 */
export default {
	name: 'RetencionInfo',
	props: {
		payment_method: {
			type: Object,
		},
	},
	computed: {
		is_retencion() {
			let payment_method_model = this.$store.state.current_acount_payment_method.models.find(p => p.id == this.payment_method.current_acount_payment_method_id)

			if (typeof payment_method_model != 'undefined') {
				if (payment_method_model.type && payment_method_model.type.slug == 'retencion') {
					return true
				}
			}
			return false
		},
		impuesto_options() {
			return [
				{value: 'ganancias', text: 'Ganancias'},
				{value: 'iva', text: 'IVA'},
				{value: 'iibb', text: 'Ingresos Brutos'},
			]
		},
		/**
		 * 🔴 El campo del régimen cambia de nombre según el impuesto, y no es cosmético: las
		 * retenciones de Ingresos Brutos NO son de ARCA, son de régimen provincial (ARBA, AGIP y
		 * demás), y ahí el certificado no trae un "régimen" sino una JURISDICCION. Es el mismo
		 * campo de la tabla —texto libre, justamente por esto—, pero pedírselo al usuario con el
		 * nombre equivocado es pedirle un dato que su papel no tiene.
		 *
		 * @returns {Array}
		 */
		props() {
			let es_iibb = this.valor('retencion_impuesto') == 'iibb'

			/*
			 * ⚠️ Las etiquetas van CORTAS a proposito. Son el `prepend` de un b-input-group dentro
			 * de un modal de 500px que en telefono baja a ~330px utiles: cada caracter de la
			 * etiqueta se lo come el input. La referencia es CheckInfo.vue, que comparte este mismo
			 * modal y cuya etiqueta mas larga son los 16 caracteres de "Numero de cheque" — todas
			 * estas quedan por debajo de esa medida. "Numero de certificado" (21) y "Fecha del
			 * certificado" (21) dejaban el input en la mitad en el ancho de telefono.
			 */
			return [
				{
					text: 'N° certificado',
					key: 'retencion_numero_certificado',
					type: 'text',
				},
				{
					text: 'Fecha',
					key: 'retencion_fecha',
					type: 'date',
				},
				{
					text: es_iibb ? 'Jurisdiccion' : 'Regimen',
					key: 'retencion_regimen',
					type: 'text',
				},
				{
					text: 'Base imponible',
					key: 'retencion_base_imponible',
					type: 'text',
				},
				{
					text: 'Alicuota (%)',
					key: 'retencion_alicuota',
					type: 'text',
				},
			]
		},
	},
	methods: {
		/**
		 * Valor de una clave de la fila, con el impuesto por defecto en Ganancias para las filas
		 * que todavía no pasaron por el factory (una fila vieja de un pago que se está editando).
		 *
		 * @param {String} key
		 * @returns {String}
		 */
		valor(key) {
			if (typeof this.payment_method[key] == 'undefined' || this.payment_method[key] === null) {
				return key == 'retencion_impuesto' ? 'ganancias' : ''
			}
			return this.payment_method[key]
		},
		emit_change(key, value) {
			this.$emit('field_change', { key: key, value: value })
		},
	},
}
</script>
<style lang="sass">
.retencion
	[class^='col-']
		margin-bottom: 10px !important

	.retencion__ayuda
		font-size: .8rem
		margin-bottom: 10px
</style>
