<template>
	<!-- Pantalla de bloqueo de una app instalada (PWA) que quedó en una dirección vieja -->
	<div
		v-if="bloqueo"
		class="app-instalada-vieja"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="app-instalada-vieja-titulo"
		aria-describedby="app-instalada-vieja-texto"
		data-testid="app-instalada-vieja"
	>
		<div class="app-instalada-vieja__panel">
			<!-- Ícono: un candado abierto hacia afuera de la ventana -->
			<span class="app-instalada-vieja__icono" aria-hidden="true">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
				</svg>
			</span>

			<h2 id="app-instalada-vieja-titulo" class="app-instalada-vieja__titulo">
				Ingresá desde el navegador
			</h2>

			<p id="app-instalada-vieja-texto" class="app-instalada-vieja__texto">
				Esta aplicación instalada quedó en una dirección anterior de tu sistema y no se puede
				seguir usando. Tu sistema ahora está en:
			</p>

			<!-- La dirección se selecciona entera con un toque (user-select: all) -->
			<p class="app-instalada-vieja__direccion" data-testid="app-instalada-vieja-direccion">
				{{ direccion }}
			</p>

			<ol class="app-instalada-vieja__pasos">
				<li>Abrí tu navegador (Chrome, Edge o Safari).</li>
				<li>Escribí o pegá esa dirección e iniciá sesión.</li>
				<li>Si querés, instalá la aplicación de nuevo desde ahí.</li>
			</ol>

			<div class="app-instalada-vieja__acciones">
				<button
					ref="boton_copiar"
					type="button"
					class="app-instalada-vieja__boton app-instalada-vieja__boton--primario"
					data-testid="app-instalada-vieja-copiar"
					@click="copiar_direccion"
				>
					{{ copiado ? 'Dirección copiada' : 'Copiar dirección' }}
				</button>
				<!--
					target=_blank: en una app instalada, un link fuera de su scope que abre en una
					pestaña nueva sale al navegador (en Android y iOS a veces lo abre en una vista
					interna, por eso el botón de copiar es el camino principal).
				-->
				<a
					class="app-instalada-vieja__boton app-instalada-vieja__boton--secundario"
					:href="direccion"
					target="_blank"
					rel="noopener noreferrer"
					data-testid="app-instalada-vieja-abrir"
				>
					Abrir en el navegador
				</a>
			</div>
		</div>
	</div>
</template>

<script>
/**
 * Pantalla de bloqueo para la app instalada (PWA) que quedó apuntando a una dirección vieja
 * (misión redireccion-version-antes-del-login, 24/9/2026).
 *
 * Una PWA es POR ORIGEN y no se puede mudar: la que el cliente instaló desde el subdominio viejo
 * no puede pasar al nuevo, y redirigirla ahí adentro da error (son dos aplicaciones distintas para
 * el sistema operativo). Por eso, en vez de redirigir, esta pantalla tapa TODO, no tiene botón de
 * cerrar y manda al usuario al navegador. Desde ahí puede instalar la aplicación de nuevo.
 *
 * Lo prende `check_version.js` (mixin de App.vue) con `auth/setVersionBloqueada`, en tres
 * momentos: antes del login, después del login y al llegar por una redirección hecha por código
 * anterior a esta misión. Ver el comentario de `version_bloqueada` en `store/auth.js`.
 *
 * Siempre montado en App.vue (`v-if` adentro, no afuera): mismo patrón que
 * `MismaSesionOtraPestanaModal.vue`, porque el bloqueo puede llegar apenas arranca la SPA.
 */
export default {
	name: 'AppInstaladaVieja',
	data() {
		return {
			/** `true` unos segundos después de copiar, para confirmarlo en el botón. */
			copiado: false,
		}
	},
	computed: {
		/**
		 * Estado del bloqueo (`{direccion, motivo}`) o `null` si no hay ninguno.
		 *
		 * @returns {object|null}
		 */
		bloqueo() {
			return this.$store.state.auth.version_bloqueada
		},
		/**
		 * Dirección a la que hay que entrar desde el navegador.
		 *
		 * @returns {string}
		 */
		direccion() {
			return this.bloqueo && this.bloqueo.direccion ? this.bloqueo.direccion : ''
		},
	},
	watch: {
		/**
		 * Al aparecer el bloqueo el foco va al botón de copiar: quien navega con teclado no
		 * puede quedar parado en un control que quedó tapado.
		 */
		bloqueo(nuevo) {
			if (nuevo) {
				this.$nextTick(() => {
					if (this.$refs.boton_copiar) {
						this.$refs.boton_copiar.focus()
					}
				})
			}
		},
	},
	methods: {
		/**
		 * Copia la dirección al portapapeles. Usa la API moderna si existe (exige https o
		 * localhost) y, si no, el método viejo con un textarea temporal.
		 *
		 * Si ninguno anda no se muestra ningún error: la dirección está a la vista y se
		 * selecciona entera con un toque, así que se puede copiar a mano.
		 *
		 * @returns {void}
		 */
		copiar_direccion() {
			var self = this
			var texto = this.direccion

			if (!texto) {
				return
			}

			function marcar_copiado() {
				self.copiado = true
				window.setTimeout(function () {
					self.copiado = false
				}, 3000)
			}

			if (
				window.navigator
				&& window.navigator.clipboard
				&& typeof window.navigator.clipboard.writeText === 'function'
			) {
				window.navigator.clipboard.writeText(texto)
					.then(marcar_copiado)
					.catch(function () {
						self.copiar_con_seleccion(texto, marcar_copiado)
					})
				return
			}

			this.copiar_con_seleccion(texto, marcar_copiado)
		},
		/**
		 * Respaldo para navegadores sin `navigator.clipboard`: textarea fuera de pantalla,
		 * selección y `execCommand('copy')`.
		 *
		 * @param {string} texto Texto a copiar.
		 * @param {Function} al_terminar Se llama solo si la copia salió bien.
		 * @returns {void}
		 */
		copiar_con_seleccion(texto, al_terminar) {
			try {
				var area = document.createElement('textarea')
				area.value = texto
				area.setAttribute('readonly', '')
				area.style.position = 'fixed'
				area.style.opacity = '0'
				document.body.appendChild(area)
				area.select()
				var salio_bien = document.execCommand('copy')
				document.body.removeChild(area)

				if (salio_bien) {
					al_terminar()
				}
			} catch (e) {
				/* Sin portapapeles no hay nada más que hacer: la dirección sigue a la vista. */
			}
		},
	},
}
</script>

