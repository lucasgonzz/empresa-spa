<template>
<div>
	<b-modal
	id="facturar-ventas-offline"
	size="lg"
	centered
	:title="titulo"
	:no-close-on-backdrop="paso == 'emitiendo'"
	:no-close-on-esc="paso == 'emitiendo'"
	:hide-header-close="paso == 'emitiendo'"
	dialog-class="ventas-offline-dialog"
	@hidden="al_cerrar">

		<!-- Paso 1: el usuario elige cuales facturar y con que fecha. -->
		<div
		v-if="paso == 'seleccion'"
		class="ventas-offline">

			<p class="ventas-offline__encabezado">
				{{ texto_encabezado }}
			</p>

			<div
			v-for="fila in filas"
			:key="fila.sale.id"
			class="ventas-offline__fila">

				<div class="ventas-offline__linea">

					<b-form-checkbox
					class="ventas-offline__check"
					v-model="fila.seleccionada">
						<span class="ventas-offline__num">N° {{ fila.sale.num }}</span>
					</b-form-checkbox>

					<span
					class="ventas-offline__cliente"
					v-if="fila.sale.client">
						{{ fila.sale.client.name }}
					</span>
					<span
					class="ventas-offline__cliente ventas-offline__cliente--vacio"
					v-else>
						Sin cliente
					</span>

					<span class="ventas-offline__total">
						{{ price(fila.sale.total) }}
					</span>

					<b-form-datepicker
					class="ventas-offline__fecha"
					size="sm"
					label-no-date-selected="Fecha del comprobante"
					:min="fecha_minima"
					:max="fecha_maxima"
					:disabled="!fila.seleccionada"
					v-model="fila.fecha_comprobante"></b-form-datepicker>
				</div>

				<p
				v-if="fila.fecha_ajustada"
				class="ventas-offline__aviso">
					La venta es del {{ date(fila.fecha_original) }}. ARCA no acepta comprobantes con
					mas de 5 dias de atraso, asi que la factura va a salir con fecha
					{{ date(fila.fecha_comprobante) }}.
				</p>

				<p
				v-if="!fila.tiene_importe"
				class="ventas-offline__aviso is-alerta">
					Esta venta no tiene importe a facturar. Revisala en Ventas antes de emitir.
				</p>
			</div>

			<p class="ventas-offline__pie">
				Las que dejes destildadas quedan guardadas sin factura. Podes facturarlas cuando
				quieras desde Ventas: abris la venta y tocas «Emitir factura».
			</p>
		</div>

		<!-- Paso 2: la emision, de a una y en orden. -->
		<div
		v-if="paso == 'emitiendo'"
		class="ventas-offline">

			<p class="ventas-offline__encabezado">
				{{ texto_progreso }}
			</p>

			<div
			v-for="(item, index) in afip_tickets_for_make"
			:key="index"
			class="ventas-offline__emision">

				<i
				v-if="item.maked"
				class="icon-check text-success"></i>
				<i
				v-else-if="item.fallo"
				class="icon-cancel text-danger"></i>
				<b-spinner
				v-else
				variant="primary"></b-spinner>

				<span
				class="p-l-15"
				v-if="item.sale">
					Venta N° {{ item.sale.num }}
				</span>

				<strong
				class="p-l-5"
				v-if="item.maked">| Factura emitida</strong>
				<strong
				class="p-l-5 text-danger"
				v-if="item.fallo">| No se pudo emitir</strong>
				<strong
				class="p-l-5 text-danger"
				v-if="item.errors">| Con errores</strong>
				<strong
				class="p-l-5 text-danger"
				v-if="item.observations">| Con Observaciones</strong>
			</div>
		</div>

		<!-- Paso 3: que paso con cada una. -->
		<div
		v-if="paso == 'resultado'"
		class="ventas-offline">

			<p class="ventas-offline__encabezado">
				{{ texto_resultado }}
			</p>

			<p
			v-if="numeros_fallidos"
			class="ventas-offline__aviso is-alerta">
				Estas quedaron sin autorizar: {{ numeros_fallidos }}. Las vas a encontrar en
				Alertas, en Problemas al facturar, y desde ahi las podes volver a mandar.
			</p>

			<p
			v-if="hubo_errores_de_afip"
			class="ventas-offline__aviso">
				ARCA informo errores u observaciones en alguna de las facturas. El detalle esta en
				la venta, en Ventas.
			</p>
		</div>

		<template #modal-footer>
			<div class="ventas-offline-footer">

				<template v-if="paso == 'seleccion'">
					<b-button
					variant="outline-secondary"
					@click="cerrar">
						Ahora no
					</b-button>
					<b-button
					class="ventas-offline-footer__principal"
					variant="primary"
					:disabled="!cantidad_seleccionada"
					@click="aceptar">
						{{ texto_boton_emitir }}
					</b-button>
				</template>

				<template v-else-if="paso == 'emitiendo'">
					<span class="ventas-offline-footer__esperando">
						No cierres esta ventana hasta que termine.
					</span>
				</template>

				<template v-else>
					<b-button
					class="ventas-offline-footer__principal"
					variant="primary"
					@click="cerrar">
						Cerrar
					</b-button>
				</template>
			</div>
		</template>

	</b-modal>
