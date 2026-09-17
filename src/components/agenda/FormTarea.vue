<template>
	<b-modal
	id="agenda-form-tarea"
	:title="es_edicion ? 'Editar tarea' : 'Nueva tarea'"
	modal-class="agenda-form-tarea"
	@show="cargar"
	@shown="enfocar">

		<!--
			En una recurrente se edita la REGLA, no la fecha en la que se hizo clic. Se dice arriba
			de todo porque es lo unico de este form que sorprende: "cambiar la fecha" mueve todas
			las ocurrencias futuras.
		-->
		<div
		v-if="es_edicion && tarea.es_recurrente"
		class="agenda-form-tarea__aviso"
		data-testid="agenda-aviso-recurrente">
			<i class="bi bi-arrow-repeat"></i>
			Editás la tarea recurrente; cambia todas las ocurrencias futuras.
		</div>

		<b-form-group label="Detalle">
			<b-form-input
			ref="detalle"
			v-model="tarea.detalle"
			placeholder="¿Qué hay que hacer?"
			data-testid="agenda-detalle"
			@keydown.enter.prevent="guardar"></b-form-input>
		</b-form-group>

		<b-form-group :label="tarea.es_recurrente ? 'Primera vez' : 'Fecha'">
			<b-form-input
			type="date"
			v-model="tarea.fecha_realizacion"
			data-testid="agenda-fecha"></b-form-input>
		</b-form-group>

		<toggle-agenda
		id="agenda-toggle-repite"
		testid="agenda-se-repite"
		v-model="tarea.es_recurrente"
		@input="al_activar_recurrencia">
			Se repite
		</toggle-agenda>

		<div
		v-if="tarea.es_recurrente"
		class="agenda-form-tarea__bloque"
		data-testid="agenda-bloque-recurrencia">
			<div class="agenda-form-tarea__cada">
				<span>cada</span>
				<b-form-input
				type="number"
				min="1"
				step="1"
				class="agenda-form-tarea__cantidad"
				v-model.number="tarea.cantidad_frecuencia"
				data-testid="agenda-cantidad-frecuencia"></b-form-input>
				<b-form-select
				v-model="tarea.unidad_frecuencia_id"
				:options="opciones_unidad"
				class="agenda-form-tarea__unidad"
				data-testid="agenda-unidad-frecuencia"></b-form-select>
			</div>
			<b-form-group
			label="Hasta (opcional)"
			class="m-t-10 m-b-0">
				<b-form-input
				type="date"
				v-model="tarea.fecha_fin_recurrencia"
				data-testid="agenda-fecha-fin"></b-form-input>
			</b-form-group>
		</div>

		<toggle-agenda
		id="agenda-toggle-gasto"
		testid="agenda-tiene-gasto"
		v-model="tarea.tiene_gasto">
			Tiene un gasto asociado
		</toggle-agenda>

		<div
		v-if="tarea.tiene_gasto"
		class="agenda-form-tarea__bloque"
		data-testid="agenda-bloque-gasto">

			<div
			v-if="!hay_conceptos"
			class="agenda-form-tarea__sin-conceptos">
				Todavía no hay sub categorías de gasto. Crealas en
				<router-link :to="{ name: 'abm', params: { view: 'gastos' } }">ABM → Gastos</router-link>
				y volvé a esta tarea.
			</div>

			<template v-else>
				<b-form-group
				v-if="opciones_categoria.length > 1"
				label="Categoría">
					<b-form-select
					v-model="gasto.expense_category_id"
					:options="opciones_categoria"
					data-testid="agenda-categoria-gasto"
					@change="limpiar_expense_concept_de_otra_categoria(null, gasto)"></b-form-select>
				</b-form-group>

				<b-form-group label="Sub categoría">
					<b-form-select
					v-model="gasto.expense_concept_id"
					:options="opciones_concepto"
					data-testid="agenda-concepto-gasto"
					@change="set_expense_category_del_concepto(null, gasto)"></b-form-select>
				</b-form-group>

				<b-form-group
				label="Monto estimado"
				description="Se puede dejar en 0 y definirlo al marcar la tarea como hecha."
				class="m-b-0">
					<b-form-input
					type="number"
					min="0"
					step="0.01"
					v-model.number="tarea.expense_amount"
					data-testid="agenda-monto-gasto"></b-form-input>
				</b-form-group>
			</template>
		</div>

		<b-form-group
		label="Notas"
		class="m-t-15 m-b-0">
			<b-form-textarea
			v-model="tarea.notas"
			rows="2"
			max-rows="5"
			data-testid="agenda-notas"></b-form-textarea>
		</b-form-group>

		<template #modal-footer>
			<div class="agenda-form-tarea__footer">
				<b-button
				v-if="es_edicion"
				class="btn-modulo agenda-btn-peligro"
				:disabled="guardando"
				data-testid="agenda-eliminar-tarea"
				@click="eliminar">
					<i class="bi bi-trash m-r-5"></i>
					Eliminar
				</b-button>
				<div class="agenda-form-tarea__footer-derecha">
					<b-button
					class="btn-modulo"
					variant="outline-secondary"
					:disabled="guardando"
					@click="cerrar">
						Cancelar
					</b-button>
					<b-button
					class="btn-modulo"
					variant="primary"
					:disabled="guardando"
					data-testid="agenda-guardar-tarea"
					@click="guardar">
						<b-spinner
						v-if="guardando"
						small
						class="m-r-5"></b-spinner>
						Guardar
					</b-button>
				</div>
			</div>
		</template>

	</b-modal>
