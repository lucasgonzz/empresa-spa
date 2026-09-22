<template>
	<!--
		Modal de configuración del agente (S3, misión foto-sucursal-y-asistente-configurable):
		tres preguntas humanizadas —cuánta confianza le tenés, con qué inteligencia y cómo querés
		que piense—, con las opciones como tarjetas elegibles. Se guarda con
		PUT api/user/asistente-config.

		Misión proveedores-ia-deepseek (22/9/2026): la pregunta de la inteligencia elige el
		PROVEEDOR (Claude o DeepSeek). La tarjeta de un proveedor sin clave en la instalación va
		deshabilitada ("No disponible en esta instalación"), y las tarjetas de "cómo piensa" se
		filtran por proveedor: Claude tiene tres, DeepSeek dos (Flash = ágil, Pro = profundo).
		Contra un API viejo que no manda las listas, se asume solo Claude con sus tres.

		Se monta UNA sola vez (colgado del botón flotante, como CuentaCorrienteDeMencion) y se
		abre por id desde los dos accesos: el engranaje de la sidebar del panel y el botón al
		lado del título "Tu mostrador". Con una sola instancia no hay dos <b-modal> con el
		mismo id peleándose por el $bvModal.show (la traba que documenta el store).
	-->
	<b-modal
	id="configuracion-agente"
	title="Configurá tu asistente"
	hide-footer
	centered
	@show="al_abrir">
		<div class="config-agente">
			<p class="config-agente__intro">
				Elegí cómo querés que trabaje tu asistente. Podés cambiarlo cuando quieras.
			</p>

			<!-- Pregunta 1: confianza / autonomía -->
			<div class="config-agente__pregunta">
				<h6 class="config-agente__titulo-pregunta">¿Cuánta confianza le tenés?</h6>
				<div class="config-agente__opciones">
					<button
					type="button"
					class="config-agente__opcion"
					:class="{ 'config-agente__opcion--activa': confianza == 'cauteloso' }"
					@click="confianza = 'cauteloso'">
						<span class="config-agente__opcion-icono">
							<i class="bi bi-shield-check" aria-hidden="true"></i>
						</span>
						<span class="config-agente__opcion-titulo">Cauteloso</span>
						<span class="config-agente__opcion-desc">Me pregunta todo</span>
					</button>

					<button
					type="button"
					class="config-agente__opcion"
					:class="{ 'config-agente__opcion--activa': confianza == 'resuelto' }"
					@click="confianza = 'resuelto'">
						<span class="config-agente__opcion-icono">
							<i class="bi bi-rocket-takeoff" aria-hidden="true"></i>
						</span>
						<span class="config-agente__opcion-titulo">Resuelto</span>
						<span class="config-agente__opcion-desc">
							Resuelve solo lo simple: lo directo y sin riesgo, como ponerle la foto a
							una sucursal, lo hace al toque y te avisa. Lo que toca plata, siempre te
							pregunta.
						</span>
					</button>
				</div>
			</div>

			<!-- Pregunta 2: la inteligencia (proveedor) -->
			<div class="config-agente__pregunta">
				<h6 class="config-agente__titulo-pregunta">¿Con qué inteligencia?</h6>
				<div class="config-agente__opciones">
					<button
					v-for="opcion in opciones_de_proveedor"
					:key="opcion.valor"
					type="button"
					class="config-agente__opcion"
					:class="{
						'config-agente__opcion--activa': proveedor == opcion.valor,
						'config-agente__opcion--no-disponible': !opcion.disponible,
					}"
					:disabled="!opcion.disponible"
					:title="opcion.disponible ? '' : 'No disponible en esta instalación'"
					@click="elegir_proveedor(opcion.valor)">
						<span class="config-agente__opcion-icono">
							<i
							:class="opcion.icono"
							aria-hidden="true"></i>
						</span>
						<span class="config-agente__opcion-titulo">{{ opcion.titulo }}</span>
						<span class="config-agente__opcion-desc">
							{{ opcion.disponible ? opcion.desc : 'No disponible en esta instalación.' }}
						</span>
					</button>
				</div>
			</div>

			<!-- Pregunta 3: modo de pensamiento (modelo), filtrado por el proveedor elegido -->
			<div class="config-agente__pregunta">
				<h6 class="config-agente__titulo-pregunta">¿Cómo querés que piense?</h6>
				<div class="config-agente__opciones">
					<button
					v-for="opcion in opciones_de_pensamiento"
					:key="opcion.valor"
					type="button"
					class="config-agente__opcion"
					:class="{ 'config-agente__opcion--activa': pensamiento == opcion.valor }"
					@click="pensamiento = opcion.valor">
						<span class="config-agente__opcion-icono">
							<i
							:class="opcion.icono"
							aria-hidden="true"></i>
						</span>
						<span class="config-agente__opcion-titulo">{{ opcion.titulo }}</span>
						<span class="config-agente__opcion-desc">
							{{ opcion.desc }}
						</span>
					</button>
				</div>
			</div>

			<div class="config-agente__pie">
				<b-button
				variant="outline-secondary"
				:disabled="guardando"
				@click="cerrar">
					Cancelar
				</b-button>
				<btn-loader
				:loader="guardando"
				:block="false"
				icon_class="bi bi-check-lg"
				text="Guardar"
				@clicked="guardar"></btn-loader>
			</div>
		</div>
	</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			// Selección local, arranca en los defaults del sistema (plan: resuelto / anthropic /
			// agil) y se sincroniza con lo que traiga el store al abrir.
			confianza: 'resuelto',
			proveedor: 'anthropic',
			pensamiento: 'agil',
			guardando: false,
		}
	},
	computed: {
		config_store() {
			return this.$store.state.ai_chat.asistente_config
		},
		/**
		 * Los proveedores con clave en esta instalación (asistente_config.proveedores_disponibles).
		 * Si la clave no viene —API viejo— se asume que solo está Claude, que es lo único que ese
		 * API sabe llamar.
		 *
		 * @returns {Array}
		 */
		proveedores_disponibles() {
			let cfg = this.config_store
			if (cfg && Array.isArray(cfg.proveedores_disponibles)) {
				return cfg.proveedores_disponibles
			}
			return ['anthropic']
		},
		/**
		 * Qué modos de pensamiento tiene cada proveedor (asistente_config.pensamientos_por_proveedor).
		 * Con el fallback del contrato si el API no lo manda: Claude tiene tres, DeepSeek dos.
		 *
		 * @returns {Object}
		 */
		pensamientos_por_proveedor() {
			let cfg = this.config_store
			if (cfg && cfg.pensamientos_por_proveedor && typeof cfg.pensamientos_por_proveedor == 'object') {
				return cfg.pensamientos_por_proveedor
			}
			return {
				anthropic: ['agil', 'equilibrado', 'profundo'],
				deepseek: ['agil', 'profundo'],
			}
		},
		/**
		 * Las dos tarjetas de inteligencia, con si están disponibles en esta instalación.
		 *
		 * @returns {Array}
		 */
		opciones_de_proveedor() {
			let self = this
			let opciones = [
				{
					valor: 'anthropic',
					titulo: 'Claude',
					icono: 'bi bi-stars',
					desc: 'De Anthropic. La inteligencia de siempre: tres formas de pensar.',
				},
				{
					valor: 'deepseek',
					titulo: 'DeepSeek',
					icono: 'bi bi-cpu',
					desc: 'Alternativa más económica. Dos formas de pensar: Flash (ágil) y Pro (profundo).',
				},
			]
			opciones.forEach(function (opcion) {
				opcion.disponible = self.proveedores_disponibles.indexOf(opcion.valor) != -1
			})
			return opciones
		},
		/**
		 * Las tarjetas de "cómo piensa" del proveedor elegido: los tres modos de Claude con los
		 * textos de siempre, o los dos de DeepSeek con los subtítulos de Flash y Pro. Se filtran por
		 * `pensamientos_por_proveedor[proveedor]`, así el modal no tiene una lista propia que se
		 * pueda desactualizar respecto del API.
		 *
		 * @returns {Array}
		 */
		opciones_de_pensamiento() {
			let es_deepseek = this.proveedor == 'deepseek'
			let todas = [
				{
					valor: 'agil',
					titulo: 'Ágil',
					icono: 'bi bi-lightning-charge-fill',
					desc: es_deepseek
						? 'Flash: piensa rápido, respuestas veloces y muy económicas.'
						: 'Piensa rápido: respuestas veloces y más económicas.',
				},
				{
					valor: 'equilibrado',
					titulo: 'Equilibrado',
					icono: 'bi bi-sliders',
					desc: 'Piensa balanceado: un término medio entre velocidad y profundidad.',
				},
				{
					valor: 'profundo',
					titulo: 'Profundo',
					icono: 'bi bi-lightbulb',
					desc: es_deepseek
						? 'Pro: razona a fondo antes de contestar, tarda más y cuesta más. Las fotos las mira Flash.'
						: 'Piensa a fondo: mejores respuestas para lo difícil, tarda más y cuesta más.',
				},
			]
			let validos = this.pensamientos_por_proveedor[this.proveedor] || ['agil']
			return todas.filter(function (opcion) {
				return validos.indexOf(opcion.valor) != -1
			})
		},
	},
	methods: {
		/**
		 * Vuelca al estado local lo que haya en el store (si hay algo).
		 */
		sincronizar_desde_store() {
			let cfg = this.config_store
			if (!cfg) {
				return
			}
			if (cfg.confianza) {
				this.confianza = cfg.confianza
			}
			if (cfg.proveedor) {
				this.proveedor = cfg.proveedor
			}
			if (cfg.pensamiento) {
				this.pensamiento = cfg.pensamiento
			}
		},
		/**
		 * Elige la inteligencia y, si el modo de pensamiento elegido no existe en ella (por
		 * ejemplo `equilibrado` al pasar a DeepSeek), lo baja a ágil para que la tarjeta activa
		 * siempre sea una de las que se ven.
		 *
		 * @param {String} valor 'anthropic' | 'deepseek'
		 */
		elegir_proveedor(valor) {
			this.proveedor = valor
			let validos = this.pensamientos_por_proveedor[valor] || ['agil']
			if (validos.indexOf(this.pensamiento) == -1) {
				this.pensamiento = 'agil'
			}
		},
		/**
		 * Al abrir: muestra ya lo que hubiera en el store y pide la config fresca; cuando
		 * llega, vuelve a sincronizar (por si cambió desde otra pestaña).
		 */
		al_abrir() {
			let self = this
			this.sincronizar_desde_store()
			this.$store.dispatch('ai_chat/fetchAsistenteConfig')
				.then(function () {
					self.sincronizar_desde_store()
				})
		},
		cerrar() {
			this.$bvModal.hide('configuracion-agente')
		},
		/**
		 * Guarda la elección (confianza, proveedor y pensamiento). Al confirmar, refresca el
		 * consumo (el footer muestra el modo de pensamiento y la inteligencia, que pueden haber
		 * cambiado) y cierra. Si el API rechaza con un mensaje (422: proveedor sin clave o modo
		 * que ese proveedor no tiene), se muestra ese mensaje y no el genérico.
		 */
		guardar() {
			let self = this
			this.guardando = true
			this.$store.dispatch('ai_chat/guardarAsistenteConfig', {
				confianza: this.confianza,
				pensamiento: this.pensamiento,
				proveedor: this.proveedor,
			})
				.then(function () {
					self.guardando = false
					self.$toast.success('Listo, tu asistente quedó configurado')
					self.$store.dispatch('ai_chat/fetchMiConsumo')
					self.cerrar()
				})
				.catch(function (err) {
					self.guardando = false
					console.log(err)
					let mensaje = err && err.response && err.response.data && err.response.data.message
						? err.response.data.message
						: 'No pudimos guardar la configuración. Probá de nuevo.'
					self.$toast.error(mensaje)
				})
		},
	},
}
</script>
<style lang="sass">
// 🔴 MISMO MOTIVO Y MISMO ESCALÓN que el modal de cuenta corriente del chat
// (CuentaCorrienteDeMencion.vue): BootstrapVue le mide al div externo del modal un z-index
// inline (~1040) que lo dejaría DETRÁS del panel del chat (overlay 1055). Este modal se abre
// desde el engranaje de la sidebar del panel y desde el título del mostrador, así que tiene
// que ganarle al panel. Comparte el 1066 del modal de cuenta corriente porque los dos nunca
// están abiertos a la vez (mientras un modal bloquea el fondo no se puede disparar el otro), y
// queda ABAJO de los toasts (1067), que avisan si el guardado salió o no. Renumerado el
// 21/9/2026 por mostrador-fotos-y-modales, que insertó tres modales nuevos más abajo en el
// escalón (ver el comentario completo en InformeAbierto.vue).
//
// El id lo arma bootstrap-vue a partir del id del <b-modal>: si cambia uno, cambia el otro.
#configuracion-agente___BV_modal_outer_
	z-index: 1066 !important

