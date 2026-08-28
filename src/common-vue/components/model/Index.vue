<template>
	<div
	v-if="model">

	    <confirm
	    @confirmed="model_deleted"
	    :not_show_delete_text="not_show_delete_text"
	    :text="delete_text"
	    :model_name="model_name"
	    :show_compensar_caja_checkbox="confirm_compensar_caja"
	    :actions="[model_name+'/delete']"
	    :id="'delete-'+model_name"></confirm>

		<b-modal
		@hidden="onModalClosed"
		:size="size"
		scrollable
		:id="model_name"
		:data-tour="model_name === 'article' ? 'listado.modal_articulo' : null">

			<template #modal-title>
				<slot name="model_modal_title">
					{{ title }}
				</slot>
			</template>
			
			<slot 
			name="model_modal_header"
			:model="model"></slot>
			
			<btn-pdf
			class="m-b-15"
			v-if="show_btn_pdf"
			:model_name="model_name"
			:model="model"></btn-pdf>

			<model-form
			@save="save"
			@has_many_deleted="has_many_deleted"
			@has_many_saved="has_many_saved"
			:show_btn_remove_belongs_to_many="show_btn_remove_belongs_to_many"
			:has_many_parent_model="has_many_parent_model"
			:has_many_parent_model_name="has_many_parent_model_name"
			:has_many_prop="has_many_prop"
			:model="model"
			:model_name="model_name"
			:properties="properties"
			:actions_after_save="actions_after_save"
			:show_btn_delete="show_btn_delete"
			:check_permissions="check_permissions"
			:check_can_delete="check_can_delete">
				<template v-slot:belongs="slotProps">
					<slot name="belongs" :model="slotProps.model"></slot>
				</template> 
				<template v-slot:default="slotProps">
					<slot :model="slotProps.model"></slot>
				</template>

				<template
				v-for="prop in properties"
				v-slot:[prop.key]>
					<!--
						Fix (grupo 202, prompt 03): `props` no expone `model` porque
						ModelForm.vue declara el slot como `<slot :name="prop.key">`, sin
						bindear nada. `model` ya es un prop propio de este componente (el
						mismo que se le pasa a <model-form :model="model">), asi que se
						reenvia ese en vez del scope inexistente. No rompe a nadie: antes
						este binding siempre llegaba `undefined`.
					-->
					<slot :name="prop.key" :model="model"></slot>

				</template>

				<template
			        v-for="item in has_many_slot_items(properties)"
			        v-slot:[item.slot_name]="props"
			    >
					<slot 
						:name="item.slot_name"
					></slot>
				</template>



			</model-form>

			<div
			v-if="false">
			<!-- <div
			v-if="show_limpiar_formulario"> -->
				<b-form-checkbox
				:value="1"
				:uncheked-value="0"
				v-model="clear_model">
					Limpiar formulario
				</b-form-checkbox>
				<div
				class="p-l-20"
				v-if="!clear_model">
					<h5
					class="m-t-15">
						Se mantendran las siguientes propiedades:
					</h5>
					<p
					class="m-b-0"
					v-for="prop in props_to_keep_after_create">
						{{ prop.text }}
					</p>
				</div>
			</div>

			<template v-slot:modal-footer>
				<slot 
				v-if="!from_has_many"
				name="buttons">
					<div
					class="w-100">
						<!--
							Avisos de validación al guardar (check): persisten hasta un guardado exitoso.
						-->
						<b-alert
						v-if="save_check_alert_message"
						show
						:variant="save_check_alert_variant"
						class="model-modal-footer__alerta">
							{{ save_check_alert_message }}
						</b-alert>

						<!--
							Footer en flex y no en b-btn-group: el group pegaba los botones borde con
							borde y les comia los radios internos, asi que la fila se leia como una
							barra de bloques soldados. Y sobre todo dejaba pegadas dos acciones de
							sentido opuesto -una destructiva y una confirmatoria-, que es justo la
							geometria que hace facil errarle al clic. Ahora Eliminar queda a la
							izquierda y Guardar y cerrar se va a la derecha con margin-left: auto.
						-->
						<div class="model-modal-footer">
						<btn-delete
						v-if="!papelera && _show_btn_delete"
						class="model-modal-footer__eliminar"
						:solo_emitir_delete="solo_emitir_delete"
						@press_delete_btn="press_delete_btn"
						:has_many_prop="has_many_prop"
						:has_many_parent_model_name="has_many_parent_model_name"
						:model_name="model_name"
						:model="model"
						:dusk="'btn_eliminar_'+model_name"
						:modal="'delete-'+model_name"></btn-delete>

						<btn-loader
						:block="false"
						class="model-modal-footer__guardar"
						v-if="!papelera && can_save"
						@clicked="save"
						:dusk="'btn_guardar_'+model_name"
						:data-testid="'btn-guardar-'+model_name"
						:data-tour="model_name === 'article' ? 'listado.boton_guardar_articulo' : null"
						:prop_to_send_on_emit="{close: true}"
						:loader="loading"
						text="Guardar y cerrar"></btn-loader>

						<!-- Restaurar usa el mismo chasis del footer pero conserva su verde: no lleva
						     la clase __guardar, que es la que fuerza el azul de la accion primaria. -->
						<btn-loader
						:block="false"
						class="model-modal-footer__restaurar"
						v-if="papelera && show_btn_restaurar"
						variant="success"
						@clicked="restaurar"
						:prop_to_send_on_emit="{close: true}"
						:loader="restaurando"
						text="Restaurar"></btn-loader>
						</div>
					</div>
				</slot>
			</template>
		</b-modal>

	</div>
