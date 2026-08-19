<template>
	<!--
		Modal del reporte de inventario del Listado (rehecho en la mision 31, 11/8/2026).

		Muestra EXACTAMENTE los mismos datos que la version anterior y sigue leyendolos del mismo
		reporte: no se toco el store, ni el mixin, ni el endpoint, ni el calculo. Lo que cambia es
		la forma: antes eran cuatro tarjetas con encabezado gris, todas del mismo peso, con los
		numeros en el mismo cuerpo que sus etiquetas y dos circulos de progreso dibujados a mano.
		Ahora los totales encabezan --que es lo que se viene a mirar-- y las proporciones se leen
		como graficos, con la libreria que el sistema ya usa (chart.js 2 via vue-chartjs, la misma
		de los reportes). No se instalo ningun paquete.

		El chasis del modal --radio, header, footer-- lo pone _modals.sass (mision 29). Aca solo
		vive el cuerpo.

		El ancho baja de "xl" a "lg": con los tres paneles compactos ya no hacen falta cuatro
		columnas, y en un notebook de 1366x768 el modal entra sin scroll, que era uno de los
		criterios de aceptacion.
	-->
	<b-modal
	hide-footer
	size="lg"
	title="Inventario"
	id="inventory-performance"
	@show="get_inventory_performance_models">

		<!-- Fecha de calculo del reporte vigente: con reportes que pueden tener minutos de antiguedad,
		aclarar cuando se calculo evita que "el inventario no coincide con el listado" sea un ticket
		de soporte recurrente. -->
		<p
		v-if="inventory_performance"
		class="inventario-fecha">
			Calculado el {{ date(inventory_performance.created_at) }} a las {{ hour(inventory_performance.created_at) }}
		</p>

		<!-- Aviso de regeneracion en background: el reporte vigente sigue siendo util mientras se
		recalcula, asi que esto es una nota del sistema que convive con datos validos y no una
		interrupcion. El icono va al lado del texto, no arriba y en grande (ver el bloque de estilos
		de mas abajo).

		Y no, la palabra "style" entre signos de menor y mayor NO va escrita aca aunque quede mas
		claro: la revalidacion del carril de merge cuenta las aperturas y los cierres de ese tag en
		el archivo entero --comentarios incluidos-- y una mencion suelta le da 2 aperturas contra 1
		cierre, o sea que frena el merge. Paso el 12/8/2026. -->
		<div
		v-if="inventory_performance && inventory_performance_generating"
		class="inventario-aviso"
		role="status"
		aria-live="polite">
			<i class="bi bi-arrow-repeat inventario-aviso__icono" aria-hidden="true"></i>
			<span>Estamos actualizando el reporte de inventario. Los datos de abajo van a refrescarse solos apenas termine.</span>
		</div>

		<!-- Sin reporte todavia: mostrar "0 articulos / $0 en costos" seria informacion falsa, no
		vacia. Es un estado vacio y se dice con el vocabulario que el sistema ya tiene para eso
		--circulo con el icono, titulo y pista debajo--, reusando el componente en vez de repetirlo. -->
		<empty-state
		v-if="!inventory_performance"
		icon_class="bi bi-hourglass-split"
		title="Estamos calculando el reporte de inventario"
		hint="Los datos van a aparecer solos en unos minutos."></empty-state>

		<template v-else>

			<!-- Los tres totales, arriba y grandes -->
			<valor-del-inventario></valor-del-inventario>

			<!-- La aclaracion viaja con los totales porque es sobre ELLOS: los valores de costos y
			precios solo suman los articulos que tienen el stock indicado. Antes vivia adentro de la
			tarjeta de valor; ahora que los totales encabezan el modal, la aclaracion los sigue. -->
			<p class="inventario-aclaracion">
				Solo se tienen en cuenta los artículos que tienen indicado su stock (actualmente, el {{ inventory_performance.porcentaje_stockeado }}% del inventario)
			</p>

			<div class="inventario-paneles">
				<inventario-stockeado></inventario-stockeado>
				<costos-articulos></costos-articulos>
				<estado-del-stock></estado-del-stock>
			</div>

		</template>
	</b-modal>
