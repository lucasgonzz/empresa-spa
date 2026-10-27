<template>
	<div class="meli-card">
		<div class="meli-card__encabezado">
			<h6 class="meli-card__titulo">Tu reputación en Mercado Libre</h6>
			<b-badge
			v-if="mercado_lider"
			variant="warning"
			data-testid="meli-mercado-lider">
				{{ mercado_lider }}
			</b-badge>
		</div>

		<!-- La API manda la reputación en null si Mercado Libre no respondió: no es lo mismo que "sin color" -->
		<p
		v-if="!reputacion"
		class="meli-card__texto m-b-0"
		data-testid="meli-reputacion-sin-datos">
			No pudimos traer tu reputación de Mercado Libre en este momento. Tocá «Actualizar» en un rato.
		</p>

		<template v-else>
		<!-- Termómetro: cinco tramos del rojo al verde; sin color, todos en gris -->
		<div
		class="meli-termometro"
		data-testid="meli-termometro"
		:data-nivel="rep.level_id || 'sin-color'">
			<span
			v-for="nivel in niveles"
			:key="nivel.id"
			class="meli-termometro__tramo"
			:class="clases_del_tramo(nivel)"
			:title="nivel.nombre"></span>
		</div>

		<p class="meli-reputacion__nivel">
			{{ nivel_actual ? nivel_actual.nombre : 'Todavía sin color' }}
		</p>
		<p class="meli-card__texto">
			{{ nivel_actual ? nivel_actual.explicacion : explicacion_sin_color }}
		</p>

		<!-- Lo que mide Mercado Libre para el color -->
		<div class="meli-indicadores">
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ numero(rep.transacciones_completadas) }}</span>
				<span class="meli-indicador__nombre">Ventas concretadas (en total)</span>
			</div>
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ porcentaje(rep.reclamos_rate) }}</span>
				<span class="meli-indicador__nombre">Ventas con reclamo</span>
			</div>
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ porcentaje(rep.cancelaciones_rate) }}</span>
				<span class="meli-indicador__nombre">Ventas que cancelaste vos</span>
			</div>
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ porcentaje(rep.demoras_rate) }}</span>
				<span class="meli-indicador__nombre">Despachos con demora</span>
			</div>
		</div>

		<p
		v-if="texto_periodo"
		class="meli-card__texto">
			{{ texto_periodo }}
		</p>

		<!-- Las transacciones de Mercado Libre son de toda la historia de la cuenta, no del período -->
		<p
		v-if="rep.transacciones_canceladas !== null && typeof rep.transacciones_canceladas != 'undefined'"
		class="meli-card__texto">
			Ventas canceladas en toda tu historia en Mercado Libre: {{ numero(rep.transacciones_canceladas) }}.
		</p>

		<p class="meli-card__aviso">
			Te bajan la reputación los <strong>reclamos</strong>, las <strong>ventas que cancelás vos</strong> (por ejemplo, porque no tenías stock) y los <strong>despachos tarde</strong>. Para estar en verde, en los últimos 60 días: reclamos hasta 1,5 %, canceladas por vos hasta 1 % y despachos con demora hasta 10 %. Por eso es clave que el stock del sistema esté bien cargado.
		</p>

		<p
		v-if="!mercado_lider"
		class="meli-card__texto m-b-0">
			Para llegar a MercadoLíder necesitás más de 4 meses vendiendo, reputación verde y, en los últimos 60 días, al menos 101 ventas y $1.500.000 vendidos.
		</p>
		</template>
	</div>
</template>
<script>
/**
 * Tarjeta de reputación de la solapa "Cuenta" (misión mercado-libre-integracion, 27/10/2026).
 *
 * Recibe `cuenta.reputacion` de `GET mercado-libre/cuenta`:
 * {level_id, power_seller_status, transacciones_completadas, transacciones_canceladas,
 * reclamos_rate, demoras_rate, cancelaciones_rate, periodo}.
 *
 * - `level_id` es el color del termómetro de Mercado Libre: null (sin color, gris), `1_red`,
 *   `2_orange`, `3_yellow`, `4_light_green` o `5_green`.
 * - `power_seller_status` es MercadoLíder: null, `silver` (MercadoLíder), `gold` o `platinum`.
 * - Los `*_rate` vienen como fracción, igual que los devuelve Mercado Libre (0.012 = 1,2 %).
 *
 * Los textos son para un comerciante: sin jerga técnica. Los umbrales del color verde y de
 * MercadoLíder salen de la ayuda de Mercado Libre Argentina (investigacion-ml.md, sección 2).
 * Los estilos viven en cuenta/Index.vue.
 */
