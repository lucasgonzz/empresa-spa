<template>
	<div
	v-if="is_cheque"
	class="check card-moderna p-15 m-t-15 s-2 b-r-1">

		<!--
			ORIGEN DEL CHEQUE (misión cheques-endoso-y-bancos, 21/9/2026).

			Solo con `permitir_endoso`: la prenden el pago a proveedor y el gasto, que son las dos
			pantallas donde un cheque que ya se recibió puede salir endosado. Vender, la agenda y
			las comisiones no la pasan: una venta cobrada con cheque es un cheque RECIBIDO y no se
			endosa desde ahí.
		-->
		<b-form-group
		v-if="permitir_endoso"
		class="check__origen">
			<b-form-radio-group
			:data-testid="'cheque-origen-'+index"
			:checked="origen"
			:options="origen_options"
			:disabled="disabled_inputs"
			@change="set_origen"></b-form-radio-group>

			<small
			v-if="!hay_cheques_para_endosar"
			class="text-muted check__leyenda">
				No tenés cheques recibidos disponibles para endosar.
			</small>
		</b-form-group>

		<b-form-row
		v-if="permitir_endoso && endosando">
			<b-col
			cols="12">
				<!--
					Cartera de cheques (misión cartera-cheques-modal, 22/9/2026): reemplaza al
					<select> de antes. El botón sigue visible con un cheque ya elegido A PROPÓSITO
					-es lo que permite reabrir la cartera y cambiar de cheque-; lo único que cambia
					es que abajo, con `mostrar_campos`, aparecen los datos ya poblados.
				-->
				<b-button
				:data-testid="'cheque-abrir-cartera-'+index"
				variant="outline-primary"
				class="check__btn-cartera"
				:disabled="disabled_inputs || !hay_cheques_para_endosar"
				v-b-modal="'cartera-cheques-'+index">
					<i class="bi bi-wallet2 m-r-5"></i>
					Seleccionar de mi cartera de cheques
				</b-button>

				<small
				v-if="cheque_id_actual"
				class="text-muted check__leyenda">
					Se endosa entero: el monto de la fila es el del cheque y no se puede cambiar.
				</small>

				<cartera-cheques
				:id="'cartera-cheques-'+index"
				:cheques="cheques_disponibles"
				@elegir="set_cheque_a_endosar"></cartera-cheques>
			</b-col>
		</b-form-row>

		<b-form-row
		v-if="mostrar_campos"
		v-for="prop in props"
		:key="prop.key">
			<b-col
			cols="12">

				<!--
					BANCO: un select sobre el catálogo (cheque_banco) con "+" para dar de alta uno
					sin salir del pago. Reemplaza al texto libre de antes; la columna `banco` se
					sigue mandando con el NOMBRE del banco elegido, así una API que todavía no
					conozca cheque_banco_id (o el Excel y el mostrador, que leen el texto) no
					quedan con el banco vacío.
				-->
				<div
				v-if="prop.key == 'banco'">
					<b-input-group
					:prepend="prop.text">
						<b-form-select
						:data-testid="'cheque-banco-'+index"
						:value="cheque_banco_id_actual"
						:options="banco_options"
						:disabled="campos_deshabilitados"
						@change="set_banco"></b-form-select>

						<b-input-group-append>
							<b-button
							:data-testid="'cheque-nuevo-banco-'+index"
							variant="outline-primary"
							title="Dar de alta un banco nuevo"
							:disabled="campos_deshabilitados"
							@click="alternar_nuevo_banco">
								<i class="icon-plus"></i>
							</b-button>
						</b-input-group-append>
					</b-input-group>

					<!--
						Un cheque viejo con el banco escrito a mano y sin id: el select queda en
						"Sin banco" y el texto se muestra acá, para que se entienda que el dato
						existe aunque no esté en la lista.
					-->
					<small
					v-if="!cheque_banco_id_actual && texto_banco_legacy"
					class="text-muted check__leyenda">
						Banco cargado como texto: {{ texto_banco_legacy }}
					</small>

					<b-input-group
					v-if="nuevo_banco_visible"
					class="check__nuevo-banco m-t-10">
						<b-form-input
						:data-testid="'cheque-nuevo-banco-nombre-'+index"
						:ref="'nuevo_banco_input'"
						v-model="nuevo_banco_nombre"
						placeholder="Nombre del banco nuevo"
						:disabled="creando_banco"
						@keydown.enter.prevent="crear_banco"></b-form-input>

						<b-input-group-append>
							<b-button
							:data-testid="'cheque-nuevo-banco-guardar-'+index"
							variant="primary"
							:disabled="creando_banco"
							@click="crear_banco">
								<b-spinner
								v-if="creando_banco"
								small></b-spinner>
								<span
								v-else>
									Crear
								</span>
							</b-button>
							<b-button
							variant="outline-secondary"
							:disabled="creando_banco"
							@click="alternar_nuevo_banco">
								Cancelar
							</b-button>
						</b-input-group-append>
					</b-input-group>
				</div>

				<b-input-group
				v-else
				:prepend="prop.type != 'checkbox' ? prop.text : ''">
					<b-form-checkbox
						:value="1"
						:unchecked-value="0"
						:checked="payment_method[prop.key] ? 1 : 0"
						:disabled="campos_deshabilitados"
                        @change="emit_change(prop.key, $event ? 1 : 0)"
						v-if="prop.type == 'checkbox'"
					>
						{{ prop.text }}
					</b-form-checkbox>

			        <b-form-input
				        v-else
				        :disabled="campos_deshabilitados"
				        :placeholder="prop.text"
				        :type="prop.type"
                        :value="payment_method[prop.key]"
                        @input="emit_change(prop.key, $event)"
				    >
			        </b-form-input>
				</b-input-group>
			</b-col>
		</b-form-row>
	</div>
