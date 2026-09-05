<template>
	<div class="puntos-detalle">

		<div class="puntos-detalle__cabecera">
			<h6 class="puntos-detalle__titulo">{{ titulo }}</h6>
			<b-button
			size="sm"
			variant="outline-secondary"
			@click="$emit('cerrar')">
				Cerrar
			</b-button>
		</div>

		<div v-if="detalle.loading">
			<!-- Misma separacion que la fila de totales real, para que la tabla no salte de lugar
			cuando llegan los datos -->
			<div class="puntos-detalle__totales puntos-detalle__totales--skeleton">
				<b-skeleton width="30%"></b-skeleton>
			</div>

			<b-skeleton-table
			:rows="6"
			:columns="5"></b-skeleton-table>
		</div>

		<template v-else>

			<div class="puntos-detalle__totales">
				<span class="puntos-detalle__total">
					<small>Puntos</small>
					{{ numero_es(total_puntos) }}
				</span>
				<span class="puntos-detalle__total">
					<!-- `total` del contrato es el importe en PESOS, no la cantidad de filas: es
					el precedente de los *_detalle() de contabilidad. Las filas son
					paginacion.total_registros, que es el numero de al lado. -->
					<small>En pesos</small>
					{{ price(detalle.total, false, false) }}
				</span>
				<span class="puntos-detalle__total">
					<small>Movimientos</small>
					{{ numero_es(detalle.paginacion.total_registros) }}
				</span>
			</div>

			<b-table
			striped
			hover
			responsive
			:items="detalle.registros"
			:fields="campos"
			:empty-text="'No hay movimientos de este tipo en el período seleccionado'"
			show-empty>

				<template #cell(fecha)="fila">
					{{ date(fila.item.fecha) }}
				</template>

				<template #cell(cliente)="fila">
					{{ fila.item.cliente ? fila.item.cliente : '—' }}
				</template>

				<template #cell(price_type)="fila">
					<!-- price_type_id 0 es el centinela de "sin lista": la venta no tenia lista y
					el programa no filtraba por ninguna. Se muestra como lo que es y no vacio. -->
					{{ fila.item.price_type ? fila.item.price_type : 'Sin lista' }}
				</template>

				<template #cell(monto_base)="fila">
					{{ fila.item.monto_base === null ? '—' : price(fila.item.monto_base, false, false) }}
				</template>

				<template #cell(puntos)="fila">
					<!-- Acá SI van con signo, y no es una contradicción con las tarjetas: esto es
					el libro fila por fila, donde un canje o un vencimiento están en negativo. Las
					tarjetas muestran totales de la API, que ya vienen en magnitud positiva. -->
					<span :class="clase_puntos(fila.item.puntos)">{{ numero_es(Number(fila.item.puntos)) }}</span>
				</template>

				<template #cell(pesos)="fila">
					{{ price(fila.item.pesos, false, false) }}
				</template>

				<template #cell(vence_at)="fila">
					{{ fila.item.vence_at ? date(fila.item.vence_at) : 'No vence' }}
				</template>

				<template #cell(acciones)="fila">
					<b-button
					v-if="fila.item.sale_id"
					size="sm"
					variant="outline-primary"
					@click="verVenta(fila.item)">
						Ver venta
					</b-button>
				</template>

			</b-table>

			<b-pagination
			v-if="detalle.paginacion.total_registros > detalle.paginacion.per_page"
			class="m-0"
			pills
			v-model="pagina_actual"
			:total-rows="detalle.paginacion.total_registros"
			:per-page="detalle.paginacion.per_page"></b-pagination>

		</template>

	</div>