</template>
<script>
import Confirm from '@/common-vue/components/Confirm'
import BtnLoader from '@/common-vue/components/BtnLoader'
import BtnDelete from '@/common-vue/components/BtnDelete'
import BtnPdf from '@/common-vue/components/BtnPdf'

import ModelForm from '@/common-vue/components/model/ModelForm'
import { collect_laravel_validation_messages } from '@/utils/laravel_validation_toast'

export default {
	name: 'ModelIndex',
	props: {
		model_name: {
			type: String,
		},
		model_prop: {
			type: Object,
			default: null,
		},
		from_has_many: {
			type: Boolean,
			default: false,
		},
		has_many_parent_model: {
			type: Object,
			default: null,
		},
		has_many_parent_model_name: {
			type: String,
			default: null,
		},
		has_many_prop: {
			type: Object,
			default: null
		},
		show_btn_pdf: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'lg',
		},
		actions_after_save: {
			type: Array,
			default: () => []
		},
		show_btn_delete: {
			type: Boolean,
			default: true,
		},
		show_btn_save: {
			type: Boolean,
			default: true,
		},
		/**
			Cuando esta en true, el guardado le pide al interceptor global de main.js que NO
			despache `errorEvent` por los errores de este formulario.

			Lo necesita un formulario cuyo backend puede devolver un 422 "de negocio" sin la clave
			`errors` de Laravel: el interceptor lo toma por error generico y saca un toast, y si
			ese caso ya se resuelve con un modal propio el usuario termina viendo el mismo texto
			dos veces. El alert del propio modal (`setSaveErrorFromApi`) sigue funcionando igual,
			asi que no se pierde ningun aviso.
		*/
		skip_global_error_event: {
			type: Boolean,
			default: false,
		},
		check_can_delete: Boolean,
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
		prop_to_send_on_save: {
			type: Object,
			default: null,
		},
		props_to_send_on_save: {
			type: Array,
			default: () => []
		},
		props_to_send_on_save_function: {
			type: String,
			default: null,
		},
		emit_on_saved_instead_continue: {
			type: Boolean,
			default: false,
		},
		not_show_delete_text: {
			type: Boolean,
			default: false,
		},
		delete_text: {
			type: String,
			default: null,
		},
		save_check_function: {
			type: String,
			default: null,
		},
		properties_to_show: {
			type: Array,
			default: () => null
		},
		papelera: {
			type: Boolean,
			default: false,
		},
		show_btn_restaurar: {
			type: Boolean,
			default: true,
		},
		solo_emitir_delete: {
			type: Boolean,
			default: null,
		},
		/**
		 * Si es true, el modal de confirmación de borrado muestra la opción de compensar movimientos en caja (venta/gasto).
		 */
		confirm_compensar_caja: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		Confirm,
		BtnPdf,

		ModelForm,
		BtnLoader,
		BtnDelete,
	},
	data() {
		return {
			clear_model: 1,
			restaurando: false,
			/* Mensaje de error/advertencia del chequeo previo a guardar (visible sobre los botones). */
			save_check_alert_message: '',
			/* Variante Bootstrap del alert (danger, warning, etc.). */
			save_check_alert_variant: 'danger',
			/**
				Props extra para el PROXIMO envio y nada mas. Las setea `guardar_de_nuevo_con()`
				y se limpian apenas vuelve la respuesta, sea buena o mala.

				🔴 Van en un data del componente y NO pegadas al modelo del store a proposito: el
				modelo del store lo comparten el listado, el buscador y cualquier otra vista, y una
				bandera de un reintento puntual que quede ahi viaja en todos los guardados
				siguientes sin que nadie se entere.
			*/
			extra_props_del_proximo_guardado: {},
		}
	},
	computed: {


		show_limpiar_formulario() {
			return this.props_to_keep_after_create.length
		},
		loading: {
			set(value) {
				this.$store.commit('auth/setLoading', value)
			},
			get() {
				return this.$store.state.auth.loading
			}
		},
		_show_btn_delete() {
			// console.log('_show_btn_delete:')
			// console.log('check_can_delete: '+this.check_can_delete)
			// console.log('check_permissions: '+this.check_permissions)
			// console.log('show_btn_delete: '+this.show_btn_delete)
			if (this.show_btn_delete && (this.check_can_delete || this.check_permissions)) {
				// console.log('Chequeando permisos para eliminar '+this.model_name)
				return this.can(this.model_name+'.delete')
			}
			// console.log('NO SE ESTAN CHEQUEANDO permisos para eliminar '+this.model_name)
			return this.show_btn_delete
		},
		can_save() {
			// console.log('check_permissions: '+this.check_permissions)
			// console.log('show_btn_save: '+this.show_btn_save)
			if (!this.show_btn_save) {
				return false 
			}
			if (this.check_permissions) {
				if (!this.model.id) {
					return this.can(this.model_name+'.store')
				} else if (this.model.id) {
					return this.can(this.model_name+'.update')
				}
			}
			return true 
		},
		model() {
			if (this.model_prop) {
				return this.model_prop 
			}
			if (this.hasFullReactivity(this.model_name)) {
				return this.modelStoreFromName(this.model_name)
			} else {
				let model = this.modelStoreFromName(this.model_name)
				return {
					...model
				}
			}
		},
		properties() {
			if (this.properties_to_show) {
				return this.properties_to_show
			}
			return this.modelPropertiesFromName(this.model_name)
		},
		title() {
			if (this.model.id) {
				let text = 'Actualizar '+this.singular(this.model_name).toLowerCase()
				let prop_title = this.prop_to_show_in_modal_title(this.model_name)
				if (prop_title) {
					text += ' '+ this.model[prop_title]
				} else if (this.model.num) {
					text += ' N° '+this.model.num
				} else if (this.model.id) {
					text += ' N° '+this.model.id
				}
				return text
			}
			return this.create_spanish(this.model_name)
		},
		props_to_keep_after_create() {
			return this.properties.filter(prop => {
				return prop.keep_after_create 
			})
		}
	},
	mounted() {
		/*
			Contraparte de `<model_name>:save-error`: la pantalla que se quedo con un error puede
			pedir que se vuelva a guardar con props extra. Ver `guardar_de_nuevo_con`.
		*/
		this.$root.$on(this.model_name + ':save-retry', this.guardar_de_nuevo_con)
	},
	beforeDestroy() {
		/*
			🔴 El $off es obligatorio, no higiene. `$root` vive toda la sesion: sin esto, cada vez
			que se monta un formulario queda otro listener pegado y un solo evento dispara N
			guardados.
		*/
		this.$root.$off(this.model_name + ':save-retry', this.guardar_de_nuevo_con)
	},
	methods: {
		/**
		 * Vuelve a guardar el modelo agregandole props que no salen del formulario.
		 *
		 * Es el segundo tiempo del hook de `<model_name>:save-error`: una pantalla se queda con un
		 * 422, le muestra al usuario una decision, y si el usuario elige seguir, pide el reintento
		 * con la bandera que corresponda (ej: `{ ignorar_limite_credito: true }`).
		 *
		 * Las props valen SOLO para ese envio: se limpian apenas vuelve la respuesta.
		 *
		 * @param {Object} extra_props Claves a mezclar en el payload de este unico guardado.
		 * @returns {void}
		 */
		guardar_de_nuevo_con(extra_props) {
			this.extra_props_del_proximo_guardado = extra_props || {}

			/*
				🔴 El `{close: true}` NO es opcional. `save(info)` no tiene default y su `.then()`
				llama a `closeModal(info, ...)`, que arranca con `if (info.close)`: con `info` en
				undefined tira un TypeError DESPUES de que el guardado salio bien, el error cae en
				el `.catch()` encadenado del mismo PUT y el usuario termina viendo "No se pudo
				guardar" con el modal trabado sobre una operacion que funciono.

				Es el mismo objeto que manda el unico otro llamador (`@save` de ModelForm).
			*/
			this.save({ close: true })
		},
		has_many_deleted() {
			this.$emit('has_many_deleted')
		},
		has_many_saved(model) {
			this.$emit('has_many_saved', model)
		},
		press_delete_btn() {
			this.$emit('press_delete_btn')
		},
		restaurar() {
			if (confirm('¿Seguro que quiere restaurar este elemento?')) {
				
				this.restaurando = true
				this.$api.put('papelera/restaurar/'+this.model_name+'/'+this.model.id)
				.then(res => {
					this.restaurando = false
					this.$toast.success('Restaurado') 
					this.$bvModal.hide(this.model_name)
					this.$store.dispatch('papelera/'+this.model_name+'/getModels')

				})
				.catch(err => {
					this.restaurando = false
					this.$toast.error('Error al restaurar')
				})
			}
		},
		onModalClosed() {
			this.clearSaveCheckAlert()
			this.$root.$emit(this.model_name+'-modal-closed');
		},
		/**
		 * Muestra un aviso de validación sobre los botones Guardar del modal.
		 * @param {string} message - Texto a mostrar al usuario.
		 * @param {string} variant - Variante de b-alert (p. ej. danger, warning).
		 */
		setSaveCheckAlert(message, variant) {
			if (!message) {
				return
			}
			this.save_check_alert_message = message
			this.save_check_alert_variant = variant || 'danger'
		},
		/**
		 * Oculta el aviso de validación al guardar (tras guardado exitoso o al cerrar el modal).
		 */
		clearSaveCheckAlert() {
			this.save_check_alert_message = ''
			this.save_check_alert_variant = 'danger'
		},
		/**
		 * Muestra en el alert del modal el mensaje devuelto por la API (p. ej. validación 422).
		 *
		 * @param {import('axios').AxiosError} err Error de la petición de guardado.
		 * @return {void}
		 */
		setSaveErrorFromApi(err) {
			const response = err && err.response
			if (!response || !response.data) {
				this.setSaveCheckAlert('No se pudo guardar. Intente nuevamente.')
				return
			}
			const data = response.data
			const validation_messages = collect_laravel_validation_messages(data)
			if (validation_messages.length) {
				this.setSaveCheckAlert(validation_messages.join(' '))
				return
			}
			if (typeof data.message === 'string' && data.message.trim().length) {
				this.setSaveCheckAlert(data.message.trim())
				return
			}
			this.setSaveCheckAlert('No se pudo guardar. Intente nuevamente.')
		},
		model_deleted() {
			// alert('emitiendo model_deleted desde Index')
			this.$emit('modelDeleted')
		},
		async save(info) {
			// this.setPropsValues()}
			console.log('se mando check')
			const isValid = await this.check();
			console.log('llego esto de check:')
			console.log(isValid)

			if (!isValid) {
				/*
					El guardado no llega a salir, asi que las props extra de un reintento no se
					consumen. Si quedaran, viajarian en el proximo guardado de esta instancia sin
					que nadie lo haya pedido.
				*/
				this.extra_props_del_proximo_guardado = {}
			}

			if (isValid && !this.loading) {
				/* Validación OK: se oculta el aviso hasta que falle un chequeo posterior. */
				this.clearSaveCheckAlert()
				console.log('mandando solicitud')
				this.$store.commit('auth/setMessage', 'Guardando')
				this.loading = true 
				let route = this.route_model_name()
				// let model_to_send = this.model 
				let model_to_send = this.getModelToSend()

				/*
					Props extra de un reintento puntual (ver `guardar_de_nuevo_con`). Se mezclan
					recien aca, en el payload, y no en el modelo: ver el comentario de
					`extra_props_del_proximo_guardado`.
				*/
				if (Object.keys(this.extra_props_del_proximo_guardado).length) {
					model_to_send = {
						...model_to_send,
						...this.extra_props_del_proximo_guardado,
					}
				}

				/* Config de axios de este envio. Ver la prop `skip_global_error_event`. */
				let config_del_envio = {
					skip_global_error_event: this.skip_global_error_event,
				}

				// console.log('model_to_send:')
				// console.log(model_to_send)
				if (this.model.id) {
					this.$api.put(route+'/'+this.model.id, model_to_send, config_del_envio)
					.then(res => {
						this.extra_props_del_proximo_guardado = {}
						this.loading = false
						this.clearSaveCheckAlert()
						this.$toast.success('Actualizado')
						if (this.has_many_parent_model) {
							let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
								return model.id == this.model.id 
							})
							if (index != -1) {
								this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, res.data.model)
							} else {
								this.has_many_parent_model[this.has_many_prop.key].push(res.data.model)
								this.setModel(this.has_many_parent_model, this.has_many_parent_model_name)
							}
						} else {
							if (this.model_name == 'user') {
								this.$store.commit('auth/setUser', res.data.model)
								// alert('asd')
								console.log('Volviendo a cargar AUTH')
					        	this.$store.dispatch('auth/me')
							} else {
								this.$store.commit(this.replaceGuion(this.model_name)+'/add', res.data.model)
								// console.log('se agrego este '+this.model_name+': ')
								// console.log(res.data.model)
							}
						}
						this.closeModal(info, res.data.model)
						this.callActions(res.data.model)
					})
					.catch(err => {
						this.extra_props_del_proximo_guardado = {}
						console.log(err)
						this.loading = false
						this.$store.commit('auth/setMessage', '')

						/*
							Hook para que una pantalla puntual se quede con un error de guardado y
							lo resuelva a su manera (por ejemplo, un modal de decision en vez de un
							alert). `$root.$emit` es sincronico en Vue 2, asi que el que escucha
							alcanza a marcar `manejado.valor` antes de que siga esta linea.

							🔴 Es ADITIVO: sin nadie escuchando el evento, `manejado.valor` queda
							en false y el comportamiento es exactamente el de siempre. No cambia
							nada para los demas formularios.
						*/
						let manejado = { valor: false }

						this.$root.$emit(this.model_name + ':save-error', err, manejado)

						if (!manejado.valor) {
							this.setSaveErrorFromApi(err)
						}
					})
				} else {
					this.$api.post(route, model_to_send, config_del_envio)
					.then(res => {
						this.extra_props_del_proximo_guardado = {}
						this.loading = false
						this.clearSaveCheckAlert()
						this.$toast.success('Guardado')
						let created_model = res.data.model 
						if (!this.emit_on_saved_instead_continue) {
							if (this.has_many_parent_model) {
								
								this.$set(this.has_many_parent_model, this.has_many_prop.key, this.has_many_parent_model[this.has_many_prop.key].concat([created_model]))
									
								console.log('Se agrego al parent model '+this.has_many_prop.key)
								
								console.log('has_many_parent_model:')
								console.log(this.has_many_parent_model)
								
								if (!this.has_many_parent_model.id) {
									if (this.has_many_parent_model.childrens) {
										this.has_many_parent_model.childrens.push({
											model_name: this.has_many_prop.has_many.model_name,
											temporal_id: created_model.temporal_id
										})
										console.log('se agrego el temporal id '+created_model.temporal_id)
									} else {
										this.has_many_parent_model.childrens = []
										console.log('se creo la prop childrens')
										this.has_many_parent_model.childrens.push({
											model_name: this.has_many_prop.has_many.model_name,
											temporal_id: created_model.temporal_id
										})
										// console.log('se agrego el id '+created_model.temporal_id)
									}
								} 
								this.setModel(this.has_many_parent_model, this.has_many_parent_model_name)

							} else {
								this.$store.commit(this.replaceGuion(this.model_name)+'/add', created_model)
							}
						}	
						this.closeModal(info, res.data.model)
						this.callActions(created_model)
						this.clearModel(info)
					})
					.catch(err => {
						this.extra_props_del_proximo_guardado = {}
						console.log('Error catch')
						console.log(err)
						this.loading = false
						this.$store.commit('auth/setMessage', '')

						/*
							Mismo hook que en el PUT. Va en las dos ramas a proposito: la prop y el
							evento estan documentados como del FORMULARIO, no del metodo HTTP. Una
							pantalla que use el gancho al crear y no al actualizar se caeria sin
							ruido.
						*/
						let manejado = { valor: false }

						this.$root.$emit(this.model_name + ':save-error', err, manejado)

						if (!manejado.valor) {
							this.setSaveErrorFromApi(err)
						}
					})
				}
			}
		},
		route_model_name() {
			
			let route_string = this.$store.state[this.model_name].route_string

			if (typeof route_string != 'undefined' && route_string != '') {
				return route_string
			}

			return this.routeString(this.model_name)
		},
		/**
		 * Desde el 10/8/2026 el footer de este modal tiene un solo boton de guardar ("Guardar y
		 * cerrar"), que manda close: true. O sea que la rama de info.close === false ya no la
		 * alcanza NINGUN llamador del footer, y lo mismo vale para el clearModel() que cuelga de
		 * ella. No se borran: save() tambien se invoca desde el @save de ModelForm y este es un
		 * componente generico que usa todo el sistema, asi que sacar esa rama es una limpieza
		 * estructural con su propia decision detras. Queda escrito para que nadie la de por viva
		 * ni la "limpie" sin entender por que quedo.
		 */
		closeModal(info, model) {
			if (info.close) {
				setTimeout(() => {
					this.$bvModal.hide(this.model_name)
				}, 100)
			} else {

				console.log('se va a poner este model:')
				console.log(this.model)

				console.log('res model:')
				console.log(model)

				this.setModel(model, this.model_name)

				// setTimeout(() => {
				// 	this.$bvModal.hide(this.model_name)

				// 	setTimeout(() => {
				// 		this.$bvModal.show(this.model_name)
				// 	}, 100)

				// }, 100)
			}
		},
		clearModel(info) {
			if (!info.close) {
				let properties_to_override = []
				if (!this.clear_model) {
					this.props_to_keep_after_create.forEach(prop => {
						properties_to_override.push({
							key: prop.key,
							value: this.model[prop.key],
						})
					})
					// console.log('propiedades para mantener')
					// console.log(properties_to_override)
				} 
				this.setModel(null, this.model_name, properties_to_override, false)
			}
		},
		getModelToSend() {
			let model_to_send = {
				...this.model
			}
			let store = this.$store.state[this.model_name]
			if (typeof store != 'undefined') {
				let selected_model = this.$store.state[this.model_name].selected_model 
				if (typeof selected_model != 'undefined') {
					model_to_send.model_id = selected_model.id 
				}
			}

			if (this.prop_to_send_on_save) {
				model_to_send[this.prop_to_send_on_save.key] = this.prop_to_send_on_save.value
			}

			if (this.props_to_send_on_save.length) {

				this.props_to_send_on_save.forEach(prop_to_send => {

					model_to_send[prop_to_send.key] = prop_to_send.value
				}) 
			}

			if (this.props_to_send_on_save_function) {
				model_to_send = this[this.props_to_send_on_save_function](model_to_send)
			}

			// Algunos endpoints (ej: sale-tax) esperan la relacion belongs_to_many como un array plano de ids
			// (ej: "article_ids") en lugar del array de objetos completos que usa la convencion generica de
			// belongs_to_many (GeneralHelper::attachModels en el backend). El modelo declara esto con la
			// propiedad `send_belongs_to_many_ids_as` en la definicion del belongs_to_many.
			this.properties.forEach(prop => {
				if (prop.belongs_to_many && prop.send_belongs_to_many_ids_as && Array.isArray(this.model[prop.key])) {
					let related_ids = []
					this.model[prop.key].forEach(related_model => {
						related_ids.push(related_model.id)
					})
					model_to_send[prop.send_belongs_to_many_ids_as] = related_ids
				}
			})

			// if (this.model_name == 'expense') {
			// 	model_to_send.payment_methods = this.$store.state.expense.selected_payment_methods.map(payment_method => {
			// 		return {
			// 			id: payment_method.id,
			// 			amount: payment_method.amount,
			// 			caja_id: payment_method.caja_id,
			// 		}
			// 	})
			// }

			return model_to_send
		},
		setPropsValues() {
			this.properties.forEach(prop => {
				if (
					(prop.type == 'text' 
					|| prop.type == 'textarea' 
					|| prop.type == 'date' 
					// || prop.type == 'checkbox' 
					|| prop.type == 'select')

					&& typeof prop.not_show_on_form == 'undefined' && typeof prop.show_only_if_is_created == 'undefined') {
				
					let input = document.getElementById(this.model_name+'-'+prop.key)

					if (input) {
						this.model[prop.key] = input.value
					} 

				}
			})
		},
		async check() {
		    return new Promise((resolve) => {
		        let ok = true;
		        let numero = null;

		        this.properties.forEach(prop => {
		            if (prop.required) {
		            	if (
		            		typeof prop.required_if_models_length != 'undefined'
		            		&& !this.modelsStoreFromName(prop.required_if_models_length).length
		            	) {

		            	} else {

			                if (ok && this.propType(prop, this.model) == 'select' && this.model[prop.key] == 0) {
			                    this.setSaveCheckAlert('Ingrese ' + this.propText(prop));
			                    ok = false;
			                } else if (ok && this.model[prop.key] == '') {
			                    this.setSaveCheckAlert('Ingrese ' + this.propText(prop));
			                    ok = false;
			                }
		            	}
		            }

		            if (
		            	prop.check_length
		            	&& typeof this.model[prop.key] != 'undefined' 
		            	&& this.model[prop.key] != ''
		            	&& this.model[prop.key] !== null
		            ) {
		            	let input = document.getElementById(this.model_name+'-'+prop.key)

		            	if (input) {

			            	if (input.value.length != prop.check_length) {
			            		this.setSaveCheckAlert('El campo '+this.propText(prop)+' debe tener '+prop.check_length+' caracteres')
			            		ok = false	
			            	}
		            	}
		            }

		            if ((prop.type == 'number' || prop.filter_type == 'number') && this.model[prop.key]) {
		                numero = '' + this.model[prop.key];
		                if (numero.includes(',')) {
		                    numero = numero.replace(',', '.');
		                    this.model[prop.key] = numero;
		                }
		            }
		        });

		        this.checkRelationsFiltered();
		        if (this.save_check_function) {
		        	console.log('save_check_function:')
		        	console.log(this.save_check_function)
		            ok = this[this.save_check_function]();
		            if (!ok && !this.save_check_alert_message) {
		            	this.setSaveCheckAlert('No se pudo guardar. Revise los datos ingresados.')
		            }
		        }

		        /*
		         * Validación adicional: chequeo de repetidos al momento de CREAR.
		         * Esto asegura que el usuario no pueda crear duplicados si no presionó Enter
		         * o si no se disparó blur en el input antes de guardar.
		         */
		        if (ok) {
		        	let is_creating_model = !this.model || !this.model.id
		        	if (is_creating_model) {
		        		/* Resolver usuario owner (si el autenticado es empleado). */
		        		let auth_user = this.$store && this.$store.state && this.$store.state.auth ? this.$store.state.auth.user : null
		        		let owner_user = auth_user && auth_user.owner ? auth_user.owner : auth_user

		        		/*
		        		 * Ejecuta chequeos en serie (uno por vez) para mantener el flujo simple
		        		 * y evitar múltiples requests simultáneas.
		        		 */
		        		let props_to_check = this.properties.filter(p => {
		        			return p && p.use_to_check_if_is_repeat
		        		})

		        		let check_next_prop = (index) => {
		        			if (!ok || index >= props_to_check.length) {
		        				console.log('termino check: ')
		        				console.log(ok)
		        				resolve(ok)
		        				return
		        			}

		        			let prop = props_to_check[index]

		        			/* Caso particular: permitir `provider_code` repetido en artículos según configuración. */
		        			if (
		        				this.model_name == 'article'
		        				&& prop.key == 'provider_code'
		        				&& owner_user
		        				&& Number(owner_user.usa_provider_codes_repetidos) === 1
		        			) {
		        				check_next_prop(index + 1)
		        				return
		        			}

		        			/* Si no hay valor cargado, no se chequea. */
		        			let current_value = this.model && this.model[prop.key] != null ? String(this.model[prop.key]) : ''
		        			if (current_value.trim() == '') {
		        				check_next_prop(index + 1)
		        				return
		        			}

		        			/* Chequeo por API (si corresponde), o local si el prop así lo define. */
		        			if (prop.chequear_buscando_desde_api) {
		        				let filters = [
		        					{
		        						type: 'text',
		        						igual_que: current_value.toLowerCase(),
		        						key: prop.key,
		        					},
		        				]

		        				this.$store.commit('auth/setMessage', 'Chequeando ' + this.propText(prop))
		        				this.$store.commit('auth/setLoading', true)

		        				this.$api.post('search/' + this.model_name, { filters })
		        				.then(res => {
		        					this.$store.commit('auth/setLoading', false)
		        					let models = res && res.data && res.data.models ? res.data.models : []
		        					if (models.length) {
		        						/* Si existe repetido, se bloquea el guardado. */
		        						ok = false
		        						this.setSaveCheckAlert(
		        							'Ya hay un ' + this.singular(this.model_name) + ' con este ' + this.propText(prop),
		        							'warning'
		        						)
		        						let input = document.getElementById(this.model_name + '-' + prop.key)
		        						if (input) {
		        							setTimeout(() => {
		        								input.focus()
		        							}, 150)
		        						}
		        					}
		        					check_next_prop(index + 1)
		        				})
		        				.catch(err => {
		        					this.$store.commit('auth/setLoading', false)
		        					/*
		        					 * Si falla el chequeo, por seguridad bloqueamos el guardado para no crear duplicados
		        					 * sin poder validar.
		        					 */
		        					ok = false
		        					this.setSaveCheckAlert('Error al chequear repetidos')
		        					console.log(err)
		        					check_next_prop(index + 1)
		        				})
		        			} else {
		        				/* Chequeo local contra store (fallback). */
		        				let models_store = this.modelsStoreFromName(this.model_name)
		        				let finded = models_store.find(model => {
		        					return model[prop.key] && String(model[prop.key]).toLowerCase() == current_value.toLowerCase()
		        				})
		        				if (typeof finded != 'undefined') {
		        					ok = false
		        					this.setSaveCheckAlert(
		        						'Ya hay un ' + this.singular(this.model_name) + ' con este ' + this.propText(prop),
		        						'warning'
		        					)
		        					let input = document.getElementById(this.model_name + '-' + prop.key)
		        					if (input) {
		        						setTimeout(() => {
		        							input.focus()
		        						}, 150)
		        					}
		        				}
		        				check_next_prop(index + 1)
		        			}
		        		}

		        		check_next_prop(0)
		        		return
		        	}
		        }

		        console.log('termino check: ')
		        console.log(ok)
		        resolve(ok); // Retorna true o false
		    });
		},
		checkRelationsFiltered() {
			let relations_filtered = this.$store.state[this.model_name].relations_filtered
			if (typeof relations_filtered != 'undefined' && relations_filtered.length) {
				relations_filtered.forEach(relation_filtered => {
					this.removeRelationFiltered(this.model_name, this.model, relation_filtered)
				})
				this.$store.commit(this.model_name+'/setDeletedModelsFromRelationFiltered', [])
			}
		},
		callActions(model) {
			this.actions_after_save.forEach(action => {
				this.$store.dispatch(action)
			})
			this.$emit('modelSaved', model)
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
@if ($theme == 'dark') 
	.modal-content
		background: #1d1d1d !important
	.modal-header, .modal-header > .close
		color: rgba(255, 255, 255, .9) !important
@else 
	.modal-content
		color: rgba(0, 0, 0, .6) !important
.modal-body
	.b-form-datepicker
		// margin-bottom: 250px
	// min-height: 500px

// Footer del modal generico de formulario (10/8/2026).
//
// Todas las reglas van anidadas bajo .model-modal-footer a proposito: este <style> es global
// (tiene que alcanzar el interior de btn-loader y btn-delete, que son componentes hijos), y sin
// ese anidado el chasis se le filtraria a los 147 usos de btn-loader del sistema. Por el mismo
// motivo el estilo entra por la clase contenedora y NO se toca BtnLoader.vue ni BtnDelete.vue.
//
// Los colores salen todos de custom properties de _dark_theme.sass, sin fallbacks del tipo
// var(--x, #hex): un fallback tapa una variable faltante y deja el modo oscuro roto sin que
// nadie se entere.
.model-modal-footer
	display: flex
	align-items: center
	gap: 10px
	width: 100%

	.btn
		height: 38px
		padding: 0 18px
		border-radius: 10px
		font-size: 0.875rem
		font-weight: 600
		line-height: 1
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 8px
		border: 1px solid transparent
		transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease

		&:focus-visible
			outline: none
			// Mismo anillo de foco que BtnAccion.vue del modulo de Cajas.
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25)

		&:disabled
			opacity: 0.6
			cursor: default

	// Eliminar: fantasma con acento rojo, no rojo lleno. Dos acciones de igual peso visual
	// hacen que no se destaque ninguna, que es lo que el grupo 371 ya corrigio en Cajas.
	//
	// Se pisan tambien :hover, :focus y :active porque Bootstrap pinta .btn-danger en cada uno
	// por separado: cubriendo solo el estado normal, el boton volvia a ponerse rojo lleno al
	// apretarlo. Alcanza con la especificidad de dos clases (.model-modal-footer__eliminar.btn)
	// contra la de una (.btn-danger): no hace falta ningun !important.
	.model-modal-footer__eliminar.btn,
	.model-modal-footer__eliminar.btn:focus,
	.model-modal-footer__eliminar.btn:not(:disabled):not(.disabled):active
		background: transparent
		border-color: var(--color-border)
		color: var(--btn-peligro-texto)

	.model-modal-footer__eliminar.btn:hover
		background: var(--btn-peligro-fondo)
		border-color: var(--btn-peligro-borde)
		color: var(--btn-peligro-texto)

	// Guardar y cerrar: la unica accion con peso visual, y empujada a la derecha para que no
	// quede pegada a la destructiva.
	.model-modal-footer__guardar
		margin-left: auto

	.model-modal-footer__guardar.btn,
	.model-modal-footer__guardar.btn:focus,
	.model-modal-footer__guardar.btn:not(:disabled):not(.disabled):active
		background: var(--color-primary)
		border-color: var(--color-primary)
		color: #fff

	.model-modal-footer__guardar.btn:hover
		// brightness en vez de un token de azul oscuro: --color-primary vale distinto en claro
		// y en oscuro, y un hex de hover fijo se pelearia con uno de los dos.
		filter: brightness(0.94)
		background: var(--color-primary)
		border-color: var(--color-primary)
		color: #fff

	// Restaurar (papelera): mismo chasis, conserva su verde de Bootstrap.
	.model-modal-footer__restaurar
		margin-left: auto

// El alert de validacion vive arriba de los botones, fuera del flex.
.model-modal-footer__alerta
	border-radius: 10px
	border: none
	font-size: 0.875rem
	padding: 0.6rem 0.9rem
	margin-bottom: 12px
</style>