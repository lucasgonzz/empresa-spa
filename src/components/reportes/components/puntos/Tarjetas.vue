<template>
	<div>

		<!--
			EL numero del reporte. Va arriba, solo y con otra forma que las cinco de abajo a
			proposito: es un STOCK (todo el libro hasta la fecha de fin) y las otras cinco son
			FLUJOS del periodo elegido. Mezclado en la misma grilla, el duenio los resta entre si
			y le da cualquier cosa.
		-->
		<div class="puntos-pasivo">

			<div class="puntos-pasivo__cabecera">
				<span class="puntos-pasivo__icono">
					<i
					class="bi bi-wallet2"
					aria-hidden="true"></i>
				</span>
				<div class="puntos-pasivo__texto">
					<h6 class="puntos-pasivo__titulo">Saldo vivo — lo que el negocio debe en puntos</h6>
					<p class="puntos-pasivo__aclaracion">
						Puntos entregados que todavia no se canjearon ni vencieron. Es mercaderia
						que en algun momento hay que entregar.
					</p>
				</div>
			</div>

			<div class="puntos-pasivo__numeros">
				<b-skeleton
				v-if="loading"
				width="190px"
				height="38px"></b-skeleton>
				<template v-else>
					<span class="puntos-pasivo__puntos">
						{{ mostrar_puntos('saldo_vivo') }}
						<small>puntos</small>
					</span>
					<span class="puntos-pasivo__pesos">{{ mostrar_pesos('saldo_vivo') }}</span>
				</template>
			</div>

			<p class="puntos-pasivo__acumulado">
				<i
				class="bi bi-info-circle"
				aria-hidden="true"></i>
				Acumulado de <strong>todo el libro</strong> hasta el {{ date(hasta) }}.
				<strong>No es del periodo elegido</strong>: las cinco tarjetas de abajo si lo son,
				asi que este numero no se saca restandolas.
			</p>

			<p
			v-if="valor_punto"
			class="puntos-pasivo__valor">
				1 punto = {{ price(valor_punto, false, false) }}
			</p>

		</div>

		<h6 class="puntos-seccion">Movimientos del periodo</h6>

		<div class="puntos-grilla">
			<div
			v-for="tarjeta in tarjetas"
			:key="tarjeta.clave"
			class="puntos-tarjeta apretable"
			:class="[tarjeta.acento, {'puntos-tarjeta--activa': tipo_activo == tarjeta.tipo}]"
			@click="$emit('seleccionar', tarjeta.tipo)">

				<div class="puntos-tarjeta__cabecera">
					<span class="puntos-tarjeta__icono">
						<i
						:class="tarjeta.icono"
						aria-hidden="true"></i>
					</span>
					<span class="puntos-tarjeta__titulo">{{ tarjeta.titulo }}</span>
				</div>

				<div
				v-if="loading"
				class="puntos-tarjeta__numeros">
					<b-skeleton width="70%"></b-skeleton>
					<b-skeleton width="45%"></b-skeleton>
				</div>
				<div
				v-else
				class="puntos-tarjeta__numeros">
					<span class="puntos-tarjeta__puntos">{{ mostrar_puntos(tarjeta.clave, tarjeta.con_signo) }}</span>
					<span class="puntos-tarjeta__pesos">{{ mostrar_pesos(tarjeta.clave, tarjeta.con_signo) }}</span>
				</div>

				<p class="puntos-tarjeta__ayuda">{{ tarjeta.ayuda }}</p>

				<span class="puntos-tarjeta__ver">
					{{ tipo_activo == tarjeta.tipo ? 'Ocultar detalle' : 'Ver detalle' }}
				</span>

			</div>
		</div>

	</div>
