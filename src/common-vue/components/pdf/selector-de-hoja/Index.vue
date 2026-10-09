<template>
	<div class="selector-de-hoja">
		<b-form-select
		v-model="valor_elegido"
		:options="opciones"
		:disabled="guardando_ancho"
		data-testid="selector-de-hoja"
		@change="al_elegir"></b-form-select>

		<!--
			"+ Agregar un ancho de comandera…": el ancho queda guardado para el NEGOCIO (D-L2) y
			aparece en el select de los demás diseños. Solo rollos de 40 a 120 mm; las hojas siguen
			siendo A4, Carta, Oficio y A5 (se eligen en el diseñador).
		-->
		<div
		v-if="agregando_ancho"
		class="selector-de-hoja__agregar">
			<b-input-group>
				<b-form-input
				ref="input_ancho"
				v-model="ancho_nuevo"
				type="number"
				min="40"
				max="120"
				step="1"
				placeholder="Ancho del rollo en mm (40 a 120)"
				:disabled="guardando_ancho"
				data-testid="selector-de-hoja-ancho"
				@keydown.enter.prevent="agregar_ancho"
				@keydown.esc.prevent="cancelar_agregar"></b-form-input>
				<b-input-group-append>
					<b-button
					variant="primary"
					:disabled="guardando_ancho"
					data-testid="selector-de-hoja-agregar"
					@click="agregar_ancho">
						{{ guardando_ancho ? 'Agregando...' : 'Agregar' }}
					</b-button>
					<b-button
					variant="outline-secondary"
					:disabled="guardando_ancho"
					@click="cancelar_agregar">
						Cancelar
					</b-button>
				</b-input-group-append>
			</b-input-group>
			<p
			v-if="error_del_ancho"
			class="selector-de-hoja__error"
			data-testid="selector-de-hoja-error">
				{{ error_del_ancho }}
			</p>
		</div>

		<p
		class="selector-de-hoja__ayuda"
		data-testid="selector-de-hoja-ayuda">
			{{ ayuda }}
		</p>
	</div>
</template>

<script>
import { collect_laravel_validation_messages } from '@/utils/laravel_validation_toast'
import { es_tipo_de_hoja_ticket } from '@/constants/vender_print_shortcut_options'
import { ordenar_tipos_de_hoja } from '@/store/sheet_type'
import {
	CAMPOS_APAGADOS_EN_TICKET,
	HOJA_POR_DEFECTO,
	ancho_util_del_modelo,
	foto_de_la_clase,
	columnas_reescaladas,
	caracteres_por_renglon,
} from './clase_de_hoja'

/**
 * Valor del renglón "+ Agregar un ancho de comandera…". Un string que nunca puede ser un id.
 */
const OPCION_AGREGAR = '__agregar_ancho_de_comandera__'

/**
 * Valor del renglón de hoja cuando no se conoce ningún tipo de hoja (API vieja sin perfiles con
 * tipo): el diseño queda sin tipo, que es "hoja" (D2).
 */
const SIN_TIPO = null

/**
 * Selector "Hoja o comandera" del formulario de Diseño de PDF (solo con modelo Venta).
 *
 * Misión diseno-ticket-comandera (9/10/2026), sección 7.1 del plan. Elige el tipo de hoja del
 * diseño (`sheet_type_id`): un rollo de comandera (el diseño pasa a ser un TICKET, que sale directo
 * a la impresora por ESC/POS, no por PDF) o una hoja (PDF). Al elegir, además de `sheet_type_id`
 * deja el objeto en `model.sheet_type` con $set, para que la tarjeta en miniatura y el diseñador
 * sepan la clase sin tener que guardar.
 *
 * Lo monta ModelForm.vue por la propiedad `selector_de_hoja` (`type: 'display'`) del modelo
 * pdf_column_profile, igual que monta el editor de columnas.
 */