</div>
</template>
<script>
import moment from 'moment'
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
	mixins: [afip_ticket],
	data() {
		return {
			/*
				Los nombres van todos en castellano y ninguno se llama como algo del mixin
				afip_ticket, que ya define selected_sales, afip_tickets_for_make,
				ventas_afip_information_id, forma_de_pago, permiso_existente, incoterms,
				afip_tipo_comprobante_id y monto_a_facturar. Pisar cualquiera de esos le cambiaria
				el body del POST al camino de Ventas, que este modal no toca.
			*/
			paso: 'seleccion',
			filas: [],
		}
	},
	computed: {
		ventas_offline_para_facturar() {
			return this.$store.state.afip_ticket.ventas_offline_para_facturar
		},
		/*
			🔴 La ventana de ARCA se calcula con moment() y NO copiando el minDate()/maxDate() de
			ConfirmAfipTickets.vue, que hacen new Date().toISOString().split('T')[0]. Eso es UTC:
			en Argentina (UTC-3), despues de las 21:00 devuelve el dia siguiente y la ventana queda
			corrida un dia entero. moment().format('YYYY-MM-DD') es hora local.
		*/
		fecha_minima() {
			return moment().subtract(5, 'days').format('YYYY-MM-DD')
		},
		fecha_maxima() {
			return moment().add(5, 'days').format('YYYY-MM-DD')
		},
		titulo() {
			if (this.paso == 'emitiendo') {
				return 'Emitiendo facturas'
			}
			if (this.paso == 'resultado') {
				return 'Resultado de la facturacion'
			}
			return 'Facturar ventas guardadas sin conexion'
		},
		texto_encabezado() {
			let cantidad = this.filas.length
			if (cantidad == 1) {
				return 'Volvio la conexion. Se guardo 1 venta que tenia punto de venta y todavia no se facturo. Elegi si querés facturarla ahora.'
			}
			return 'Volvio la conexion. Se guardaron '+cantidad+' ventas que tenian punto de venta y todavia no se facturaron. Elegi cuales querés facturar ahora.'
		},
		cantidad_seleccionada() {
			let cantidad = 0
			this.filas.forEach(fila => {
				if (fila.seleccionada) {
					cantidad++
				}
			})
			return cantidad
		},
		texto_boton_emitir() {
			if (this.cantidad_seleccionada == 1) {
				return 'Facturar 1 venta'
			}
			return 'Facturar '+this.cantidad_seleccionada+' ventas'
		},
		total_a_emitir() {
			return this.afip_tickets_for_make.length
		},
		procesadas() {
			let cantidad = 0
			this.afip_tickets_for_make.forEach(item => {
				if (item.maked || item.fallo) {
					cantidad++
				}
			})
			return cantidad
		},
		/*
			Con la lista vacia devuelve false a proposito: every() sobre un array vacio da true, y
			sin esta guarda el watch mandaria al paso de resultado apenas se monta el componente,
			antes de emitir nada.
		*/
		todas_procesadas() {
			if (!this.total_a_emitir) {
				return false
			}
			return this.procesadas == this.total_a_emitir
		},
		emitidas_ok() {
			let cantidad = 0
			this.afip_tickets_for_make.forEach(item => {
				if (item.maked) {
					cantidad++
				}
			})
			return cantidad
		},
		numeros_fallidos() {
			let numeros = []
			this.afip_tickets_for_make.forEach(item => {
				if (item.fallo && item.sale) {
					numeros.push('N° '+item.sale.num)
				}
			})
			return numeros.join(', ')
		},
		hubo_errores_de_afip() {
			let hubo = false
			this.afip_tickets_for_make.forEach(item => {
				if (item.errors || item.observations) {
					hubo = true
				}
			})
			return hubo
		},
		texto_resultado() {
			if (this.emitidas_ok == this.total_a_emitir) {
				if (this.total_a_emitir == 1) {
					return 'Se emitio 1 factura.'
				}
				return 'Se emitieron '+this.total_a_emitir+' facturas.'
			}
			return 'Se emitieron '+this.emitidas_ok+' de '+this.total_a_emitir+' facturas.'
		},
		texto_progreso() {
			if (this.todas_procesadas) {
				return 'Listo.'
			}
			return 'Facturando '+(this.procesadas + 1)+' de '+this.total_a_emitir+'...'
		},
	},
	watch: {
		/*
			Dos disparadores para lo mismo, y hacen falta los dos: el watch cubre el caso en que
			este chunk ya estaba bajado cuando termino la sincronizacion, y el mounted() cubre el
			inverso, que es el que se rompia solo -- App.vue importa todo con () => import(...), asi
			que si la lista se llena mientras el chunk todavia baja, no hay watch que la vea.
		*/
		ventas_offline_para_facturar() {
			this.abrir_si_hay_ventas()
		},
		todas_procesadas(termino) {
			if (termino && this.paso == 'emitiendo') {
				this.paso = 'resultado'
			}
		},
	},
	mounted() {
		this.abrir_si_hay_ventas()
	},
	methods: {
		abrir_si_hay_ventas() {
			if (!this.ventas_offline_para_facturar.length) {
				return
			}

			/*
				Idempotente: los dos disparadores pueden llegar juntos, y una segunda pasada
				mientras el usuario ya esta eligiendo (o peor, mientras se esta emitiendo) le
				rearmaria las filas y le borraria lo que destildo.
			*/
			if (this.paso != 'seleccion' || this.filas.length) {
				return
			}

			this.armar_filas()

			this.$bvModal.show('facturar-ventas-offline')
		},
		armar_filas() {
			let filas = []
			let minima = this.fecha_minima
			let maxima = this.fecha_maxima

			this.ventas_offline_para_facturar.forEach(venta => {

				let fecha_original = moment(venta.fecha_original).format('YYYY-MM-DD')
				let fecha_comprobante = fecha_original
				let fecha_ajustada = false

				/*
					Se comparan strings 'YYYY-MM-DD' derecho: ese formato ordena igual
					alfabeticamente que cronologicamente, y evita construir tres objetos moment por
					fila solo para comparar.
				*/
				if (fecha_original < minima) {
					fecha_comprobante = minima
					fecha_ajustada = true
				} else if (fecha_original > maxima) {
					fecha_comprobante = maxima
					fecha_ajustada = true
				}

				/*
					Una venta sin total_a_facturar se muestra igual pero DESTILDADA. Filtrarla la
					escondería sin decir por que, y tildarla mandaria a ARCA una factura en cero.
					La columna la escribe SaleHelper::set_total_a_facturar() al crear la venta, y
					solo si vino punto de venta -- que es justo el filtro con el que llegamos aca,
					asi que en el camino normal siempre esta.
				*/
				let tiene_importe = Number(venta.sale.total_a_facturar) > 0

				filas.push({
					sale: venta.sale,
					afip: venta.afip,
					fecha_original: fecha_original,
					fecha_comprobante: fecha_comprobante,
					fecha_ajustada: fecha_ajustada,
					tiene_importe: tiene_importe,
					seleccionada: tiene_importe,
				})
			})

			this.filas = filas
		},
		aceptar() {
			let items = []

			this.filas.forEach(fila => {

				if (!fila.seleccionada) {
					return
				}

				items.push({
					sale: fila.sale,
					maked: false,
					errors: false,
					observations: false,
					/*
						Los seis campos existen desde que se crea el objeto porque Vue 2 no detecta
						propiedades agregadas despues: si `fallo` naciera recien en el .catch de
						send_request, la fila se quedaria con el spinner girando para siempre.
					*/
					fallo: false,
					datos_afip: {
						ventas_afip_information_id: fila.afip.ventas_afip_information_id,
						afip_tipo_comprobante_id: fila.afip.afip_tipo_comprobante_id,
						/*
							El importe personalizado y el reparto por alicuota no entran en este
							flujo: vacios significan "facturar el total, todo al 21%", que es lo que
							habria hecho el camino online al guardar la venta. El que necesite otro
							importe lo hace desde Ventas.
						*/
						monto_a_facturar: '',
						importe_personalizado_ivas: [],
						afip_fecha_emision: fila.fecha_comprobante,
						forma_de_pago: fila.afip.forma_de_pago,
						permiso_existente: fila.afip.permiso_existente,
						/*
							incoterms va tal cual vino, sin default 'FOB'. Fuera del comprobante
							tipo 8 el backend ni lo mira, y en tipo 8 el usuario ya eligio uno al
							hacer la venta: inventarle uno aca seria mandarle a ARCA una condicion
							de venta que no eligio nadie.
						*/
						incoterms: fila.afip.incoterms,
					},
				})
			})

			if (!items.length) {
				return
			}

			this.paso = 'emitiendo'

			this.iniciar_emision(items)
		},
		cerrar() {
			this.$bvModal.hide('facturar-ventas-offline')
		},
		al_cerrar() {
			/*
				Se vacia la lista del store al cerrar y no al abrir: es lo que evita que el modal
				se vuelva a abrir solo con las mismas ventas si el usuario dijo "Ahora no".
			*/
			this.$store.commit('afip_ticket/set_ventas_offline_para_facturar', [])

			this.paso = 'seleccion'
			this.filas = []
		},
	}
}
</script>
<style lang="sass">
// 🔴 Ni un hexadecimal en todo el bloque, y ningun var(--x, #hex) tampoco: este modal se monta
// colgando de <body>, fuera de #app, y un color escrito a mano lo deja roto en modo oscuro. El
// fallback no ayuda: tapa el token faltante en vez de mostrarlo.
//
// Van DOS clases y no una en el dialog, por lo mismo que documenta el encabezado de _modals.sass:
// cada archivo .sass del proyecto arrastra bootstrap entero por el @import de _custom.scss, asi que
// la ultima copia de bootstrap queda despues en la hoja final y con una sola clase le gana.
.modal-dialog.ventas-offline-dialog
	max-width: 760px

