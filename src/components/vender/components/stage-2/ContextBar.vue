<template>
	<!--
		Barra de contexto horizontal compacta dentro de la Etapa 2 del wizard de venta.
		Muestra en una sola fila: total, cliente, método de pago (con vuelto) y checklist de estado.
		Permanece visible mientras el usuario trabaja con artículos.
	-->
	<div class="vender-context-bar">

		<!-- ── Bloque 1: Total ── -->
		<!--
			🔴 Este es el total que el operador VE mientras arma la venta. El `data-monto` lleva
			el valor crudo porque el filtro `currency` lo imprime formateado y del texto no
			siempre se puede sacar el numero. Mismo patron que Posicion Fiscal.
		-->
		<!--
			🔴 El `data-monto-forzado` sigue el mismo criterio que el `data-monto` de al lado: el
			renglon de abajo imprime el monto formateado y del texto no siempre se saca el numero.
			Cuando no hay forzado el valor es null y Vue no dibuja el atributo, asi que su sola
			presencia ya dice que esta venta lleva ajuste.
		-->
		<div
		class="vender-context-bar__block vender-context-bar__block--total"
		data-testid="venta-total"
		:data-monto="total"
		:data-monto-forzado="forzar_total_monto"
		data-tour="vender.total">

			<div class="vender-context-bar__total-row">
				<span
				v-if="!editando_total_forzado"
				class="vender-context-bar__total-value">{{ total | currency }}</span>

				<!--
					Input inline del total forzado (extension forzar_total): el vendedor escribe el
					total que quiere cobrar y el sistema calcula el ajuste. Confirma con Enter o
					saliendo del campo, cancela con Escape.

					Es un v-if propio y no el v-else del <span> de arriba a proposito: entre los dos
					hay un comentario, y el v-else depende de que el compilador de plantillas los
					deje pegados. Dos v-if no dependen de eso.
				-->
				<!--
					🔴 `type="text"`, NO `type="number"`. Medido en Chrome el 17/9/2026 tipeando de
					verdad sobre una venta de $5.595,86:

						"4000"   -> value "4000"   -> total $4.000,00   ok
						"4.000"  -> value "4.000"  -> total $4,00       🔴
						"4,000"  -> value "4.000"  -> total $4,00       🔴

					En un input numerico el punto es el separador DECIMAL, y la coma Chrome la
					normaliza al punto. O sea que el vendedor que escribe "4.000" queriendo cobrar
					cuatro mil pesos cobra cuatro, y no lo va a revisar: es un numero que acaba de
					escribir el. El parseo lo hace normalizar_monto_tipeado(), que entiende las dos
					formas en que se escribe plata acá.

					`inputmode="decimal"` deja el teclado numerico en el telefono, que es lo unico
					que se pierde al salir de type="number".
				-->
				<input
				v-if="editando_total_forzado"
				ref="input_total_forzado"
				v-model="total_tipeado"
				type="text"
				inputmode="decimal"
				autocomplete="off"
				class="vender-context-bar__total-input"
				data-testid="input-total-forzado"
				aria-label="Total a cobrar"
				@keydown.enter="confirmar_total_forzado"
				@keydown.esc="cancelar_total_forzado"
				@blur="confirmar_total_forzado">

				<button
				v-if="puede_forzar_total && !editando_total_forzado"
				type="button"
				class="vender-context-bar__total-edit"
				data-testid="btn-forzar-total"
				title="Editar el total a cobrar"
				aria-label="Editar el total a cobrar"
				@click="abrir_total_forzado">
					<i class="bi bi-pencil"></i>
				</button>
			</div>

			<span class="vender-context-bar__sub-value">
				<!-- El singular/plural se sigue decidiendo con el valor crudo (total_unidades === 1): el formateo va solo donde se muestra. -->
				{{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }} · {{ numero_es(total_unidades) }} {{ total_unidades === 1 ? 'unidad' : 'unidades' }}
			</span>

			<!--
				El renglon del ajuste. Va siempre que haya monto forzado, tambien al abrir una venta
				guardada: el vendedor tiene que poder ver que ese total no sale de los items solos.
			-->
			<span
			v-if="forzar_total_monto"
			class="vender-context-bar__forzado"
			data-testid="renglon-total-forzado">
				{{ signo_total_forzado }} Total forzado: {{ format_price(monto_total_forzado_absoluto) }}
			</span>
		</div>

		<!-- ── Bloque 2: Cliente ── -->
		<div class="vender-context-bar__block">
			<div
			v-if="client"
			class="vender-context-bar__client">
				<i class="icon-user vender-context-bar__client-icon"></i>
				<span class="vender-context-bar__main-value">{{ client.name }}</span>
				<!-- Badge "A cuenta corriente" si aplica -->
				<span
				v-if="is_cuenta_corriente"
				class="vender-context-bar__badge vender-context-bar__badge--cc">
					A cuenta corriente
				</span>
			</div>
			<span
			v-else
			class="vender-context-bar__muted">
				Sin cliente
			</span>
		</div>

		<!-- ── Bloque 3: Método de pago y vuelto efectivo ── -->
		<div class="vender-context-bar__block vender-context-bar__block--payment">
			<div class="vender-context-bar__payment-row">
				<span
				v-if="payment_method_summary"
				class="vender-context-bar__main-value">
					{{ payment_method_summary }}
				</span>
				<span
				v-else
				class="vender-context-bar__muted">
					Sin método de pago
				</span>
			</div>

			<!-- Vuelto efectivo inline: solo cuando monto_efectivo > 0 y no hay presupuesto -->
			<div
			v-if="monto_efectivo > 0 && !budget"
			class="vender-context-bar__vuelto-row">
				<span class="vender-context-bar__vuelto-label">
					Vuelto ({{ format_price(monto_efectivo) }}):
				</span>
				<b-form-input
				v-model="pago_del_cliente"
				type="number"
				size="sm"
				placeholder="Ingrese monto"
				class="vender-context-bar__vuelto-input"
				@keyup.enter.native="calcular_vuelto">
				</b-form-input>
				<span
				v-if="vuelto_calculado !== ''"
				class="vender-context-bar__vuelto-result text-success">
					= {{ format_price(vuelto_calculado) }}
				</span>
			</div>
		</div>

		<!-- ── Bloque 4: Checklist de estado ── -->
		<div class="vender-context-bar__block vender-context-bar__block--checklist">
			<div class="vender-context-bar__check-item">
				<i :class="has_address ? 'icon-check text-success' : 'icon-right text-muted'"></i>
				<span :class="has_address ? '' : 'vender-context-bar__muted'">Sucursal</span>
			</div>
			<div class="vender-context-bar__check-item">
				<i :class="has_payment_method ? 'icon-check text-success' : 'icon-right text-muted'"></i>
				<span :class="has_payment_method ? '' : 'vender-context-bar__muted'">Pago</span>
			</div>
			<div class="vender-context-bar__check-item">
				<i :class="has_articles ? 'icon-check text-success' : 'icon-right text-muted'"></i>
				<span :class="has_articles ? '' : 'vender-context-bar__muted'">Artículos</span>
			</div>
		</div>

	</div>