</template>
<script>
export default {
	props: {
		/* ganados | canjeados | vencidos | revertidos | ajuste — cualquier otro le da 422 a la API */
		tipo: {
			type: String,
			required: true,
		},
		desde: {
			type: String,
			default: '',
		},
		hasta: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			/*
				El total en puntos del tipo, tal como lo devuelve la API en `total_puntos`.
				Vive acá y no en el store porque la mutation setDetalle de src/store/puntos.js
				guarda solo tipo, total, registros y paginacion. Se lee de la respuesta que la
				action devuelve resuelta.
			*/
			total_puntos: 0,
		}
	},
	computed: {
		detalle() {
			return this.$store.state.puntos.detalle
		},
		titulo() {
			return this.etiquetas[this.tipo] ? this.etiquetas[this.tipo] : 'Detalle'
		},
		etiquetas() {
			return {
				ganados: 'Puntos emitidos',
				canjeados: 'Puntos canjeados',
				vencidos: 'Puntos vencidos',
				revertidos: 'Puntos revertidos',
				ajuste: 'Ajustes manuales',
			}
		},
		campos() {
			let campos = [
				{key: 'fecha', label: 'Fecha'},
				{key: 'cliente', label: 'Cliente'},
				{key: 'detalle', label: 'Detalle'},
				{key: 'price_type', label: 'Lista'},
				{key: 'monto_base', label: 'Base'},
				{key: 'puntos', label: 'Puntos'},
				{key: 'pesos', label: 'En pesos'},
			]

			/* El vencimiento solo lo llevan los lotes emitidos; en los otros cuatro tipos esta
			columna quedaria entera en blanco */
			if (this.tipo == 'ganados') {
				campos.push({key: 'vence_at', label: 'Vence'})
			}

			campos.push({key: 'acciones', label: ''})

			return campos
		},
		pagina_actual: {
			get() {
				return this.detalle.paginacion.page
			},
			set(value) {
				if (value != this.detalle.paginacion.page) {
					this.pedir(value)
				}
			},
		},
	},
	watch: {
		/* Cambiar de tarjeta no destruye este componente: lo unico que cambia es la prop */
		tipo() {
			this.pedir(1)
		},
		desde() {
			this.pedir(1)
		},
		hasta() {
			this.pedir(1)
		},
	},
	created() {
		this.pedir(1)
	},
	methods: {
		/**
		 * Pide una pagina del detalle.
		 *
		 * @param {Number} page
		 */
		pedir(page) {
			let self = this

			this.$store.dispatch('puntos/getReporteDetalle', {
				desde: this.desde,
				hasta: this.hasta,
				tipo: this.tipo,
				page: page,
			})
			.then(function(res) {
				if (res && typeof res.total_puntos != 'undefined') {
					self.total_puntos = Number(res.total_puntos)
					return
				}
				self.total_puntos = 0
			})
		},

		/**
		 * Abre el comprobante de la venta que origino el movimiento. Reusa el <sale-modal> que
		 * views/Reportes.vue ya monta para el drill-down de contabilidad, con el mismo
		 * mecanismo generico show_model que usa detalle-modal/Index.vue.
		 *
		 * @param {Object} fila registro del detalle
		 */
		verVenta(fila) {
			if (!fila.sale_id) {
				return
			}
			this.show_model('sale', fila.sale_id)
		},

		/**
		 * @param {*} puntos valor signado tal como viene del libro
		 * @returns {String}
		 */
		clase_puntos(puntos) {
			if (Number(puntos) > 0) {
				return 'puntos-detalle__puntos--suma'
			}
			if (Number(puntos) < 0) {
				return 'puntos-detalle__puntos--resta'
			}
			return ''
		},
	},
}
</script>
<style lang="sass">
.reporte-puntos
	.puntos-detalle
		margin-top: 24px
		padding: 18px
		border: 1px solid #e2e8f0
		border-radius: 12px
		background: #fff
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)

		&__cabecera
			display: flex
			align-items: center
			justify-content: space-between
			gap: 12px
			margin-bottom: 14px

		&__titulo
			margin: 0
			font-size: 0.95rem
			font-weight: 700
			color: #0f172a
			min-width: 0

		&__totales
			display: flex
			flex-wrap: wrap
			gap: 24px
			margin-bottom: 14px

			small
				display: block
				font-size: 0.7rem
				font-weight: 600
				text-transform: uppercase
				letter-spacing: 0.04em
				color: #94a3b8

			// El margin-bottom que BootstrapVue le pone a .b-skeleton se sumaria al del bloque y
			// correria la tabla hacia abajo respecto de donde queda la fila real de totales
			&--skeleton
				.b-skeleton
					margin-bottom: 0

		&__total
			font-size: 1.05rem
			font-weight: 700
			color: #0f172a

		&__puntos--suma
			color: #059669
			font-weight: 600

		&__puntos--resta
			color: #dc2626
			font-weight: 600
</style>
