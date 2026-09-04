<template>
	<b-modal
	id="ticket-2-impresora-config-modal"
	title="Configurar impresion del Ticket 2.0"
	size="md"
	hide-footer
	@shown="on_modal_shown">

		<!--
		Impresion directa: el camino nuevo. Va arriba de todo porque es lo que queremos que el
		comercio use, y porque cuando esta andando el resto de la pantalla casi no se toca.
		-->
		<div class="impresora-config-modal__directa">
			<p class="impresora-config-modal__directa-titulo">
				Impresión directa
			</p>

			<template v-if="agentes.length">
				<div
				v-for="agente in agentes"
				:key="'agente-'+agente.id"
				class="impresora-config-modal__equipo">
					<span
					class="impresora-config-modal__punto"
					:class="agente.en_linea ? 'impresora-config-modal__punto--activo' : ''"></span>
					<span class="impresora-config-modal__equipo-nombre">
						{{ agente.nombre_equipo }}
					</span>
					<span class="impresora-config-modal__equipo-estado">
						{{ agente.en_linea ? 'conectada' : 'desconectada' }}
					</span>
				</div>
			</template>

			<p
			v-else
			class="impresora-config-modal__hint">
				Instalá el programa de impresión directa y el ticket sale sin ningún cartel de
				permiso, sin tener que abrir nada cada mañana.
			</p>

			<div class="impresora-config-modal__directa-acciones">
				<b-button
				variant="primary"
				size="sm"
				:disabled="descargando"
				@click="$emit('descargar')">
					{{ agentes.length ? 'Agregar otra computadora' : 'Descargar programa' }}
				</b-button>
				<b-button
				variant="outline-secondary"
				size="sm"
				@click="$emit('ver_instructivo')">
					Ver paso a paso
				</b-button>
			</div>
		</div>

		<!--
		Avisos de QZ Tray. Van ARRIBA del formulario y no en lugar de el: el ancho del papel se
		configura igual aunque QZ no responda. Y no se muestran si el comercio ya tiene impresión
		directa andando, porque ahi QZ dejo de importar.
		-->
		<div
		v-if="mostrar_aviso_qz_cerrado"
		class="impresora-config-modal__aviso">
			<p class="impresora-config-modal__aviso-titulo">
				No se detecta QZ Tray
			</p>
			<p>
				Sin el programa de impresión directa, el Ticket 2.0 usa QZ Tray, que tiene que estar
				<strong>instalado y abierto</strong> en esta computadora. Buscá su ícono en la barra
				de tareas de Windows, al lado del reloj.
			</p>
			<b-button
			variant="outline-secondary"
			size="sm"
			@click="$emit('refrescar')">
				Reintentar
			</b-button>
		</div>

		<div
		v-else-if="mostrar_aviso_sin_impresoras"
		class="impresora-config-modal__aviso">
			<p class="impresora-config-modal__aviso-titulo">
				QZ Tray está andando, pero no encuentra impresoras
			</p>
			<p>
				No hay ninguna impresora instalada en esta computadora. Agregala desde Windows y
				después tocá Actualizar lista.
			</p>
			<b-button
			variant="outline-secondary"
			size="sm"
			@click="$emit('refrescar')">
				Actualizar lista
			</b-button>
		</div>

		<div class="impresora-config-modal__field">
			<label class="impresora-config-modal__label">Impresora</label>
			<b-form-select
			size="sm"
			v-model="impresora_elegida"
			:options="opciones_impresoras"
			:disabled="cargando || guardando || !hay_impresoras">
			</b-form-select>
			<p class="impresora-config-modal__hint">
				{{ cargando ? 'Buscando impresoras...' : texto_impresoras_detectadas }}
				<a
				v-if="!cargando"
				href="#"
				@click.prevent="$emit('refrescar')">Actualizar lista</a>
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
		 * Equipos con el agente de impresion instalado, con sus impresoras.
		 */
		agentes: {
			type: Array,
			default() {
				return []
			},
		},

		/**
		 * Si QZ Tray respondio. Va SEPARADO de la lista a proposito: QZ abierto sin
		 * impresoras instaladas y QZ cerrado son dos problemas distintos, y se resuelven
		 * en lugares distintos.
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

		/**
		 * Hay una descarga en preparacion (se esta pidiendo el codigo de vinculacion).
		 */
		descargando: {
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
		 * Impresoras de los equipos con agente, ya en formato de opciones agrupadas.
		 *
		 * @returns {Array}
		 */
		grupos_de_agentes() {
			let grupos = []

			this.agentes.forEach(function (agente) {
				if (!agente.impresoras || !agente.impresoras.length) {
					return
				}

				let etiqueta = agente.nombre_equipo ? agente.nombre_equipo : 'Equipo'

				if (!agente.en_linea) {
					etiqueta += ' — desconectada'
				}

				grupos.push({
					label: etiqueta,
					options: agente.impresoras.map(function (nombre) {
						return {
							/*
							 * El valor lleva el prefijo y el id del equipo: es lo que despues
							 * usa el mixin para saber si el ticket va por el agente o por QZ.
							 */
							value: 'agente:' + agente.id + ':' + nombre,
							text: nombre,
						}
					}),
				})
			})

			return grupos
		},

		/**
		 * Opciones del selector: primero los equipos con agente, después QZ Tray.
		 *
		 * @returns {Array}
		 */
		opciones_impresoras() {
			let opciones = this.grupos_de_agentes.slice()

			if (this.impresoras.length) {
				opciones.push({
					label: this.agentes.length ? 'QZ Tray (esta computadora)' : 'Impresoras de esta computadora',
					options: this.impresoras.map(function (nombre) {
						return {
							value: 'qz:' + nombre,
							text: nombre,
						}
					}),
				})
			}

			/**
			 * La impresora configurada puede no estar entre las detectadas: se renombro, se
			 * desconecto, o quedo el valor con el que se crea la cuenta. Se la muestra igual y
			 * avisando, porque hacerla desaparecer del selector sin explicacion es justo lo
			 * que deja al operador sin saber que mirar.
			 */
			if (this.impresora_actual && !this.impresora_actual_esta_en_la_lista) {
				opciones.unshift({
					value: this.impresora_actual,
					text: this.nombre_de_la_impresora_actual + ' (no se detecta)',
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
		 * Si el valor configurado aparece entre las opciones que se van a mostrar.
		 *
		 * @returns {boolean}
		 */
		impresora_actual_esta_en_la_lista() {
			let actual = this.impresora_actual
			let encontrada = false

			this.grupos_de_agentes.forEach(function (grupo) {
				grupo.options.forEach(function (opcion) {
					if (opcion.value == actual) {
						encontrada = true
					}
				})
			})

			if (encontrada) {
				return true
			}

			return this.impresoras.indexOf(actual) != -1 || this.impresoras.indexOf(this.nombre_de_la_impresora_actual) != -1
		},

		/**
		 * Nombre pelado de la impresora configurada, sin el prefijo del destino.
		 *
		 * @returns {string}
		 */
		nombre_de_la_impresora_actual() {
			if (!this.impresora_actual) {
				return ''
			}

			if (this.impresora_actual.indexOf('agente:') === 0) {
				return this.impresora_actual.split(':').slice(2).join(':')
			}

			if (this.impresora_actual.indexOf('qz:') === 0) {
				return this.impresora_actual.substring(3)
			}

			return this.impresora_actual
		},

		/**
		 * Si hay alguna impresora para elegir, venga de donde venga.
		 *
		 * @returns {boolean}
		 */
		hay_impresoras() {
			return this.impresoras.length > 0 || this.grupos_de_agentes.length > 0
		},

		/**
		 * El aviso de QZ cerrado solo tiene sentido si el comercio todavía depende de QZ.
		 *
		 * @returns {boolean}
		 */
		mostrar_aviso_qz_cerrado() {
			return !this.qz_disponible && !this.cargando && !this.grupos_de_agentes.length
		},

		/**
		 * @returns {boolean}
		 */
		mostrar_aviso_sin_impresoras() {
			return this.qz_disponible && !this.cargando && !this.impresoras.length && !this.grupos_de_agentes.length
		},

		/**
		 * Leyenda con la cantidad de impresoras detectadas.
		 *
		 * @returns {string}
		 */
		texto_impresoras_detectadas() {
			let total = this.impresoras.length

			this.grupos_de_agentes.forEach(function (grupo) {
				total += grupo.options.length
			})

			if (!total) {
				return 'No se detectaron impresoras.'
			}

			if (total == 1) {
				return '1 impresora detectada.'
			}

			return total + ' impresoras detectadas.'
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
.impresora-config-modal__directa
	padding: 12px 14px
	margin-bottom: 18px
	background: var(--bg-card-secondary, #f1f3f5)
	border-radius: 8px

.impresora-config-modal__directa-titulo
	font-weight: 600
	font-size: 0.9rem
	margin-bottom: 8px
	color: var(--color-text-primary, #212529)

.impresora-config-modal__directa-acciones
	display: flex
	gap: 8px
	flex-wrap: wrap
	margin-top: 10px

.impresora-config-modal__equipo
	display: flex
	align-items: center
	gap: 8px
	font-size: 0.85rem
	margin-bottom: 4px

.impresora-config-modal__equipo-nombre
	font-weight: 600
	color: var(--color-text-primary, #212529)

.impresora-config-modal__equipo-estado
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)

.impresora-config-modal__punto
	flex: 0 0 auto
	width: 8px
	height: 8px
	border-radius: 50%
	background: var(--color-border-tertiary, #adb5bd)

.impresora-config-modal__punto--activo
	background: #2ea44f

.impresora-config-modal__aviso
	font-size: 0.85rem
	color: var(--color-text-secondary, #6c757d)
	padding-bottom: 14px
	margin-bottom: 14px
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)

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