</template>

<script>
// Se importa con alias: el mixin global ya expone un `numero_es(valor)` de un solo
// argumento, y este de aca lleva la cantidad de decimales. Dos firmas con el mismo
// nombre en el mismo archivo es una trampa para el que lo lea en seis meses.
import { numero_es as numero_es_con_decimales } from '@/common-vue/helpers/formato_numero'
/*
	El mixin del calculo del total. Se importa por el mismo motivo que lo hace
	stage-3/Discounts.vue: esta barra ahora no solo MUESTRA el total, tambien lo cambia --el lapiz
	del total forzado-- y para eso necesita setTotal(), que es el unico lugar donde se arma el
	numero completo (items + descuentos + recargos + puntos + metodos de pago + forzado).
*/
import vender_set_total from '@/mixins/vender_set_total'
export default {
	name: 'ContextBar',
	mixins: [vender_set_total],
	filters: {
		/**
		 * Formatea un número como moneda con dos decimales y separadores de miles.
		 *
		 * @param {number} value
		 * @returns {string}
		 */
		currency(value) {
			if (typeof value !== 'number') return '$ 0,00'
			return '$ ' + numero_es_con_decimales(value, 2)
		},
	},
	data() {
		return {
			/* Monto ingresado por el operador para calcular vuelto */
			pago_del_cliente: '',
			/* Resultado del cálculo de vuelto; cadena vacía = sin calcular */
			vuelto_calculado: '',
			/* Si el input inline del total forzado está abierto */
			editando_total_forzado: false,
			/* Lo que el vendedor tipea adentro de ese input */
			total_tipeado: '',
			/*
				🔴 Escape cierra el input, y cerrarlo le saca el foco: el @blur dispara igual y,
				sin esta bandera, confirmaría justo lo que se acaba de cancelar. No sacarla.
			*/
			cancelando_total_forzado: false,
		}
	},
	watch: {
		/* Limpiar el cálculo de vuelto cada vez que cambia el total */
		total() {
			this.pago_del_cliente = ''
			this.vuelto_calculado = ''
		},
	},
	computed: {
		/**
		 * Total de la venta desde el store.
		 *
		 * @returns {number}
		 */
		total() {
			return this.$store.state.vender.total || 0
		},

		/**
		 * Monto con signo del total forzado (extensión forzar_total): negativo descuenta,
		 * positivo recarga, null es que no se forzó nada.
		 *
		 * Se declara acá aunque el mixin vender_set_total también lo traiga, por el mismo criterio
		 * que `total`, `items` y `client` de este mismo bloque: en esta barra toda lectura del
		 * store es un computed propio, para que el que la lea encuentre de dónde sale cada cosa.
		 *
		 * @returns {Number|null}
		 */
		forzar_total_monto() {
			return this.$store.state.vender.forzar_total_monto
		},

		/**
		 * Signo del renglón del ajuste.
		 *
		 * @returns {String}
		 */
		signo_total_forzado() {
			return Number(this.forzar_total_monto) < 0 ? '-' : '+'
		},

		/**
		 * Monto del ajuste sin signo, para imprimirlo al lado del signo de arriba.
		 *
		 * @returns {Number}
		 */
		monto_total_forzado_absoluto() {
			return Math.abs(Number(this.forzar_total_monto))
		},

		/**
		 * El total SIN el ajuste: el que sale de los ítems, los descuentos, los recargos, el
		 * canje de puntos y el reparto por método de pago.
		 *
		 * Es la base contra la que se calcula el monto del forzado, y también la que decide si
		 * el lápiz se dibuja.
		 *
		 * @returns {Number}
		 */
		total_base() {
			return Number(this.total) - Number(this.forzar_total_monto || 0)
		},

		/**
		 * El lápiz existe solo con la extensión prendida. Sin ella esta barra se comporta
		 * exactamente como antes de la misión.
		 *
		 * 🔴 EL `> 0` MIRA EL TOTAL BASE, NO EL TOTAL YA FORZADO. NO LO CAMBIES POR `this.total`.
		 *
		 * Con `this.total` la puerta de entrada dependía de su propio resultado, y eso deja al
		 * vendedor encerrado: forzando el total a 0 --que la validación acepta, porque no está
		 * vacío ni es negativo-- el total pasa a valer 0, el lápiz deja de dibujarse y la venta
		 * queda en $0 mostrando "- Total forzado: $4.012,00" sin ninguna forma de reeditarla ni
		 * de deshacerla. Las únicas salidas eran limpiar la venta entera o agregar un ítem, y
		 * mientras tanto la venta estaba lista para guardarse en cero.
		 *
		 * Mirando la base, el lápiz sigue estando mientras haya mercadería que cobrar, sin
		 * importar en cuánto quedó el total. Que además es lo que la condición quiere decir:
		 * "forzar el total de un remito vacío no significa nada".
		 *
		 * @returns {boolean}
		 */
		puede_forzar_total() {
			return this.hasExtencion('forzar_total') && this.total_base > 0
		},

		/**
		 * Lista de ítems del remito actual.
		 *
		 * @returns {Array}
		 */
		items() {
			return this.$store.state.vender.items || []
		},

		/**
		 * Suma de unidades (amount) de todos los ítems del remito.
		 *
		 * @returns {number}
		 */
		total_unidades() {
			let suma = 0
			this.items.forEach(item => {
				suma += Number(item.amount) || 1
			})
			return suma
		},

		/**
		 * Cliente seleccionado para la venta.
		 *
		 * @returns {Object|null}
		 */
		client() {
			return this.$store.state.vender.client
		},

		/**
		 * Indica si la venta irá a cuenta corriente del cliente.
		 *
		 * @returns {boolean}
		 */
		is_cuenta_corriente() {
			return !!(
				this.$store.state.vender.client
				&& this.$store.state.vender.omitir_en_cuenta_corriente == 0
				&& this.$store.state.vender.budget === null
				&& !this.$store.state.vender.guardar_como_presupuesto
			)
		},

		/**
		 * Método de pago único seleccionado; buscado en el store de current_acount_payment_method.
		 * Fuente de verdad correcta para la venta de método único (no el store legacy payment_method).
		 *
		 * @returns {Object|null}
		 */
		selected_payment_method() {
			/* ID del método de pago único guardado en el store de vender */
			const pm_id = this.$store.state.vender.current_acount_payment_method_id
			if (!pm_id) return null
			const methods = this.$store.state.current_acount_payment_method.models || []
			return methods.find(m => m.id == pm_id) || null
		},

		/**
		 * Resumen textual del método de pago para mostrar en la barra de contexto.
		 * Contempla tanto el caso de método único como el de múltiples métodos repartidos.
		 *
		 * @returns {string|null}
		 */
		payment_method_summary() {
			/* Caso método único: mostrar su nombre */
			if (this.selected_payment_method) {
				return this.selected_payment_method.name
			}
			/* Caso múltiples métodos de pago repartidos: mostrar cantidad */
			if (this.selected_payment_methods.length) {
				return this.selected_payment_methods.length + ' métodos de pago'
			}
			/* Sin método de pago seleccionado */
			return null
		},

		/**
		 * Indica si hay una sucursal seleccionada.
		 *
		 * @returns {boolean}
		 */
		has_address() {
			return !!this.$store.state.vender.address_id
		},

		/**
		 * Indica si hay un método de pago seleccionado: método único o reparto de múltiples métodos.
		 *
		 * @returns {boolean}
		 */
		has_payment_method() {
			return !!this.$store.state.vender.current_acount_payment_method_id
				|| this.selected_payment_methods.length > 0
		},

		/**
		 * Indica si hay al menos un artículo cargado.
		 *
		 * @returns {boolean}
		 */
		has_articles() {
			return this.items.length > 0
		},

		/**
		 * Presupuesto activo; si existe, no se muestra el vuelto.
		 *
		 * @returns {Object|null}
		 */
		budget() {
			return this.$store.state.vender.budget
		},

		/**
		 * Estado del flag omitir_en_cuenta_corriente.
		 *
		 * @returns {number} 0 o 1
		 */
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente
		},

		/**
		 * ID del método de pago efectivo.
		 *
		 * @returns {number|null}
		 */
		payment_method_id_efectivo() {
			return this.$store.state.vender.current_acount_payment_method_id
		},

		/**
		 * Métodos de pago seleccionados (múltiples, para ventas con método combinado).
		 *
		 * @returns {Array}
		 */
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods || []
		},

		/**
		 * Monto en efectivo que el cliente debe pagar.
		 *
		 * @returns {number}
		 */
		monto_efectivo() {
			/* Si hay cliente en cuenta corriente, no se cobra en efectivo */
			if (this.client && !this.omitir_en_cuenta_corriente) {
				return 0
			}

			/* Método de pago ID 3 = efectivo */
			if (this.payment_method_id_efectivo != 0) {
				if (this.payment_method_id_efectivo == 3) {
					return this.total
				}
			}

			/* Buscar efectivo dentro de los métodos de pago seleccionados */
			let efectivo = this.selected_payment_methods.find(pm => pm.id == 3)
			if (typeof efectivo != 'undefined') {
				return efectivo.amount
			}

			return 0
		},
	},
	methods: {
		/**
		 * Formatea un número como precio con separadores de miles y decimales.
		 *
		 * @param {number} value
		 * @returns {string}
		 */
		format_price(value) {
			if (typeof value !== 'number') return '$ 0,00'
			return '$ ' + numero_es_con_decimales(value, 2)
		},

		/**
		 * Calcula el vuelto a partir del monto ingresado por el operador.
		 * Si el monto es insuficiente muestra un toast de error.
		 */
		calcular_vuelto() {
			const vuelto = Number(this.pago_del_cliente) - Number(this.monto_efectivo)
			if (vuelto > 0) {
				this.vuelto_calculado = vuelto
			} else {
				this.$toast.error('Dinero insuficiente')
				this.vuelto_calculado = ''
			}
		},

		/**
		 * Abre el input inline del total forzado.
		 */
		abrir_total_forzado() {

			this.cancelando_total_forzado = false

			/*
				🔴 FORMATEADO, NO `this.total` PELADO. El total del store es el resultado de una
				cadena de multiplicaciones y restas en punto flotante, así que bien puede valer
				5599.9980000000005: puesto crudo en el input, el vendedor abre el lápiz y ve ese
				número en pantalla, con el cliente adelante. Medido a 380px el 17/9/2026.

				Se muestra con los separadores de acá ("5.599,86") porque es como el monto se ve en
				todo el resto de la interfaz, y porque normalizar_monto_tipeado() lo vuelve a leer
				sin ayuda: el vendedor puede confirmar sin tocar nada y el ajuste da cero.
			*/
			this.total_tipeado = numero_es_con_decimales(Math.round(Number(this.total) * 100) / 100, 2)

			this.editando_total_forzado = true

			/*
				El input recién existe en el DOM en el próximo tick. Arranca con el total actual y
				con el texto SELECCIONADO para que el vendedor tipee encima sin tener que borrar,
				que es como se usa esto en el mostrador: con el cliente adelante.
			*/
			let self = this
			this.$nextTick(() => {
				let input = self.$refs.input_total_forzado
				if (input) {
					input.focus()
					input.select()
				}
			})
		},

		/**
		 * Cierra el input sin tocar el total.
		 */
		cancelar_total_forzado() {
			this.cancelando_total_forzado = true
			this.editando_total_forzado = false
		},

		/**
		 * Lee el monto que el vendedor escribió y lo devuelve como número.
		 *
		 * 🔴 ACEPTA LAS DOS FORMAS EN QUE SE ESCRIBE PLATA, NO UNA SOLA. El vendedor escribe
		 * "4.000" queriendo cobrar cuatro mil, y también escribe "4000" y "4.000,50". Obligarlo
		 * a usar la notación del navegador no es una opción: no va a revisar dos veces un número
		 * que acaba de escribir él, así que un malentendido acá se cobra mal y nadie se entera.
		 *
		 * Las reglas, en este orden:
		 *
		 *   1. "4,000" / "1,234,567" (comas cada tres, sin puntos) es el formato de miles a la
		 *      inglesa: se sacan las comas. Un importe con TRES decimales no existe en pesos, así
		 *      que leer eso como 4 pesos sería leerlo mal.
		 *   2. Si queda una coma, es el separador decimal de acá y los puntos son de miles.
		 *   3. Sin coma y con puntos: son de miles si todos los grupos que siguen al primero son
		 *      de tres dígitos ("4.000", "1.234.567"). Si no, el punto es decimal ("4000.50").
		 *
		 * @param {*} texto lo que hay en el input.
		 * @returns {Number|null} el monto, o null si no es un importe válido.
		 */
		normalizar_monto_tipeado(texto) {

			let limpio = String(texto).trim().replace(/\s/g, '').replace(/^\$/, '')

			if (limpio === '') {
				return null
			}

			if (/^\d{1,3}(,\d{3})+$/.test(limpio)) {
				limpio = limpio.replace(/,/g, '')
			} else if (limpio.indexOf(',') !== -1) {
				limpio = limpio.replace(/\./g, '').replace(',', '.')
			} else if (limpio.indexOf('.') !== -1) {
				let partes = limpio.split('.')
				let todos_de_tres = partes.slice(1).every(grupo => /^\d{3}$/.test(grupo))
				if (partes.length > 2 || todos_de_tres) {
					limpio = partes.join('')
				}
			}

			/* Sin signo a proposito: un total negativo no es un total. */
			if (!/^\d+(\.\d+)?$/.test(limpio)) {
				return null
			}

			let numero = Number(limpio)

			return isNaN(numero) ? null : numero
		},

		/**
		 * Descarta el reparto del total entre varios métodos de pago.
		 *
		 * 🔴 POR QUE HAY QUE LIMPIARLO AL FORZAR EL TOTAL, Y POR QUE NO ALCANZA CON EL WATCHER
		 * QUE YA EXISTE.
		 *
		 * El modal de multipago se limpia solo cuando cambia `sub_total` (el watcher de
		 * vender/modals/payment-methods/select-payment-methods/Index.vue). Forzar el total NO
		 * toca `sub_total` --y no tiene que tocarlo: el subtotal es el importe antes de todos los
		 * descuentos, que es justo lo que Lucas pidió que quede guardado--, así que ese watcher
		 * no se entera y el reparto queda calculado sobre un total que ya no existe.
		 *
		 * Medido el 17/9/2026 sobre una venta de $5.595,86 repartida en dos métodos: al forzar el
		 * total a $5.500, `selected_payment_methods` seguía sumando $5.595,86. Esos importes son
		 * los que PaymentMethodHelper engancha tal cual y con los que SaleCajaHelper crea el
		 * movimiento de caja: entraban $95,86 de más a la caja por una venta de $5.500, y con
		 * cliente en cuenta corriente el `debe` decía una cosa y los métodos de pago otra.
		 *
		 * El servidor NO puede validar esa suma —con cliente en cuenta corriente es legítimo que
		 * los métodos de pago sumen menos que el total—, así que la invariante se sostiene acá:
		 * no se guarda una venta cuyo reparto se calculó sobre un total viejo. Se descarta y se
		 * le avisa al vendedor, que es más ruidoso que arreglarlo solo pero es honesto: el que
		 * decide cómo se reparten los $5.500 es él, no nosotros.
		 *
		 * @returns {boolean} si había un reparto y se descartó.
		 */
		limpiar_reparto_de_metodos_de_pago() {

			let hay_reparto = this.selected_payment_methods.length || this.modal_payment_metohds.length

			if (!hay_reparto) {
				return false
			}

			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/set_modal_payment_methods', [])

			this.$toast.warning('Cambió el total: volvé a repartirlo entre los métodos de pago', {
				duration: 8000,
			})

			return true
		},

		/**
		 * Convierte el total tipeado en el monto del ajuste y recalcula la venta.
		 */
		confirmar_total_forzado() {

			if (!this.editando_total_forzado) {
				return
			}

			if (this.cancelando_total_forzado) {
				this.editando_total_forzado = false
				return
			}

			let total_deseado = this.normalizar_monto_tipeado(this.total_tipeado)

			/*
				🔴 EL INPUT QUEDA ABIERTO Y ENFOCADO CUANDO EL VALOR NO SIRVE. Cerrarlo obliga al
				vendedor a volver a buscar el lápiz para corregir un error de tipeo, con el cliente
				esperando. La salida siempre está: Escape cancela y deja el total como estaba.
			*/
			if (total_deseado === null) {

				this.$toast.warning('Escribi el total que queres cobrar')

				let self = this
				this.$nextTick(() => {
					let input = self.$refs.input_total_forzado
					if (input) {
						input.focus()
						input.select()
					}
				})
				return
			}

			this.editando_total_forzado = false

			/*
				El total tipeado es el que ya está en pantalla: no hay ajuste que hacer ni reparto
				que descartar. Cubre el caso de abrir el lápiz sin querer y salir del campo, que si
				no le borraría al vendedor un reparto que nadie pidió tocar.
			*/
			if (total_deseado === Math.round(Number(this.total) * 100) / 100) {
				return
			}

			/*
				🔴 PRIMERO SE DESARMA, DESPUÉS SE MIDE. NO CALCULAR EL MONTO CONTRA EL TOTAL QUE
				HAY EN PANTALLA Y LIMPIAR DESPUÉS.

				Confirmar el forzado destruye dos cosas que están metidas adentro de `this.total`:
				el forzado anterior y --cuando hay reparto en varios métodos de pago-- el descuento
				o el recargo de esos métodos, que aplica
				vender_set_total.js::aplicar_payment_method_discounts_a_total_repartido_del_modal().
				Medir el monto contra un total que incluye lo que el paso siguiente hace
				desaparecer da un ajuste del tamaño de ese descuento o recargo:

					venta de $10.000 repartida entre efectivo y una tarjeta con 10% de recargo
					-> `total` en pantalla: $10.500
					-> el vendedor fuerza a $10.400
					-> monto = 10.400 - 10.500 = -100
					-> se descarta el reparto, se va el recargo de $500
					-> setTotal() da 10.000 - 100 = $9.900

				El vendedor tipeó 10.400 y la venta quedaba en 9.900. No son centavos: es el
				recargo entero, y es justo lo único que esta funcionalidad promete.

				Entonces el orden es: descartar el reparto, sacar el forzado anterior, dejar que
				setTotal() reconstruya el total limpio, y recién ahí medir contra ese número. La
				invariante que queda es una sola y siempre vale: **el monto se mide contra el total
				que va a quedar, no contra el que se está mirando**.

				El `if` no es una optimización cosmética: sin nada que desarmar, `this.total` YA es
				la base limpia y el setTotal() de adentro sería una recalculada al pedo.
			*/
			let se_descarto_reparto = this.limpiar_reparto_de_metodos_de_pago()

			if (se_descarto_reparto || this.forzar_total_monto) {
				this.$store.commit('vender/set_forzar_total_monto', null)
				this.setTotal()
			}

			let monto = total_deseado - Number(this.total)

			/*
				Redondeo a centavos. La resta en punto flotante deja colas
				(4000 - 4012 = -11.999999999999545) que después viajan a una columna
				decimal(22,2) y dejan el total corrido por un centavo del que el vendedor tipeó.
			*/
			monto = Math.round(monto * 100) / 100

			/*
				Monto cero no es un forzado: es el total que ya estaba. Va null para que la venta no
				quede marcada como ajustada cuando no se ajustó nada.
			*/
			this.$store.commit('vender/set_forzar_total_monto', monto ? monto : null)

			this.setTotal()
		},
	},
}
</script>