</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
		InventarioStockeado: () => import('@/components/listado/modals/inventory-performance/InventarioStockeado'),
		ValorDelInventario: () => import('@/components/listado/modals/inventory-performance/ValorDelInventario'),
		CostosArticulos: () => import('@/components/listado/modals/inventory-performance/CostosArticulos'),
		EstadoDelStock: () => import('@/components/listado/modals/inventory-performance/EstadoDelStock'),
	},
}
</script>
<style lang="sass">
// El bloque NO va scoped a proposito: los paneles viven en componentes hijos y el estilo del
// modal es uno solo. Va anidado bajo el id del modal --que es el mismo con el que se abre por
// v-b-modal-- para que no se escape a ninguna otra pantalla.
//
// Todos los colores salen de tokens de _dark_theme.sass, sin un solo hexadecimal: este modal se
// monta colgando de <body>, FUERA de #app, asi que un hex lo dejaria blanco en modo oscuro (la
// razon esta explicada en el encabezado de _dark_theme.sass, y es por lo que los tokens viven
// en :root).
#inventory-performance

	.inventario-fecha
		margin: 0 0 14px
		font-size: 0.8125rem
		color: var(--color-text-secondary)

	// --- Aviso de regeneracion en background --------------------------------------------------
	// 🔴 A proposito NO usa `.text-with-icon` de common-vue/sass/_texts.sass, que es lo que tenia
	// hasta la mision 36: esa clase pinta el texto de lighten($blue, 10) a 1.2em centrado y pone
	// el icono en `4em` con `display: block` --el cartel azul con el icono gigante de la captura
	// del 12/8/2026--. La clase NO se toca porque la usan ~40 componentes del sistema; el
	// tratamiento propio vive aca, anidado bajo el id del modal, asi que no se escapa a ningun
	// otro lado.
	.inventario-aviso
		display: flex
		flex-direction: row
		align-items: flex-start
		gap: 8px
		margin: 0 0 14px
		padding: 8px 12px
		border-radius: var(--toolbar-btn-radius)
		border: 1px solid var(--color-border)
		background: var(--bg-section)
		font-size: 0.8125rem
		line-height: 1.35
		color: var(--color-text-secondary)

		&__icono
			flex-shrink: 0
			// El icono acompana a la PRIMERA linea del texto: con `align-items: flex-start` y el
			// mismo line-height que el parrafo queda a su altura, en vez de flotar en el medio
			// cuando el texto entra en dos renglones (que es lo que pasa en telefono).
			line-height: 1.35
			// Una sola cosa animada, y es esta: el giro del icono es lo que dice que hay algo en
			// curso. Nada mas parpadea ni se mueve, para que la nota siga siendo una nota.
			animation: inventario-aviso-girar 1.6s linear infinite

	// --- Los tres totales -------------------------------------------------------------------
	// Vocabulario tomado de caja/components/horizontal-nav-center/Total.vue (caja-totales__chip):
	// icono en su caja, etiqueta chica en mayusculas y valor grande. Se copia el lenguaje, no el
	// archivo: aca los colores salen de tokens y alla eran hexadecimales.
	.inventario-totales
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 10px

	.inventario-chip
		display: flex
		flex-direction: row
		align-items: center
		gap: 10px
		flex: 1 1 0
		min-width: 150px
		padding: 10px 14px
		border-radius: var(--toolbar-btn-radius)
		border: 1px solid var(--color-border)
		background: var(--bg-card)

		&__icon
			flex-shrink: 0
			width: 34px
			height: 34px
			border-radius: 8px
			display: flex
			align-items: center
			justify-content: center
			background: var(--bg-hover)
			color: var(--color-text-secondary)

			i
				font-size: 1rem
				line-height: 1

			// Los dos valores de plata llevan el color; la cantidad de articulos queda neutra.
			// Es la jerarquia que pedia la mision: que el numero mas importante se vea como tal,
			// en vez de que los cuatro bloques pesen lo mismo.
			&--costos
				color: var(--color-primary)

			&--precios
				color: var(--caja-abierta-acento)

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

		&__value
			font-size: 1.25rem
			font-weight: 700
			line-height: 1.2
			color: var(--color-text-primary)
			white-space: nowrap

	.inventario-aclaracion
		margin: 10px 0 0
		font-size: 0.8125rem
		line-height: 1.35
		color: var(--color-text-secondary)

	// --- Los tres paneles -------------------------------------------------------------------
	// Grid y no b-row/b-col: son tres piezas del mismo ancho que tienen que apilarse juntas, y el
	// grid lo resuelve con una linea en vez de con tres clases de breakpoint por columna.
	.inventario-paneles
		display: grid
		// `auto-fit` + `minmax` en lugar de las tres columnas fijas que dejo la mision 31: entre
		// 768px y el ancho completo del modal las tres columnas no entraban y el tercer panel se
		// cortaba contra el borde (captura de Lucas del 12/8/2026). El defecto vivia justo en el
		// medio, porque el unico breakpoint estaba en 767px. Asi la grilla decide sola: tres
		// columnas en el modal ancho, dos cuando dejan de entrar y una en telefono.
		//
		// El minimo son 240px y sale del contenido real del panel mas ancho de los tres --el de
		// estado del stock--: 14px de padding a cada lado mas el boton "Excel de stock minimo" con
		// su icono, que a 0.875rem mide poco mas de 200px. Con menos que eso el boton se parte en
		// dos renglones antes de que la grilla se decida a bajar de columna.
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))
		gap: 12px
		margin-top: 16px

	.inventario-panel
		// 🔴 La causa de fondo del desborde, y sin esto el `auto-fit` de arriba tampoco alcanza:
		// un item de grilla tiene `min-width: auto`, o sea que NO baja del ancho de su propio
		// contenido y desborda su columna en vez de encogerse. Es la misma linea de la que
		// dependieron la cabecera de Ventas (mision 32) y la fila de ABM (mision 33) -- el mismo
		// error por tercera vez, por eso queda escrito y no se "simplifica" sacandolo.
		min-width: 0
		display: flex
		flex-direction: column
		align-items: stretch
		padding: 14px
		border-radius: var(--toolbar-btn-radius)
		border: 1px solid var(--color-border)
		background: var(--bg-card)

		&__titulo
			margin: 0 0 10px
			font-size: 0.75rem
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.04em
			color: var(--color-text-secondary)

		// La dona y su numero comparten caja: el canvas ocupa el alto y el numero se apoya encima
		// con position absolute. Sin `position: relative` aca, ese numero se iria al modal.
		&__grafico
			position: relative
			height: 128px

		&__centro
			position: absolute
			top: 0
			left: 0
			right: 0
			bottom: 0
			display: flex
			flex-direction: column
			align-items: center
			justify-content: center
			// El numero no tiene que robarle el mouse al canvas.
			pointer-events: none

		&__centro-valor
			font-size: 1.5rem
			font-weight: 700
			line-height: 1
			color: var(--color-text-primary)

		&__centro-label
			margin-top: 2px
			font-size: 0.7rem
			color: var(--color-text-secondary)

		// La barra apilada del estado del stock ocupa el lugar de la dona en su panel, con menos
		// alto: es una sola linea. El margen de abajo la separa de su detalle.
		&__barra
			height: 26px
			margin: 46px 0 42px

		&__detalle
			margin: 12px 0 0
			display: flex
			flex-direction: column
			gap: 6px

		&__fila
			display: flex
			flex-direction: row
			align-items: baseline
			justify-content: space-between
			gap: 8px

			dt
				display: flex
				flex-direction: row
				align-items: center
				gap: 6px
				font-size: 0.8125rem
				font-weight: 400
				color: var(--color-text-secondary)

			dd
				margin: 0
				font-size: 0.95rem
				font-weight: 600
				color: var(--color-text-primary)

		// Los puntos de color repiten los de la barra apilada, que es lo que convierte a la barra
		// en algo legible: sin ellos habria que adivinar cual tramo es cual.
		&__punto
			width: 8px
			height: 8px
			border-radius: 50%
			flex-shrink: 0

			&--sin-stock
				background: var(--caja-cerrar-acento)

			&--minimo
				background: var(--toolbar-btn-seleccion)

		// 🔴 El botón declara su aspecto acá, y no alcanza con sacarle el `variant="success"`:
		// medido el 11/8/2026 con el CSS del build, un `b-button` sin variant cae en el
		// `btn-secondary` de Bootstrap, que es un gris MACIZO con letra blanca. La regla neutra
		// del sistema vive en `_toolbar_botones.sass` acotada a `.view-header-toolbar`, y este
		// modal no está adentro de esa barra, así que no le llega. O sea que sacar el variant
		// cambiaba un botón verde macizo por uno gris macizo.
		//
		// Se repite el vocabulario en vez de ensanchar aquel selector a todo el sistema: eso
		// último le cambiaría el aspecto a cada botón sin variant de la aplicación, que es
		// bastante más de lo que esta misión vino a hacer. Queda como hallazgo.
		&__excel
			margin-top: 12px
			align-self: flex-start
			height: var(--toolbar-control-h)
			padding: 0 12px
			border-radius: var(--toolbar-btn-radius)
			background: var(--bg-card)
			border: 1px solid var(--color-border)
			color: var(--color-text-primary)
			box-shadow: var(--toolbar-btn-shadow)

			&:hover,
			&:focus
				background: var(--bg-hover)
				border-color: var(--color-border)
				color: var(--color-text-primary)

			i
				color: var(--color-text-secondary)

	// --- Mobile -----------------------------------------------------------------------------
	// Los paneles se apilan y los chips pasan a ocupar el ancho completo: tres chips de 150px en
	// una pantalla de 360 se rompen en dos filas desparejas.
	//
	// La linea de los paneles ya no es la que los apila --de eso se ocupa el `auto-fit`, que en
	// un modal de telefono da una sola columna--: queda como red de seguridad para un contenedor
	// mas angosto que el minimo de 240px, donde una pista fija de ese ancho desbordaria igual.
	@media (max-width: 767px)
		.inventario-paneles
			grid-template-columns: 1fr

		.inventario-chip
			flex: 1 1 100%

		.inventario-panel__barra
			margin: 20px 0

// El @keyframes va al nivel de arriba y NO adentro de `#inventory-performance`: una regla
// @keyframes no se acota a un selector --el nombre es global igual--, asi que anidarla solo
// confundiria al que la lea. Por eso el nombre lleva el prefijo del modal.
@keyframes inventario-aviso-girar
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

// Quien pidio menos movimiento en su sistema operativo ve la nota quieta. El aviso no depende de
// la animacion para entenderse: el texto ya dice que el reporte se esta actualizando.
@media (prefers-reduced-motion: reduce)
	#inventory-performance .inventario-aviso__icono
		animation: none
</style>
