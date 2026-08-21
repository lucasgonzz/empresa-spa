<template>
	<div>

		<div
		v-if="view == 'cobros'">

			<current-acounts></current-acounts>

			<!--
				🔴 Sigue enganchado y sin tocar: la línea "y N ventas más" de cada tarjeta lo abre
				con TODAS las ventas del cliente. La tarjeta muestra las 5 más viejas (las mismas
				que van en el WhatsApp); el detalle completo sigue viviendo acá.
			-->
			<ventas-sin-cobrar></ventas-sin-cobrar>

			<recordatorio-cobro
			:client="client_seleccionado"></recordatorio-cobro>

			<recordatorio-cobro-masivo
			:total_clientes="ventas_sin_cobrar.length"></recordatorio-cobro-masivo>

			<div class="alertas-cobros">

				<div class="alertas-cobros__toolbar">

					<!--
						El filtro de días. Vacío = el comportamiento de siempre: el backend
						resuelve con su cascada por rol y con el umbral propio de cada venta. Por
						eso el input arranca en blanco y no en un número.
					-->
					<div class="alertas-cobros__filtro">
						<label
						class="alertas-cobros__filtro-label"
						for="alertas_cobros_dias">
							Ventas de hace más de
						</label>
						<b-form-input
						id="alertas_cobros_dias"
						class="alertas-cobros__filtro-input"
						type="number"
						min="0"
						placeholder="días"
						v-model="dias_input"
						@keyup.enter="aplicar_dias"></b-form-input>
						<b-button
						variant="outline-primary"
						:disabled="aplicando"
						@click="aplicar_dias">
							<b-spinner
							v-if="aplicando"
							small></b-spinner>
							Aplicar
						</b-button>
					</div>

					<span class="alertas-cobros__contador">
						{{ numero_es(ventas_sin_cobrar.length) }}
						{{ ventas_sin_cobrar.length == 1 ? 'cliente con ventas por cobrar' : 'clientes con ventas por cobrar' }}
					</span>

					<b-button
					v-if="puede_recordar"
					class="alertas-cobros__btn-masivo"
					variant="success"
					:disabled="!ventas_sin_cobrar.length"
					@click="abrir_masivo">
						<i class="bi bi-whatsapp"></i>
						Recordar a todos
					</b-button>
				</div>

				<div
				v-if="ventas_sin_cobrar.length"
				class="alertas-cobros__lista">

					<div
					class="alertas-cobros__cliente"
					v-for="(alerta, index) in ventas_sin_cobrar"
					:key="index">

						<div class="alertas-cobros__cliente-header">

							<p class="alertas-cobros__cliente-nombre">
								{{ alerta.client.name }}
							</p>

							<div class="alertas-cobros__cliente-chips">
								<button
								type="button"
								class="alertas-cobros__chip"
								:class="{'is-usd': credit_account.moneda_id == 2}"
								v-for="credit_account in alerta.client.credit_accounts"
								:key="credit_account.id"
								@click="showCurrentAcounts(alerta.client, credit_account)">
									{{ price(credit_account.saldo) }}
									<span v-if="credit_account.moneda_id == 2">USD</span>
									<span v-else>Pesos</span>
								</button>
							</div>

							<div class="alertas-cobros__cliente-acciones">
								<b-button
								v-if="puede_recordar"
								variant="success"
								size="sm"
								@click="abrir_recordatorio(alerta.client)">
									<i class="bi bi-whatsapp"></i>
									Recordar por WhatsApp
								</b-button>
								<b-button
								v-if="alerta.client.credit_accounts.length"
								variant="outline-secondary"
								size="sm"
								@click="showCurrentAcounts(alerta.client, alerta.client.credit_accounts[0])">
									Ver cuenta
								</b-button>
							</div>
						</div>

						<div class="alertas-cobros__ventas">

							<div
							class="alertas-cobros__ventas-fila"
							v-for="sale in ventas_mas_viejas(alerta)"
							:key="sale.id">

								<span class="alertas-cobros__ventas-num">
									N° {{ sale.num }}
								</span>

								<!--
									Envoltorio con `display: contents` en escritorio: monto y
									"hace" son dos columnas del grid. En tablet el envoltorio
									vuelve a ser una caja y los dos comparten renglón, que es la
									colapsada que se pidió, sin escribir el dato dos veces.
								-->
								<span class="alertas-cobros__ventas-monto-linea">
									<span class="alertas-cobros__ventas-monto">
										{{ lo_que_falta_pagarse(sale) }}
									</span>
									<span class="alertas-cobros__ventas-hace">
										{{ since(sale.created_at) }}
									</span>
								</span>

								<a
								class="alertas-cobros__ventas-link"
								:href="sale_pdf_url(sale)"
								target="_blank">
									Ver PDF
								</a>
							</div>

							<button
							v-if="ventas_restantes(alerta) > 0"
							type="button"
							class="alertas-cobros__ventas-mas"
							@click="showVentasSinCobrar(alerta.ventas_sin_cobrar)">
								y {{ numero_es(ventas_restantes(alerta)) }}
								{{ ventas_restantes(alerta) == 1 ? 'venta más' : 'ventas más' }} — ver el detalle
							</button>
						</div>
					</div>
				</div>

				<!--
					Estado vacío con el vocabulario del sistema (display/EmptyState). Antes era
					el cartel azul con el ícono de 4em de la clase de textos vieja: esa clase NO se toca
					porque la usan ~40 componentes del sistema, se deja de usar acá y nada más.
					La pista dice que es buena noticia: una alerta vacía no es un módulo sin datos.
				-->
				<empty-state
				v-else
				class="alertas-cobros__vacio"
				icon_class="bi bi-cash-coin"
				title="No hay ventas por cobrar"
				hint="Ningún cliente tiene ventas pendientes de cobro en su cuenta corriente."></empty-state>

			</div>

		</div>

	</div>

