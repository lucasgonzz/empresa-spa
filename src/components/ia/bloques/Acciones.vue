<template>
	<!-- "Qué conviene hacer hoy": la lista de acciones concretas, con un ícono por tipo. -->
	<div class="informe-acciones">
		<h4 class="informe-acciones__titulo">
			<i class="bi bi-lightning-charge m-r-5"></i>
			{{ bloque.titulo || 'Qué conviene hacer hoy' }}
		</h4>
		<ol class="informe-acciones__items">
			<li
			v-for="(item, index) in items"
			:key="index"
			class="informe-acciones__item">
				<span
				class="informe-acciones__icono"
				:title="etiqueta_de(item)"
				aria-hidden="true">
					<i :class="'bi bi-' + icono_de(item)"></i>
				</span>
				<div class="informe-acciones__cuerpo">
					<span class="informe-acciones__texto">{{ item.texto }}</span>
					<!--
						Solo en una acción `cobrar` con `client_id` (hoy la manda únicamente el
						informe de caja) y con el mismo gate que alertas > Cobros. Si falta
						cualquiera de las dos cosas, el ítem se ve como siempre.
					-->
					<b-button
					v-if="lleva_recordatorio(item)"
					size="sm"
					variant="outline-success"
					class="informe-acciones__recordatorio"
					@click="mandar_recordatorio(item)">
						<i class="bi bi-whatsapp"></i>
						Mandar recordatorio por WhatsApp
					</b-button>
				</div>
			</li>
		</ol>
	</div>
</template>

<script>
/**
 * Ícono y etiqueta por tipo de acción. Los seis tipos son los que acepta el
 * validador del backend (§1.4); uno desconocido cae al check.
 */
const TIPOS = {
	cobrar: { icono: 'cash-coin', etiqueta: 'Cobrar' },
	comprar: { icono: 'cart-plus', etiqueta: 'Comprar' },
	mover: { icono: 'arrow-left-right', etiqueta: 'Mover stock' },
	ofertar: { icono: 'tag', etiqueta: 'Ofertar' },
	revisar: { icono: 'search', etiqueta: 'Revisar' },
	contactar: { icono: 'chat-dots', etiqueta: 'Contactar' },
}

export default {
	props: {
		bloque: {
			type: Object,
			required: true,
		},
	},
	computed: {
		items() {
			return Array.isArray(this.bloque.items) ? this.bloque.items : []
		},
		/**
		 * Las mismas dos capas que alertas > Cobros (puede_recordar): la empresa tiene el
		 * módulo de WhatsApp y la persona puede mandar recordatorios de cobro. El backend
		 * las vuelve a chequear al previsualizar y al mandar: esto es comodidad, no
		 * seguridad. hasExtencion devuelve undefined mientras auth/me no resolvió, y se lee
		 * como "no".
		 */
		puede_mandar_recordatorio() {
			return !!(this.hasExtencion('whatsapp') && this.can('alerts.recordatorio_cobro'))
		},
	},
	methods: {
		icono_de(item) {
			let tipo = item && TIPOS[item.tipo]
			return tipo ? tipo.icono : 'check2-circle'
		},
		etiqueta_de(item) {
			let tipo = item && TIPOS[item.tipo]
			return tipo ? tipo.etiqueta : 'Acción'
		},
		/**
		 * El client_id de la acción, o null si no es un entero positivo. El backend ya lo
		 * valida al depositar (y exige que sea un cliente del dueño); acá solo se evita
		 * dibujar un botón con un valor que no sirve para abrir nada.
		 *
		 * @param {Object} item
		 * @returns {number|null}
		 */
		client_id_de(item) {
			let valor = item ? item.client_id : null
			if (typeof valor != 'number' && typeof valor != 'string') {
				return null
			}
			let id = Number(valor)
			return (id > 0 && Math.floor(id) === id) ? id : null
		},
		lleva_recordatorio(item) {
			return this.puede_mandar_recordatorio
				&& !!item
				&& item.tipo == 'cobrar'
				&& this.client_id_de(item) !== null
		},
		/**
		 * El modal no se monta acá: con dos bloques de acciones en el mismo informe habría
		 * dos modales con el mismo id. Se avisa hacia arriba y lo abre el anfitrión único
		 * del informe (Informe.vue -> RecordatorioDesdeInforme.vue).
		 *
		 * @param {Object} item
		 */
		mandar_recordatorio(item) {
			this.$emit('mandar-recordatorio', this.client_id_de(item))
		},
	},
}
</script>

<style lang="sass">
// Va en una tarjeta propia, apenas distinta del resto: es la parte del informe que
// pide hacer algo.
.informe-acciones
	margin: 26px 0 8px 0
	padding: 16px 18px
	border-radius: 16px
	background: var(--bg-section, #f8f9fa)
	border: 1px solid var(--color-border-secondary, #e9ecef)

	&__titulo
		font-size: .98rem
		font-weight: 700
		margin: 0 0 12px 0
		color: var(--color-text-primary, #212529)

	&__items
		list-style: none
		margin: 0
		padding: 0
		display: flex
		flex-direction: column
		gap: 10px

	&__item
		display: flex
		align-items: flex-start
		gap: 12px
		font-size: .95rem
		line-height: 1.5
		color: var(--color-text-primary, #212529)

	&__icono
		flex-shrink: 0
		width: 30px
		height: 30px
		border-radius: 9px
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-secondary, #e9ecef)
		display: flex
		align-items: center
		justify-content: center
		color: var(--color-primary, #007bff)
		font-size: 15px

	// El texto y, si la acción lo lleva, el botón del recordatorio debajo. Ocupa hasta el
	// borde de la tarjeta para que el botón nunca se salga; sin botón, el texto queda
	// igual que cuando iba suelto al lado del ícono.
	&__cuerpo
		flex: 1 1 auto
		min-width: 0
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 8px

	&__texto
		white-space: pre-wrap
		min-width: 0
		max-width: 100%
		padding-top: 4px

	// Botón chico debajo del texto. En un ancho angosto se parte en dos renglones antes
	// que salirse de la tarjeta.
	&__recordatorio
		display: inline-flex
		align-items: center
		gap: 6px
		max-width: 100%
		white-space: normal
		text-align: left
		line-height: 1.3

		.bi
			flex-shrink: 0

// En el teléfono el botón va a lo ancho, debajo del texto (plan de
// mostrador-caja-vencimientos §2.3).
@media screen and (max-width: 767px)
	.informe-acciones__recordatorio
		width: 100%
		justify-content: center
		text-align: center
</style>
