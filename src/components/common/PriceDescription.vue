<template>
	<b-modal
	title="Cálculo del precio"
	hide-footer
	size="lg"
	id="final-price-description">

		<!-- Mientras el servidor calcula. El modal ya esta abierto: esto es lo que reemplaza a la
		     pantalla quieta que se veia antes de esta mision. -->
		<cargando-desglose
		v-if="cargando"></cargando-desglose>

		<!-- Si el pedido fallo. El mensaje va ADENTRO del modal y no solo en un toast: el modal ya
		     se abrio, asi que dejarlo vacio seria peor que no haberlo abierto. -->
		<div
		v-else-if="error"
		class="desglose-error">
			<i class="bi bi-exclamation-triangle"></i>
			<p>{{ error }}</p>
		</div>

		<!-- El desglose estructurado: cada renglon llega del backend con su `tipo`, y de ahi salen
		     el icono y el color. -->
		<div
		v-else-if="hay_detalle"
		class="desglose-precio">
			<template v-for="(entrada, index) in detalle">

				<div
				v-if="es_seccion(entrada)"
				:key="'seccion-'+index"
				class="desglose-seccion">
					<span class="desglose-seccion__texto">
						{{ entrada.etiqueta }}
					</span>
					<span class="desglose-seccion__linea"></span>
				</div>

				<desglose-linea
				v-else
				:key="'linea-'+index"
				:entrada="entrada"></desglose-linea>

			</template>
		</div>

		<!-- Nada que mostrar. Pasa con un desglose guardado que quedo vacio (una venta vieja, una
		     compra sin renglones). El modal ahora abre siempre, asi que sin esta rama se veria un
		     cuadro en blanco sin explicacion. -->
		<div
		v-else-if="!textos.length"
		class="desglose-vacio">
			<i class="bi bi-inbox"></i>
			<p>No hay un desglose guardado para este total.</p>
		</div>

		<!--
			El desglose viejo, en texto plano.

			🔴 Esta rama no es codigo muerto ni una red por las dudas: es lo que ven los desgloses YA
			GUARDADOS en la base. sales.price_description y provider_orders.price_description son
			JSON de arrays de strings, escritos por ventas y compras de hace meses, y no tienen
			`tipo` que colorear ni monto separado del texto. Lo unico honesto que se puede hacer con
			ellos es mostrarlos como parrafos; lo que si cambia es el ritmo tipografico, que ahora
			es el mismo que el del desglose nuevo en vez del <h4> entre dos <hr> de antes.

			La deteccion del encabezado por mayusculas se conserva TAL CUAL para este camino: es la
			unica señal que tienen esos strings. Para el desglose nuevo esa heuristica ya no existe
			-- el backend manda `tipo: 'seccion'` --, que es lo que cierra el hallazgo
			20260805-desglose-por-lista-margen-propio-y-acentos.
		-->
		<div
		v-else
		class="desglose-texto">
			<template v-for="(des, index) in textos">
				<div
				v-if="es_titulo_viejo(des)"
				:key="'titulo-'+index"
				class="desglose-texto__seccion">
					{{ des }}
				</div>
				<p
				v-else
				:key="'texto-'+index"
				class="desglose-texto__linea">
					{{ des }}
				</p>
			</template>
		</div>

	</b-modal>
</template>
<script>
export default {
	components: {
		DesgloseLinea: () => import('@/components/common/desglose-precio/Linea'),
		CargandoDesglose: () => import('@/components/common/desglose-precio/CargandoDesglose'),
	},
	props: {
		/*
			El desglose historico: array de strings. Lo siguen mandando ventas, compras y Vender,
			que guardan el texto ya armado en la base. Es el fallback cuando no hay `detalle`.
		*/
		price_descriptions: {
			type: Array,
			default: function() {
				return []
			},
		},
		/*
			El desglose estructurado (clave `detalle` de la respuesta de empresa-api). Cada entrada
			es { tipo, clave, etiqueta, detalle, valor, texto }. Hoy lo mandan los dos endpoints del
			boton "?" del articulo; los demas modulos no lo tienen y caen al fallback de arriba.
		*/
		detalle: {
			type: Array,
			default: function() {
				return []
			},
		},
		// Prendido mientras se espera la respuesta del servidor.
		cargando: {
			type: Boolean,
			default: false,
		},
		// Mensaje de error si el pedido fallo. Null cuando no hubo error.
		error: {
			type: String,
			default: null,
		},
	},
	computed: {
		hay_detalle() {
			return Array.isArray(this.detalle) && this.detalle.length > 0
		},
		textos() {
			if (!Array.isArray(this.price_descriptions)) {
				return []
			}
			return this.price_descriptions
		},
	},
	methods: {
		/**
		 * Si esta entrada del desglose estructurado es un encabezado de seccion.
		 *
		 * @param {Object|String} entrada
		 * @returns {Boolean}
		 */
		es_seccion(entrada) {
			return entrada !== null
				&& typeof entrada == 'object'
				&& entrada.tipo == 'seccion'
		},
		/**
		 * Si este renglon del desglose VIEJO (texto plano) es un encabezado. Se compara contra su
		 * propia version en mayusculas, que es la unica señal que trae un string suelto. Ver el
		 * comentario largo del template.
		 *
		 * @param {String} des
		 * @returns {Boolean}
		 */
		es_titulo_viejo(des) {
			return typeof des == 'string' && des === des.toUpperCase()
		},
	},
}
</script>
