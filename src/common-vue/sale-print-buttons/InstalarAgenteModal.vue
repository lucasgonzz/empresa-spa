<template>
	<b-modal
	id="instalar-agente-impresion-modal"
	title="Cómo instalar la impresión directa"
	size="lg"
	hide-footer
	scrollable
	@hidden="$emit('cerrado')">

		<p class="instalar-agente__intro">
			Seguí estos pasos una sola vez. Después la impresión arranca sola cada vez que prendas
			la computadora y no vas a tener que hacer nada más.
		</p>

		<!-- Paso 1 -->
		<div class="instalar-agente__paso">
			<div class="instalar-agente__numero">1</div>
			<div class="instalar-agente__contenido">
				<p class="instalar-agente__titulo">Buscá el archivo que se descargó</p>
				<p>
					Se llama <strong>ComercioCityPrint.exe</strong> y está en la carpeta
					<strong>Descargas</strong> de esta computadora. En muchos navegadores también
					aparece abajo de todo en la pantalla, o arriba a la derecha con una flechita.
				</p>
			</div>
		</div>

		<!-- Paso 2 -->
		<div class="instalar-agente__paso">
			<div class="instalar-agente__numero">2</div>
			<div class="instalar-agente__contenido">
				<p class="instalar-agente__titulo">Hacé doble clic en el archivo</p>
				<p>
					Es un programa que se instala solo. No te va a pedir la contraseña de Windows
					ni te va a preguntar dónde instalarlo.
				</p>
			</div>
		</div>

		<!-- Paso 3: SmartScreen. Es donde más gente abandona si no se avisa antes. -->
		<div class="instalar-agente__paso instalar-agente__paso--atencion">
			<div class="instalar-agente__numero">3</div>
			<div class="instalar-agente__contenido">
				<p class="instalar-agente__titulo">
					Windows te va a mostrar un cartel azul. Es normal.
				</p>
				<p>
					Va a decir <strong>"Windows protegió su PC"</strong>. No significa que el
					programa tenga un virus: Windows muestra ese cartel con todos los programas
					nuevos que todavía no tienen mucha gente usándolos.
				</p>
				<p class="instalar-agente__que-hacer">
					Tocá <strong>"Más información"</strong> (el texto chiquito del cartel) y
					después el botón <strong>"Ejecutar de todas formas"</strong>.
				</p>
				<p class="instalar-agente__nota">
					Si el cartel no aparece, mejor: seguí con el paso 4.
				</p>
			</div>
		</div>

		<!-- Paso 4 -->
		<div class="instalar-agente__paso">
			<div class="instalar-agente__numero">4</div>
			<div class="instalar-agente__contenido">
				<p class="instalar-agente__titulo">Se abre una ventana negra</p>
				<p>
					Es la ventana del programa. Te va a mostrar la lista de impresoras que tiene
					esta computadora y abajo te va a pedir un código.
				</p>
				<p class="instalar-agente__nota">
					Si en esa lista no aparece tu comandera, cerrá la ventana: primero hay que
					instalar la impresora en Windows.
				</p>
			</div>
		</div>

		<!-- Paso 5: el código, acá mismo para no mandarlo a buscarlo a otra pantalla -->
		<div class="instalar-agente__paso">
			<div class="instalar-agente__numero">5</div>
			<div class="instalar-agente__contenido">
				<p class="instalar-agente__titulo">Copiá este código y pegalo en la ventana negra</p>

				<div class="instalar-agente__codigo-caja">
					<template v-if="generando_codigo">
						<span class="instalar-agente__codigo-cargando">Generando el código...</span>
					</template>
					<template v-else-if="codigo">
						<code class="instalar-agente__codigo">{{ codigo }}</code>
						<b-button
						variant="primary"
						size="sm"
						class="instalar-agente__copiar"
						@click="$emit('copiar')">
							{{ copiado ? '¡Copiado!' : 'Copiar código' }}
						</b-button>
					</template>
					<template v-else>
						<span class="instalar-agente__codigo-cargando">
							No se pudo generar el código.
						</span>
						<b-button
						variant="primary"
						size="sm"
						class="instalar-agente__copiar"
						@click="$emit('regenerar')">
							Reintentar
						</b-button>
					</template>
				</div>

				<p>
					Para pegarlo en la ventana negra, hacé <strong>clic derecho</strong> adentro de
					la ventana, o apretá <strong>Ctrl + V</strong>. Después apretá
					<strong>Enter</strong>.
				</p>
				<p class="instalar-agente__nota">
					El código vence en {{ minutos_de_vida }} minutos. Si se te venció, cerrá esta
					ventana y volvé a abrirla para generar uno nuevo.
				</p>
			</div>
		</div>

		<!-- Paso 6 -->
		<div class="instalar-agente__paso">
			<div class="instalar-agente__numero">6</div>
			<div class="instalar-agente__contenido">
				<p class="instalar-agente__titulo">Listo</p>
				<p>
					La ventana negra te va a decir <strong>"LISTO"</strong> y el nombre de esta
					computadora. Apretá <strong>Enter</strong>: la ventana se esconde sola y el
					programa se queda funcionando.
				</p>
				<p>
					Volvé acá y cerrá esta ayuda: vas a ver la computadora en la lista, con sus
					impresoras, y vas a poder elegir la comandera y hacer una impresión de prueba.
				</p>
			</div>
		</div>

		<div class="instalar-agente__cierre">
			<p class="instalar-agente__titulo">De acá en adelante</p>
			<p>
				El programa arranca solo cada vez que prendas la computadora, sin que tengas que
				abrir nada.
			</p>
			<p class="instalar-agente__nota">
				El archivo que descargaste ya no hace falta, pero no lo vas a poder borrar hasta
				que reinicies la computadora: mientras el programa está funcionando, Windows lo
				tiene tomado. Podés dejarlo donde está.
			</p>
			<p>
				Cuando imprimas una venta, el ticket va a salir directo por la comandera. No vas a
				ver ningún cartel pidiendo permiso.
			</p>
		</div>

		<div class="instalar-agente__acciones">
			<b-button
			variant="secondary"
			size="sm"
			@click="close_modal">
				Cerrar
			</b-button>
		</div>
	</b-modal>
