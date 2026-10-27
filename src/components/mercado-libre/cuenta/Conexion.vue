<template>
	<div class="meli-card">
		<div class="meli-card__encabezado">
			<h6 class="meli-card__titulo">Tu cuenta de Mercado Libre</h6>
			<b-badge
			:variant="estado.variant"
			data-testid="meli-cuenta-estado">
				{{ estado.text }}
			</b-badge>
		</div>

		<!-- Conectada: qué cuenta quedó atada -->
		<p
		v-if="mercado_libre_conectado"
		class="meli-card__dato">
			Cuenta conectada:
			<strong>{{ cuenta.nickname || cuenta.meli_user_id || 'sin nombre' }}</strong>
		</p>

		<!-- La conexión se cortó sola: el motivo lo manda la API, ya en lenguaje llano -->
		<p
		v-if="cuenta.error_conexion"
		class="meli-card__aviso meli-card__aviso--error">
			{{ cuenta.error_conexion }}
		</p>

		<!-- Sin conectar: qué pasa al tocar el botón -->
		<p
		v-if="!mercado_libre_conectado"
		class="meli-card__texto">
			Conectá la cuenta <strong>titular</strong> de Mercado Libre (no la de un empleado). Se abre Mercado Libre en otra pestaña, aceptás el permiso para ComercioCity y volvés acá. ComercioCity nunca ve tu contraseña.
		</p>

		<!-- Modelo nuevo de publicaciones de Mercado Libre -->
		<p
		v-if="mercado_libre_conectado && cuenta.user_product_seller"
		class="meli-card__aviso meli-card__aviso--info">
			Tu cuenta usa el <strong>modelo nuevo de publicaciones de Mercado Libre</strong>: el sistema publica con el nombre del artículo y Mercado Libre arma el título de la publicación. No tenés que hacer nada distinto.
		</p>

		<!-- Stock en varios depósitos de Mercado Libre -->
		<p
		v-if="mercado_libre_conectado && cuenta.multiorigen"
		class="meli-card__aviso meli-card__aviso--alerta">
			Tu cuenta maneja el stock en <strong>varios depósitos dentro de Mercado Libre</strong>. En ese caso el sistema no cambia el stock de tus publicaciones: lo seguís manejando desde Mercado Libre.
		</p>

		<p
		v-if="mercado_libre_conectado"
		class="meli-card__texto">
			Si cambiás la contraseña de Mercado Libre o le quitás el permiso a ComercioCity, la conexión se corta y vas a tener que volver a conectar.
		</p>

		<div class="meli-card__acciones">
			<b-button
			v-if="!mercado_libre_conectado"
			variant="primary"
			size="sm"
			data-testid="meli-cuenta-conectar"
			@click="conectar_mercado_libre">
				Conectar mi cuenta
			</b-button>

			<b-button
			v-if="mercado_libre_conectado"
			variant="outline-secondary"
			size="sm"
			data-testid="meli-cuenta-reconectar"
			@click="conectar_mercado_libre">
				Reconectar
			</b-button>

			<b-button
			v-if="mercado_libre_conectado"
			variant="outline-danger"
			size="sm"
			data-testid="meli-cuenta-desconectar"
			@click="desconectar_mercado_libre">
				Desconectar
			</b-button>
		</div>
	</div>
</template>
<script>
import mercado_libre_conexion from '@/mixins/mercado_libre_conexion'

/**
 * Tarjeta de conexión de la solapa "Cuenta" (misión mercado-libre-integracion, 27/10/2026).
 *
 * Lee `GET mercado-libre/cuenta` del store: `conectado`, `nickname`, `meli_user_id`,
 * `error_conexion`, `user_product_seller` y `multiorigen`. Los botones usan
 * `GET integraciones/mercadolibre/connect` y `POST integraciones/mercadolibre/disconnect`
 * (ver mixins/mercado_libre_conexion.js). Los estilos viven en cuenta/Index.vue.
 */
export default {
	name: 'MeliCuentaConexion',
	mixins: [mercado_libre_conexion],
	computed: {
		// La respuesta de la cuenta, o un objeto vacío mientras no hay respuesta
		cuenta() {
			return this.cuenta_mercado_libre || {}
		},
		// Texto y color del estado de la conexión
		estado() {
			if (this.mercado_libre_conectado) {
				return { text: 'Conectada', variant: 'success' }
			}
			if (this.cuenta.error_conexion) {
				return { text: 'Se cortó la conexión', variant: 'danger' }
			}
			return { text: 'Sin conectar', variant: 'secondary' }
		},
	},
}
</script>
