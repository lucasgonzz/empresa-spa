/**
 * Acciones que comparten la lista y el calendario de la agenda: abrir el form (alta o edicion),
 * marcar una ocurrencia como hecha y deshacerla.
 *
 * Viven en un mixin y no en cada componente porque una fila (FilaTarea) se monta en tres
 * lugares --los grupos de la lista, el dia seleccionado del calendario y, en el futuro, donde
 * haga falta-- y las tres tienen que reaccionar exactamente igual al mismo clic. El HTTP lo
 * hace el store; aca esta la orquestacion: que modal abrir y que decirle al usuario.
 */
export default {
	methods: {
		/**
		 * Tarea vacia para el alta. `fecha` permite que "Nueva tarea" desde un dia del calendario
		 * arranque en ese dia.
		 *
		 * @param {String|null} fecha YYYY-MM-DD
		 * @returns {Object}
		 */
		tarea_vacia(fecha) {
			return {
				id: null,
				detalle: '',
				fecha_realizacion: fecha ? fecha : this.$store.state.agenda.hoy,
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
		 * Campos del form a partir de una ocurrencia (forma de la seccion 2 del plan) o de un
		 * Pending crudo (GET pending/{id}). Las dos formas comparten nombres salvo la fecha: la
		 * ocurrencia trae `fecha` y el modelo `fecha_realizacion` (con hora).
		 *
		 * @param {Object} origen
		 * @returns {Object}
		 */
		tarea_desde(origen) {
			let fecha = origen.fecha
				? origen.fecha
				: String(origen.fecha_realizacion || '').substr(0, 10)
			let fecha_fin = origen.fecha_fin_recurrencia
				? String(origen.fecha_fin_recurrencia).substr(0, 10)
				: ''
			return {
				id: origen.pending_id ? origen.pending_id : origen.id,
				detalle: origen.detalle ? origen.detalle : '',
				fecha_realizacion: fecha,
				es_recurrente: !!Number(origen.es_recurrente),
				unidad_frecuencia_id: origen.unidad_frecuencia_id ? Number(origen.unidad_frecuencia_id) : null,
				cantidad_frecuencia: origen.cantidad_frecuencia ? Number(origen.cantidad_frecuencia) : 1,
				fecha_fin_recurrencia: fecha_fin,
				tiene_gasto: !!origen.expense_concept_id,
				expense_concept_id: origen.expense_concept_id ? Number(origen.expense_concept_id) : 0,
				expense_amount: origen.expense_amount ? Number(origen.expense_amount) : 0,
				notas: origen.notas ? origen.notas : '',
			}
		},

		/**
		 * @param {String|null} fecha YYYY-MM-DD para precargar (dia seleccionado del calendario)
		 */
		abrir_nueva_tarea(fecha) {
			this.$store.commit('agenda/setTareaEnEdicion', this.tarea_vacia(fecha))
			this.$bvModal.show('agenda-form-tarea')
		},

		/**
		 * Abre el form en edicion. Para una tarea recurrente se edita la REGLA, y la ocurrencia
		 * no alcanza para eso (no trae la fecha base): se pide el Pending real. Si esa lectura
		 * falla se abre igual con lo que hay, avisando, antes que dejar el clic sin respuesta.
		 *
		 * @param {Object} ocurrencia
		 */
		abrir_edicion(ocurrencia) {
			if (!ocurrencia.es_recurrente) {
				this.$store.commit('agenda/setTareaEnEdicion', this.tarea_desde(ocurrencia))
				this.$bvModal.show('agenda-form-tarea')
				return
			}

			let self = this
			this.$store.dispatch('agenda/cargar_tarea', ocurrencia.pending_id)
			.then(model => {
				self.$store.commit('agenda/setTareaEnEdicion', self.tarea_desde(model))
				self.$bvModal.show('agenda-form-tarea')
			})
			.catch(mensaje => {
				self.$toast.error(mensaje)
				self.$store.commit('agenda/setTareaEnEdicion', self.tarea_desde(ocurrencia))
				self.$bvModal.show('agenda-form-tarea')
			})
		},

		/**
		 * El circulo de la fila. Con gasto asociado se pregunta como se pago (ModalCompletar);
		 * sin gasto se marca directo y la barra de abajo ofrece deshacer unos segundos.
		 *
		 * @param {Object} ocurrencia
		 */
		marcar_hecha(ocurrencia) {
			if (ocurrencia.completado) {
				return
			}

			if (ocurrencia.expense_concept_id) {
				this.$store.commit('agenda/setOcurrenciaACompletar', ocurrencia)
				this.$bvModal.show('agenda-completar')
				return
			}

			let self = this
			this.$store.dispatch('agenda/completar', {
				pending_id: ocurrencia.pending_id,
				fecha_realizacion: ocurrencia.fecha,
			})
			.then(res => {
				self.$store.commit('agenda/setUltimaHecha', {
					pending_completed_id: res && res.model ? res.model.id : null,
					detalle: ocurrencia.detalle,
					expense_id: null,
				})
			})
			.catch(error => {
				if (error && error.status == 409) {
					self.$toast.warning('Esta ocurrencia ya estaba marcada como hecha')
					return
				}
				self.$toast.error(error && error.message ? error.message : 'No se pudo marcar la tarea como hecha.')
			})
		},

		/**
		 * Deshacer desde una fila ya hecha (dia del calendario). Si al completarla se registro un
		 * gasto, se avisa que ese gasto queda cargado: la API no lo borra y se saca desde Gastos.
		 *
		 * @param {Object} ocurrencia con pending_completed_id
		 */
		deshacer_ocurrencia(ocurrencia) {
			if (!ocurrencia.pending_completed_id) {
				return
			}

			let self = this
			let pregunta = ocurrencia.expense_id
				? '¿Deshacer "' + ocurrencia.detalle + '"? El gasto que se registró queda cargado; si hace falta, se borra desde Gastos.'
				: '¿Deshacer "' + ocurrencia.detalle + '"?'

			this.$bvModal.msgBoxConfirm(pregunta, {
				title: 'Volver a pendiente',
				okTitle: 'Deshacer',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}
				return self.$store.dispatch('agenda/deshacer', ocurrencia.pending_completed_id)
				.then(() => {
					self.$toast.success('Volvió a pendiente')
				})
				.catch(mensaje => {
					self.$toast.error(mensaje)
				})
			})
		},
	}
}
