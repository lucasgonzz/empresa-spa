<template>
	<!--
		Reporte del pasivo del programa de puntos: lo que el negocio le debe a sus clientes en
		mercaderia futura. Es una seccion mas de Reportes y usa el MISMO selector de rango de
		arriba que Estado de Resultados, Flujo de Caja y Posicion Fiscal.
	-->
	<div
	v-if="visible"
	class="reporte-puntos m-t-20 p-b-100">

		<tarjetas
		:reporte="reporte"
		:loading="loading"
		:hasta="periodo_hasta"
		:tipo_activo="tipo_activo"
		@seleccionar="seleccionar"></tarjetas>

		<!-- El detalle recibe el periodo YA ASENTADO (periodo_desde / periodo_hasta), no los
		computados desde/hasta: los computados cambian con cada tecla del input de fecha y el
		detalle pediria una pagina por tecla. El respiro se aplica una sola vez, acá. -->
		<detalle
		v-if="tipo_activo"
		:tipo="tipo_activo"
		:desde="periodo_desde"
		:hasta="periodo_hasta"
		@cerrar="cerrarDetalle"></detalle>

	</div>
</template>
<script>
export default {
	components: {
		Tarjetas: () => import('@/components/reportes/components/puntos/Tarjetas'),
		Detalle: () => import('@/components/reportes/components/puntos/Detalle'),
	},
	data() {
		return {
			/*
				Tipo del libro cuyo detalle esta abierto debajo de las tarjetas. null = ninguno.
				Los valores validos son los que acepta la API (ganados, canjeados, vencidos,
				revertidos, ajuste); cualquier otro le da 422.
			*/
			tipo_activo: null,

			/*
				Temporizador del watcher del rango. Los dos <input type="date"> de
				seleccionar-fecha escriben en el store apenas cambia el valor, y tipear una fecha
				a mano dispara hasta tres cambios (dia, mes y anio). Sin este respiro serian tres
				pedidos al pedo por cada fecha que el usuario escribe.
			*/
			timeout_rango: null,

			/*
				El periodo con el que se pidió el reporte que se está viendo. Es el que baja al
				detalle: así las dos mitades de la pantalla muestran siempre el MISMO periodo,
				incluso mientras el usuario está a mitad de camino de escribir una fecha nueva.
			*/
			periodo_desde: '',
			periodo_hasta: '',
		}
	},
	computed: {
		visible() {
			return this.hasExtencion('puntos_clientes') && this.view == 'puntos'
		},
		reporte() {
			return this.$store.state.puntos.reporte
		},
		loading() {
			return this.$store.state.puntos.reporte_loading
		},

		/*
			desde/hasta salen del MISMO estado que usa fecha_moneda_params() en
			src/store/reportes/index.js: en 'dia-actual' el periodo es hoy, y en 'rango-de-fechas'
			son las dos fechas elegidas arriba. La derivacion se repite aca en vez de llamar a esa
			funcion porque es privada del store de reportes y este reporte vive en el de puntos.
		*/
		desde() {
			if (this.$store.state.reportes.rango_temporal == 'rango-de-fechas') {
				return this.$store.state.reportes.mes_inicio
			}
			return this.today
		},
		hasta() {
			if (this.$store.state.reportes.rango_temporal == 'rango-de-fechas') {
				return this.$store.state.reportes.mes_fin
			}
			return this.today
		},
		rango() {
			return this.desde + '|' + this.hasta
		},
	},
	watch: {
		/* Al entrar a la seccion desde otra pestania de Reportes */
		visible() {
			if (this.visible) {
				this.pedir()
			}
		},

		/*
			El boton "Buscar" del selector de fechas despacha los cuatro reportes contables y NO
			este: seleccionar-fecha/Index.vue no es de esta unidad y no se toca. Por eso el
			reporte se entera del cambio de periodo mirando el rango en el store.
		*/
		rango() {
			let self = this

			if (this.timeout_rango) {
				clearTimeout(this.timeout_rango)
			}

			this.timeout_rango = setTimeout(function() {
				self.pedir()
			}, 400)
		},
	},
	created() {
		/* Reportes.vue monta esta seccion siempre; pedir() se encarga de no pedir nada si no toca */
		this.pedir()
	},
	beforeDestroy() {
		if (this.timeout_rango) {
			clearTimeout(this.timeout_rango)
		}
		this.$store.commit('puntos/resetDetalle')
	},
	methods: {
		/**
		 * Pide el reporte del periodo actual.
		 *
		 * El rango invalido (desde posterior a hasta) se saltea y no se avisa: el aviso ya lo da
		 * seleccionar-fecha/Index.vue arriba, y repetirlo aca serian dos mensajes para un solo
		 * problema.
		 */
		pedir() {
			if (!this.visible || !this.desde || !this.hasta || this.desde > this.hasta) {
				return
			}

			this.periodo_desde = this.desde
			this.periodo_hasta = this.hasta

			this.$store.dispatch('puntos/getReporte', {desde: this.desde, hasta: this.hasta})
		},

		/**
		 * Abre el detalle de un tipo del libro, o lo cierra si ya estaba abierto ese mismo.
		 *
		 * @param {String} tipo ganados | canjeados | vencidos | revertidos | ajuste
		 */
		seleccionar(tipo) {
			if (!tipo) {
				return
			}

			if (this.tipo_activo == tipo) {
				this.cerrarDetalle()
				return
			}

			this.tipo_activo = tipo
		},

		cerrarDetalle() {
			this.tipo_activo = null
			this.$store.commit('puntos/resetDetalle')
		},
	},
}
</script>
<style lang="sass">
.reporte-puntos
	max-width: 980px
	margin-left: auto
	margin-right: auto
</style>