</template>
<script>
/*
	Cuántas ventas se muestran adentro de la tarjeta. Es el MISMO tope que usa el mensaje de
	WhatsApp (las 5 más viejas), y esa coincidencia es el punto: la tarjeta es un eco visual de
	lo que el cliente va a leer. Si el backend cambia su tope, este número lo sigue.
*/
const MAX_VENTAS_EN_TARJETA = 5

export default {
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		VentasSinCobrar: () => import('@/components/alertas/modals/cobros/VentasSinCobrar'),
		RecordatorioCobro: () => import('@/components/alertas/modals/cobros/RecordatorioCobro'),
		RecordatorioCobroMasivo: () => import('@/components/alertas/modals/cobros/RecordatorioCobroMasivo'),
	},
	data() {
		return {
			/*
				Se inicializa desde el store y no en blanco: si el usuario ya había aplicado un
				filtro y vuelve a la pestaña, el input tiene que decir lo mismo que la lista.
			*/
			dias_input: this.$store.state.sale.ventas_sin_cobrar.dias,
			aplicando: false,
			/** Cliente de la fila desde la que se abrió el modal individual. */
			client_seleccionado: null,
		}
	},
	computed: {
		ventas_sin_cobrar() {
			return this.$store.state.sale.ventas_sin_cobrar.models
		},
		/**
		 * Las dos capas del front para los botones de WhatsApp.
		 *
		 * `hasExtencion('whatsapp')` es lo que decide si la empresa tiene el módulo; el permiso
		 * es aparte porque ver la alerta y dispararle un WhatsApp a todos los deudores no son la
		 * misma capacidad. El backend chequea las dos por su cuenta: esto es comodidad, no
		 * seguridad.
		 */
		puede_recordar() {
			return this.hasExtencion('whatsapp') && this.can('alerts.recordatorio_cobro')
		},
	},
	methods: {
		/**
		 * Guarda los días y vuelve a pedir la lista.
		 *
		 * El input vacío no es un caso raro: es "volver al comportamiento de siempre". La
		 * mutation lo normaliza a null y la action arma la request sin `?dias`.
		 */
		aplicar_dias() {
			let self = this
			this.aplicando = true
			this.$store.commit('sale/ventas_sin_cobrar/setDias', this.dias_input)
			this.$store.dispatch('sale/ventas_sin_cobrar/getModels')
			.then(() => {
				self.aplicando = false
			})
			.catch(() => {
				self.aplicando = false
			})
		},
		/**
		 * Las 5 ventas más viejas del cliente, que son las mismas que lista el WhatsApp.
		 *
		 * Se ordena acá y no se confía en el orden que traiga el backend: la tarjeta y el
		 * mensaje tienen que mostrar el mismo recorte, y "las más viejas" es una decisión, no
		 * un efecto secundario de cómo salió la query.
		 *
		 * @param {Object} alerta Fila del endpoint: `{client, ventas_sin_cobrar}`.
		 * @returns {Array}
		 */
		ventas_mas_viejas(alerta) {
			let ventas = alerta.ventas_sin_cobrar.slice()
			ventas.sort((a, b) => {
				if (a.created_at == b.created_at) {
					return 0
				}
				return a.created_at < b.created_at ? -1 : 1
			})
			return ventas.slice(0, MAX_VENTAS_EN_TARJETA)
		},
		ventas_restantes(alerta) {
			return alerta.ventas_sin_cobrar.length - MAX_VENTAS_EN_TARJETA
		},
		sale_pdf_url(sale) {
			return process.env.VUE_APP_API_URL + '/sale/pdf/' + sale.id
		},
		abrir_recordatorio(client) {
			this.client_seleccionado = client
			this.$bvModal.show('recordatorio-cobro')
		},
		abrir_masivo() {
			this.$bvModal.show('recordatorio-cobro-masivo')
		},
		client_name(info) {
			if (info.client) {
				let text = info.client.name

				let credit_account = info.client.credit_accounts.find(c => c.moneda_id == info.moneda_id)

				if (typeof credit_account != 'undefined') {
					text += ' ( '+ this.price(credit_account.saldo)
					if (credit_account.moneda_id == 2) {
						text += ' USD )'
					} else {

						text += ' )'
					}
				} else {
				}
				return text
			}
			return 'NO HAY'
		},
		showVentasSinCobrar(ventas) {
			this.$store.commit('sale/ventas_sin_cobrar/setVentasSinCobrar', ventas)
			this.$bvModal.show('ventas-sin-cobrar')
		},
		lo_que_falta_pagarse(sale) {
			return this.price(Number(sale.current_acount.debe) - Number(sale.current_acount.pagandose))
		},
		showCurrentAcounts(client, credit_account) {
			this.showCurrentAcount(client, credit_account)
		}
	}
}
</script>
<style lang="sass">
// 🔴 Ni un hexadecimal en todo el bloque, y ningún var(--x, #hex) tampoco: la lista convive con
// modales que se montan colgando de <body>, fuera de #app, y un color escrito a mano queda roto
// en modo oscuro. El fallback no ayuda, tapa el token faltante en vez de mostrarlo.
//
// Sin `scoped`, como el resto del vocabulario nuevo del sistema: los estilos cuelgan de
// `.alertas-cobros` y el namespace lo pone el BEM, no el atributo de vue-loader.
.alertas-cobros
	color: var(--color-text-primary)

	// ============================ Toolbar ============================
	&__toolbar
		display: flex
		align-items: center
		gap: 12px
		flex-wrap: wrap
		margin-bottom: 14px

	&__filtro
		display: flex
		align-items: center
		gap: 8px

	&__filtro-label
		font-size: 0.8rem
		font-weight: 600
		color: var(--color-text-secondary)
		margin-bottom: 0
		white-space: nowrap

	// src/sass/_inputs.sass le pone a TODO input del sistema 1.4rem de tipografía y un borde de
	// 2px que pasa a 3px al enfocar. No se toca a nivel global -lo usan pantallas viejas de todo
	// el sistema-: se lo pisa acá adentro, con la misma calibración que usa ConfirmAfipTickets.
	&__filtro-input
		width: 92px
		min-height: var(--toolbar-control-h)
		height: auto
		padding: 0.25rem 0.7rem
		font-size: 0.95rem
		line-height: 1.45
		border: 1px solid var(--color-border)
		border-radius: 10px
		box-shadow: none

		&:focus
			border: 1px solid var(--color-primary)
			box-shadow: none

	&__contador
		font-size: 0.8rem
		color: var(--color-text-secondary)

	// El masivo se va a la derecha y queda solo: es la única acción de la barra que le habla a
	// todos los clientes a la vez.
	&__btn-masivo
		margin-left: auto

	// ============================ La lista ============================
	&__lista
		display: flex
		flex-direction: column
		gap: 12px

	// Una tarjeta por cliente y, adentro, sus ventas. 🔴 Esa estructura no se toca: es lo que
	// hace que la fila se lea como "este cliente me debe esto por estas ventas".
	&__cliente
		border: 1px solid var(--color-border)
		border-radius: 12px
		background: var(--bg-card)
		box-shadow: 0 1px 3px var(--shadow-color)
		padding: 14px 16px

	&__cliente-header
		display: grid
		grid-template-columns: 1fr auto auto
		align-items: center
		gap: 10px 14px

	&__cliente-nombre
		font-size: 1.02rem
		font-weight: 700
		margin-bottom: 0
		min-width: 0
		overflow-wrap: anywhere

	&__cliente-chips
		display: flex
		align-items: center
		gap: 8px
		min-width: 0

	// El chip del saldo es clickeable y abre la cuenta corriente de ESA moneda. Los dos acentos
	// son los mismos que usa el resto del sistema para pesos y dólares, así que un saldo en USD
	// se reconoce por color antes de leer la etiqueta.
	&__chip
		display: inline-flex
		align-items: center
		gap: 5px
		border: 0
		padding: 5px 11px
		border-radius: 999px
		font-size: 0.85rem
		font-weight: 700
		font-variant-numeric: tabular-nums
		background: var(--totales-acento-principal-bg)
		color: var(--totales-acento-principal)
		white-space: nowrap

		&.is-usd
			background: var(--totales-acento-usd-bg)
			color: var(--totales-acento-usd)

		span
			font-weight: 600
			font-size: 0.74rem
			text-transform: uppercase
			letter-spacing: 0.03em
			opacity: 0.85

	&__cliente-acciones
		display: flex
		align-items: center
		gap: 8px

		.btn
			border-radius: 10px
			font-size: 0.8rem
			font-weight: 600
			display: inline-flex
			align-items: center
			gap: 6px
			white-space: nowrap

	// ============================ Las ventas ============================
	&__ventas
		margin-top: 12px
		padding-top: 10px
		border-top: 1px solid var(--color-border-secondary)

	&__ventas-fila
		display: grid
		grid-template-columns: minmax(78px, auto) minmax(100px, 1fr) minmax(100px, 1fr) auto
		align-items: baseline
		gap: 4px 14px
		padding: 5px 0
		font-size: 0.86rem

		& + &
			border-top: 1px solid var(--color-border-secondary)

	&__ventas-num
		font-weight: 600
		white-space: nowrap

	// En escritorio el envoltorio directamente no existe: `display: contents` deja que el monto
	// y el "hace" sean dos items del grid, uno por columna. En tablet vuelve a ser una caja y
	// los dos comparten renglón. Es la única forma de colapsar la columna sin dibujar el dato
	// dos veces en el HTML.
	&__ventas-monto-linea
		display: contents

	&__ventas-monto
		font-variant-numeric: tabular-nums
		font-weight: 600

	&__ventas-hace
		color: var(--color-text-secondary)

	&__ventas-link
		font-size: 0.8rem
		font-weight: 600
		white-space: nowrap
		text-align: right

	// "y N ventas más": abre el modal de siempre con TODAS las ventas del cliente. Se dibuja
	// como un enlace y no como un botón de bootstrap para que no compita con las acciones del
	// header, que son las que mandan un WhatsApp.
	&__ventas-mas
		display: inline-block
		margin-top: 8px
		padding: 0
		border: 0
		background: transparent
		font-size: 0.82rem
		font-weight: 600
		color: var(--color-primary)

		&:hover
			text-decoration: underline

	&__vacio
		margin-top: 4px

