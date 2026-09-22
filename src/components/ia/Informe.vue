<template>
	<article class="informe">
		<header class="informe__cabecera">
			<span
			class="informe__tipo"
			:class="'informe__tipo--' + reporte.tipo">
				<i :class="'bi bi-' + icono"></i>
				{{ nombre_tipo }}
			</span>
			<h2 class="informe__titulo">{{ reporte.titulo || nombre_tipo }}</h2>
			<p class="informe__fecha">{{ fecha_en_letras }}</p>
		</header>

		<!--
			Un componente por tipo de bloque (§1.4). Los tipos que no están en el mapa se
			ignoran (un formato futuro no rompe el informe). Todo el texto sale por la
			interpolación normal de Vue, que escapa: cero v-html en todo el módulo.
		-->
		<div
		v-if="bloques.length"
		class="informe__bloques">
			<component
			v-for="(bloque, index) in bloques"
			:key="index"
			:is="componente_de(bloque)"
			:bloque="bloque"
			:solo_lectura="solo_lectura"
			@mandar-recordatorio="abrir_recordatorio"
			@abrir-articulo="abrir_articulo"
			@abrir-cliente="abrir_cliente"
			@ampliar-imagen="ampliar_imagen"></component>
		</div>

		<p
		v-else
		class="informe__vacio">
			Este informe todavía no tiene contenido.
		</p>

		<!--
			Anfitrión único del recordatorio de cobro por WhatsApp: lo pide el botón de las
			acciones `cobrar` con cliente (bloques/Acciones.vue, evento mandar-recordatorio).
			Uno por informe y no uno por bloque de acciones, para que nunca haya dos modales
			con el mismo id. No ocupa lugar en el informe: el modal se dibuja colgado de <body>.
		-->
		<recordatorio-desde-informe
		v-if="!solo_lectura"
		ref="recordatorio"></recordatorio-desde-informe>

		<!--
			Puentes de la misión mostrador-fotos-y-modales (21/9/2026), mismo criterio que
			RecordatorioDesdeInforme: uno por informe, nunca uno por bloque. Los dos que
			piden datos al API se apagan en modo solo lectura (sin sesión); el lightbox no
			pide nada (solo muestra una URL que ya vino en el contenido) y queda siempre.
		-->
		<abrir-articulo-desde-informe
		v-if="!solo_lectura"
		ref="abrirArticulo"></abrir-articulo-desde-informe>

		<abrir-cliente-desde-informe
		v-if="!solo_lectura"
		ref="abrirCliente"></abrir-cliente-desde-informe>

		<imagen-ampliada-desde-informe
		ref="imagenAmpliada"></imagen-ampliada-desde-informe>
	</article>
</template>

<script>
import moment from 'moment'
import RecordatorioDesdeInforme from '@/components/ia/RecordatorioDesdeInforme'
import AbrirArticuloDesdeInforme from '@/components/ia/AbrirArticuloDesdeInforme'
import AbrirClienteDesdeInforme from '@/components/ia/AbrirClienteDesdeInforme'
import ImagenAmpliadaDesdeInforme from '@/components/ia/ImagenAmpliadaDesdeInforme'

/**
 * Tipo de bloque -> componente. Toda clave nueva del validador del backend
 * (MostradorContenidoValidator) necesita su fila acá para dibujarse.
 */
const COMPONENTE_POR_TIPO = {
	resumen: 'bloque-resumen',
	cifras: 'bloque-cifras',
	seccion: 'bloque-seccion',
	parrafo: 'bloque-parrafo',
	lista: 'bloque-lista',
	tabla: 'bloque-tabla',
	articulos: 'bloque-articulos',
	acciones: 'bloque-acciones',
	clientes: 'bloque-clientes',
}

/**
 * Misma tabla que Carpeta.vue (nombre e ícono por tipo de informe).
 */
const TIPOS = {
	dia: { nombre: 'Rendimiento de ayer', icono: 'sun' },
	caja: { nombre: 'Caja y vencimientos', icono: 'wallet2' },
	tienda: { nombre: 'Tu tienda', icono: 'shop' },
	compras: { nombre: 'Compras', icono: 'cart-plus' },
	stock: { nombre: 'Stock', icono: 'boxes' },
}

