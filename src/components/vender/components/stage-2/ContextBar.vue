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
				<input
				v-if="editando_total_forzado"
				ref="input_total_forzado"
				v-model="total_tipeado"
				type="number"
				step="0.01"
				min="0"
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
		 * El lápiz existe solo con la extensión prendida. Sin ella esta barra se comporta
		 * exactamente como antes de la misión.
		 *
		 * El `total > 0` es el mismo que tenía el botón "Forzar" que este lápiz reemplaza:
		 * forzar el total de un remito vacío no significa nada.
		 *
		 * @returns {boolean}
		 */
		puede_forzar_total() {
			return this.hasExtencion('forzar_total') && this.total > 0
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
				🔴 REDONDEADO A CENTAVOS, NO `this.total` PELADO. El total del store es el
				resultado de una cadena de multiplicaciones y restas en punto flotante, así que
				bien puede valer 5599.9980000000005: puesto crudo en el input, el vendedor abre el
				lápiz y ve ese número en pantalla, con el cliente adelante. Medido a 380px el
				17/9/2026.
			*/
			this.total_tipeado = Math.round(Number(this.total) * 100) / 100

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
		 * Convierte el total tipeado en el monto del ajuste y recalcula la venta.
		 */
		confirmar_total_forzado() {

			if (!this.editando_total_forzado) {
				return
			}

			this.editando_total_forzado = false

			if (this.cancelando_total_forzado) {
				return
			}

			let tipeado = String(this.total_tipeado).trim()

			if (
				tipeado === ''
				|| isNaN(Number(tipeado))
				|| Number(tipeado) < 0
			) {
				this.$toast.warning('Escribi el total que queres cobrar')
				return
			}

			/*
				El total que se ve en pantalla YA tiene aplicado el forzado anterior, si había uno.
				Para saber cuánto hay que ajustar primero se lo saca: si no, forzar dos veces
				seguidas iría restando sobre lo ya restado.
			*/
			let base = Number(this.total) - Number(this.forzar_total_monto || 0)

			let monto = Number(tipeado) - base

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