</template>
<script>
import moment from 'moment'

/**
 * Los datos del cheque dentro de la fila de método de pago (PaymentMethodsStep).
 *
 * Misión cheques-endoso-y-bancos (21/9/2026): además de los campos de siempre, el banco pasa a
 * ser un select sobre el catálogo `cheque_banco` (con alta inline) y, donde el padre lo permite,
 * la fila puede ser un cheque NUEVO o el ENDOSO de un cheque recibido que ya está en cartera.
 *
 * 🔴 Dos formas de avisar al padre, y no son intercambiables:
 *   - `field_change` {key, value}: un campo suelto, como siempre.
 *   - `fields_change` {patch}: varios campos DE UNA SOLA VEZ. Elegir un cheque a endosar copia
 *     ocho claves (cheque_id, numero, banco, cheque_banco_id, fechas, es_echeq, notes, amount);
 *     mandarlas de a una son ocho re-renders de la fila y ocho `changed` al padre, con el total
 *     del pago recalculándose a mitad de camino con el monto todavía viejo.
 *
 * El listado de cheques disponibles NO se pide acá: se pide una vez por apertura del modal en
 * PaymentMethodsStep y baja por prop, ya sin los cheques que eligieron las otras filas.
 */
export default {
	components: {
		CarteraCheques: () => import('@/components/common/payment-methods/cartera-cheques/Index'),
	},
	props: {
		payment_method: {
			type: Object,
		},
		disabled_inputs: {
			type: Boolean,
			default: false,
		},
		/**
		 * Índice de la fila en el reparto: va en los data-testid porque este bloque se repite.
		 */
		index: {
			type: Number,
			default: 0,
		},
		/**
		 * Ofrece "Endosar un cheque recibido" además de "Cheque nuevo". La prenden solo el pago a
		 * proveedor y el gasto.
		 */
		permitir_endoso: {
			type: Boolean,
			default: false,
		},
		/**
		 * Cheques recibidos en cartera y no vencidos (GET cheque/disponibles-para-endosar), ya
		 * filtrados por el padre para excluir los elegidos en otras filas.
		 */
		cheques_disponibles: {
			type: Array,
			default: () => [],
		},
	},
	data() {
		return {
			/*
				'nuevo' | 'endoso'. Es estado local y no un derivado de cheque_id a propósito: el
				usuario elige "Endosar" ANTES de elegir el cheque, y en ese momento cheque_id sigue
				en 0. El watch de abajo lo alinea cuando la fila ya viene con un cheque.
			*/
			origen: this.payment_method && Number(this.payment_method.cheque_id) > 0 ? 'endoso' : 'nuevo',
			nuevo_banco_visible: false,
			nuevo_banco_nombre: '',
			creando_banco: false,
		}
	},
	computed: {
		is_cheque(){
			let payment_method_model = this.$store.state.current_acount_payment_method.models.find(p => p.id == this.payment_method.current_acount_payment_method_id)

			if (typeof payment_method_model != 'undefined') {
				if (payment_method_model.type && payment_method_model.type.slug == 'cheque') {
					return true
				}
			}
			return false
		},
		props() {
			return [
				{
					text: 'Numero de cheque',
					key: 'numero',
					type: 'text',
				},
				{
					text: 'Banco',
					key: 'banco',
					type: 'text',
				},
				{
					text: 'Fecha de emision',
					key: 'fecha_emision',
					type: 'date',
				},
				{
					text: 'Fecha de pago',
					key: 'fecha_pago',
					type: 'date',
				},
				{
					text: 'Es un echeq',
					key: 'es_echeq',
					type: 'checkbox',
				},
				{
					text: 'Notas',
					key: 'notes',
					type: 'text',
				},
			]
		},

		// ------------------------------ Banco ------------------------------

		bancos() {
			return this.$store.state.cheque_banco.models
		},
		banco_options() {
			let options = [{
				value: 0,
				text: 'Sin banco',
			}]

			this.bancos.forEach(banco => {
				options.push({
					value: banco.id,
					text: banco.name,
				})
			})

			return options
		},
		cheque_banco_id_actual() {
			return Number(this.payment_method.cheque_banco_id) || 0
		},
		/**
		 * El texto libre de un cheque que todavía no tiene banco del catálogo (edición de un pago
		 * viejo, o un cheque a endosar cargado antes de esta versión).
		 *
		 * @returns {String}
		 */
		texto_banco_legacy() {
			if (!this.payment_method.banco || typeof this.payment_method.banco != 'string') {
				return ''
			}
			return this.payment_method.banco
		},

		// ------------------------------ Endoso ------------------------------

		cheque_id_actual() {
			return Number(this.payment_method.cheque_id) || 0
		},
		endosando() {
			return this.origen == 'endoso'
		},
		/**
		 * Con un cheque elegido para endosar, los datos del cheque no se editan: son los del
		 * cheque que ya está en cartera. El monto lo deshabilita PaymentMethodsStep por el mismo
		 * criterio (`!!payment_method.cheque_id`).
		 *
		 * @returns {Boolean}
		 */
		campos_deshabilitados() {
			return this.disabled_inputs || this.cheque_id_actual > 0
		},
		hay_cheques_para_endosar() {
			return this.cheques_disponibles.length > 0 || this.cheque_id_actual > 0
		},
		/**
		 * Los campos del cheque (numero, banco, fechas, es_echeq, notas) se ocultan mientras se
		 * está endosando y todavía no hay ningún cheque elegido de la cartera (misión
		 * cartera-cheques-modal, 22/9/2026): mostrarlos vacíos y editables no tenía sentido, ya
		 * que al elegir un cheque su contenido se pisa entero con `set_cheque_a_endosar`.
		 *
		 * Fuera del endoso (cheque nuevo, o `permitir_endoso` en falso: Vender, agenda,
		 * comisiones) `endosando` ya es `false`, así que acá siempre da `true` sin necesidad de
		 * repetir esa condición.
		 *
		 * @returns {Boolean}
		 */
		mostrar_campos() {
			return !this.endosando || this.cheque_id_actual > 0
		},
		origen_options() {
			return [
				{
					value: 'nuevo',
					text: 'Cheque nuevo',
				},
				{
					value: 'endoso',
					text: 'Endosar un cheque recibido',
					disabled: !this.hay_cheques_para_endosar,
				},
			]
		},
	},
	watch: {
		/*
			La fila puede llegar con cheque_id ya cargado (el padre reaplicó el factory o se está
			editando un pago) o perderlo desde afuera: el radio acompaña.
		*/
		cheque_id_actual(valor) {
			if (valor > 0) {
				this.origen = 'endoso'
			}
		},
	},
    methods: {
        emit_change(key, value) {
            this.$emit('field_change', { key: key, value: value })
        },
		/**
		 * Varios campos de la fila de una sola vez (ver el comentario del componente).
		 *
		 * @param {Object} patch {clave: valor, ...}
		 * @returns {void}
		 */
		emit_patch(patch) {
			this.$emit('fields_change', patch)
		},

		// ------------------------------ Banco ------------------------------

		/**
		 * Banco elegido del catálogo. Van las DOS claves: `cheque_banco_id` (lo nuevo) y `banco`
		 * con el nombre (compatibilidad con una API que no conozca la primera). "Sin banco"
		 * limpia las dos: dejar el texto del banco anterior con el id en 0 sería un cheque
		 * "sin banco" que igual dice Galicia.
		 *
		 * @param {Number|String} cheque_banco_id
		 * @returns {void}
		 */
		set_banco(cheque_banco_id) {
			let id = Number(cheque_banco_id) || 0

			if (!id) {
				this.emit_patch({
					cheque_banco_id: 0,
					banco: '',
				})
				return
			}

			let banco = this.bancos.find(_banco => _banco.id == id)

			this.emit_patch({
				cheque_banco_id: id,
				banco: banco ? banco.name : '',
			})
		},
		alternar_nuevo_banco() {
			this.nuevo_banco_visible = !this.nuevo_banco_visible
			this.nuevo_banco_nombre = ''

			if (this.nuevo_banco_visible) {
				this.$nextTick(() => {
					// El ref está adentro del v-for de los campos, así que Vue 2 lo entrega como
					// array (de un solo elemento: el input se dibuja solo en la fila del banco).
					let input = this.$refs.nuevo_banco_input
					if (Array.isArray(input)) {
						input = input[0]
					}
					if (input && input.focus) {
						input.focus()
					}
				})
			}
		},
		/**
		 * POST cheque-banco y el banco nuevo entra al store (`cheque_banco/add`, la misma
		 * mutación que usa el ABM) y queda elegido en esta fila. El ABM de Tesorería lo ve al
		 * instante sin recargar.
		 *
		 * @returns {void}
		 */
		crear_banco() {
			let nombre = (this.nuevo_banco_nombre || '').trim()

			if (!nombre) {
				this.$toast.error('Escribí el nombre del banco')
				return
			}

			let self = this
			this.creando_banco = true

			this.$api.post('cheque-banco', {
				name: nombre,
			})
			.then(res => {
				self.creando_banco = false

				let banco = res.data.model

				if (!banco || !banco.id) {
					self.$toast.error('No se pudo crear el banco')
					return
				}

				self.$store.commit('cheque_banco/add', banco)
				self.set_banco(banco.id)

				self.nuevo_banco_visible = false
				self.nuevo_banco_nombre = ''
				self.$toast.success('Banco creado')
			})
			.catch(err => {
				console.log(err)
				self.creando_banco = false
				self.$toast.error('No se pudo crear el banco')
			})
		},

		// ------------------------------ Endoso ------------------------------

		/**
		 * "Cheque nuevo" / "Endosar un cheque recibido". Volver a "nuevo" con un cheque ya
		 * elegido deja la fila en blanco (los datos eran de ESE cheque, no del usuario); si
		 * todavía no había cheque elegido no hay nada que limpiar y se respeta lo tipeado.
		 *
		 * @param {String} valor 'nuevo' | 'endoso'
		 * @returns {void}
		 */
		set_origen(valor) {
			this.origen = valor

			if (valor == 'nuevo' && this.cheque_id_actual > 0) {
				this.emit_patch(this.patch_en_blanco())
			}
		},
		/**
		 * Copia los datos del cheque elegido a la fila, de una sola vez, y fija el monto en el
		 * del cheque: se endosa entero, no hay endoso parcial (supuesto del plan). Con la opción
		 * vacía, la fila vuelve a blanco.
		 *
		 * 🔴 `caja_id: 0` va en el patch y no es opcional: un cheque endosado nunca es plata de
		 * caja (el papel cambia de mano, no entra ni sale nada del comercio). Si el comercio
		 * tiene una caja por defecto para el método Cheque, la fila la traía cargada aunque el
		 * select estuviera oculto, y el pago generaba un egreso de caja que no existió. La API
		 * rechaza con 422 una fila con cheque_id y caja_id; acá se evita que llegue a eso.
		 *
		 * @param {Number|String} cheque_id
		 * @returns {void}
		 */
		set_cheque_a_endosar(cheque_id) {
			let id = Number(cheque_id) || 0

			if (!id) {
				this.emit_patch(this.patch_en_blanco())
				return
			}

			let cheque = this.cheques_disponibles.find(_cheque => _cheque.id == id)

			if (!cheque) {
				this.emit_patch(this.patch_en_blanco())
				return
			}

			this.emit_patch({
				cheque_id: cheque.id,
				numero: cheque.numero || '',
				banco: this.cheque_banco_texto(cheque),
				cheque_banco_id: Number(cheque.cheque_banco_id) || 0,
				fecha_emision: this.fecha_para_input(cheque.fecha_emision),
				fecha_pago: this.fecha_para_input(cheque.fecha_pago),
				es_echeq: cheque.es_echeq ? 1 : 0,
				notes: cheque.notes || '',
				amount: Number(cheque.amount) || 0,
				caja_id: 0,
			})
		},
		patch_en_blanco() {
			return {
				cheque_id: 0,
				numero: '',
				banco: '',
				cheque_banco_id: 0,
				fecha_emision: '',
				fecha_pago: '',
				es_echeq: 0,
				notes: '',
				amount: '',
			}
		},
		/**
		 * Las fechas de GET cheque vienen como timestamp ISO (son `$dates` en el modelo) y el
		 * `<input type="date">` solo acepta YYYY-MM-DD.
		 *
		 * @param {String|null} fecha
		 * @returns {String}
		 */
		fecha_para_input(fecha) {
			if (!fecha) {
				return ''
			}
			let m = moment(fecha)
			return m.isValid() ? m.format('YYYY-MM-DD') : ''
		},
    }
}
</script>
<style lang="sass">
.check
	[class^='col-']
		margin-bottom: 10px !important

	// Los textos de ayuda del bloque toman el mismo tamaño y color secundario que las notas de la
	// tarjeta (metodo-pago-card__nota), no colores sueltos.
	.check__leyenda
		display: block
		margin-top: 4px
		color: var(--color-text-secondary)
		font-size: .8rem

	// El radio "Cheque nuevo / Endosar" va como primer renglón del bloque, separado de los
	// campos por el mismo gap de la tarjeta.
	.check__origen
		margin-bottom: var(--metodo-pago-gap)

		.custom-control-inline
			margin-right: 1rem

	// El botón que abre la cartera de cheques ocupa todo el ancho de la fila, igual que el
	// <select> que reemplazó (misión cartera-cheques-modal, 22/9/2026).
	.check__btn-cartera
		display: block
		width: 100%

	// El alta inline del banco: el input se estira y los dos botones miden lo suyo.
	.check__nuevo-banco
		.form-control
			flex: 1 1 auto
			min-width: 0

</style>