export default {
	components: {
		BloqueResumen: () => import('@/components/ia/bloques/Resumen'),
		BloqueCifras: () => import('@/components/ia/bloques/Cifras'),
		BloqueSeccion: () => import('@/components/ia/bloques/Seccion'),
		BloqueParrafo: () => import('@/components/ia/bloques/Parrafo'),
		BloqueLista: () => import('@/components/ia/bloques/Lista'),
		BloqueTabla: () => import('@/components/ia/bloques/Tabla'),
		BloqueArticulos: () => import('@/components/ia/bloques/Articulos'),
		BloqueAcciones: () => import('@/components/ia/bloques/Acciones'),
		BloqueClientes: () => import('@/components/ia/bloques/Clientes'),
		// Directo y no en diferido: tiene que estar escuchando el show antes de que
		// aparezca el botón que lo abre (ver RecordatorioDesdeInforme.vue). Los tres
		// puentes nuevos son livianos (no traen el modal genérico hasta el primer click,
		// ver su propio import() adentro) así que ir directos acá no pesa.
		RecordatorioDesdeInforme,
		AbrirArticuloDesdeInforme,
		AbrirClienteDesdeInforme,
		ImagenAmpliadaDesdeInforme,
	},
	props: {
		reporte: {
			type: Object,
			required: true,
		},
		/**
		 * Modo solo lectura (misión asistente-por-whatsapp, 16/9/2026): el MISMO informe,
		 * abierto desde el link que llegó por WhatsApp, sin sesión iniciada.
		 *
		 * Lo único que apaga es el modal del recordatorio de cobro: no hay usuario del que
		 * chequear permisos ni sesión con la que mandar un WhatsApp, y montarlo sería dejar
		 * colgado un modal que no puede funcionar. El botón que lo abre ya no aparece solo
		 * —bloques/Acciones.vue lo condiciona a `hasExtencion` + `can`, y sin sesión las dos
		 * dan false—, así que esto es la segunda vuelta de la misma guarda, no la única.
		 */
		solo_lectura: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		tipo() {
			return TIPOS[this.reporte.tipo] || null
		},
		nombre_tipo() {
			return this.tipo ? this.tipo.nombre : 'Informe'
		},
		icono() {
			return this.tipo ? this.tipo.icono : 'folder'
		},
		/**
		 * "sábado 13 de septiembre de 2026".
		 */
		fecha_en_letras() {
			if (!this.reporte.fecha) {
				return ''
			}
			return moment(this.reporte.fecha, 'YYYY-MM-DD').format('dddd D [de] MMMM [de] YYYY')
		},
		/**
		 * Los bloques del contenido (§1.4), solo los de tipo conocido. El modelo trae
		 * `contenido` ya como objeto (cast array del backend); si por alguna razón
		 * llegara como texto JSON, se parsea; si no se puede, no hay bloques.
		 */
		bloques() {
			let contenido = this.reporte.contenido
			if (typeof contenido == 'string') {
				try {
					contenido = JSON.parse(contenido)
				} catch (e) {
					return []
				}
			}
			if (!contenido || !Array.isArray(contenido.bloques)) {
				return []
			}
			return contenido.bloques.filter(bloque => {
				return bloque && typeof bloque == 'object' && COMPONENTE_POR_TIPO[bloque.tipo]
			})
		},
	},
	methods: {
		componente_de(bloque) {
			return COMPONENTE_POR_TIPO[bloque.tipo]
		},
		/**
		 * Botón "Mandar recordatorio por WhatsApp" de una acción `cobrar` (misión
		 * "mostrador-caja-vencimientos"): el anfitrión abre el modal existente de
		 * alertas > Cobros para ese cliente, encima del informe.
		 *
		 * @param {number} client_id
		 */
		abrir_recordatorio(client_id) {
			if (this.solo_lectura || !client_id || !this.$refs.recordatorio) {
				return
			}
			this.$refs.recordatorio.abrir(client_id)
		},
		/**
		 * Click en un artículo (tarjeta de bloques/Articulos.vue o renglón de
		 * bloques/Lista.vue): abre su modal de edición (misión mostrador-fotos-y-modales).
		 *
		 * @param {number} article_id
		 */
		abrir_articulo(article_id) {
			if (this.solo_lectura || !article_id || !this.$refs.abrirArticulo) {
				return
			}
			this.$refs.abrirArticulo.abrir(article_id)
		},
		/**
		 * Click en el nombre de un cliente (bloques/Clientes.vue): abre su modal. El
		 * click en la deuda no pasa por acá — bloques/Clientes.vue reusa directo el
		 * puente global de cuenta corriente (ai_chat/pedirCuentaCorrienteDeCliente).
		 *
		 * @param {number} client_id
		 */
		abrir_cliente(client_id) {
			if (this.solo_lectura || !client_id || !this.$refs.abrirCliente) {
				return
			}
			this.$refs.abrirCliente.abrir(client_id)
		},
		/**
		 * Click en cualquier imagen de artículo: la amplía. A diferencia de los dos de
		 * arriba, anda también en modo solo lectura (no pide nada al API, solo muestra
		 * la URL que ya vino en el contenido).
		 *
		 * @param {{url: string, alt: string}} payload
		 */
		ampliar_imagen(payload) {
			if (!payload || !payload.url || !this.$refs.imagenAmpliada) {
				return
			}
			this.$refs.imagenAmpliada.abrir(payload.url, payload.alt)
		},
	},
}
</script>

<style lang="sass">
// Tonos de las cifras y viñetas (ok / alerta), con su versión para oscuro. Se
// declaran acá, en la raíz del informe, y los bloques los leen con var().
.informe
	--informe-tono-ok: #1B9E5A
	--informe-tono-alerta: #D96A00
	max-width: 860px
	margin: 0 auto

	&__cabecera
		margin-bottom: 18px

	// Pastilla con el tipo de informe, del color de su carpeta.
	&__tipo
		display: inline-flex
		align-items: center
		gap: 6px
		font-size: .78rem
		font-weight: 600
		letter-spacing: .02em
		text-transform: uppercase
		padding: 4px 10px
		border-radius: 999px
		color: #fff
		background: #8a94a6
		margin-bottom: 10px

		&--dia
			background: #0B84F8

		&--caja
			background: #0F766E

		&--tienda
			background: #3A31FC

		&--compras
			background: #1B9E5A

		&--stock
			background: #FA7E06

	&__titulo
		font-size: 1.5rem
		font-weight: 700
		letter-spacing: -0.015em
		line-height: 1.25
		margin: 0
		color: var(--color-text-primary, #212529)

	&__fecha
		margin: 4px 0 0 0
		font-size: .9rem
		color: var(--color-text-secondary, #6c757d)

		&::first-letter
			text-transform: uppercase

	&__vacio
		color: var(--color-text-secondary, #6c757d)
		margin: 10px 0

html.dark-mode .informe
	--informe-tono-ok: #57b48d
	--informe-tono-alerta: #ffa14d
</style>
