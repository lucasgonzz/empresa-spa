<template>
	<!--
		Bloque de totales del módulo de Ventas (misión 32, 11/8/2026).

		Antes era una hilera de <p> separados por caracteres `|` literales, con dos botones verdes
		`outline-success` colgando a la derecha y el contador de ventas viviendo aparte. Ahora usa el
		mismo vocabulario de chip que el módulo de Cajas —ícono en celda, etiqueta chica arriba, valor
		grande abajo— porque ese problema ya estaba resuelto en este sistema y no hacía falta un
		quinto estilo de tarjeta.

		Los permisos NO cambiaron: `can('sale.index.total')` gobierna el bloque entero y `is_admin`
		gobierna costos, ganancia y los dos Excel, igual que antes.
	-->
	<div
	v-if="can('sale.index.total')"
	class="ventas-totales">

		<template v-if="!loading">

			<!-- ============ Pesos ============ -->
			<div class="totales-chip totales-chip--principal">
				<div class="totales-chip__icon-wrap">
					<i
					class="bi bi-cash-stack"
					aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Total</span>
					<span class="totales-chip__value">{{ price(total) }}</span>
					<span
					class="totales-chip__meta"
					v-if="total_selected_payment_method > 0">
						{{ price(total_selected_payment_method) }} en {{ selected_payment_method }}
					</span>
				</div>
			</div>

			<!--
				El `d-none d-lg-block` viene de refractor y se conserva: los dos <p> de Costos y
				Ganancia en pesos estaban ocultos abajo de 992px. Es una decisión de qué se muestra y
				esta misión es de disposición, así que no le tocaba cambiarla. (Los de USD nunca las
				tuvieron, así que ahí no hay nada que conservar.)

				`d-lg-flex` y no `d-lg-block`: el chip es un contenedor flex y con `display: block` se
				le desarma la fila de ícono + cuerpo.
			-->
			<div
			class="totales-chip d-none d-lg-flex"
			v-if="is_admin">
				<div class="totales-chip__icon-wrap">
					<i
					class="bi bi-tag"
					aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Costos</span>
					<span class="totales-chip__value">{{ price(total_cost) }}</span>
				</div>
			</div>

			<div
			class="totales-chip totales-chip--positivo d-none d-lg-flex"
			v-if="is_admin">
				<div class="totales-chip__icon-wrap">
					<i
					class="bi bi-graph-up-arrow"
					aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Ganancia</span>
					<span class="totales-chip__value">{{ price(total_ganancia) }}</span>
				</div>
			</div>

			<!--
				Este chip tambien perdió su guarda, y va declarado igual que el de dólares aunque la
				misión solo pedía el otro: en refractor iba con `v-if="total_cuenta_corriente_pesos >
				-1"`, que es la misma condición muerta de más abajo y por los mismos motivos. Acá la
				salida es distinta y a propósito: la cuenta corriente en pesos aplica siempre —no hay
				extensión que la habilite—, así que el chip se muestra sin condición. Los dos casos que
				aquella condición ocultaba (un NaN por un ítem sin precio, un saldo negativo real) son
				MÁS frecuentes de este lado, que es donde está el volumen y las notas de crédito.
			-->
			<div class="totales-chip">
				<div class="totales-chip__icon-wrap">
					<i
					class="bi bi-person-lines-fill"
					aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Cuenta corriente</span>
					<span class="totales-chip__value">{{ price(total_cuenta_corriente_pesos) }}</span>
				</div>
			</div>

			<!-- ============ Dólares ============ -->
			<!--
				🔴 Los CUATRO chips de dólares cuelgan de `hasExtencion('ventas_en_dolares')`, incluido
				el de cuenta corriente. Antes ese último iba condicionado a
				`total_cuenta_corriente_dolar > -1`.

				Lo que la misión pedía verificar era si esa condición distinguía "no hay dato" de "es
				cero". NO lo hacía: el computed arranca en 0 y solo acumula, nunca devuelve null ni
				undefined, así que con cero ventas daba 0 y el renglón se mostraba igual — un "Total
				C/C: usd $0" a un cliente que no vende en dólares.

				Lo que sí filtraba, y conviene tenerlo escrito porque no es evidente, son los dos casos
				en que el acumulador NO es un positivo: si algún ítem viene sin `pivot.price` o sin
				`pivot.amount`, `getTotalItem` multiplica undefined y el total queda en NaN, y
				`NaN > -1` es false; y un neto de cuenta corriente puede ser negativo de verdad, porque
				`totalSale` resta descuentos sin piso y toma el `sale.total` persistido, que una nota de
				crédito deja abajo de cero.

				O sea que la condición vieja hacía DESAPARECER el renglón justo en los dos casos en los
				que hay algo para mirar: un dato roto y un saldo negativo real. Ocultar ahí es peor que
				mostrar. Por eso la extensión la reemplaza en vez de sumarse a ella: no había nada que
				conservar.
			-->
			<template v-if="hasExtencion('ventas_en_dolares')">
				<div class="totales-chip totales-chip--usd">
					<div class="totales-chip__icon-wrap">
						<i
						class="bi bi-currency-exchange"
						aria-hidden="true"></i>
					</div>
					<div class="totales-chip__body">
						<span class="totales-chip__label">Total USD</span>
						<span class="totales-chip__value">{{ price(total_usd) }}</span>
					</div>
				</div>

				<div
				class="totales-chip totales-chip--usd"
				v-if="is_admin">
					<div class="totales-chip__icon-wrap">
						<i
						class="bi bi-tag"
						aria-hidden="true"></i>
					</div>
					<div class="totales-chip__body">
						<span class="totales-chip__label">Costos USD</span>
						<span class="totales-chip__value">{{ price(total_cost_usd) }}</span>
					</div>
				</div>

				<div
				class="totales-chip totales-chip--usd"
				v-if="is_admin">
					<div class="totales-chip__icon-wrap">
						<i
						class="bi bi-graph-up-arrow"
						aria-hidden="true"></i>
					</div>
					<div class="totales-chip__body">
						<span class="totales-chip__label">Ganancia USD</span>
						<span class="totales-chip__value">{{ price(total_ganancia_usd) }}</span>
					</div>
				</div>

				<div class="totales-chip totales-chip--usd">
					<div class="totales-chip__icon-wrap">
						<i
						class="bi bi-person-lines-fill"
						aria-hidden="true"></i>
					</div>
					<div class="totales-chip__body">
						<span class="totales-chip__label">Cuenta corriente USD</span>
						<span class="totales-chip__value">{{ price(total_cuenta_corriente_dolar) }}</span>
					</div>
				</div>
			</template>

			<!-- ============ Contador y acciones, a la derecha ============ -->
			<div class="ventas-totales__derecha">
				<div class="totales-chip">
					<div class="totales-chip__icon-wrap">
						<i
						class="bi bi-receipt-cutoff"
						aria-hidden="true"></i>
					</div>
					<div class="totales-chip__body">
						<span class="totales-chip__label">Ventas</span>
						<span class="totales-chip__value">{{ cantidad_ventas }}</span>
					</div>
				</div>

				<b-button
				v-if="is_admin"
				@click="export_excel"
				class="ventas-totales__btn">
					<i class="bi bi-download"></i>
					Excel
				</b-button>
				<b-button
				v-if="is_admin"
				@click="export_breakdown_excel"
				class="ventas-totales__btn">
					<i class="bi bi-download"></i>
					Excel full
				</b-button>
			</div>

		</template>

		<!-- Sin m-b-20: el margen inferior lo pone .ventas-totales (15px), y el de bootstrap encima
		     hacia saltar el bloque 5px al terminar de cargar. -->
		<b-skeleton
		v-else
		type="button"
		width="200px"></b-skeleton>
	</div>
