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

		Misión asistente-capacidades-y-hilos (22/9/2026): la confianza pasó a tener TRES modos. Se
		sumó `directo`, que ejecuta 16 tipos de carga en el acto —incluidas una venta y un pago—.
		La baja, la actualización masiva y la unificación de bancos de cheques siguen pidiendo
		confirmación en los tres modos; la tarjeta nombra las dos primeras, que son las que el
		dueño reconoce. El default sigue siendo `resuelto`: nadie cambia de comportamiento porque
		esta opción exista.

		Misión asistente-mcp (22/9/2026): cuarta sección, "Conectá tu asistente a Claude y a otras
		apps". El dueño genera una clave de conexión (POST api/mcp/conexion), la ve UNA sola vez
		con la configuración lista para pegar en Claude Code, Claude Desktop o la API de Anthropic,
		y puede revocarla. Contra un API viejo (404 en el GET) la sección dice "Tu sistema todavía
		no tiene esta función" y el resto del modal sigue andando.

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
	@show="al_abrir"
	@hidden="al_cerrar">
		<div class="config-agente">
			<p class="config-agente__intro">
				Elegí cómo querés que trabaje tu asistente. Podés cambiarlo cuando quieras.
			</p>

			<!--
				Pregunta 1: confianza / autonomía.

				🔴 Son TRES tarjetas y están escritas a mano, una por una (a diferencia de las
				preguntas 2 y 3, que salen de un computed): cada modo tiene una redacción propia
				y la de `directo` es una advertencia, no un subtítulo. Los tres valores son los
				del enum de `users.agente_confianza` en el back —`cauteloso`, `resuelto`,
				`directo`— y tienen que seguirlo: si allá se agrega o se renombra uno, el bloque
				se toca acá a mano. Un valor guardado que no tenga su tarjeta no rompe nada, pero
				deja el modal MUDO (ninguna opción marcada como activa), que es justo lo que
				pasaba con `directo` antes de esta misión.
			-->
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

					<button
					type="button"
					class="config-agente__opcion"
					:class="{ 'config-agente__opcion--activa': confianza == 'directo' }"
					@click="confianza = 'directo'">
						<span class="config-agente__opcion-icono">
							<i class="bi bi-key" aria-hidden="true"></i>
						</span>
						<span class="config-agente__opcion-titulo">Directo</span>
						<span class="config-agente__opcion-desc">
							Hace las cargas en el acto y sin preguntarte: un gasto, un pago, una
							compra, una oferta, hasta una venta. Igual te sigue pidiendo
							confirmación para borrar algo y para la actualización masiva de
							artículos. Es el que más confianza pide.
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

			<!--
				Sección 4 (misión asistente-mcp, 22/9/2026): la conexión del asistente a Claude y a
				otras apps por MCP. No es una pregunta con tarjetas elegibles: es una ficha con estado
				y acciones, y por eso lleva su propio bloque de estilos (.config-agente__conexion).

				Seis estados, excluyentes, en este orden de prioridad (ver el computed `mcp_estado`):
				clave recién generada (se ve UNA vez, con los tres ejemplos para pegar) > API viejo sin
				la función > cargando > error de carga > conectada > sin conexión.

				🔴 La clave y los ejemplos viven en el estado LOCAL de este componente (`mcp_token`,
				`mcp_ejemplos`), nunca en el store, y se vacían al abrir y al cerrar el modal: el API
				la devuelve una sola vez y acá tampoco se persiste en ningún lado del navegador.

				🔴 "Revocar" confirma con un SEGUNDO CLIC inline y no con $bvModal.msgBoxConfirm: este
				modal está forzado a z-index 1066 (ver el <style>) y BootstrapVue le da a un segundo
				modal `base + índice` (1041 con el CSS de Bootstrap, modal-manager.js), así que el
				cuadro de confirmación quedaría DETRÁS del modal que lo disparó, sin poder clickearlo.
			-->
			<div class="config-agente__pregunta">
				<h6 class="config-agente__titulo-pregunta">Conectá tu asistente a Claude y a otras apps</h6>
				<div
				ref="conexion"
				class="config-agente__conexion"
				data-testid="config-agente-conexion-mcp">
					<p class="config-agente__conexion__intro">
						Con una clave de conexión, Claude Desktop, Claude Code o cualquier app compatible
						con MCP usa tu asistente con los datos de tu negocio. La clave se muestra una sola
						vez.
					</p>

					<!-- Clave recién generada: se ve una sola vez, con la configuración lista para pegar. -->
					<template v-if="mcp_estado == 'clave_nueva'">
						<div class="config-agente__conexion__campo">
							<p class="config-agente__conexion__etiqueta">Tu clave de conexión</p>
							<div class="config-agente__conexion__clave">
								<input
								type="text"
								class="config-agente__conexion__input"
								:value="mcp_token"
								readonly
								spellcheck="false"
								aria-label="Clave de conexión"
								data-testid="config-agente-mcp-clave"
								@focus="seleccionar_todo"
								@click="seleccionar_todo">
								<b-button
								size="sm"
								variant="primary"
								data-testid="config-agente-mcp-copiar-clave"
								@click="copiar(mcp_token)">
									Copiar
								</b-button>
							</div>
							<p class="config-agente__conexion__aviso">Copiala ahora: no se vuelve a mostrar.</p>
						</div>

						<div
						v-if="mcp_url"
						class="config-agente__conexion__campo">
							<p class="config-agente__conexion__etiqueta">Servidor</p>
							<div class="config-agente__conexion__url">
								<input
								type="text"
								class="config-agente__conexion__input"
								:value="mcp_url"
								readonly
								spellcheck="false"
								aria-label="URL del servidor"
								@focus="seleccionar_todo"
								@click="seleccionar_todo">
								<b-button
								size="sm"
								variant="outline-secondary"
								@click="copiar(mcp_url)">
									Copiar
								</b-button>
							</div>
						</div>

						<div
						v-if="ejemplos.length"
						class="config-agente__conexion__ejemplos">
							<div
							v-for="ejemplo in ejemplos"
							:key="ejemplo.clave"
							class="config-agente__conexion__ejemplo">
								<button
								type="button"
								class="config-agente__conexion__ejemplo-titulo"
								:class="{ 'config-agente__conexion__ejemplo-titulo--abierto': ejemplo_abierto == ejemplo.clave }"
								:aria-expanded="ejemplo_abierto == ejemplo.clave ? 'true' : 'false'"
								:aria-controls="'config-agente-mcp-ejemplo-' + ejemplo.clave"
								:data-testid="'config-agente-mcp-ejemplo-' + ejemplo.clave"
								@click="alternar_ejemplo(ejemplo.clave)">
									<i class="bi bi-chevron-right" aria-hidden="true"></i>
									{{ ejemplo.titulo }}
								</button>
								<b-collapse
								:id="'config-agente-mcp-ejemplo-' + ejemplo.clave"
								:visible="ejemplo_abierto == ejemplo.clave">
									<div class="config-agente__conexion__ejemplo-cuerpo">
										<pre class="config-agente__conexion__codigo">{{ ejemplo.texto }}</pre>
										<!-- Ayuda del bloque (hoy: el header anthropic-beta del ejemplo de la API), solo si el API la mandó. -->
										<p
										v-if="ejemplo.nota"
										class="config-agente__conexion__ayuda">
											{{ ejemplo.nota }}
										</p>
										<b-button
										size="sm"
										variant="outline-secondary"
										@click="copiar(ejemplo.texto)">
											Copiar
										</b-button>
									</div>
								</b-collapse>
							</div>
						</div>

						<div class="config-agente__conexion__acciones">
							<button
							type="button"
							class="config-agente__conexion__link"
							data-testid="config-agente-mcp-ocultar-clave"
							@click="olvidar_clave">
								Ya la copié, ocultar
							</button>
						</div>
					</template>

					<!-- API viejo: la ruta no existe. El resto del modal sigue andando. -->
					<p
					v-else-if="mcp_estado == 'no_disponible'"
					class="config-agente__conexion__nota"
					data-testid="config-agente-mcp-no-disponible">
						Tu sistema todavía no tiene esta función.
					</p>

					<p
					v-else-if="mcp_estado == 'cargando'"
					class="config-agente__conexion__nota">
						Consultando la conexión…
					</p>

					<!-- Un 403, un 500 o un corte de red (el 404 del API viejo no llega acá). -->
					<p
					v-else-if="mcp_estado == 'error'"
					class="config-agente__conexion__nota">
						No pudimos consultar la conexión.
						<button
						type="button"
						class="config-agente__conexion__link"
						@click="cargar_conexion">
							Reintentar
						</button>
					</p>

					<!-- Conectada: desde cuándo, último uso, la URL del servidor y las dos acciones. -->
					<template v-else-if="mcp_estado == 'conectada'">
						<p
						class="config-agente__conexion__estado"
						data-testid="config-agente-mcp-conectada">
							<span>
								<i class="bi bi-check-circle-fill" aria-hidden="true"></i>
								Conectada<template v-if="mcp_desde"> desde {{ mcp_desde }}</template>
							</span>
							<small v-if="mcp_conexion.ultimo_uso_at">
								Último uso: {{ fecha_con_hora(mcp_conexion.ultimo_uso_at) }}
							</small>
							<small v-else>Todavía no se usó.</small>
						</p>

						<div
						v-if="mcp_url"
						class="config-agente__conexion__campo">
							<p class="config-agente__conexion__etiqueta">Servidor</p>
							<div class="config-agente__conexion__url">
								<input
								type="text"
								class="config-agente__conexion__input"
								:value="mcp_url"
								readonly
								spellcheck="false"
								aria-label="URL del servidor"
								data-testid="config-agente-mcp-url"
								@focus="seleccionar_todo"
								@click="seleccionar_todo">
								<b-button
								size="sm"
								variant="outline-secondary"
								data-testid="config-agente-mcp-copiar-url"
								@click="copiar(mcp_url)">
									Copiar
								</b-button>
							</div>
						</div>

						<div
						v-if="!mcp_confirmando_revocacion"
						class="config-agente__conexion__acciones">
							<btn-loader
							:loader="mcp_generando"
							:block="false"
							size="sm"
							variant="outline-secondary"
							text="Generar una clave nueva"
							data-testid="config-agente-mcp-generar"
							@clicked="generar_clave"></btn-loader>
							<button
							type="button"
							class="config-agente__conexion__link config-agente__conexion__link--peligro"
							:disabled="mcp_generando"
							data-testid="config-agente-mcp-revocar"
							@click="pedir_revocar">
								Revocar
							</button>
							<p class="config-agente__conexion__ayuda">
								Al generar una clave nueva, la anterior deja de funcionar.
							</p>
						</div>

						<!-- El segundo clic de Revocar (ver el comentario de la sección). -->
						<div
						v-else
						class="config-agente__conexion__confirmacion">
							<span>¿Revocás la conexión? Las apps que la usan dejan de funcionar.</span>
							<div class="config-agente__conexion__acciones">
								<btn-loader
								:loader="mcp_revocando"
								:block="false"
								size="sm"
								variant="danger"
								text="Sí, revocar"
								data-testid="config-agente-mcp-confirmar-revocar"
								@clicked="revocar"></btn-loader>
								<button
								type="button"
								class="config-agente__conexion__link"
								:disabled="mcp_revocando"
								@click="cancelar_revocar">
									Cancelar
								</button>
							</div>
						</div>
					</template>

					<!-- Sin conexión: un solo botón. -->
					<div
					v-else
					class="config-agente__conexion__acciones">
						<btn-loader
						:loader="mcp_generando"
						:block="false"
						size="sm"
						text="Generar clave de conexión"
						data-testid="config-agente-mcp-generar"
						@clicked="generar_clave"></btn-loader>
					</div>
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
// moment es lo que el sistema ya usa para fechas (el mixin global `date()` lo envuelve, pero
// devuelve DD/MM/YY y acá la ficha va con el año entero: dd/mm/aaaa).
import moment from 'moment'
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

			// Conexión MCP (misión asistente-mcp, 22/9/2026): estado local de la cuarta sección.
			// "Cargando" no tiene bandera propia: `mcp_estado` lo deriva de que todavía no haya
			// ficha en el store (con una ficha de una apertura anterior se muestra esa mientras se
			// refresca por detrás).
			mcp_error_de_carga: false,
			mcp_generando: false,
			mcp_revocando: false,
			// El segundo clic de "Revocar" (ver el comentario de la sección en el template: acá
			// no va msgBoxConfirm).
			mcp_confirmando_revocacion: false,
			// 🔴 La clave y los ejemplos que devuelve el POST viven SOLO acá, y se vacían al abrir
			// y al cerrar el modal (al_abrir / al_cerrar). El store guarda la ficha sin ellos.
			mcp_token: null,
			mcp_ejemplos: null,
			// Cuál de los bloques plegables de ejemplos está abierto: uno por vez, o ninguno.
			ejemplo_abierto: null,
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
		/**
		 * La ficha de la conexión MCP del store: { activa, nombre, creada_at, ultimo_uso_at, url }
		 * o null si todavía no se pidió. Nunca trae la clave (ver el comentario del store).
		 *
		 * @returns {Object|null}
		 */
		mcp_conexion() {
			return this.$store.state.ai_chat.mcp_conexion
		},
		mcp_no_disponible() {
			return this.$store.state.ai_chat.mcp_conexion_no_disponible
		},
		/**
		 * El estado de la sección de conexión, uno solo por vez. La clave recién generada le gana
		 * a todo (se muestra una sola vez y no puede taparla un refresco); después el API viejo;
		 * la carga y su error solo mientras NO haya ficha (con una ficha de una apertura anterior
		 * se muestra esa y se refresca por detrás, sin parpadeo).
		 *
		 * @returns {String} 'clave_nueva' | 'no_disponible' | 'cargando' | 'error' | 'conectada' | 'sin_conexion'
		 */
		mcp_estado() {
			if (this.mcp_token) {
				return 'clave_nueva'
			}
			if (this.mcp_no_disponible) {
				return 'no_disponible'
			}
			if (!this.mcp_conexion) {
				return this.mcp_error_de_carga ? 'error' : 'cargando'
			}
			return this.mcp_conexion.activa ? 'conectada' : 'sin_conexion'
		},
		mcp_url() {
			return this.mcp_conexion && this.mcp_conexion.url ? this.mcp_conexion.url : null
		},
		mcp_desde() {
			return this.mcp_conexion ? this.fecha_corta(this.mcp_conexion.creada_at) : ''
		},
		/**
		 * Los bloques de configuración lista para pegar, en el orden en que los va a buscar el
		 * dueño. Solo los que el API mandó como texto: si un API futuro suma o saca uno, acá no
		 * se rompe nada.
		 *
		 * @returns {Array} [{ clave, titulo, texto, nota }] (nota: string o null)
		 */
		ejemplos() {
			let self = this
			let bloques = [
				{ clave: 'claude_code', titulo: 'Claude Code' },
				{ clave: 'claude_desktop', titulo: 'Claude Desktop' },
				{ clave: 'anthropic_api', titulo: 'API de Anthropic' },
			]
			let lista = []
			bloques.forEach(function (bloque) {
				let texto = self.mcp_ejemplos ? self.mcp_ejemplos[bloque.clave] : null
				if (typeof texto == 'string' && texto != '') {
					// La nota de un bloque (hoy solo `anthropic_api_nota`: el aviso del header
					// `anthropic-beta`, porque ese ejemplo es JSON puro y el header no entra ahí) va
					// como texto de ayuda debajo del snippet, y SOLO si el API la mandó como string
					// no vacío. Un API viejo no la manda y no cambia nada.
					let nota = self.mcp_ejemplos[bloque.clave + '_nota']
					lista.push({
						clave: bloque.clave,
						titulo: bloque.titulo,
						texto: texto,
						nota: typeof nota == 'string' && nota != '' ? nota : null,
					})
				}
			})
			return lista
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
			// La conexión MCP: se olvida cualquier clave de una apertura anterior y se pide fresca.
			this.olvidar_clave()
			this.cargar_conexion()
		},
		/**
		 * Al cerrar (por Guardar, Cancelar, la X o Escape) la clave se olvida: el API la devolvió
		 * una sola vez y acá tampoco queda viva en memoria mientras el modal está cerrado.
		 */
		al_cerrar() {
			this.olvidar_clave()
		},
		cerrar() {
			this.$bvModal.hide('configuracion-agente')
		},
		/**
		 * Pide la ficha de la conexión MCP. Un 404 de un API viejo NO llega acá como error (el
		 * store lo convierte en `mcp_conexion_no_disponible` y resuelve); lo que sí llega es un
		 * 403, un 500 o un corte de red, y eso se muestra como "No pudimos consultar" con un
		 * Reintentar, para que la sección no diga "Consultando…" para siempre.
		 */
		cargar_conexion() {
			let self = this
			this.mcp_error_de_carga = false
			this.$store.dispatch('ai_chat/fetchMcpConexion')
				.catch(function (err) {
					self.mcp_error_de_carga = true
					console.log(err)
				})
		},
		/**
		 * Vacía lo que solo puede verse una vez: la clave, sus ejemplos, el bloque abierto y el
		 * segundo clic de Revocar. Es también el "Ya la copié, ocultar" de la clave nueva.
		 */
		olvidar_clave() {
			this.mcp_token = null
			this.mcp_ejemplos = null
			this.ejemplo_abierto = null
			this.mcp_confirmando_revocacion = false
		},
		/**
		 * Genera una clave de conexión (la primera, o una nueva: el API revoca la anterior). La
		 * clave y los ejemplos quedan en el estado local para mostrarse UNA vez; la ficha sin
		 * ellos ya la dejó en el store la acción.
		 */
		generar_clave() {
			let self = this
			if (this.mcp_generando) {
				return
			}
			this.mcp_generando = true
			this.mcp_confirmando_revocacion = false
			this.$store.dispatch('ai_chat/crearMcpConexion')
				.then(function (data) {
					self.mcp_generando = false
					if (!data || !data.token) {
						self.$toast.error('El sistema no devolvió la clave. Probá de nuevo.')
						return
					}
					self.mcp_token = data.token
					self.mcp_ejemplos = data.ejemplos && typeof data.ejemplos == 'object' ? data.ejemplos : null
					self.ejemplo_abierto = null
				})
				.catch(function (err) {
					self.mcp_generando = false
					console.log(err)
					self.$toast.error(self.mensaje_del_api(err, 'No pudimos generar la clave. Probá de nuevo.'))
				})
		},
		pedir_revocar() {
			this.mcp_confirmando_revocacion = true
		},
		cancelar_revocar() {
			this.mcp_confirmando_revocacion = false
		},
		/**
		 * Revoca la conexión (es el segundo clic). La clave deja de autenticar en el acto y la
		 * ficha del store pasa a `activa: false`, con lo que la sección vuelve al botón de generar.
		 */
		revocar() {
			let self = this
			if (this.mcp_revocando) {
				return
			}
			this.mcp_revocando = true
			this.$store.dispatch('ai_chat/revocarMcpConexion')
				.then(function () {
					self.mcp_revocando = false
					self.olvidar_clave()
					self.$toast.success('Conexión revocada')
				})
				.catch(function (err) {
					self.mcp_revocando = false
					console.log(err)
					self.$toast.error(self.mensaje_del_api(err, 'No pudimos revocar la conexión. Probá de nuevo.'))
				})
		},
		alternar_ejemplo(clave) {
			this.ejemplo_abierto = this.ejemplo_abierto == clave ? null : clave
		},
		/**
		 * Un campo de solo lectura se selecciona entero al tocarlo, así Ctrl+C también sirve.
		 */
		seleccionar_todo(event) {
			if (event && event.target && typeof event.target.select == 'function') {
				event.target.select()
			}
		},
		/**
		 * Copia al portapapeles y avisa con un toast. navigator.clipboard no existe fuera de
		 * HTTPS y puede estar bloqueado por permisos, así que queda el camino viejo del textarea
		 * (mismo criterio que el código de vinculación de sale-print-buttons).
		 *
		 * @param {String} texto
		 */
		copiar(texto) {
			let self = this
			if (!texto) {
				return
			}
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(texto)
					.then(function () {
						self.$toast.success('Copiado')
					})
					.catch(function () {
						self.copiar_con_textarea_temporal(texto)
					})
				return
			}
			this.copiar_con_textarea_temporal(texto)
		},
		/**
		 * El camino viejo: un textarea temporal + execCommand('copy'). Se cuelga ADENTRO del
		 * modal (this.$refs.conexion) y no de <body>: BootstrapVue devuelve el foco al modal en
		 * cuanto algo de afuera lo toma, y sin foco en el textarea no hay selección que copiar.
		 *
		 * @param {String} texto
		 */
		copiar_con_textarea_temporal(texto) {
			let contenedor = this.$refs.conexion || document.body
			let textarea = document.createElement('textarea')
			textarea.value = texto
			textarea.setAttribute('readonly', '')
			textarea.setAttribute('aria-hidden', 'true')
			textarea.style.position = 'absolute'
			textarea.style.left = '-9999px'
			textarea.style.top = '0'
			contenedor.appendChild(textarea)
			textarea.select()
			try {
				document.execCommand('copy')
				this.$toast.success('Copiado')
			} catch (error) {
				this.$toast.error('No se pudo copiar. Seleccioná el texto a mano y copialo con Ctrl+C.')
			}
			contenedor.removeChild(textarea)
		},
		/**
		 * El mensaje del API si lo mandó (403 del gate, 422, etc.), o el genérico. Un 401 se
		 * traduce: Laravel manda "Unauthenticated." crudo, y lo que el dueño puede hacer con eso
		 * es volver a entrar (con la sesión caída, el resto del modal tampoco va a andar).
		 *
		 * @param {Object} err
		 * @param {String} generico
		 * @returns {String}
		 */
		mensaje_del_api(err, generico) {
			let response = err && err.response ? err.response : null
			if (response && response.status == 401) {
				return 'Tu sesión venció. Volvé a entrar y probá de nuevo.'
			}
			return response && response.data && response.data.message
				? response.data.message
				: generico
		},
		/**
		 * dd/mm/aaaa a partir de un ISO del API (con la Z: moment lo pasa a hora local).
		 * Vacío si no hay fecha o no se entiende, para que la ficha no muestre "Invalid date".
		 *
		 * @param {String|null} valor
		 * @returns {String}
		 */
		fecha_corta(valor) {
			if (!valor) {
				return ''
			}
			let fecha = moment(valor)
			return fecha.isValid() ? fecha.format('DD/MM/YYYY') : ''
		},
		/**
		 * dd/mm/aaaa HH:mm, mismo criterio que fecha_corta.
		 *
		 * @param {String|null} valor
		 * @returns {String}
		 */
		fecha_con_hora(valor) {
			if (!valor) {
				return ''
			}
			let fecha = moment(valor)
			return fecha.isValid() ? fecha.format('DD/MM/YYYY HH:mm') : ''
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

// Sección 4 (misión asistente-mcp): la ficha de la conexión MCP. Es un bloque propio, con su
// anatomía adentro (`__intro`, `__estado`, `__clave`, `__url`, `__acciones`, `__ejemplo`...),
// porque no es una tarjeta elegible como las de las tres preguntas: tiene estado y acciones.
// Mismo molde visual que las tarjetas (borde, radio, fondo de tarjeta) para que se lea como
// parte del mismo modal. Todo con tokens del tema: el modo oscuro sale solo.
.config-agente__conexion
	display: flex
	flex-direction: column
	gap: 12px
	min-width: 0
	padding: 14px
	border-radius: 12px
	border: 1.5px solid var(--color-border, #dee2e6)
	background: var(--bg-card, #fff)

	&__intro
		font-size: .8rem
		line-height: 1.35
		color: var(--color-text-secondary, #6c757d)
		margin: 0

	// Cargando / no disponible / error: una línea discreta, sin caja.
	&__nota
		font-size: .85rem
		color: var(--color-text-secondary, #6c757d)
		margin: 0

	// "Conectada desde…" con el tilde en el único verde del tema que tiene contraparte oscura
	// (--caja-abierta-acento, el mismo del resultado de una tarjeta de AccionCard), y el último
	// uso debajo, atenuado.
	&__estado
		display: flex
		flex-direction: column
		gap: 2px
		font-size: .9rem
		font-weight: 600
		color: var(--color-text-primary, #212529)
		margin: 0

		i
			color: var(--caja-abierta-acento, #2f7d5d)
			margin-right: 4px

		small
			font-size: .8rem
			font-weight: 400
			color: var(--color-text-secondary, #6c757d)

	&__campo
		display: flex
		flex-direction: column
		gap: 4px
		min-width: 0

	&__etiqueta
		font-size: .72rem
		letter-spacing: .04em
		text-transform: uppercase
		color: var(--color-text-secondary, #6c757d)
		margin: 0

	// La clave y la URL comparten el molde: un campo de solo lectura que ocupa el ancho y el
	// botón Copiar pegado a la derecha. El `min-width: 0` del input es lo que evita que un token
	// largo empuje el botón fuera del modal a 375 px.
	&__clave, &__url
		display: flex
		align-items: stretch
		gap: 8px
		min-width: 0

	&__input
		flex: 1 1 auto
		min-width: 0
		font-family: SFMono-Regular, Menlo, Consolas, monospace
		font-size: .8rem
		padding: 6px 10px
		border-radius: 8px
		border: 1px solid var(--color-border-secondary, #e9ecef)
		background: var(--bg-section, #f8f9fa)
		color: var(--color-text-primary, #212529)
		text-overflow: ellipsis
		box-shadow: none

		&:focus
			outline: none
			border-color: var(--color-primary, #007bff)

	&__aviso
		font-size: .8rem
		color: var(--btn-peligro-texto, #9c3a36)
		margin: 0

	// Los botones se envuelven a la línea siguiente cuando no entran (375 px), nunca desbordan.
	&__acciones
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 8px 14px

	&__ayuda
		flex-basis: 100%
		font-size: .75rem
		color: var(--color-text-secondary, #6c757d)
		margin: 0

	// Un botón que se lee como texto (Revocar, Reintentar, Cancelar, ocultar la clave): sin
	// fondo, sin borde y sin la sombra que common-vue/sass/_inputs.sass le pone a todo <button>.
	&__link
		background: none
		border: none
		padding: 0
		box-shadow: none
		font-size: .85rem
		color: var(--color-primary, #007bff)

		&:hover
			text-decoration: underline

		&:disabled
			opacity: .5
			cursor: default
			text-decoration: none

		&--peligro
			color: var(--btn-peligro-texto, #9c3a36)

	// El segundo clic de Revocar: la pregunta y los dos botones, en una caja atenuada.
	&__confirmacion
		display: flex
		flex-direction: column
		gap: 10px
		padding: 10px 12px
		border-radius: 10px
		font-size: .85rem
		color: var(--color-text-primary, #212529)
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border-secondary, #e9ecef)

	// Los bloques plegables de configuración lista para pegar: una lista con renglones
	// separados por una línea, sin caja adentro de la caja.
	&__ejemplos
		display: flex
		flex-direction: column
		min-width: 0
		border-top: 1px solid var(--color-border-secondary, #e9ecef)

	&__ejemplo
		min-width: 0
		border-bottom: 1px solid var(--color-border-secondary, #e9ecef)

	&__ejemplo-titulo
		display: flex
		align-items: center
		gap: 8px
		width: 100%
		padding: 10px 0
		background: none
		border: none
		box-shadow: none
		text-align: left
		font-size: .88rem
		font-weight: 600
		color: var(--color-text-primary, #212529)

		i
			font-size: .75rem
			color: var(--color-text-secondary, #6c757d)
			transition: transform .15s ease

		&--abierto i
			transform: rotate(90deg)

	&__ejemplo-cuerpo
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 8px
		padding: 0 0 12px 0

	// El snippet: se envuelve y se parte donde haga falta (una URL o una clave no tienen
	// espacios), así NUNCA desborda el modal a 375 px ni genera scroll horizontal. Sin
	// overflow-x: si algo no entra, se parte; no se esconde ni se scrollea. El `overflow: visible`
	// pisa el `overflow: auto` que el reboot de Bootstrap le pone a todo <pre>.
	&__codigo
		width: 100%
		max-width: 100%
		margin: 0
		padding: 10px 12px
		border-radius: 8px
		border: 1px solid var(--color-border-secondary, #e9ecef)
		background: var(--bg-section, #f8f9fa)
		color: var(--color-text-primary, #212529)
		font-family: SFMono-Regular, Menlo, Consolas, monospace
		font-size: .8rem
		line-height: 1.45
		white-space: pre-wrap
		word-break: break-all
		overflow-wrap: anywhere
		overflow: visible

@media (prefers-reduced-motion: reduce)
	.config-agente__conexion__ejemplo-titulo i
		transition: none

html.dark-mode .config-agente__opcion--activa
	// El azul de acción del tema oscuro (--color-primary #4da3ff) en baja opacidad: el #007bff
	// del claro sobre el fondo oscuro del modal queda demasiado apagado para leerse como realce.
	background: rgba(77, 163, 255, .16)
</style>
