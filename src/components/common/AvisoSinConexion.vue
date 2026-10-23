<template>
	<!--
		Aviso fijo de conexión (misión ingreso-sin-internet, 23/10/2026). Dos situaciones:
		- sin conexión: el sistema trabaja con los artículos y la sesión guardados en el equipo;
		- con conexión pero con ventas hechas sin internet que todavía no subieron.
		No tapa nada que se pueda tocar: es una píldora chica abajo a la izquierda y deja pasar los
		clics (pointer-events: none).
	-->
	<div
		v-if="visible"
		class="aviso-sin-conexion"
		:class="sin_conexion ? 'aviso-sin-conexion--sin-red' : 'aviso-sin-conexion--pendientes'"
		role="status"
		aria-live="polite"
		data-testid="aviso-sin-conexion"
		:data-estado="sin_conexion ? 'sin-conexion' : 'ventas-sin-subir'"
	>
		<span class="aviso-sin-conexion__punto" aria-hidden="true"></span>
		<span class="aviso-sin-conexion__texto">
			<strong>{{ titulo }}</strong>
			<span
				v-if="detalle"
				class="aviso-sin-conexion__detalle"
				data-testid="aviso-sin-conexion-detalle">
				{{ detalle }}
			</span>
		</span>
	</div>
</template>
<script>
/*
	Rutas públicas donde el aviso no tiene sentido: no son del sistema de un usuario con sesión
	(el ingreso a la demo y el informe compartido por WhatsApp).
*/
const RUTAS_SIN_AVISO = ['demoIngreso', 'informeCompartido']

export default {
	computed: {
		/**
		 * ¿El sistema está trabajando sin conexión? `auth.online` lo mantienen los eventos del
		 * navegador y la sesión restaurada desde el equipo (que lo deja en false hasta que el
		 * servidor confirma la sesión).
		 *
		 * @returns {Boolean}
		 */
		sin_conexion() {
			return !this.$store.state.auth.online || Boolean(this.$store.state.auth.sesion_sin_conexion)
		},
		/**
		 * Ventas hechas sin conexión que siguen guardadas en este equipo.
		 *
		 * @returns {Number}
		 */
		ventas_sin_subir() {
			return this.$store.state.auth.ventas_sin_subir
		},
		/**
		 * @returns {Boolean}
		 */
		visible() {
			if (RUTAS_SIN_AVISO.indexOf(this.$route.name) !== -1) {
				return false
			}
			return this.sin_conexion || this.ventas_sin_subir > 0
		},
		/**
		 * @returns {String}
		 */
		titulo() {
			if (this.sin_conexion) {
				return 'Sin conexión'
			}
			return this.texto_ventas + ' sin subir'
		},
		/**
		 * @returns {String}
		 */
		detalle() {
			if (this.sin_conexion) {
				if (this.ventas_sin_subir > 0) {
					return this.texto_ventas + ' guardada' + (this.ventas_sin_subir === 1 ? '' : 's') + ' en este equipo'
				}
				return 'Las ventas se guardan en este equipo'
			}
			if (!this.$store.state.auth.authenticated) {
				return 'Se suben al iniciar sesión'
			}
			return 'Se suben solas en unos segundos'
		},
		/**
		 * "1 venta" / "3 ventas".
		 *
		 * @returns {String}
		 */
		texto_ventas() {
			return this.ventas_sin_subir + (this.ventas_sin_subir === 1 ? ' venta' : ' ventas')
		},
	},
}
</script>
<style scoped lang="sass">
// Debajo de los modales de bootstrap (1040/1050) y del overlay de carga: es un aviso, no un bloqueo.
$aviso_sin_conexion_z: 1030

.aviso-sin-conexion
	position: fixed
	left: 12px
	bottom: 12px
	z-index: $aviso_sin_conexion_z
	display: flex
	align-items: center
	gap: 8px
	max-width: calc(100vw - 24px)
	padding: 6px 12px
	border-radius: 999px
	font-size: 13px
	line-height: 1.25
	box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18)
	pointer-events: none
	box-sizing: border-box

// Sin conexión: ámbar, se lee igual en claro y en oscuro.
.aviso-sin-conexion--sin-red
	background: #fff4d6
	color: #6b4500
	border: 1px solid #f0c25a

// Con conexión y ventas por subir: azul, informativo.
.aviso-sin-conexion--pendientes
	background: #e7f0ff
	color: #1d3f7a
	border: 1px solid #9dbcf2

.aviso-sin-conexion__punto
	flex: 0 0 auto
	width: 8px
	height: 8px
	border-radius: 50%
	background: currentColor

.aviso-sin-conexion__texto
	display: flex
	flex-wrap: wrap
	column-gap: 6px
	min-width: 0

.aviso-sin-conexion__detalle
	opacity: 0.85
</style>
