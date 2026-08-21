<template>
<div>
	<b-modal
	id="facturar-ventas-offline"
	size="lg"
	centered
	:title="titulo"
	:no-close-on-backdrop="paso == 'emitiendo'"
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
						<!--
							La fecha de la venta va SIEMPRE a la vista y como dato propio, no
							solo dentro del datepicker: ese muestra la fecha del COMPROBANTE, y
							apenas el usuario la toca deja de haber en pantalla cualquier rastro
							de cuando se hizo la venta, que es justo con lo que tiene que
							comparar para decidir.
						-->
						<span class="ventas-offline__fecha-venta">Venta del {{ date(fila.fecha_original) }}</span>
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
					ARCA no acepta comprobantes con más de 5 días de atraso, así que esta factura
					va a salir con fecha {{ date(fila.fecha_comprobante) }} y no con la de la venta.
				</p>

				<p
				v-if="!fila.tiene_importe"
				class="ventas-offline__aviso is-alerta">
					Esta venta no tiene importe a facturar. Revisala en Ventas antes de emitir.
				</p>
			</div>

			<p class="ventas-offline__pie">
				Las que dejes destildadas quedan guardadas sin factura. Podés facturarlas cuando
				quieras desde Ventas: abrís la venta y tocás «Emitir factura».
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
				v-if="item.sale">
					Venta N° {{ item.sale.num }}
				</span>

				<strong
				v-if="item.maked">| Factura emitida</strong>
				<strong
				class="text-danger"
				v-if="item.fallo">| No se pudo emitir</strong>
				<strong
				class="text-danger"
				v-if="item.errors">| Con errores</strong>
				<strong
				class="text-danger"
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
				{{ texto_fallidas }}
			</p>

			<!--
				Dos destinos y no uno, porque no siempre está en el mismo lado: "Problemas al
				facturar" se arma con los AfipTicket sin CAE, y esa fila la crea el servidor. Si
				el POST no llegó a salir -- que es el modo de falla más probable acá, con la
				conexión recién recuperada -- no hay ticket, y la venta no aparece en esa
				pantalla por más que el usuario la busque.
			-->
			<p
			v-if="numeros_fallidos"
			class="ventas-offline__aviso">
				Si ARCA las rechazó, las vas a encontrar en Alertas, en Problemas al facturar. Si
				no llegaron a salir, no van a estar ahí: abrí la venta en Ventas y tocá
				«Emitir factura».
			</p>

			<p
			v-if="hubo_errores_de_afip"
			class="ventas-offline__aviso">
				ARCA informó errores u observaciones en alguna de las facturas. El detalle está en
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
					:disabled="paso != 'seleccion' || !cantidad_seleccionada"
					@click="aceptar">
						{{ texto_boton_emitir }}
					</b-button>
				</template>

				<!--
					🔴 El paso de emisión tiene salida. La tentación es trabarlo entero para que
					nadie corte la cadena a la mitad, pero cerrar el modal NO corta nada: la
					cadena vive en el mixin y sigue sola hasta el final. Lo único que se pierde
					al cerrar es ver el progreso. En cambio, un modal sin salida deja la
					aplicación entera bloqueada si un item nunca resuelve, y la única forma de
					salir es recargar la página -- justo con ventas recién persistidas sin
					factura, que es el peor momento para recargar.
				-->
				<template v-else-if="paso == 'emitiendo'">
					<span class="ventas-offline-footer__esperando">
						Podés cerrar esta ventana: las facturas se emiten igual.
					</span>
					<b-button
					class="ventas-offline-footer__principal"
					variant="outline-secondary"
					@click="cerrar">
						Cerrar
					</b-button>
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
			/*
				La ventana de ARCA vive en data() y NO en un computed: un computed sin
				dependencias reactivas se evalua una sola vez y queda cacheado para siempre, asi
				que una pestaña abierta desde ayer calcularia la ventana con el dia de ayer --
				exactamente el bug de un dia corrido que el comentario de abajo dice estar
				evitando, entrando por la otra puerta. Se recalcula cada vez que se arman las
				filas, que es el unico momento en que se usa.
			*/
			fecha_minima: '',
			fecha_maxima: '',
		}
	},
	computed: {
		ventas_offline_para_facturar() {
			return this.$store.state.afip_ticket.ventas_offline_para_facturar
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
				return 'Volvió la conexión. Se guardó 1 venta que tenía punto de venta y todavía no se facturó. Elegí si querés facturarla ahora.'
			}
			return 'Volvió la conexión. Se guardaron '+cantidad+' ventas que tenían punto de venta y todavía no se facturaron. Elegí cuáles querés facturar ahora.'
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
		cantidad_fallidas() {
			let cantidad = 0
			this.afip_tickets_for_make.forEach(item => {
				if (item.fallo) {
					cantidad++
				}
			})
			return cantidad
		},
		texto_fallidas() {
			if (this.cantidad_fallidas == 1) {
				return 'Esta quedó sin autorizar: '+this.numeros_fallidos+'.'
			}
			return 'Estas quedaron sin autorizar: '+this.numeros_fallidos+'.'
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
					return 'Se emitió 1 factura.'
				}
				return 'Se emitieron '+this.total_a_emitir+' facturas.'
			}
			if (this.emitidas_ok == 1) {
				return 'Se emitió 1 de '+this.total_a_emitir+' facturas.'
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

			// Se recalcula al armar y no en un computed. Ver el comentario de data().
			let minima = moment().subtract(5, 'days').format('YYYY-MM-DD')
			let maxima = moment().add(5, 'days').format('YYYY-MM-DD')

			this.fecha_minima = minima
			this.fecha_maxima = maxima

			this.ventas_offline_para_facturar.forEach(venta => {

				let momento = moment(venta.fecha_original)

				/*
					🔴 Sin el isValid(), una fecha rota se convertia en una fecha REAL y peor que
					la de hoy: moment(null).format() devuelve la cadena 'Invalid date', y la
					comparacion de strings de abajo la da por mayor que la maxima ('I' le gana a
					'2' en ASCII), asi que caia en la rama de "muy nueva" y la factura salia con
					fecha de hoy + 5 dias. Ante una fecha que no se entiende, el default sano es
					hoy: es la que habria usado el backend si no le mandaramos ninguna.
				*/
				let fecha_original = momento.isValid()
					? momento.format('YYYY-MM-DD')
					: moment().format('YYYY-MM-DD')

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
			/*
				Guarda contra el doble click: el boton se deshabilita por `paso`, pero eso recien
				se ve en el proximo render. Dos clicks en el mismo tick largaban dos cadenas, y
				la segunda le rearmaba la lista a la primera con los indices ya corridos.
			*/
			if (this.paso != 'seleccion') {
				return
			}

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

			/*
				El paso cambia SOLO si el motor arrancó de verdad. iniciar_emision se niega si hay
				otra cadena en vuelo, y si igual pasáramos a 'emitiendo' el modal se quedaría
				mostrando el progreso de la emisión ajena.
			*/
			if (!this.iniciar_emision(items)) {
				return
			}

			this.paso = 'emitiendo'
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
		display: block
		font-weight: 600
		font-size: 0.95rem

	&__fecha-venta
		display: block
		font-size: 0.75rem
		color: var(--color-text-secondary)
		white-space: nowrap

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

	// El gap va aca y no con las clases p-l-15 / p-l-5 que usa SendAfipTickets.vue: esas dos
	// clases NO EXISTEN en el proyecto -- no estan definidas ni en src/sass/, ni en common-vue,
	// ni en bootstrap --, asi que no separan nada y el texto queda pegado al icono. Las usan
	// media docena de componentes viejos y ninguno se entero.
	&__emision
		display: flex
		flex-direction: row
		align-items: center
		gap: 6px
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
