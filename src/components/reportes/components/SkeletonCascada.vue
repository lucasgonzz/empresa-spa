<template>
	<div>
		<!-- Una silueta por tarjeta. El m-t-20 arranca en el segundo bloque, igual que la
		separacion que hoy tienen las tarjetas reales de Flujo de Caja y Posicion Fiscal -->
		<div
		v-for="(bloque, i) in bloques"
		:key="'bloque-'+i"
		class="cascada-card skeleton-cascada"
		:class="{ 'm-t-20': i > 0 }">

			<div
			v-if="bloque.titulo"
			class="cascada-card__titulo">
				<b-skeleton width="28%"></b-skeleton>
			</div>

			<div
			v-for="(renglon, j) in bloque.renglones"
			:key="'renglon-'+i+'-'+j"
			:class="clase_renglon(renglon)">
				<!-- La cajita del icono tambien va en la silueta: sin ella, al llegar el
				contenido real todas las etiquetas se corren 42px (30 de la cajita + 12 del
				gap) de golpe hacia la derecha. Va adentro del mismo __label que usa el
				renglon real, para heredar de el ese flex y ese gap en vez de repetirlos aca. -->
				<div class="cascada-renglon__label">
					<div class="skeleton-cascada__icono">
						<b-skeleton width="30px" height="30px"></b-skeleton>
					</div>
					<b-skeleton :width="ancho_etiqueta(i, j)"></b-skeleton>
				</div>
				<b-skeleton :width="ancho_monto(renglon)"></b-skeleton>
			</div>
		</div>
	</div>
</template>
<script>
/**
 * Anchos de las etiquetas, fijos y ciclados por la posicion del renglon.
 *
 * NO cambiar esto por un Math.random(): un ancho aleatorio se recalcula en cada re-render
 * de Vue, y el skeleton esta montado justo mientras el componente se actualiza. El
 * resultado es que las barras cambian de largo solas mientras carga, un temblor que se lee
 * como un bug. Ciclado con modulo se ve igual de "escrito a mano" y no se mueve nunca.
 */
const ANCHOS_ETIQUETA = ['46%', '62%', '38%', '54%', '44%', '58%', '40%', '50%']

export default {
	props: {
		bloques: Array,
	},
	methods: {
		/**
		 * Clase del renglon segun su tipo, para que herede el mismo separador y el mismo
		 * peso visual que el renglon real de la cascada.
		 *
		 * @param {String} tipo 'linea' | 'subtotal' | 'final'
		 * @returns {String}
		 */
		clase_renglon(tipo) {
			if (tipo == 'final') {
				return 'cascada-renglon cascada-renglon--subtotal cascada-renglon--final'
			}
			if (tipo == 'subtotal') {
				return 'cascada-renglon cascada-renglon--subtotal'
			}
			return 'cascada-renglon'
		},
		/**
		 * @param {Number} bloque Indice de la tarjeta
		 * @param {Number} renglon Indice del renglon dentro de la tarjeta
		 * @returns {String}
		 */
		ancho_etiqueta(bloque, renglon) {
			return ANCHOS_ETIQUETA[(bloque * 3 + renglon) % ANCHOS_ETIQUETA.length]
		},
		/* Los montos de subtotal y final son mas grandes en el contenido real */
		ancho_monto(tipo) {
			if (tipo == 'subtotal' || tipo == 'final') {
				return '110px'
			}
			return '90px'
		},
	},
}
</script>
<style lang="sass">
// El skeleton NO redefine .cascada-card ni .cascada-renglon: los HEREDA de los estilos
// no-scoped de cada componente padre (.cascada-resultados, .flujo-caja, .posicion-fiscal),
// porque se renderiza adentro de esos contenedores. Por eso la silueta coincide con el
// contenido real por construccion, y si manana cambia el padding o el ancho de la tarjeta
// el skeleton acompana solo. Si aca se vuelve a declarar background / border-radius /
// padding / max-width, se duplica la definicion y las dos empiezan a separarse.
.skeleton-cascada
	// El renglon real ya no necesita que aca se corrija el align-items: desde que lleva
	// icono adentro del label, los tres padres alinean con center y esta regla quedaba
	// duplicando una definicion que ya vive alla (que es justo lo que el comentario de
	// arriba pide no hacer). Verificado: los tres unicos componentes que montan este
	// skeleton son estado-resultados, flujo-caja y posicion-fiscal.
	.cascada-renglon__label
		// Los anchos de ANCHOS_ETIQUETA estan en %, y hasta ahora se resolvian contra el
		// ancho del renglon porque el b-skeleton era hijo directo de el. Adentro del label
		// (flex-item de base auto) ese % se resolveria contra un ancho que depende del
		// propio contenido y la barra colapsaria; con flex: 1 el label toma el espacio
		// libre del renglon y los porcentajes vuelven a medir algo estable.
		flex: 1
		min-width: 0

	.skeleton-cascada__icono
		flex-shrink: 0

		.b-skeleton
			border-radius: 8px

	.b-skeleton
		// BootstrapVue le pone margin-bottom, que adentro de un flex de dos columnas
		// descentra las barras
		margin-bottom: 0

	.cascada-card__titulo
		// Misma altura que el <h6> real, para que no salte al llegar el contenido
		padding: 14px 0 4px
</style>