</template>
<script>
export default {
	props: {
		reporte: {
			type: Object,
			default: function() {
				return {}
			},
		},
		loading: {
			type: Boolean,
			default: false,
		},
		/* Fecha de fin del periodo, para poder decir hasta cuando esta acumulado el saldo vivo */
		hasta: {
			type: String,
			default: '',
		},
		tipo_activo: {
			type: String,
			default: null,
		},
	},
	computed: {
		/*
			Las cinco tarjetas de flujo. `clave` es la del cuerpo del reporte y `tipo` es el que
			acepta api/puntos/reporte/detalle, que NO siempre coinciden:

			- emitidos -> 'ganados' (el libro guarda el tipo en participio, la tarjeta habla en
			  castellano del duenio);
			- ajustes  -> 'ajuste', en SINGULAR. La whitelist de la API son los cinco tipos del
			  libro tal como estan escritos en la columna `tipo`; mandarle 'ajustes' da 422.
		*/
		tarjetas() {
			return [
				{
					clave: 'emitidos',
					tipo: 'ganados',
					titulo: 'Emitidos',
					icono: 'bi bi-plus-circle',
					acento: 'acento-emitidos',
					ayuda: 'Puntos que el programa entrego por las ventas del periodo. Es deuda nueva.',
				},
				{
					clave: 'canjeados',
					tipo: 'canjeados',
					titulo: 'Canjeados',
					icono: 'bi bi-bag-check',
					acento: 'acento-canjeados',
					ayuda: 'Puntos que los clientes usaron como descuento. Deuda que ya se pago en mercaderia.',
				},
				{
					clave: 'vencidos',
					tipo: 'vencidos',
					titulo: 'Vencidos',
					icono: 'bi bi-hourglass-bottom',
					acento: 'acento-vencidos',
					ayuda: 'Puntos que caducaron sin usarse. Deuda que se cayo sola.',
				},
				{
					clave: 'revertidos',
					tipo: 'revertidos',
					titulo: 'Revertidos',
					icono: 'bi bi-arrow-counterclockwise',
					acento: 'acento-revertidos',
					ayuda: 'Puntos dados de baja porque la venta que los origino se anulo o se devolvio.',
				},
				{
					clave: 'ajustes',
					tipo: 'ajuste',
					titulo: 'Ajustes',
					icono: 'bi bi-pencil-square',
					acento: 'acento-ajustes',
					/*
						El unico de los seis que viaja con signo neto: la API ya suma los ajustes a
						mano en mas y en menos. Los otros cuatro flujos vienen en magnitud positiva
						aunque en el libro esten en negativo, y se muestran como lo que son
						(cantidades entregadas, vencidas o revertidas), sin inventarles un signo.
					*/
					con_signo: true,
					ayuda: 'Ajustes manuales de puntos. Es el unico numero con signo: puede sumar o restar.',
				},
			]
		},
		valor_punto() {
			if (!this.reporte || !this.reporte.valor_punto) {
				return 0
			}
			return Number(this.reporte.valor_punto)
		},
	},
	methods: {
		/**
		 * Un campo de un bloque del reporte, ya normalizado a numero. Laravel manda los decimales
		 * como string ('1200.00'), asi que sin el Number() el formateador mostraria "1.200,00"
		 * para una cantidad de puntos que es entera.
		 *
		 * @param {String} clave emitidos | canjeados | vencidos | revertidos | ajustes | saldo_vivo
		 * @param {String} campo puntos | pesos
		 * @returns {Number}
		 */
		valor(clave, campo) {
			if (!this.reporte || !this.reporte[clave] || typeof this.reporte[clave][campo] == 'undefined') {
				return 0
			}

			let numero = Number(this.reporte[clave][campo])
			return isNaN(numero) ? 0 : numero
		},

		/**
		 * @param {String} clave
		 * @param {Boolean} con_signo true solo en ajustes (ver el comentario de tarjetas())
		 * @returns {String}
		 */
		mostrar_puntos(clave, con_signo) {
			let puntos = this.valor(clave, 'puntos')

			if (con_signo && puntos > 0) {
				return '+' + this.numero_es(puntos)
			}
			return this.numero_es(puntos)
		},

		/**
		 * @param {String} clave
		 * @param {Boolean} con_signo
		 * @returns {String}
		 */
		mostrar_pesos(clave, con_signo) {
			let pesos = this.valor(clave, 'pesos')

			if (con_signo && pesos > 0) {
				return '+' + this.price(pesos, false, false)
			}
			return this.price(pesos, false, false)
		},
	},
}
</script>
<style lang="sass">
// Misma familia de acentos que usa la cascada del Estado de Resultados, para que Reportes se
// siga sintiendo un solo modulo.
$puntos-pasivo: #7c3aed
$puntos-emitidos: #2563eb
$puntos-canjeados: #059669
$puntos-vencidos: #d97706
$puntos-revertidos: #dc2626
$puntos-ajustes: #0891b2