</template>
<script>
/*
	Alta y edicion de una tarea de la agenda. Trabaja sobre una COPIA local de
	store.agenda.tarea_en_edicion (cargada en cada apertura): asi cancelar no deja nada a medias
	y el store no se entera hasta que la API confirmo.

	El body que se manda es el de la seccion 2 del plan (POST pending / PUT pending/{id}); la
	traduccion de los toggles a null la hace guardar_tarea() del store.
*/
import ToggleAgenda from '@/components/agenda/ToggleAgenda'

export default {
	components: {
		ToggleAgenda,
	},
	data() {
		return {
			tarea: this.tarea_por_defecto(),
			/* Estado del selector de concepto; separado de `tarea` para poder pasarlo a los helpers del mixin generals. */
			gasto: {
				expense_category_id: 0,
				expense_concept_id: 0,
			},
			guardando: false,
		}
	},
	computed: {
		es_edicion() {
			return !!this.tarea.id
		},
		unidades() {
			return this.$store.state.unidad_frecuencia.models
		},
		/**
		 * "día / semana / mes / año" en singular o plural segun la cantidad: "cada 1 mes" se lee
		 * mal, "cada 2 mes" tambien.
		 *
		 * @returns {Array}
		 */
		opciones_unidad() {
			let plural = Number(this.tarea.cantidad_frecuencia) > 1
			let nombres = {
				day: ['día', 'días'],
				week: ['semana', 'semanas'],
				month: ['mes', 'meses'],
				year: ['año', 'años'],
			}
			return this.unidades.map(unidad => {
				let par = nombres[unidad.slug]
				let texto = par ? (plural ? par[1] : par[0]) : unidad.name
				return {
					value: unidad.id,
					text: texto,
				}
			})
		},
		hay_conceptos() {
			return this.$store.state.expense_concept.models.length > 0
		},
		opciones_categoria() {
			let opciones = [{ value: 0, text: 'Todas las categorías' }]
			this.$store.state.expense_category.models.forEach(categoria => {
				opciones.push({ value: categoria.id, text: categoria.name })
			})
			return opciones
		},
		/**
		 * Conceptos filtrados por la categoria elegida, con el mismo helper que usa el form de
		 * Gastos (expense_concept_options_de_la_categoria, mixins/generals.js).
		 *
		 * @returns {Array}
		 */
		opciones_concepto() {
			return this.expense_concept_options_de_la_categoria(null, this.gasto)
		},
	},
	methods: {
		tarea_por_defecto() {
			return {
				id: null,
				detalle: '',
				fecha_realizacion: this.$store.state.agenda.hoy,
				es_recurrente: false,
				unidad_frecuencia_id: null,
				cantidad_frecuencia: 1,
				fecha_fin_recurrencia: '',
				tiene_gasto: false,
				expense_concept_id: 0,
				expense_amount: 0,
				notas: '',
			}
		},
		/**
		 * Copia lo que dejo el mixin acciones_agenda en el store. Se clona campo por campo y no por
		 * referencia: el form tiene que poder cancelarse sin haber tocado el store.
		 */
		cargar() {
			let origen = this.$store.state.agenda.tarea_en_edicion
			this.tarea = Object.assign(this.tarea_por_defecto(), origen ? origen : {})
			this.gasto = {
				expense_category_id: 0,
				expense_concept_id: this.tarea.expense_concept_id ? this.tarea.expense_concept_id : 0,
			}
			// La categoria del concepto ya elegido, para que el select de categoria no diga "Todas".
			this.set_expense_category_del_concepto(null, this.gasto)
			this.guardando = false
		},
		enfocar() {
			if (this.$refs.detalle && typeof this.$refs.detalle.focus == 'function') {
				this.$refs.detalle.focus()
			}
		},
		/**
		 * Al prender "Se repite" sin unidad elegida se propone "cada mes": es lo que mas se carga
		 * (alquiler, sueldos, servicios) y evita mandar un null que el back rechaza.
		 *
		 * @param {Boolean} activo
		 */
		al_activar_recurrencia(activo) {
			if (!activo || this.tarea.unidad_frecuencia_id) {
				return
			}
			let mes = this.unidades.find(unidad => unidad.slug == 'month')
			let elegida = mes ? mes : this.unidades[0]
			if (elegida) {
				this.tarea.unidad_frecuencia_id = elegida.id
			}
		},
		/**
		 * Validacion minima del lado del usuario, con el mismo criterio que el 422 del back: que
		 * nada viaje sabiendo que va a volver rechazado.
		 *
		 * @returns {String|null} el mensaje del problema, o null si esta todo bien
		 */
		problema() {
			if (!String(this.tarea.detalle || '').trim()) {
				return 'Escribí qué hay que hacer.'
			}
			if (!this.tarea.fecha_realizacion) {
				return 'Elegí la fecha.'
			}
			if (this.tarea.es_recurrente) {
				if (!this.tarea.unidad_frecuencia_id) {
					return 'Elegí cada cuánto se repite.'
				}
				let n = this.tarea.cantidad_frecuencia
				if (!Number.isInteger(n) || n < 1) {
					return 'La cantidad de la repetición tiene que ser un entero mayor o igual a 1.'
				}
				if (this.tarea.fecha_fin_recurrencia && this.tarea.fecha_fin_recurrencia < this.tarea.fecha_realizacion) {
					return 'La fecha "Hasta" no puede ser anterior a la primera vez.'
				}
			}
			if (this.tarea.tiene_gasto) {
				if (!this.hay_conceptos) {
					return 'Para asociar un gasto hace falta al menos un concepto de gasto.'
				}
				if (!Number(this.gasto.expense_concept_id)) {
					return 'Elegí el concepto del gasto.'
				}
				let monto = Number(this.tarea.expense_amount)
				if (Number.isNaN(monto) || monto < 0) {
					return 'El monto estimado no puede ser negativo.'
				}
			}
			return null
		},
		guardar() {
			let problema = this.problema()
			if (problema) {
				this.$toast.error(problema)
				return
			}

			let self = this
			this.guardando = true
			let a_guardar = Object.assign({}, this.tarea, {
				detalle: String(this.tarea.detalle).trim(),
				expense_concept_id: this.tarea.tiene_gasto ? Number(this.gasto.expense_concept_id) : null,
				expense_amount: this.tarea.tiene_gasto ? (Number(this.tarea.expense_amount) || 0) : null,
			})

			this.$store.dispatch('agenda/guardar_tarea', a_guardar)
			.then(() => {
				self.guardando = false
				self.$toast.success(self.es_edicion ? 'Tarea guardada' : 'Tarea creada')
				self.cerrar()
			})
			.catch(mensaje => {
				self.guardando = false
				self.$toast.error(mensaje)
			})
		},
		/**
		 * Borra la regla entera. En una recurrente se dice explicito: no es "esta ocurrencia", son
		 * todas las que faltan. Lo ya hecho (pending_completeds) no se toca.
		 */
		eliminar() {
			let self = this
			let pregunta = this.tarea.es_recurrente
				? '¿Eliminar "' + this.tarea.detalle + '"? Se van todas las ocurrencias futuras; lo que ya se marcó como hecho queda en Realizadas.'
				: '¿Eliminar "' + this.tarea.detalle + '"?'

			this.$bvModal.msgBoxConfirm(pregunta, {
				title: 'Eliminar tarea',
				okTitle: 'Eliminar',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}
				self.guardando = true
				return self.$store.dispatch('agenda/eliminar_tarea', self.tarea.id)
				.then(() => {
					self.guardando = false
					self.$toast.success('Tarea eliminada')
					self.cerrar()
				})
				.catch(mensaje => {
					self.guardando = false
					self.$toast.error(mensaje)
				})
			})
		},
		cerrar() {
			this.$bvModal.hide('agenda-form-tarea')
		},
	},
}
</script>
<style lang="sass">
.agenda-form-tarea
	&__aviso
		display: flex
		align-items: center
		gap: 8px
		padding: 8px 12px
		margin-bottom: 14px
		border-radius: 10px
		font-size: 0.85rem
		background: var(--bg-nav-hover)
		color: var(--color-text-primary)
		i
			color: var(--color-primary)

	// Lo que se despliega debajo de un toggle: apenas un escalon de fondo para leerse como
	// "parte de" el interruptor que lo abrio.
	&__bloque
		padding: 12px 14px
		margin-bottom: 6px
		border-radius: 10px
		background: var(--bg-section)
		border: 1px solid var(--color-border-secondary)

	&__cada
		display: flex
		align-items: center
		gap: 10px
		flex-wrap: wrap
		color: var(--color-text-secondary)

		// Con dos clases y el elemento a proposito: bootstrap se importa en el <style> de
		// muchos componentes y `.form-control { width: 100% }` aparece decenas de veces en el
		// CSS final, varias DESPUES de esta regla. Un solo `.agenda-form-tarea__cantidad`
		// perdia y el numero ocupaba todo el ancho, con el select abajo (medido el 14/9/2026).
		input.agenda-form-tarea__cantidad
			width: 90px
			flex: none

		select.agenda-form-tarea__unidad
			flex: 1
			width: auto
			min-width: 140px

	&__sin-conceptos
		font-size: 0.9rem
		color: var(--color-text-secondary)
		a
			color: var(--color-primary)

	&__footer
		display: flex
		align-items: center
		justify-content: space-between
		gap: 8px
		width: 100%

	&__footer-derecha
		display: flex
		gap: 8px
		margin-left: auto