.ventas-offline
	color: var(--color-text-primary)

	&__encabezado
		font-size: 0.95rem
		color: var(--color-text-secondary)
		margin-bottom: 18px

	&__fila
		padding: 10px 0
		border-bottom: 1px solid var(--color-border-secondary)

		&:last-of-type
			border-bottom: none

	// Grilla y no flex con wrap: con cuatro columnas de anchos muy distintos (checkbox, cliente,
	// total, datepicker) el wrap dejaba el total colgando solo en una linea propia justo en tablet.
	&__linea
		display: grid
		grid-template-columns: 110px 1fr 110px 190px
		align-items: center
		gap: 10px

	&__check
		white-space: nowrap

	&__num
		font-weight: 600
		font-size: 0.95rem

	&__cliente
		font-size: 0.9rem
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

		&--vacio
			color: var(--color-text-secondary)
			font-style: italic

	&__total
		text-align: right
		font-size: 0.95rem
		font-weight: 600
		font-variant-numeric: tabular-nums

	&__aviso
		font-size: 0.8rem
		color: var(--color-text-secondary)
		margin: 6px 0 0
		padding-left: 2px

		&.is-alerta
			color: var(--btn-peligro-texto)
			font-weight: 600

	&__pie
		font-size: 0.82rem
		color: var(--color-text-secondary)
		margin: 18px 0 0
		padding-top: 14px
		border-top: 1px solid var(--color-border)

	&__emision
		display: flex
		flex-direction: row
		align-items: center
		padding: 6px 0

		.spinner-border
			width: 20px !important
			height: 20px !important

		i
			font-size: 1.1rem

	// src/sass/_inputs.sass le pone a TODO input del sistema 1.4rem de tipografia y un borde de
	// 2px que pasa a 3px al enfocar (la fila se mueve 1px). Nada de eso se toca a nivel global:
	// se lo pisa aca adentro, con la misma calibracion que ya usa ConfirmAfipTickets.vue.
	.b-form-datepicker .form-control,
	.form-control
		min-height: var(--toolbar-control-h)
		height: auto
		padding: 0.25rem 0.7rem
		font-size: 0.9rem
		line-height: 1.45
		border: 1px solid var(--color-border)
		border-radius: 10px
		box-shadow: none

		&:focus
			border: 1px solid var(--color-primary)
			box-shadow: none