.reporte-puntos
	// --- El pasivo: la tarjeta que manda ------------------------------------------------
	.puntos-pasivo
		background: #fff
		border: 1px solid rgba($puntos-pasivo, 0.35)
		// Franja gruesa a la izquierda: es lo que separa de un vistazo el stock de los flujos,
		// sin depender de que el usuario lea la aclaracion.
		border-left: 5px solid $puntos-pasivo
		border-radius: 12px
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		padding: 20px 24px

		&__cabecera
			display: flex
			align-items: flex-start
			gap: 12px

		&__icono
			flex-shrink: 0
			width: 34px
			height: 34px
			border-radius: 8px
			display: inline-flex
			align-items: center
			justify-content: center
			background: rgba($puntos-pasivo, 0.10)
			color: $puntos-pasivo

			i
				font-size: 1.05rem
				line-height: 1

		&__texto
			// Sin esto el texto no baja del ancho de su propio contenido y desborda la tarjeta en
			// telefono. Es la misma linea que ya hizo falta tres veces en este repo.
			min-width: 0

		&__titulo
			margin: 0
			font-size: 0.95rem
			font-weight: 700
			color: #0f172a

		&__aclaracion
			margin: 4px 0 0
			font-size: 0.82rem
			color: #64748b

		&__numeros
			display: flex
			align-items: baseline
			flex-wrap: wrap
			gap: 14px
			margin-top: 14px

		&__puntos
			font-size: 2rem
			font-weight: 700
			line-height: 1.1
			color: $puntos-pasivo

			small
				font-size: 0.9rem
				font-weight: 600
				color: #94a3b8

		&__pesos
			font-size: 1.2rem
			font-weight: 600
			color: #0f172a

		&__acumulado
			margin: 14px 0 0
			padding: 10px 12px
			border-radius: 8px
			background: rgba($puntos-pasivo, 0.07)
			font-size: 0.8rem
			line-height: 1.45
			color: #475569

			i
				margin-right: 4px
				color: $puntos-pasivo

		&__valor
			margin: 8px 0 0
			font-size: 0.78rem
			color: #94a3b8

	// --- Los cinco flujos del periodo ---------------------------------------------------
	.puntos-seccion
		margin: 24px 0 10px
		font-size: 0.75rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: #64748b

	.puntos-grilla
		display: grid
		// auto-fit + minmax y no cinco columnas fijas con un solo breakpoint en telefono: entre
		// 768 y 1024px (tablet) cinco columnas no entran y las tarjetas se cortan contra el
		// borde. Asi la grilla decide sola cuantas columnas caben, que es la solucion que ya usa
		// .inventario-paneles en listado/modals/inventory-performance.
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))
		gap: 12px

	.puntos-tarjeta
		// 🔴 Un item de grilla tiene min-width: auto, o sea que NO baja del ancho de su propio
		// contenido y desborda la columna en vez de encogerse. Sin esto el auto-fit de arriba no
		// alcanza. Mismo motivo que .inventario-panel.
		min-width: 0
		display: flex
		flex-direction: column
		padding: 14px
		border: 1px solid #e2e8f0
		border-radius: 12px
		background: #fff
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05)
		transition: border-color 0.15s ease, box-shadow 0.15s ease

		&:hover
			border-color: #cbd5e1
			box-shadow: 0 2px 8px rgba(15, 23, 42, 0.09)

		&--activa
			border-color: #0d6efd
			box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.12)

		&__cabecera
			display: flex
			align-items: center
			gap: 8px
			min-width: 0

		&__icono
			flex-shrink: 0
			width: 28px
			height: 28px
			border-radius: 8px
			display: inline-flex
			align-items: center
			justify-content: center
			background: rgba($puntos-emitidos, 0.10)
			color: $puntos-emitidos

			i
				font-size: 0.9rem
				line-height: 1

		&__titulo
			font-size: 0.8rem
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.03em
			color: #64748b
			// El titulo se corta con puntos suspensivos antes que ensanchar la columna
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		&__numeros
			display: flex
			flex-direction: column
			gap: 2px
			margin-top: 12px

			.b-skeleton
				margin-bottom: 0

		&__puntos
			font-size: 1.4rem
			font-weight: 700
			line-height: 1.15
			color: #0f172a
			// Los numeros largos rompen la columna antes que la grilla se decida a bajar de fila
			overflow-wrap: anywhere

		&__pesos
			font-size: 0.9rem
			font-weight: 600
			color: #64748b

		&__ayuda
			margin: 10px 0 0
			font-size: 0.75rem
			line-height: 1.4
			color: #94a3b8
			// Empuja el "Ver detalle" al piso para que las cinco tarjetas lo tengan a la misma
			// altura aunque sus ayudas ocupen distinta cantidad de renglones
			flex: 1

		&__ver
			margin-top: 10px
			font-size: 0.75rem
			font-weight: 600
			color: #0d6efd

		// Un acento por tarjeta, solo sobre la cajita del icono
		&.acento-emitidos .puntos-tarjeta__icono
			background: rgba($puntos-emitidos, 0.10)
			color: $puntos-emitidos

		&.acento-canjeados .puntos-tarjeta__icono
			background: rgba($puntos-canjeados, 0.10)
			color: $puntos-canjeados

		&.acento-vencidos .puntos-tarjeta__icono
			background: rgba($puntos-vencidos, 0.10)
			color: $puntos-vencidos

		&.acento-revertidos .puntos-tarjeta__icono
			background: rgba($puntos-revertidos, 0.10)
			color: $puntos-revertidos

		&.acento-ajustes .puntos-tarjeta__icono
			background: rgba($puntos-ajustes, 0.10)
			color: $puntos-ajustes

	// Telefono: el numero grande del pasivo baja a un tamanio que entra en 360px sin partirse,
	// y la grilla queda en una sola columna aunque el minmax de 190px todavia diera dos.
	@media screen and (max-width: 480px)
		.puntos-pasivo
			padding: 16px

			&__puntos
				font-size: 1.6rem

		.puntos-grilla
			grid-template-columns: 1fr
</style>