</template>
<script>
import sale from '@/mixins/sale'
export default {
	mixins: [sale],
	computed: {
		loading() {
			return this.$store.state.sale.loading
		},
		selected_payment_method_id() {
			return this.$store.state.sale.payment_method_show_option
		},
		selected_payment_method() {
			let payment_method = this.$store.state.current_acount_payment_method.models.find(p => p.id == this.selected_payment_method_id)
			if (typeof payment_method != 'undefined') {
				return payment_method.name
			}
			return ''
		},
		total_selected_payment_method() {
			let total = 0
			if (this.selected_payment_method_id != 'Todos') {
				this.sales_to_show.forEach(sale => {
					let payment_method = sale.current_acount_payment_methods.find(p => p.id == this.selected_payment_method_id)
					if (typeof payment_method != 'undefined') {
						total += Number(payment_method.pivot.amount)
					}
				})
			}
			return total
		},
		total_cuenta_corriente_pesos() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (
					model.client_id
					&& !model.omitir_en_cuenta_corriente
					&& model.moneda_id == 1
				) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total
		},
		total_cuenta_corriente_dolar() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (
					model.client_id
					&& !model.omitir_en_cuenta_corriente
					&& model.moneda_id == 2
				) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total
		},
		total() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total
		},
		total_cost() {
			/* Acumulador de costos para ventas en pesos. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					total += Number(model.total_cost)
				}
			})
			return total
		},
		total_ganancia() {
			/* Acumulador de ganancia persistida para ventas en pesos. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					/* Se usa el campo persistido por backend y no un calculo local. */
					total += Number(model.ganancia)
				}
			})
			return total
		},
		total_usd() {
			/* Acumulador de total de ventas en dolares. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total
		},
		total_cost_usd() {
			/* Acumulador de costos para ventas en dolares. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					total += Number(model.total_cost)
				}
			})
			return total
		},
		total_ganancia_usd() {
			/* Acumulador de ganancia persistida para ventas en dolares. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					/* Se usa el campo persistido por backend y no un calculo local. */
					total += Number(model.ganancia)
				}
			})
			return total
		},
		cantidad_ventas() {
			let total = 0
			this.sales_to_show.forEach(model => {
				total++
			})
			return total
		},
		from_date() {
			return this.$store.state.sale.from_date
		},
		until_date() {
			return this.$store.state.sale.until_date
		},
	},
	methods: {
		export_excel() {
			this.download_sales_excel('sales/excel/export', 'ventas')
		},
		export_breakdown_excel() {
			this.download_sales_excel('sales/excel/breakdown-export', 'ventas_desglosado')
		},
		/**
		 * Arma el cuerpo del POST con el estado completo del filtro que ve la pantalla.
		 * @returns {Object}
		 */
		build_export_body() {
			let state = this.$store.state.sale
			let scope = this.resolve_view_scope()
			return {
				is_filtered: state.is_filtered,
				filters: state.filters,
				from_date: this.from_date,
				until_date: this.until_date,
				ventas_cobradas_show_option: state.ventas_cobradas_show_option,
				afip_ticket_show_option: state.afip_ticket_show_option,
				payment_method_show_option: state.payment_method_show_option,
				address_id: scope.address_id,
				employee_id: scope.employee_id,
				only_owner: scope.only_owner,
			}
		},
		/**
		 * Resuelve la pestaña actual (sucursal/empleado) igual que sales_to_show (mixins/sale.js).
		 * @returns {{address_id: (number|null), employee_id: (number|null), only_owner: boolean}}
		 */
		resolve_view_scope() {
			// Id de sucursal resuelto por nombre de calle (street), null si es "todas".
			let address_id = null
			// Id de empleado resuelto por nombre, null si es "todos" o si es el caso "dueño".
			let employee_id = null
			// True cuando la sub_view es una pestaña de empleado pero ninguna venta tiene employee_id (caso dueño).
			let only_owner = false

			if (this.view != 'todas') {
				let address = this.addresses.find(model => {
					return model.street.toLowerCase() == this.view.replaceAll('-', ' ').toLowerCase()
				})
				if (typeof address != 'undefined') {
					address_id = address.id
				}
			}

			if (this.sub_view != 'todos') {
				let employee = this.employees.find(model => {
					return model.name.toLowerCase() == this.sub_view.replaceAll('-', ' ').toLowerCase()
				})
				if (typeof employee == 'undefined') {
					// Caso "dueño": ventas sin empleado asignado.
					only_owner = true
				} else {
					employee_id = employee.id
				}
			}

			return { address_id, employee_id, only_owner }
		},
		/**
		 * POST autenticado al endpoint de export; descarga el .xlsx desde la respuesta (blob).
		 * @param {string} endpoint 'sales/excel/export' | 'sales/excel/breakdown-export'
		 * @param {string} filename_prefix Prefijo del nombre del archivo.
		 * @returns {void}
		 */
		download_sales_excel(endpoint, filename_prefix) {
			this.$api.post(endpoint, this.build_export_body(), { responseType: 'blob' })
				.then(res => {
					// Se arma un link temporal para disparar la descarga del blob recibido.
					let url = window.URL.createObjectURL(new Blob([res.data]))
					let a = document.createElement('a')
					a.href = url
					let now = new Date()
					let stamp = ('0' + now.getDate()).slice(-2)
						+ '-' + ('0' + (now.getMonth() + 1)).slice(-2)
						+ '-' + String(now.getFullYear()).slice(-2)
					a.download = filename_prefix + '_' + stamp + '.xlsx'
					document.body.appendChild(a)
					a.click()
					a.remove()
					window.URL.revokeObjectURL(url)
				})
				.catch(() => {
					this.$toast.error('No se pudo generar el Excel', { duration: 4000 })
				})
		},
	}
}
</script>
<style lang="sass">
// El VOCABULARIO del chip --caja, celda del icono, etiqueta, valor y los tres acentos-- ya no vive
// aca: lo declara src/sass/_chips_totales.sass desde la mision 34, porque Comprobantes es el tercer
// modulo que lo necesita y tres copias del mismo chip era la deuda que esta tanda viene a pagar.
//
// Lo que queda es lo que si es propio de este bloque: como se ordenan los chips, que se va a la
// derecha, y los dos botones de Excel.
.ventas-totales
	display: flex
	flex-direction: row
	flex-wrap: wrap
	align-items: stretch
	gap: 10px
	margin-bottom: 15px

	// El contador y los dos Excel se van a la derecha con margin-left auto, no con un
	// justify-content del contenedor: asi los chips de la izquierda siguen pegados entre si cuando
	// la fila se corta y baja.
	&__derecha
		display: flex
		flex-direction: row
		// `stretch` y no `center`: el contenedor estira con la hilera (el padre es align-items:
		// stretch) pero adentro centraba, asi que el chip del contador se quedaba en su alto natural
		// de 52px contra los 56 de sus hermanos y sus bordes quedaban 2px para adentro.
		align-items: stretch
		gap: 10px
		margin-left: auto

	// Los dos Excel toman la altura, el radio y la sombra de los controles de la barra.
	//
	// 🔴 SOBRE EL COLOR, y este parrafo reemplaza al que decia que iban neutros (mision 40,
	// 12/8/2026). La mision 32 los saco del `outline-success` con el argumento correcto de que el
	// verde macizo competia con el unico acento de la pantalla. Lucas lo uso asi y pidio el punto
	// medio: que se distingan de los chips, pero sin volver a ser botones verdes.
	//
	// La solucion es la misma que ya usan los botones de modulo del Listado: el color va en el
	// ICONO, y el fondo solo aparece al pasar el mouse. El relleno macizo sigue reservado para el
	// unico acento de la pantalla, asi que la decision de la 32 no se cae: se corrige el valor.
	//
	// 🔴 Y el verde NO se declara de nuevo: sale de `--totales-acento-positivo`, que ya vive en
	// _chips_totales.sass --el archivo de este mismo bloque-- y ya tiene su contraparte mas clara en
	// `html.dark-mode`. Es exactamente el mismo #059669 que el `--toolbar-tinte` verde de la barra.
	// Reusarlo es lo que evita un tercer juego de verdes: el sistema ya tiene dos declarados con los
	// mismos valores (el de totales y el de la barra), y sumar uno mas para estos dos botones era el
	// camino corto. Que sean dos y no uno esta registrado como hallazgo aparte.
	//
	// La sombra sale de --toolbar-btn-shadow y no de un `none` ni de un valor propio: ese token lo
	// definio la mision 27, y tiene contraparte en oscuro con la proporcion calculada contra la
	// sombra del pill. Estos botones viven FUERA del .view-header-toolbar, asi que las reglas de la
	// barra no los alcanzan solas y hay que nombrar el token: es la unica forma de que no queden
	// planos al lado de sus hermanos de arriba.
	&__btn.btn
		height: var(--toolbar-control-h)
		display: inline-flex
		align-items: center
		gap: 6px
		padding: 0 12px
		font-size: 0.875rem
		line-height: 1
		border-radius: var(--toolbar-btn-radius)
		box-shadow: var(--toolbar-btn-shadow)
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		color: var(--color-text-primary)
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

		&:hover,
		&:focus
			background: var(--totales-acento-positivo-bg)
			border-color: var(--totales-acento-positivo)
			color: var(--color-text-primary)

		// El tinte va SOLO en el glifo. El texto queda en el color primario del sistema: si tambien
		// se pintara, el boton se leeria como un boton verde, que es lo que no se quiere.
		i
			color: var(--totales-acento-positivo)

	@media screen and (max-width: 576px)
		gap: 8px

		&__derecha
			margin-left: 0
			width: 100%

		&__btn.btn
			flex: 1 1 0
</style>