</template>

<script>
export default {
	name: 'InstalarAgenteModal',
	props: {
		/**
		 * Codigo de vinculacion que el operador pega en el agente.
		 */
		codigo: {
			type: String,
			default: null,
		},

		/**
		 * Hay una generacion de codigo en curso.
		 */
		generando_codigo: {
			type: Boolean,
			default: false,
		},

		/**
		 * El codigo se acaba de copiar al portapapeles, para confirmarselo al operador.
		 */
		copiado: {
			type: Boolean,
			default: false,
		},

		/**
		 * Minutos que dura el codigo, tal como los informa el backend.
		 */
		minutos_de_vida: {
			type: Number,
			default: 30,
		},
	},
	methods: {
		/**
		 * Abre el instructivo.
		 */
		open_modal() {
			this.$bvModal.show('instalar-agente-impresion-modal')
		},

		/**
		 * Cierra el instructivo.
		 */
		close_modal() {
			this.$bvModal.hide('instalar-agente-impresion-modal')
		},
	},
}
</script>

<style scoped lang="sass">
.instalar-agente__intro
	font-size: 0.9rem
	color: var(--color-text-secondary, #6c757d)
	margin-bottom: 20px

.instalar-agente__paso
	display: flex
	align-items: flex-start
	gap: 14px
	margin-bottom: 22px

	p
		font-size: 0.88rem
		margin-bottom: 8px
		color: var(--color-text-primary, #212529)

.instalar-agente__paso--atencion
	background: var(--bg-card-secondary, #fff8e6)
	border-radius: 8px
	padding: 14px
	margin-left: -6px
	margin-right: -6px

.instalar-agente__numero
	flex: 0 0 auto
	width: 30px
	height: 30px
	border-radius: 50%
	background: var(--color-primary, #0d6efd)
	color: #fff
	display: flex
	align-items: center
	justify-content: center
	font-weight: 700
	font-size: 0.9rem

.instalar-agente__contenido
	flex: 1 1 auto
	min-width: 0

.instalar-agente__titulo
	font-weight: 600
	font-size: 0.95rem !important
	margin-bottom: 6px !important

.instalar-agente__que-hacer
	padding: 10px 12px
	background: var(--bg-card, #fff)
	border-left: 3px solid var(--color-primary, #0d6efd)
	border-radius: 4px

.instalar-agente__nota
	font-size: 0.8rem !important
	color: var(--color-text-secondary, #6c757d) !important

.instalar-agente__codigo-caja
	display: flex
	align-items: center
	gap: 10px
	flex-wrap: wrap
	padding: 12px
	background: var(--bg-card-secondary, #f1f3f5)
	border-radius: 6px
	margin-bottom: 10px

.instalar-agente__codigo
	flex: 1 1 240px
	min-width: 0
	font-family: monospace
	font-size: 0.75rem
	word-break: break-all
	color: var(--color-text-primary, #212529)

.instalar-agente__codigo-cargando
	flex: 1 1 auto
	font-size: 0.85rem
	color: var(--color-text-secondary, #6c757d)

.instalar-agente__copiar
	flex: 0 0 auto

.instalar-agente__cierre
	border-top: 1px solid var(--color-border-tertiary, #dee2e6)
	padding-top: 16px
	margin-top: 6px

	p
		font-size: 0.88rem
		margin-bottom: 8px

.instalar-agente__acciones
	display: flex
	justify-content: flex-end
	margin-top: 16px
</style>
