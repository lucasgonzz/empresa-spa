<template>
	<b-modal
	id="ticket-2-impresora-config-modal"
	title="Configurar impresion del Ticket 2.0"
	size="md"
	hide-footer
	@shown="on_modal_shown">

		<!--
		QZ Tray no responde. No hay lista que mostrar, asi que la pantalla entera pasa a
		explicar como resolverlo: es el caso que mas soporte genera.
		-->
		<div
		v-if="!qz_disponible && !cargando"
		class="impresora-config-modal__aviso">
			<p class="impresora-config-modal__aviso-titulo">
				No se detecta QZ Tray
			</p>
			<p>
				El Ticket 2.0 le habla a la impresora a traves de QZ Tray, un programa que tiene
				que estar <strong>instalado y abierto</strong> en esta computadora.
			</p>
			<p>
				Buscá su icono en la barra de tareas de Windows, al lado del reloj. Si esta,
				abrilo y tocá Reintentar. Si no esta, hay que instalarlo.
			</p>
			<b-button
			variant="primary"
			size="sm"
			@click="$emit('refrescar')">
				Reintentar
			</b-button>
		</div>

		<template v-else>
			<div class="impresora-config-modal__field">
				<label class="impresora-config-modal__label">Impresora</label>
				<b-form-select
				size="sm"
				v-model="impresora_elegida"
				:options="opciones_impresoras"
				:disabled="cargando || guardando">
				</b-form-select>
				<p class="impresora-config-modal__hint">
					<template v-if="cargando">
						Buscando impresoras...
					</template>
					<template v-else>
						{{ texto_impresoras_detectadas }}
						<a href="#" @click.prevent="$emit('refrescar')">Actualizar lista</a>
					</template>
				</p>
			</div>

			<div class="impresora-config-modal__field">
				<label class="impresora-config-modal__label">Ancho del papel (mm)</label>
				<b-form-input
				size="sm"
				type="number"
				min="1"
				v-model="ancho_mm"
				:disabled="guardando"></b-form-input>
				<p class="impresora-config-modal__hint">
					Las comanderas mas comunes son de 80mm o de 58mm. El sistema lo usa para
					calcular cuantos caracteres entran por linea.
				</p>
			</div>

			<div class="impresora-config-modal__actions">
				<b-button
				variant="outline-secondary"
				size="sm"
				:disabled="!impresora_elegida || probando || guardando"
				@click="$emit('probar', datos_del_formulario())">
					{{ probando ? 'Imprimiendo...' : 'Imprimir prueba' }}
				</b-button>
				<b-button
				variant="primary"
				size="sm"
				:disabled="!impresora_elegida || guardando"
				@click="$emit('guardar', datos_del_formulario())">
					{{ guardando ? 'Guardando...' : 'Guardar' }}
				</b-button>
			</div>
		</template>
	</b-modal>
</template>

<script>
export default {
	name: 'ImpresoraConfigModal',
	props: {
		/**
		 * Nombres de las impresoras que QZ Tray ve en este equipo.
		 */
		impresoras: {
			type: Array,
			default() {
				return []
			},
		},

		/**
		 * Si QZ Tray respondio. En false se muestra el instructivo en vez del formulario.
		 */
		qz_disponible: {
			type: Boolean,
			default: false,
		},

		/**
		 * Hay una consulta de impresoras en curso.
		 */
		cargando: {
			type: Boolean,
			default: false,
		},

		/**
		 * Impresora configurada hoy, para preseleccionarla al abrir.
		 */
		impresora_actual: {
			type: String,
			default: null,
		},

		/**
		 * Ancho configurado hoy en milimetros.
		 */
		ancho_actual: {
			type: Number,
			default: 80,
		},

		/**
		 * Hay un guardado en curso en el padre.
		 */
		guardando: {
			type: Boolean,
			default: false,
		},

		/**
		 * Hay una impresion de prueba en curso en el padre.
		 */
		probando: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/* Borrador editable mientras el modal esta abierto */
			impresora_elegida: null,
			ancho_mm: 80,
		}
	},
	computed: {
		/**
		 * Opciones del selector de impresoras.
		 *
		 * @returns {Array<{value: string|null, text: string}>}
		 */
		opciones_impresoras() {
			let opciones = this.impresoras.map(function (nombre) {
				return {
					value: nombre,
					text: nombre,
				}
			})

			/**
			 * La impresora configurada puede no estar entre las detectadas: se renombro, se
			 * desconecto, o quedo el valor con el que se crea la cuenta. Se la muestra igual y
			 * avisando, porque hacerla desaparecer del selector sin explicacion es justo lo
			 * que deja al operador sin saber que mirar.
			 */
			if (this.impresora_actual && this.impresoras.indexOf(this.impresora_actual) == -1) {
				opciones.unshift({
					value: this.impresora_actual,
					text: this.impresora_actual + ' (no se detecta en este equipo)',
				})
			}

			if (!opciones.length) {
				return [
					{
						value: null,
						text: 'No se detectaron impresoras',
					},
				]
			}

			return opciones
		},

		/**
		 * Leyenda con la cantidad de impresoras detectadas.
		 *
		 * @returns {string}
		 */
		texto_impresoras_detectadas() {
			if (this.impresoras.length == 1) {
				return '1 impresora detectada en este equipo.'
			}

			return this.impresoras.length + ' impresoras detectadas en este equipo.'
		},
	},
	methods: {
		/**
		 * Abre el modal.
		 */
		open_modal() {
			this.$bvModal.show('ticket-2-impresora-config-modal')
		},

		/**
		 * Cierra el modal.
		 */
		close_modal() {
			this.$bvModal.hide('ticket-2-impresora-config-modal')
		},

		/**
		 * Al mostrarse, copia la configuracion vigente al borrador y pide la lista.
		 */
		on_modal_shown() {
			this.impresora_elegida = this.impresora_actual
			this.ancho_mm = this.ancho_actual

			this.$emit('refrescar')
		},

		/**
		 * Valores del formulario para guardar o para la prueba.
		 *
		 * El ancho sale sin validar a proposito: lo valida el padre, que es el que ya
		 * tiene la regla, para no terminar con dos versiones de la misma validacion.
		 *
		 * @returns {{impresora: string, ancho_mm: *}}
		 */
		datos_del_formulario() {
			return {
				impresora: this.impresora_elegida,
				ancho_mm: this.ancho_mm,
			}
		},
	},
}
</script>

<style scoped lang="sass">
.impresora-config-modal__aviso
	font-size: 0.85rem
	color: var(--color-text-secondary, #6c757d)

	p
		margin-bottom: 10px

.impresora-config-modal__aviso-titulo
	font-weight: 600
	font-size: 0.95rem
	color: var(--color-text-primary, #212529)

.impresora-config-modal__field
	margin-bottom: 16px

.impresora-config-modal__label
	display: block
	font-size: 0.8rem
	font-weight: 600
	margin-bottom: 4px
	color: var(--color-text-primary, #212529)

.impresora-config-modal__hint
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	margin: 4px 0 0 0

.impresora-config-modal__actions
	display: flex
	justify-content: flex-end
	gap: 8px
	margin-top: 8px
</style>