<style scoped lang="sass">
/* Barra de contexto horizontal dentro de la Etapa 2 */
.vender-context-bar
	display: flex
	align-items: center
	min-height: 48px
	background: var(--bg-section, #f8f9fa)
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	margin: -8px -14px 10px
	overflow-x: auto

/* Bloque individual dentro de la barra */
.vender-context-bar__block
	display: flex
	flex-direction: column
	justify-content: center
	padding: 6px 16px
	border-right: 1px solid var(--color-border-tertiary, #dee2e6)
	min-width: 0
	flex-shrink: 0

	/* Último bloque: sin borde derecho */
	&:last-child
		border-right: none

	/* Bloque de método de pago: más ancho para albergar el input de vuelto */
	&--payment
		flex: 1
		min-width: 160px

	/* Bloque de checklist: fila horizontal */
	&--checklist
		flex-direction: row
		align-items: center
		gap: 12px
		flex-shrink: 0

	/* Bloque del total: un poco más de aire vertical */
	&--total
		padding-top: 8px
		padding-bottom: 8px

		// El lápiz aparece cuando el mouse entra al bloque del total.
		//
		// focus-within además de hover: con opacity 0 el botón sigue siendo alcanzable con el
		// teclado, y si no se mostrara al recibir el foco el que navega con Tab lo estaría
		// apretando a ciegas. Y mientras el input inline está abierto el lápiz ya no existe, así
		// que ahí lo que sostiene el focus-within es el estado de edición del bloque.
		&:hover .vender-context-bar__total-edit, &:focus-within .vender-context-bar__total-edit
			opacity: 1

/* Fila del monto: el total y, a su derecha, el lápiz del total forzado */
.vender-context-bar__total-row
	display: flex
	align-items: center
	min-width: 0

// Lápiz del total forzado (extensión forzar_total), escondido hasta el hover.
//
// 🔴 EL min-width / min-height NO ES DECORACIÓN, ES EL ÁREA DE TOQUE. El ícono mide 16x16, y un
// blanco de 16 píxeles es imposible de acertar con el dedo: en teléfono el lápiz está SIEMPRE
// visible, así que es la única forma de entrar a la función y tiene que ser apretable. El fondo
// sigue siendo transparente, o sea que agrandar el botón no se ve: lo único que cambia es dónde
// se puede tocar.
.vender-context-bar__total-edit
	display: inline-flex
	align-items: center
	justify-content: center
	min-width: 32px
	min-height: 32px
	background: transparent
	border: 0
	padding: 0
	margin-left: 4px
	color: #198754
	font-size: 1rem
	line-height: 1
	cursor: pointer
	flex-shrink: 0
	opacity: 0
	transition: opacity 0.2s ease

/* Input inline que reemplaza al monto mientras se edita */
.vender-context-bar__total-input
	width: 150px
	max-width: 100%
	height: 34px
	padding: 2px 8px
	border: 1px solid #198754
	border-radius: 6px
	background: var(--bg-card, #ffffff)
	color: #198754
	font-size: 1.4rem
	font-weight: 700
	line-height: 1.1

/* Renglón del ajuste, debajo del subtexto de productos y unidades */
.vender-context-bar__forzado
	font-size: 0.72rem
	font-weight: 600
	color: var(--color-text-secondary, #6c757d)
	white-space: nowrap
	margin-top: 1px

// 🔴 EN TELÉFONO NO HAY HOVER: ahí el lápiz va SIEMPRE visible, o la función directamente no
// existe en un celular --que es donde más se usa el "pagame 4.000 y listo"--.
//
// Van las dos condiciones a propósito: (hover: none) cubre cualquier pantalla táctil, incluida la
// tablet, y el max-width cubre al navegador de escritorio angosto que igual reporta hover.
@media (hover: none)
	.vender-context-bar__total-edit
		opacity: 1
		min-width: 40px
		min-height: 40px

@media screen and (max-width: 767px)
	.vender-context-bar__total-edit
		opacity: 1
		min-width: 40px
		min-height: 40px

/* Valor principal (grande) de cada bloque */
.vender-context-bar__main-value
	font-size: 1.5rem
	font-weight: 700
	color: var(--color-text-primary, #212529)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

/* Total de la venta: más grande y en verde (acento de la etapa 2) */
.vender-context-bar__total-value
	font-size: 1.85rem
	font-weight: 700
	color: #198754
	letter-spacing: -0.01em
	line-height: 1.1
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

/* Subtexto secundario (cantidad de artículos) */
.vender-context-bar__sub-value
	font-size: 0.72rem
	color: var(--color-text-secondary, #6c757d)
	margin-top: 1px
	white-space: nowrap

/* Texto muted cuando no hay dato */
.vender-context-bar__muted
	font-size: 0.82rem
	color: var(--color-text-secondary, #6c757d)

/* Fila del cliente con ícono y badge */
.vender-context-bar__client
	display: flex
	align-items: center
	gap: 6px
	flex-wrap: wrap

.vender-context-bar__client-icon
	font-size: 0.85rem
	color: var(--color-primary, #007bff)
	flex-shrink: 0

/* Badge genérico pequeño */
.vender-context-bar__badge
	display: inline-block
	padding: 1px 7px
	border-radius: 20px
	font-size: 0.7rem
	white-space: nowrap
	font-weight: 500

	/* Variante cuenta corriente: borde azul suave */
	&--cc
		border: 1px solid var(--color-primary, #007bff)
		color: var(--color-primary, #007bff)
		background: rgba(0, 123, 255, 0.06)

/* Fila del método de pago */
.vender-context-bar__payment-row
	display: flex
	align-items: center

/* Fila del vuelto efectivo inline */
.vender-context-bar__vuelto-row
	display: flex
	align-items: center
	gap: 6px
	margin-top: 4px
	flex-wrap: wrap

.vender-context-bar__vuelto-label
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)
	white-space: nowrap

/* Input de vuelto compacto */
.vender-context-bar__vuelto-input
	width: 110px
	height: 26px
	font-size: 0.8rem
	padding: 2px 6px

.vender-context-bar__vuelto-result
	font-size: 0.85rem
	font-weight: 700
	white-space: nowrap

/* Ítem del checklist horizontal */
.vender-context-bar__check-item
	display: flex
	align-items: center
	gap: 3px
	font-size: 0.78rem
	white-space: nowrap
	color: var(--color-text-primary, #212529)
</style>