.config-agente
	&__intro
		font-size: .88rem
		color: var(--color-text-secondary, #6c757d)
		margin: 0 0 18px 0

	&__pregunta
		margin-bottom: 20px

		&:last-child
			margin-bottom: 0

	&__titulo-pregunta
		font-size: .98rem
		font-weight: 700
		color: var(--color-text-primary, #212529)
		margin: 0 0 10px 0

	// Dos tarjetas lado a lado en escritorio; se apilan solas cuando no entran (móvil, o la
	// descripción larga de "Resuelto"), sin media queries.
	&__opciones
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))
		gap: 10px

	// Cada opción es una tarjeta elegible: borde neutro en reposo, y realce con el color de
	// acción cuando está elegida. Sin sombra (el sistema le pone sombra a todo <button>, acá
	// se saca para que se lea como tarjeta y no como botón).
	&__opcion
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 4px
		text-align: left
		padding: 14px
		border-radius: 12px
		border: 1.5px solid var(--color-border, #dee2e6)
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		box-shadow: none
		transition: border-color .15s ease, background .15s ease

		&:hover
			border-color: var(--color-primary, #007bff)

		&--activa
			border-color: var(--color-primary, #007bff)
			// Tinte del color de acción, que se lee igual en los dos temas (mismo criterio que
			// las menciones del chat: un rgba del azul, no un gris fijo que se hunde o se eleva
			// según el tema).
			background: rgba(0, 123, 255, .08)

		// Un proveedor sin clave en esta instalación (misión proveedores-ia-deepseek): la tarjeta
		// se ve, atenuada y sin hover, para que el dueño sepa que existe y que no la puede elegir.
		// Va con `disabled` en el <button>, así que el click no llega ni por teclado.
		&--no-disponible
			opacity: .55
			cursor: not-allowed

			&:hover
				border-color: var(--color-border, #dee2e6)

			.config-agente__opcion-icono
				color: var(--color-text-secondary, #6c757d)

	&__opcion-icono
		font-size: 1.3rem
		line-height: 1
		color: var(--color-primary, #007bff)
		margin-bottom: 2px

	&__opcion-titulo
		font-weight: 700
		font-size: .95rem

	&__opcion-desc
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)
		line-height: 1.35

	&__pie
		display: flex
		justify-content: flex-end
		gap: 10px
		margin-top: 22px

html.dark-mode .config-agente__opcion--activa
	// El azul de acción del tema oscuro (--color-primary #4da3ff) en baja opacidad: el #007bff
	// del claro sobre el fondo oscuro del modal queda demasiado apagado para leerse como realce.
	background: rgba(77, 163, 255, .16)
</style>