export default {
	name: 'SelectorDeHoja',
	props: {
		/**
		 * El diseño que se está editando (con full_reactivity, el objeto del store).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/**
			 * Lo que muestra el select. Se sincroniza con el modelo (valor_mostrado) y vuelve a él
			 * cuando se toca "+ Agregar…", que no es un tipo de hoja.
			 */
			valor_elegido: null,
			/**
			 * Se está mostrando el campo para agregar un ancho.
			 */
			agregando_ancho: false,
			/**
			 * Lo tipeado en el campo del ancho.
			 */
			ancho_nuevo: '',
			/**
			 * Hay un POST sheet-types en curso.
			 */
			guardando_ancho: false,
			/**
			 * Error del ancho (validación local o el 422 de la API), al lado del campo.
			 */
			error_del_ancho: '',
			/**
			 * Foto de cada clase al salir de ella, para restaurarla si el operador vuelve sin
			 * guardar (ver clase_de_hoja.js).
			 */
			respaldo_por_clase: {
				ticket: null,
				hoja: null,
			},
		}
	},
	computed: {
		/**
		 * true = la API tiene sheet-types; false = API vieja (404); null = todavía no se sabe.
		 *
		 * @returns {boolean|null}
		 */
		api_soporta() {
			return this.$store.state.sheet_type ? this.$store.state.sheet_type.api_soporta : null
		},
		/**
		 * Tipos de hoja para el select.
		 *
		 * Con la API nueva, los del store (sistema + los del negocio). Con una API vieja (o mientras
		 * carga), los distintos `sheet_type` de los diseños ya cargados, que es lo único que se sabe
		 * sin el recurso nuevo. En los dos casos se suma el del propio diseño si no estaba.
		 *
		 * @returns {Array}
		 */
		tipos_de_hoja() {
			const del_store = this.$store.state.sheet_type ? this.$store.state.sheet_type.models : []
			let tipos = []
			const ids = {}

			function sumar(tipo) {
				if (tipo && tipo.id && !ids[tipo.id]) {
					ids[tipo.id] = true
					tipos.push(tipo)
				}
			}

			if (Array.isArray(del_store) && del_store.length) {
				del_store.forEach(sumar)
			} else {
				const perfiles = this.$store.state.pdf_column_profile.models || []
				perfiles.forEach(function (perfil) {
					sumar(perfil.sheet_type)
				})
			}

			sumar(this.model.sheet_type)

			return ordenar_tipos_de_hoja(tipos)
		},
		/**
		 * Los rollos de comandera.
		 *
		 * @returns {Array}
		 */
		tickets() {
			return this.tipos_de_hoja.filter(function (tipo) {
				return es_tipo_de_hoja_ticket(tipo)
			})
		},
		/**
		 * Las hojas.
		 *
		 * @returns {Array}
		 */
		hojas() {
			return this.tipos_de_hoja.filter(function (tipo) {
				return !es_tipo_de_hoja_ticket(tipo)
			})
		},
		/**
		 * La hoja con la que nace un diseño de venta nuevo, y la que se muestra en un diseño de
		 * hoja guardado sin tipo: A4 (por nombre, como pide el plan), o la primera hoja que haya.
		 *
		 * @returns {Object|null}
		 */
		tipo_a4() {
			let a4 = null
			this.hojas.forEach(function (tipo) {
				if (!a4 && tipo.name === 'A4') {
					a4 = tipo
				}
			})
			return a4 || (this.hojas.length ? this.hojas[0] : null)
		},
		/**
		 * El tipo de hoja que tiene hoy el diseño (objeto), o null si no tiene (= hoja).
		 *
		 * @returns {Object|null}
		 */
		tipo_actual() {
			const id = this.model.sheet_type_id
			if (id === null || typeof id === 'undefined' || id === '') {
				return null
			}
			let encontrado = null
			this.tipos_de_hoja.forEach(function (tipo) {
				if (!encontrado && tipo.id == id) {
					encontrado = tipo
				}
			})
			return encontrado
		},
		/**
		 * Si el diseño es hoy un ticket de comandera.
		 *
		 * @returns {boolean}
		 */
		es_ticket() {
			return es_tipo_de_hoja_ticket(this.tipo_actual)
		},
		/**
		 * Lo que tiene que mostrar el select según el modelo. Un diseño de hoja sin tipo muestra
		 * A4 sin escribirlo en el modelo: un diseño que no se toca no cambia.
		 *
		 * @returns {number|null}
		 */
		valor_mostrado() {
			if (this.tipo_actual) {
				return this.tipo_actual.id
			}
			if (this.model.sheet_type_id) {
				// Un id que no está en la lista (no debería pasar): se muestra tal cual.
				return this.model.sheet_type_id
			}
			return this.tipo_a4 ? this.tipo_a4.id : SIN_TIPO
		},
		/**
		 * Opciones del select en dos grupos: comandera y hoja.
		 *
		 * @returns {Array}
		 */
		opciones() {
			const opciones = []
			const comanderas = []
			const hojas = []

			this.tickets.forEach(function (tipo) {
				comanderas.push({
					value: tipo.id,
					text: tipo.name,
				})
			})

			// Agregar un ancho solo con la API nueva: con una vieja no hay dónde guardarlo.
			if (this.api_soporta === true) {
				comanderas.push({
					value: OPCION_AGREGAR,
					text: '+ Agregar un ancho de comandera…',
				})
			}

			this.hojas.forEach(function (tipo) {
				hojas.push({
					value: tipo.id,
					text: tipo.name,
				})
			})

			if (!hojas.length) {
				hojas.push({
					value: SIN_TIPO,
					text: 'Hoja (A4, Carta, Oficio o A5)',
				})
			}

			if (comanderas.length) {
				opciones.push({
					label: 'Comandera (sale directo a la impresora)',
					options: comanderas,
				})
			}

			opciones.push({
				label: 'Hoja (PDF)',
				options: hojas,
			})

			return opciones
		},
		/**
		 * La explicación debajo del select, según lo elegido.
		 *
		 * @returns {string}
		 */
		ayuda() {
			if (this.es_ticket) {
				const ancho = Number(this.tipo_actual.width)
				return 'Sale directo a la comandera, sin PDF: rollo de ' + ancho + ' mm, '
					+ caracteres_por_renglon(ancho) + ' caracteres por renglón. Se imprime desde '
					+ 'el menú Imprimir de la venta (Tickets) o con el atajo de Vender.'
			}
			return 'Se imprime como PDF. El tamaño de la hoja (A4, Carta, Oficio o A5) y el margen '
				+ 'se eligen en el diseñador.'
		},
	},
	watch: {
		/**
		 * El select sigue al modelo (por ejemplo, cuando la API vieja recién cargó los perfiles).
		 */
		valor_mostrado: {
			immediate: true,
			handler(valor) {
				this.valor_elegido = valor
			},
		},
		/**
		 * Un diseño de venta NUEVO nace en A4 (plan 7.1). Se espera a tener la lista: con la API
		 * nueva llega después del GET.
		 */
		tipo_a4: {
			immediate: true,
			handler() {
				this.nacer_en_a4()
			},
		},
	},
	created() {
		this.$store.dispatch('sheet_type/cargar')
	},
	beforeDestroy() {
		this.al_dejar_de_ser_venta()
	},
	methods: {
		/**
		 * Si el diseño es nuevo, de venta y todavía sin tipo de hoja, le pone A4.
		 */
		nacer_en_a4() {
			if (this.model.id || this.model.model_name !== 'sale') {
				return
			}
			if (this.model.sheet_type_id) {
				return
			}
			if (!this.tipo_a4) {
				return
			}
			this.$set(this.model, 'sheet_type_id', this.tipo_a4.id)
			this.$set(this.model, 'sheet_type', this.tipo_a4)
		},
		/**
		 * Cambio en el select.
		 *
		 * @param {number|string|null} valor
		 */
		al_elegir(valor) {
			if (valor === OPCION_AGREGAR) {
				this.abrir_agregar()
				return
			}

			let tipo = null
			this.tipos_de_hoja.forEach(function (item) {
				if (!tipo && item.id == valor) {
					tipo = item
				}
			})

			this.elegir_tipo(tipo)
		},
		/**
		 * Deja el tipo de hoja elegido en el modelo, con todo lo que cambia si cambia la clase.
		 *
		 * @param {Object|null} tipo null = hoja sin tipo.
		 */
		elegir_tipo(tipo) {
			const era_ticket = this.es_ticket
			const sera_ticket = es_tipo_de_hoja_ticket(tipo)
			let util_de_partida = ancho_util_del_modelo(this.model)

			if (era_ticket !== sera_ticket) {
				// Se guarda la clase que se deja, por si vuelve sin guardar.
				this.respaldo_por_clase[era_ticket ? 'ticket' : 'hoja'] = foto_de_la_clase(this.model)

				const respaldo = this.respaldo_por_clase[sera_ticket ? 'ticket' : 'hoja']

				if (respaldo) {
					this.restaurar_foto(respaldo)
					util_de_partida = ancho_util_del_modelo(this.model)
				} else {
					this.poner_valores_de_la_clase(sera_ticket)
				}
			}

			this.$set(this.model, 'sheet_type_id', tipo ? tipo.id : null)
			this.$set(this.model, 'sheet_type', tipo)

			if (sera_ticket) {
				// Lo mismo que fuerza la API (contrato 3.2): el rollo entero, sin margen ni alto.
				const ancho = Number(tipo.width)
				this.$set(this.model, 'paper_width_mm', ancho)
				this.$set(this.model, 'printable_width_mm', ancho)
				this.$set(this.model, 'margin_mm', 0)
				this.$set(this.model, 'paper_height_mm', null)
			}

			this.reescalar_columnas(util_de_partida, ancho_util_del_modelo(this.model))
		},
		/**
		 * Los valores con los que entra un diseño a una clase la primera vez.
		 *
		 * @param {boolean} sera_ticket
		 */
		poner_valores_de_la_clase(sera_ticket) {
			const self = this

			// El diseño con cajas es de la clase que se deja: el nuevo arranca "de siempre".
			self.$set(self.model, 'page_layout', null)

			if (sera_ticket) {
				CAMPOS_APAGADOS_EN_TICKET.forEach(function (campo) {
					self.$set(self.model, campo, 0)
				})
				return
			}

			Object.keys(HOJA_POR_DEFECTO).forEach(function (campo) {
				self.$set(self.model, campo, HOJA_POR_DEFECTO[campo])
			})
		},
		/**
		 * Vuelve a poner los campos de una clase tal cual estaban al salir de ella.
		 *
		 * @param {Object} foto ver foto_de_la_clase()
		 */
		restaurar_foto(foto) {
			const self = this
			Object.keys(foto.campos).forEach(function (campo) {
				self.$set(self.model, campo, foto.campos[campo])
			})
			if (foto.pdf_column_options) {
				self.$set(self.model, 'pdf_column_options', JSON.parse(JSON.stringify(foto.pdf_column_options)))
			}
		},
		/**
		 * Reparte las columnas de la tabla sobre el ancho útil nuevo conservando sus medias columnas
		 * (D9): 80 mm de nombre en una hoja de 200 mm útiles pasan a 32 mm en un rollo de 80 mm.
		 *
		 * @param {number} util_anterior
		 * @param {number} util_nuevo
		 */
		reescalar_columnas(util_anterior, util_nuevo) {
			if (!util_anterior || !util_nuevo || util_anterior === util_nuevo) {
				return
			}
			if (!Array.isArray(this.model.pdf_column_options) || !this.model.pdf_column_options.length) {
				return
			}
			this.$set(this.model, 'pdf_column_options', columnas_reescaladas(this.model.pdf_column_options, util_nuevo / util_anterior))
		},
		/**
		 * Si el formulario deja de ser de venta (cambiaron el Modelo), el selector se esconde: un
		 * presupuesto, un pedido o un artículo no pueden ser ticket (la API devuelve 422). Se deja
		 * el diseño como hoja, y un diseño nuevo vuelve a no tener tipo de hoja, como siempre.
		 */
		al_dejar_de_ser_venta() {
			if (!this.model || this.model.model_name === 'sale') {
				return
			}
			if (this.es_ticket) {
				this.elegir_tipo(null)
			}
			if (!this.model.id) {
				this.$set(this.model, 'sheet_type_id', null)
				this.$set(this.model, 'sheet_type', null)
			}
		},
		/**
		 * Muestra el campo para agregar un ancho y devuelve el select a lo que había.
		 */
		abrir_agregar() {
			const self = this
			self.agregando_ancho = true
			self.error_del_ancho = ''
			self.ancho_nuevo = ''
			self.$nextTick(function () {
				self.valor_elegido = self.valor_mostrado
				if (self.$refs.input_ancho && self.$refs.input_ancho.focus) {
					self.$refs.input_ancho.focus()
				}
			})
		},
		cancelar_agregar() {
			this.agregando_ancho = false
			this.error_del_ancho = ''
			this.ancho_nuevo = ''
		},
		/**
		 * POST sheet-types {width}. 201 = nuevo; 200 = ya existía uno de ese ancho (no se duplica).
		 * En los dos casos queda elegido. Un 422 se muestra al lado del campo.
		 */
		agregar_ancho() {
			const self = this
			const ancho = Number(self.ancho_nuevo)

			if (self.guardando_ancho) {
				return
			}

			if (self.ancho_nuevo === '' || isNaN(ancho) || Math.round(ancho) !== ancho || ancho < 40 || ancho > 120) {
				self.error_del_ancho = 'Ingresá un ancho entero entre 40 y 120 mm.'
				return
			}

			self.guardando_ancho = true
			self.error_del_ancho = ''

			self.$store.dispatch('sheet_type/agregar_ancho', ancho)
				.then(function (resultado) {
					self.guardando_ancho = false

					if (!resultado || !resultado.model) {
						self.error_del_ancho = 'No se pudo agregar el ancho. Volvé a intentar.'
						return
					}

					self.agregando_ancho = false
					self.ancho_nuevo = ''
					self.elegir_tipo(resultado.model)

					if (resultado.ya_existia) {
						self.$toast.success('Ya existía la comandera de ' + ancho + ' mm: quedó elegida.')
					} else {
						self.$toast.success('Comandera de ' + ancho + ' mm agregada. También aparece en los demás diseños.')
					}
				})
				.catch(function (error) {
					self.guardando_ancho = false
					const data = error && error.response ? error.response.data : null
					const mensajes = collect_laravel_validation_messages(data)

					if (mensajes.length) {
						self.error_del_ancho = mensajes.join(' ')
					} else if (data && typeof data.message === 'string' && data.message.trim().length) {
						self.error_del_ancho = data.message.trim()
					} else {
						self.error_del_ancho = 'No se pudo agregar el ancho. Revisá la conexión y volvé a intentar.'
					}
				})
		},
	},
}
</script>

<style lang="sass">
.selector-de-hoja
	&__agregar
		margin-top: 8px

	&__error
		margin: 4px 0 0
		font-size: 0.8rem
		color: var(--color-text-danger-strong, var(--danger))

	&__ayuda
		margin: 4px 0 0
		font-size: 0.8rem
		color: var(--color-text-secondary)
</style>
