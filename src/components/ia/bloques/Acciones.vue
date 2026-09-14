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
				<span class="informe-acciones__texto">{{ item.texto }}</span>
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

	&__texto
		white-space: pre-wrap
		min-width: 0
		padding-top: 4px
</style>