export default {
	name: 'MeliCuentaReputacion',
	props: {
		reputacion: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			// Los cinco colores del termómetro, del peor al mejor
			niveles: [
				{
					id: '1_red',
					clase: 'rojo',
					nombre: 'Rojo',
					explicacion: 'Es la reputación más baja y los compradores la ven antes de comprarte. Para subirla: evitá los reclamos, no canceles ventas y despachá a tiempo.',
				},
				{
					id: '2_orange',
					clase: 'naranja',
					nombre: 'Naranja',
					explicacion: 'Reputación baja. Mirá abajo qué te está bajando el color: reclamos, ventas que cancelaste o despachos con demora.',
				},
				{
					id: '3_yellow',
					clase: 'amarillo',
					nombre: 'Amarillo',
					explicacion: 'Reputación media. Con pocos reclamos, sin cancelar ventas y despachando a tiempo podés pasar a verde.',
				},
				{
					id: '4_light_green',
					clase: 'verde-claro',
					nombre: 'Verde claro',
					explicacion: 'Buena reputación. Cuidala: unos pocos reclamos o cancelaciones la pueden bajar.',
				},
				{
					id: '5_green',
					clase: 'verde',
					nombre: 'Verde',
					explicacion: 'La mejor reputación. Los compradores confían más y los envíos gratis te salen más baratos.',
				},
			],
			explicacion_sin_color: 'Mercado Libre empieza a medir tu reputación cuando completás 10 ventas en el último año. Hasta entonces tu termómetro se ve en gris.',
		}
	},
	computed: {
		// La reputación, o un objeto vacío si la API no la mandó (por ejemplo, si Mercado Libre falló al darla)
		rep() {
			return this.reputacion || {}
		},
		// Nivel actual del termómetro, o null si todavía no tiene color
		nivel_actual() {
			let nivel = this.niveles.find(n => n.id == this.rep.level_id)
			return nivel || null
		},
		// Nombre de MercadoLíder según `power_seller_status`, o null
		mercado_lider() {
			let nombres = {
				silver: 'MercadoLíder',
				gold: 'MercadoLíder Gold',
				platinum: 'MercadoLíder Platinum',
			}
			return nombres[this.rep.power_seller_status] || null
		},
		// Sobre qué período mide Mercado Libre, en castellano
		texto_periodo() {
			let periodo = this.rep.periodo
			if (!periodo) {
				return null
			}
			let coincidencia = String(periodo).match(/(\d+)\s*day/i)
			if (coincidencia) {
				return 'Medido sobre los últimos ' + coincidencia[1] + ' días.'
			}
			if (String(periodo).toLowerCase() == 'historic') {
				return 'Medido sobre toda tu historia en Mercado Libre.'
			}
			return 'Período medido: ' + periodo + '.'
		},
	},
	methods: {
		/**
		 * Clases de un tramo del termómetro: encendido si es el color actual, gris si no hay color.
		 *
		 * @param {Object} nivel Uno de `niveles`.
		 * @returns {Object}
		 */
		clases_del_tramo(nivel) {
			if (!this.nivel_actual) {
				return { 'meli-termometro__tramo--gris': true }
			}
			let clases = {}
			clases['meli-termometro__tramo--' + nivel.clase] = true
			clases['meli-termometro__tramo--activo'] = nivel.id == this.nivel_actual.id
			return clases
		},
		/**
		 * Un rate de Mercado Libre (fracción) como porcentaje con coma: 0.012 → "1,2 %".
		 *
		 * @param {Number|String|null} rate
		 * @returns {String}
		 */
		porcentaje(rate) {
			if (rate === null || typeof rate == 'undefined' || rate === '') {
				return '—'
			}
			let numero = Number(rate)
			if (isNaN(numero)) {
				return '—'
			}
			return (numero * 100).toFixed(1).replace('.', ',') + ' %'
		},
		/**
		 * Un número entero con separador de miles, o una raya si no vino.
		 *
		 * @param {Number|String|null} valor
		 * @returns {String}
		 */
		numero(valor) {
			if (valor === null || typeof valor == 'undefined' || valor === '') {
				return '—'
			}
			let numero = Number(valor)
			if (isNaN(numero)) {
				return '—'
			}
			return numero.toLocaleString('es-AR')
		},
	},
}
</script>
