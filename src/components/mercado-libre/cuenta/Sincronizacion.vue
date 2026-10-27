<template>
	<div class="meli-card">
		<div class="meli-card__encabezado">
			<h6 class="meli-card__titulo">Publicaciones y pedidos</h6>
		</div>

		<!-- Si Mercado Libre deja publicar a esta cuenta (null = Mercado Libre no respondió: no se dice nada) -->
		<p
		v-if="cuenta.puede_publicar === true"
		class="meli-card__aviso meli-card__aviso--info"
		data-testid="meli-puede-publicar">
			Mercado Libre te deja publicar con esta cuenta.
		</p>
		<div
		v-else-if="cuenta.puede_publicar === false"
		class="meli-card__aviso meli-card__aviso--alerta"
		data-testid="meli-no-puede-publicar">
			<p class="m-b-5">
				<strong>Por ahora Mercado Libre no te deja publicar.</strong>
			</p>
			<ul
			v-if="motivos.length"
			class="meli-lista">
				<li
				v-for="(motivo, index) in motivos"
				:key="index">
					{{ motivo }}
				</li>
			</ul>
			<p
			v-else
			class="m-b-0">
				Entrá a tu cuenta de Mercado Libre para ver qué te pide.
			</p>
		</div>

		<!-- Cola de publicaciones: lo que el sistema tiene que mandar a Mercado Libre -->
		<p class="meli-card__texto m-b-5">
			Cada vez que cambiás un artículo publicado (precio, stock, fotos, datos), el sistema lo actualiza solo en Mercado Libre.
		</p>
		<div class="meli-indicadores meli-indicadores--tres">
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ numero(cola.pendientes) }}</span>
				<span class="meli-indicador__nombre">Esperando para actualizarse</span>
			</div>
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ numero(cola.errores) }}</span>
				<span class="meli-indicador__nombre">Con error</span>
			</div>
			<div class="meli-indicador">
				<span class="meli-indicador__valor">{{ numero(cola.exitosas_24h) }}</span>
				<span class="meli-indicador__nombre">Actualizadas en las últimas 24 h</span>
			</div>
		</div>

		<!-- Control de pedidos: la API consulta los pedidos nuevos cada 5 minutos -->
		<p class="meli-card__texto">
			El sistema revisa tus pedidos nuevos de Mercado Libre cada 5 minutos.
			<span v-if="cuenta.ultimo_poll_pedidos">
				Última revisión: {{ since(cuenta.ultimo_poll_pedidos) }}.
			</span>
			<span v-else>
				Todavía no se revisó ninguna vez.
			</span>
		</p>

		<div
		v-if="Number(cola.errores) > 0"
		class="meli-card__acciones">
			<b-button
			variant="outline-danger"
			size="sm"
			data-testid="meli-ver-errores"
			@click="ver_errores">
				Ver las publicaciones con error
			</b-button>
		</div>
	</div>
</template>
<script>
/**
 * Tarjeta "Publicaciones y pedidos" de la solapa "Cuenta" (misión mercado-libre-integracion,
 * 27/10/2026).
 *
 * Recibe la respuesta de `GET mercado-libre/cuenta` y lee `puede_publicar`, `motivos_no_publica`,
 * `cola` ({pendientes, errores, exitosas_24h}) y `ultimo_poll_pedidos`. "Ver las publicaciones
 * con error" lleva a la solapa "Publicaciones (salientes)", que es la cola de sincronización.
 * Los estilos viven en cuenta/Index.vue.
 */
export default {
	name: 'MeliCuentaSincronizacion',
	props: {
		cuenta: {
			type: Object,
			required: true,
		},
	},
	computed: {
		// Motivos por los que Mercado Libre no deja publicar (textos de la API)
		motivos() {
			return Array.isArray(this.cuenta.motivos_no_publica) ? this.cuenta.motivos_no_publica : []
		},
		// Contadores de la cola de sincronización, o un objeto vacío si no vinieron
		cola() {
			return this.cuenta.cola || {}
		},
	},
	methods: {
		/**
		 * Lleva a la solapa de la cola de publicaciones y carga su listado, igual que tocar la
		 * solapa en la barra (la barra dispara la misma acción del store).
		 *
		 * @returns {void}
		 */
		ver_errores() {
			this.$router.push({ params: { view: 'sinc-articulo-salientes' } })
			this.$store.dispatch('sync_to_meli_article/getModels')
		},
		/**
		 * Un contador con separador de miles, o 0 si no vino.
		 *
		 * @param {Number|String|null} valor
		 * @returns {String}
		 */
		numero(valor) {
			let numero = Number(valor)
			if (isNaN(numero)) {
				return '0'
			}
			return numero.toLocaleString('es-AR')
		},
	},
}
</script>
