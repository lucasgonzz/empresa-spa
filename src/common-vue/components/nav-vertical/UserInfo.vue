<template>
	<div
	class="user-info">
		<hr>
		<div 
		class="item">
			<i class="icon-user"></i>
			{{ user.name }}
		</div>

		<div
		@click="logout"
		class="item">
			<i class="icon-logout"></i>
			Cerrar sesion
		</div>

		<div>
			<p
			class="item-title">
				<i class="icon-down"></i>
				Configuración
			</p>

			<div
			class="item item--toggle"
			@click.stop="toggle_dark_mode">
				<i class="bi bi-moon"></i>
				Modo oscuro
				<ios-toggle
				:key="dark_mode_toggle_key"
				:value="dark_mode_activo"
				:disabled="guardando_dark_mode"
				@input="toggle_dark_mode"></ios-toggle>
			</div>

		    <div
		    v-if="is_owner || user.admin_access">
		        <div
		        class="item"
		        @click="general">
		            <i class="icon-configuration"></i>
		            General
		        </div>
		        <div
		        v-if="has_extra_config">
		            <div
		            class="item"
		            v-for="config_model_name in extra_config"
		            @click="setConfig(config_model_name)">
		                <i class="icon-configuration"></i>
		                {{ singular(config_model_name) }}
		            </div>
		        </div>
		        <div
		        class="item"
		        v-b-modal="'update-password'">
		            <i class="icon-redo"></i>
		            Cambiar contraseña
		        </div>
		    </div>
		</div>
	</div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
import { apply_dark_mode_class } from '@/utils/dark_mode'

/**
 * Bloque inferior del menú lateral: usuario, logout y accesos de configuración.
 */
export default {
	mixins: [nav],
	components: {
		IosToggle: () => import('@/common-vue/components/IosToggle'),
	},
	data() {
		return {
			/**
			 * `true` mientras el PUT de la preferencia está en vuelo, para no encolar dos
			 * llamadas con clics rápidos sobre la perilla.
			 */
			guardando_dark_mode: false,
			/**
			 * Fuerza el remonte de `<ios-toggle>` cuando falla el guardado. `:checked` es un
			 * DOM prop, y Vue se salta la actualización si el valor nuevo del binding es igual
			 * al último que renderizó (acá: false -> false, porque el commit que cambiaría
			 * `dark_mode_activo` nunca llegó a pasar) -- aunque el checkbox real quedó marcado
			 * por el click nativo del usuario, antes de que la llamada fallara. Cambiar la key
			 * recrea el input de cero con el `checked` correcto, en vez de confiar en el diff.
			 */
			dark_mode_toggle_key: 0,
		}
	},
	computed: {
		/**
		 * Preferencia de modo oscuro del usuario autenticado (defensivo ante `user` nulo).
		 *
		 * @returns {boolean}
		 */
		dark_mode_activo() {
			return Boolean(this.user && this.user.dark_mode)
		},
	},
	methods: {
		/**
		 * Abre el modal de configuración general del usuario.
		 *
		 * @returns {void}
		 */
		general() {
			this.$bvModal.show('user')
		},
		/**
		 * Prende o apaga el modo oscuro: pinta primero (optimista) y confirma después contra el
		 * backend. Si el guardado falla, revierte la clase al valor anterior y avisa con un
		 * toast — un toggle que queda prendido cuando el guardado falló miente sobre el estado
		 * real del sistema.
		 *
		 * No usa el indicador global de carga (`auth/setLoading`): es un cambio instantáneo y de
		 * bajo riesgo, taparle la pantalla al usuario con el overlay por esto sería peor que no
		 * hacerlo.
		 *
		 * @returns {void}
		 */
		toggle_dark_mode() {
			if (this.guardando_dark_mode) {
				return
			}

			let valor_anterior = this.dark_mode_activo
			let valor_nuevo = !valor_anterior

			apply_dark_mode_class(valor_nuevo)
			this.guardando_dark_mode = true

			this.$store.dispatch('auth/set_dark_mode', valor_nuevo)
			.then(() => {
				this.guardando_dark_mode = false
			})
			.catch(() => {
				this.guardando_dark_mode = false
				apply_dark_mode_class(valor_anterior)
				// El click nativo ya había marcado el checkbox real antes de que la llamada
				// fallara, y `dark_mode_activo` vuelve al mismo valor de antes del click (sin
				// pasar por el commit) -- Vue no repinta un DOM prop que ve "sin cambios" en su
				// propio binding, así que hay que forzar el remonte para que la perilla vuelva
				// visualmente atrás.
				this.dark_mode_toggle_key++
				this.$toast.error('No se pudo guardar la preferencia')
			})
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

$nav_border: rgba(255, 255, 255, 0.06)
$nav_text: rgba(255, 255, 255, 0.72)
$nav_text_muted: rgba(255, 255, 255, 0.5)
$nav_hover_bg: rgba(255, 255, 255, 0.06)
$nav_item_radius: 8px

.user-info
	color: $nav_text
	padding: 8px 8px 16px
	font-family: $font-family-sans-serif
	hr
		background: $nav_border
		opacity: 1
		margin: 8px 12px 10px
	.item
		display: flex
		flex-direction: row
		align-items: center
		justify-content: flex-start
		margin: 2px 0
		padding: 9px 12px 9px 14px
		font-size: 0.8125rem
		font-weight: 500
		line-height: 1.35
		border-radius: $nav_item_radius
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease
		&:hover
			background: $nav_hover_bg
			color: #ffffff
		i
			width: 22px
			padding: 0
			margin-right: 10px
			text-align: center
			font-size: 0.9375rem
			color: $nav_text_muted
		@media screen and (min-width: 768px)
			opacity: 0
		// Empuja la perilla al borde derecho de la fila sin tocar justify-content del .item
		// base (del que dependen el hover y la opacity de arriba): con tres hijos en la fila
		// (ícono, texto, perilla), un justify-content: space-between reparte el espacio libre
		// en DOS huecos iguales -- entre ícono y texto, y entre texto y perilla -- y el texto
		// queda flotando lejos del ícono en vez de pegado a él. margin-left: auto en la perilla
		// logra "alineada a la derecha" sin ese efecto colateral.
		&.item--toggle
			.ios-toggle
				margin-left: auto
	.item-title
		text-align: left
		font-size: 0.6875rem
		font-weight: 600
		letter-spacing: 0.06em
		text-transform: uppercase
		color: $nav_text_muted
		padding: 12px 14px 6px
		margin: 0
		i
			display: none
</style>