// ==================== Tablet (768–1024px) ====================
// Los chips bajan abajo del nombre y el "hace" se mete en la línea del monto: con el header en
// una sola fila, a este ancho el nombre del cliente se espicha hasta cortarse.
@media (max-width: 1024px)
	.alertas-cobros__cliente-header
		grid-template-columns: 1fr auto

	.alertas-cobros__cliente-nombre
		grid-column: 1
		grid-row: 1

	.alertas-cobros__cliente-acciones
		grid-column: 2
		grid-row: 1

	.alertas-cobros__cliente-chips
		grid-column: 1 / -1
		grid-row: 2
		flex-wrap: wrap

	.alertas-cobros__ventas-fila
		grid-template-columns: minmax(78px, auto) 1fr auto

	.alertas-cobros__ventas-monto-linea
		display: flex
		align-items: baseline
		flex-wrap: wrap
		gap: 4px 8px
		min-width: 0

// ==================== Teléfono (360–390px) ====================
@media (max-width: 576px)
	.alertas-cobros__toolbar
		flex-wrap: wrap
		gap: 10px

	.alertas-cobros__filtro
		width: 100%

	.alertas-cobros__filtro-input
		flex: 1 1 auto
		width: auto

	.alertas-cobros__btn-masivo
		margin-left: 0
		width: 100%
		justify-content: center

	// El header pasa a columna y los botones van a ancho completo apilados: a 360px, dos
	// botones al lado del nombre no entran sin partir las palabras.
	.alertas-cobros__cliente-header
		display: flex
		flex-direction: column
		align-items: stretch
		gap: 10px

	.alertas-cobros__cliente-acciones
		flex-direction: column
		align-items: stretch

		.btn
			width: 100%
			justify-content: center

	// Dos columnas y nada más: N° y monto. El "hace" y el PDF son contexto, y a este ancho el
	// contexto le come el lugar al dato.
	.alertas-cobros__ventas-fila
		grid-template-columns: minmax(64px, auto) 1fr

	.alertas-cobros__ventas-hace,
	.alertas-cobros__ventas-link
		display: none
</style>