// Boton destructivo suave, con los tokens del sistema (--btn-peligro-*).
.agenda-btn-peligro.btn
	background: var(--btn-peligro-fondo)
	border-color: var(--btn-peligro-borde)
	color: var(--btn-peligro-texto)
	&:hover, &:focus, &:active
		background: var(--btn-peligro-fondo)
		border-color: var(--btn-peligro-texto)
		color: var(--btn-peligro-texto)
		box-shadow: none

// Inputs del form con el mismo lenguaje que los modales "nuevos" del sistema (metodos de pago,
// pago de cuenta corriente): radio de 8px y un anillo de foco suave, en vez del default GLOBAL de
// src/sass/_inputs.sass (radio de 5px y un foco de borde de 3px solido + halo a 0.8 de opacidad,
// pensado para un campo suelto y no para un formulario entero). Mismos dos tokens que ya usa
// current-acounts/pago/Index.vue (`pago-cc__campos`): no se duplican como hex nuevos.
// Ver contexto/estilo_interfaz_empresa.md: es el patron a repetir en todo modal nuevo, no algo automatico.
#agenda-form-tarea
	.form-control,
	.custom-select,
	textarea.form-control
		border-radius: var(--metodo-pago-input-radius)
		border-width: 1px

		&:focus
			border-width: 1px
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
</style>