<style scoped lang="sass">
// Sobre el overlay de carga (z-index 10000) y sobre todo lo demás: es una pantalla de bloqueo
$app_instalada_vieja_z: 20000

// Capa fija a pantalla completa. Fondo opaco (no translúcido como el de carga): acá no hay nada
// que dejar ver detrás, el sistema no se puede usar.
.app-instalada-vieja
	position: fixed
	top: 0
	right: 0
	bottom: 0
	left: 0
	z-index: $app_instalada_vieja_z
	display: flex
	align-items: center
	justify-content: center
	padding: 1.25rem
	overflow-y: auto
	background: var(--color-bg, #f5f7fb)

// Tarjeta central
.app-instalada-vieja__panel
	width: 100%
	max-width: 460px
	padding: 2rem 1.75rem 1.75rem
	border-radius: 16px
	background: var(--bg-card, #fff)
	border: 1px solid var(--color-border, #dee2e6)
	box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)
	text-align: center
	box-sizing: border-box

.app-instalada-vieja__icono
	display: inline-flex
	align-items: center
	justify-content: center
	width: 52px
	height: 52px
	margin-bottom: 1rem
	border-radius: 50%
	background: rgba(0, 123, 255, 0.1)
	color: var(--color-primary, #007bff)
	svg
		width: 26px
		height: 26px

.app-instalada-vieja__titulo
	margin: 0 0 0.75rem
	font-size: 1.35rem
	font-weight: 700
	line-height: 1.25
	color: var(--color-text-primary, #212529)

.app-instalada-vieja__texto
	margin: 0 0 0.75rem
	font-size: 0.95rem
	line-height: 1.5
	color: var(--color-text-secondary, #475569)

// La dirección: en negrita, en un recuadro, seleccionable de un toque y sin cortarse mal
.app-instalada-vieja__direccion
	margin: 0 0 1rem
	padding: 0.65rem 0.75rem
	border-radius: 10px
	background: rgba(0, 123, 255, 0.08)
	color: var(--color-primary, #007bff)
	font-size: 1rem
	font-weight: 700
	word-break: break-all
	user-select: all
	-webkit-user-select: all

.app-instalada-vieja__pasos
	margin: 0 0 1.25rem
	padding-left: 1.25rem
	text-align: left
	font-size: 0.9rem
	line-height: 1.55
	color: var(--color-text-secondary, #475569)

.app-instalada-vieja__acciones
	display: flex
	flex-direction: column
	gap: 0.6rem

.app-instalada-vieja__boton
	display: block
	width: 100%
	padding: 0.7rem 1rem
	border-radius: 10px
	border: 1px solid var(--color-primary, #007bff)
	font-size: 0.95rem
	font-weight: 600
	line-height: 1.2
	text-align: center
	text-decoration: none
	cursor: pointer
	box-sizing: border-box

.app-instalada-vieja__boton--primario
	background: var(--color-primary, #007bff)
	color: #fff

.app-instalada-vieja__boton--secundario
	background: transparent
	color: var(--color-primary, #007bff)
	&:hover
		text-decoration: none
		background: rgba(0, 123, 255, 0.06)

// En tablet ancha y escritorio los dos botones van lado a lado
@media screen and (min-width: 520px)
	.app-instalada-vieja__acciones
		flex-direction: row

// Teléfono chico o apaisado (pantalla baja): sin ícono y con menos aire, para que la dirección y
// los dos botones entren sin tener que scrollear. Medido a 360x640.
@media screen and (max-height: 700px)
	.app-instalada-vieja
		padding: 0.75rem
	.app-instalada-vieja__panel
		padding: 1.25rem 1.25rem 1.25rem
	.app-instalada-vieja__icono
		display: none
	.app-instalada-vieja__titulo
		font-size: 1.2rem
		margin-bottom: 0.5rem
	.app-instalada-vieja__pasos
		margin-bottom: 1rem
</style>
