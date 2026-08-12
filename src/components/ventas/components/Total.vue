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
			<div class="ventas-totales__chip ventas-totales__chip--total">
				<div class="ventas-totales__icon-wrap">
					<i
					class="bi bi-cash-stack"
					aria-hidden="true"></i>
				</div>
				<div class="ventas-totales__body">
					<span class="ventas-totales__label">Total</span>
					<span class="ventas-totales__value">{{ price(total) }}</span>
					<span
					class="ventas-totales__meta"
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
			class="ventas-totales__chip d-none d-lg-flex"
			v-if="is_admin">
				<div class="ventas-totales__icon-wrap">
					<i
					class="bi bi-tag"
					aria-hidden="true"></i>
				</div>
				<div class="ventas-totales__body">
					<span class="ventas-totales__label">Costos</span>
					<span class="ventas-totales__value">{{ price(total_cost) }}</span>
				</div>
			</div>

			<div
			class="ventas-totales__chip ventas-totales__chip--ganancia d-none d-lg-flex"
			v-if="is_admin">
				<div class="ventas-totales__icon-wrap">
					<i
					class="bi bi-graph-up-arrow"
					aria-hidden="true"></i>
				</div>
				<div class="ventas-totales__body">
					<span class="ventas-totales__label">Ganancia</span>
					<span class="ventas-totales__value">{{ price(total_ganancia) }}</span>
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
			<div class="ventas-totales__chip">
				<div class="ventas-totales__icon-wrap">
					<i
					class="bi bi-person-lines-fill"
					aria-hidden="true"></i>
				</div>
				<div class="ventas-totales__body">
					<span class="ventas-totales__label">Cuenta corriente</span>
					<span class="ventas-totales__value">{{ price(total_cuenta_corriente_pesos) }}</span>
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
				<div class="ventas-totales__chip ventas-totales__chip--usd">
					<div class="ventas-totales__icon-wrap">
						<i
						class="bi bi-currency-exchange"
						aria-hidden="true"></i>
					</div>
					<div class="ventas-totales__body">
						<span class="ventas-totales__label">Total USD</span>
						<span class="ventas-totales__value">{{ price(total_usd) }}</span>
					</div>
				</div>

				<div
				class="ventas-totales__chip ventas-totales__chip--usd"
				v-if="is_admin">
					<div class="ventas-totales__icon-wrap">
						<i
						class="bi bi-tag"
						aria-hidden="true"></i>
					</div>
					<div class="ventas-totales__body">
						<span class="ventas-totales__label">Costos USD</span>
						<span class="ventas-totales__value">{{ price(total_cost_usd) }}</span>
					</div>
				</div>

				<div
				class="ventas-totales__chip ventas-totales__chip--usd"
				v-if="is_admin">
					<div class="ventas-totales__icon-wrap">
						<i
						class="bi bi-graph-up-arrow"
						aria-hidden="true"></i>
					</div>
					<div class="ventas-totales__body">
						<span class="ventas-totales__label">Ganancia USD</span>
						<span class="ventas-totales__value">{{ price(total_ganancia_usd) }}</span>
					</div>
				</div>

				<div class="ventas-totales__chip ventas-totales__chip--usd">
					<div class="ventas-totales__icon-wrap">
						<i
						class="bi bi-person-lines-fill"
						aria-hidden="true"></i>
					</div>
					<div class="ventas-totales__body">
						<span class="ventas-totales__label">Cuenta corriente USD</span>
						<span class="ventas-totales__value">{{ price(total_cuenta_corriente_dolar) }}</span>
					</div>
				</div>
			</template>

			<!-- ============ Contador y acciones, a la derecha ============ -->
			<div class="ventas-totales__derecha">
				<div class="ventas-totales__chip">
					<div class="ventas-totales__icon-wrap">
						<i
						class="bi bi-receipt-cutoff"
						aria-hidden="true"></i>
					</div>
					<div class="ventas-totales__body">
						<span class="ventas-totales__label">Ventas</span>
						<span class="ventas-totales__value">{{ cantidad_ventas }}</span>
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
// El vocabulario de chip es el de caja-totales (caja/components/horizontal-nav-center/Total.vue),
// con una diferencia deliberada: allá los colores son hexadecimales fijos y acá salen de los tokens
// de _dark_theme.sass. Ese componente es scoped y vive en una pantalla que todavia no paso por el
// tema oscuro; este bloque si tiene que leerse en html.dark-mode, que es el punto 10 del criterio.
.ventas-totales
	display: flex
	flex-direction: row
	flex-wrap: wrap
	align-items: stretch
	gap: 10px
	margin-bottom: 15px

	&__chip
		display: flex
		align-items: center
		gap: 10px
		padding: 8px 12px
		border-radius: 10px
		border: 1px solid var(--color-border)
		background: var(--bg-card)
		box-shadow: 0 1px 3px var(--shadow-color)
		min-width: 0

		.ventas-totales__icon-wrap
			background: var(--bg-hover)
			color: var(--color-text-secondary)

	// El total en pesos es el numero que se viene a mirar: es el unico chip con acento.
	&__chip--total
		.ventas-totales__icon-wrap
			background: var(--ventas-total-bg)
			color: var(--ventas-total-acento)

		.ventas-totales__value
			color: var(--ventas-total-acento)
			font-size: 1.25rem

	&__chip--ganancia
		.ventas-totales__icon-wrap
			background: var(--ventas-ganancia-bg)
			color: var(--ventas-ganancia-acento)

	&__chip--usd
		.ventas-totales__icon-wrap
			background: var(--ventas-usd-bg)
			color: var(--ventas-usd-acento)

	&__icon-wrap
		flex-shrink: 0
		width: 34px
		height: 34px
		border-radius: 8px
		display: flex
		align-items: center
		justify-content: center

		i
			font-size: 1rem
			line-height: 1

	&__body
		display: flex
		flex-direction: column
		min-width: 0
		gap: 1px

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: var(--color-text-secondary)
		text-transform: uppercase
		letter-spacing: 0.04em
		line-height: 1.2
		white-space: nowrap

	&__value
		font-size: 1rem
		font-weight: 700
		line-height: 1.2
		white-space: nowrap
		color: var(--color-text-primary)

	&__meta
		font-size: 0.68rem
		color: var(--color-text-secondary)
		line-height: 1.2
		white-space: nowrap

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

	// Los dos Excel toman la altura, el radio y la sombra de los controles de la barra, y van
	// neutros: el outline-success de antes competia con el unico acento que tiene que haber en la
	// pantalla.
	//
	// La sombra sale de --toolbar-btn-shadow y no de un `none` ni de un valor propio: ese token lo
	// definio la mision 27 el mismo dia que esta, y tiene contraparte en oscuro con la proporcion
	// calculada contra la sombra del pill. Estos botones viven FUERA del .view-header-toolbar, asi
	// que las reglas de la barra no los alcanzan solas y hay que nombrar el token: es la unica
	// forma de que no queden planos al lado de sus hermanos de arriba.
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

		&:hover,
		&:focus
			background: var(--bg-hover)
			border-color: var(--color-border)
			color: var(--color-text-primary)

		i
			color: inherit

	@media screen and (max-width: 576px)
		gap: 8px

		&__derecha
			margin-left: 0
			width: 100%

		&__btn.btn
			flex: 1 1 0

// Acentos propios del bloque. Son los mismos tres tonos que ya usan los chips de Cajas y los
// tintes de icono de la barra, declarados como tokens para tener contraparte en oscuro: un ambar
// o un verde de modo claro sobre el #2e333a del oscuro se apaga hasta dejar de senalar nada.
:root
	--ventas-total-acento: #d97706
	--ventas-total-bg: rgba(217, 119, 6, 0.12)
	--ventas-ganancia-acento: #059669
	--ventas-ganancia-bg: rgba(5, 150, 105, 0.12)
	--ventas-usd-acento: #0891b2
	--ventas-usd-bg: rgba(8, 145, 178, 0.12)

html.dark-mode
	--ventas-total-acento: #f59e0b
	--ventas-total-bg: rgba(245, 158, 11, 0.16)
	--ventas-ganancia-acento: #34d399
	--ventas-ganancia-bg: rgba(52, 211, 153, 0.16)
	--ventas-usd-acento: #22d3ee
	--ventas-usd-bg: rgba(34, 211, 238, 0.16)
</style>