.ventas-offline-footer
	display: flex
	align-items: center
	gap: 10px
	width: 100%

	.btn
		height: 38px
		padding: 0 18px
		border-radius: 10px
		font-size: 0.875rem
		font-weight: 600
		line-height: 1
		display: inline-flex
		align-items: center
		justify-content: center

		&:disabled
			opacity: 0.6
			cursor: default

	&__principal
		margin-left: auto

	&__esperando
		font-size: 0.85rem
		color: var(--color-text-secondary)

// Tablet: el datepicker es lo que primero deja de entrar, asi que la fila pasa a dos lineas y el
// checkbox se queda pegado al N° de venta en vez de flotar solo.
@media (max-width: 1024px)
	.ventas-offline__linea
		grid-template-columns: 110px 1fr 110px
		grid-template-areas: "check cliente total" "fecha fecha fecha"

	.ventas-offline__check
		grid-area: check

	.ventas-offline__cliente
		grid-area: cliente

	.ventas-offline__total
		grid-area: total

	.ventas-offline__fecha
		grid-area: fecha

@media (max-width: 576px)
	.modal-dialog.ventas-offline-dialog
		max-width: none
		margin: 16px

	// En telefono la fila se apila entera: con el datepicker a ancho completo no queda lugar para
	// nada al lado.
	.ventas-offline__linea
		grid-template-columns: 1fr
		grid-template-areas: "check" "cliente" "total" "fecha"
		gap: 4px

	.ventas-offline__total
		text-align: left
</style>
