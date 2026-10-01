<template>
	<div
	class="cc-toolbar">

		<!--
			Grupo 1: el período. Es lo único de la barra que cambia lo que la tabla muestra, así que va
			primero. Reemplazó al campo "Últimos [N] movimientos" + "Buscar" (1/10/2026): ahora se elige
			un atajo o un rango de fechas, y el período activo se ve SIEMPRE en el disparador.
		-->
		<div
		class="cc-toolbar__grupo cc-periodo">
			<b-dropdown
			ref="periodo_dropdown"
			class="cc-toolbar__dropdown cc-periodo__dropdown"
			variant="light"
			:toggle-attrs="{ 'aria-label': 'Período de la cuenta corriente: ' + texto_periodo }"
			@show="prepararPersonalizado">
				<template #button-content>
					<i class="bi bi-calendar3"></i>
					<span
					class="cc-toolbar__label cc-periodo__etiqueta">
						Período:
					</span>
					<span
					class="cc-periodo__texto">
						{{ texto_periodo }}
					</span>
				</template>
				<b-dropdown-item
				v-for="atajo in atajos"
				:key="atajo.clave"
				:active="periodo.clave == atajo.clave"
				@click="elegirAtajo(atajo.clave)">
					{{ atajo.nombre }}
				</b-dropdown-item>
				<b-dropdown-divider></b-dropdown-divider>
				<!--
					El form NO cierra el menú al tocar un campo (a diferencia de un b-dropdown-item): se
					cierra recién al aplicar. El submit por Enter hace lo mismo que el botón.
				-->
				<b-dropdown-form
				class="cc-periodo__form"
				@submit.prevent="aplicarPersonalizado">
					<p
					class="cc-periodo__titulo">
						Personalizado
					</p>
					<label
					class="cc-periodo__campo"
					for="cc-periodo-desde">
						Desde
						<input
						id="cc-periodo-desde"
						v-model="desde_input"
						class="form-control cc-periodo__fecha"
						aria-label="Fecha desde"
						type="date">
					</label>
					<label
					class="cc-periodo__campo"
					for="cc-periodo-hasta">
						Hasta
						<input
						id="cc-periodo-hasta"
						v-model="hasta_input"
						class="form-control cc-periodo__fecha"
						aria-label="Fecha hasta"
						type="date">
					</label>
					<p
					v-if="rango_invertido"
					class="cc-periodo__error"
					role="alert">
						La fecha desde no puede ser posterior a la fecha hasta.
					</p>
					<b-button
					class="cc-toolbar__btn cc-toolbar__btn--acento cc-periodo__aplicar"
					variant="primary"
					type="submit"
					:disabled="!personalizado_valido">
						Aplicar
					</b-button>
				</b-dropdown-form>
			</b-dropdown>

			<!--
				Si la API devolvió un período ampliado (por defecto, con menos de 10 movimientos en el
				rango pedido) se avisa: de otro modo las fechas del disparador no coincidirían con las
				del mes anterior y actual y parecería un error.
			-->
			<span
			v-if="periodo_ampliado"
			class="cc-periodo__aviso"
			role="status">
				Se amplió el período para mostrar al menos 10 movimientos.
			</span>
		</div>

		<!--
			Grupo 2: las acciones sobre la cuenta. Ninguna cambia lo que se ve en pantalla, asi que
			van todas neutras: lo que filtra es el período de la izquierda.
		-->
		<div
		class="cc-toolbar__grupo cc-toolbar__grupo--acciones">
			<!--
				Era `variant="danger"`: una impresora ROJA, sin texto y sin title. El rojo es el
				color de lo destructivo en todo el sistema y esto imprime un resumen.
			-->
			<b-dropdown
			class="cc-toolbar__dropdown"
			data-tour="cuentas_corrientes.dropdown_imprimir"
			variant="light"
			:disabled="current_acounts.length == 0"
			right>
				<template #button-content>
					<i class="bi bi-printer"></i>
					Imprimir
				</template>
				<b-dropdown-item @click="print('simple')">
					Resumen
				</b-dropdown-item>
				<b-dropdown-item @click="print('details')">
					Con desglose
				</b-dropdown-item>
			</b-dropdown>

			<b-button
			v-if="from_model.current_acounts_count == 0"
			class="cc-toolbar__btn"
			variant="light"
			title="Cargar el saldo con el que arranca esta cuenta"
			@click="saldoInicial">
				<i class="bi bi-flag"></i>
				Saldo inicial
			</b-button>

			<btn-loader
			class="cc-toolbar__btn"
			:block="false"
			:loader="checking"
			variant="light"
			icon_class="bi bi-arrow-repeat"
			text="Chequear saldos"
			@clicked="checkSaldos">
			</btn-loader>
		</div>
	</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'
import { env } from '@/runtime_config'
import { FECHA_INICIO_HISTORIAL, rangoDeAtajo, paramsDePeriodo } from '@/store/current_acount'

// Atajos del menú de período. La clave es la que entiende rangoDeAtajo() del store.
const ATAJOS = [
	{ clave: 'defecto', nombre: 'Mes anterior y actual' },
	{ clave: 'este_mes', nombre: 'Este mes' },
	{ clave: 'mes_anterior', nombre: 'Mes anterior' },
	{ clave: 'ultimos_30_dias', nombre: 'Últimos 30 días' },
	{ clave: 'ultimos_3_meses', nombre: 'Últimos 3 meses' },
	{ clave: 'este_anio', nombre: 'Este año' },
	{ clave: 'todo', nombre: 'Todo el historial' },
]

// 'YYYY-MM-DD' -> 'DD/MM/YYYY', sin pasar por Date para que la zona horaria no corra el día.
function fechaLegible(fecha) {
	let partes = String(fecha).split('-')
	return partes.length == 3 ? partes[2] + '/' + partes[1] + '/' + partes[0] : fecha
}

export default {
	name: 'CurrentAcountsNav',
	mixins: [current_acounts],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			checking: false,
			atajos: ATAJOS,
			// Valores de los dos campos del rango personalizado (se precargan al abrir el menú).
			desde_input: '',
			hasta_input: '',
		}
	},
	computed: {
		periodo() {
			return this.$store.state.current_acount.periodo
		},
		periodo_efectivo() {
			return this.$store.state.current_acount.periodo_efectivo
		},
		periodo_ampliado() {
			return !!(this.periodo_efectivo && this.periodo_efectivo.ampliado)
		},
		/**
		 * Texto del período activo. Con el período efectivo que devolvió la API se ve también el
		 * ampliado. Si la API es vieja y no manda `periodo`, NO se inventan fechas que no se
		 * aplicaron: se dice que son los últimos 10, que es lo que esa API devuelve.
		 */
		texto_periodo() {
			if (this.periodo.clave == 'todo') {
				return 'Todo el historial'
			}
			let rango = this.periodo_efectivo
			if (!rango) {
				if (!this.loading) {
					return 'Últimos 10 movimientos'
				}
				// Mientras carga se muestra lo pedido.
				rango = paramsDePeriodo(this.periodo)
			}
			if (!rango.hasta) {
				return 'Desde ' + fechaLegible(rango.desde)
			}
			return fechaLegible(rango.desde) + ' – ' + fechaLegible(rango.hasta)
		},
		rango_invertido() {
			return !!(this.desde_input && this.hasta_input && this.desde_input > this.hasta_input)
		},
		personalizado_valido() {
			return !!(this.desde_input && this.hasta_input) && !this.rango_invertido
		},
		loading() {
			return this.$store.state.current_acount.loading
		},
        client() {
            return this.$store.state.current_acount.client
        },
        can_print() {
        	return this.selected_current_acounts.length == 0 || this.is_selected_printable
        },
        is_selected_printable() {
        	return this.selected_current_acounts.length == 1 && (this.selected_current_acounts[0].status == 'nota_credito' || this.selected_current_acounts[0].status == 'pago_from_client')
        }
	},
	methods: {
		checkSaldos() {
			this.checking = true
			this.$api.get('check-saldos/'+this.from_credit_account.id)
			.then(() => {
				this.checking = false
				this.$store.dispatch('current_acount/getModels')
			})
			.catch(err => {
				this.checking = false
			})
		},
        saldoInicial() {
            // this.$store.commit('clients/setSaldoInicial', this.client)
            this.$bvModal.show('saldo-inicial')
        },
		/**
		 * Aplica un período y recarga al toque. El por defecto guarda las fechas en null: las calcula
		 * el store en cada pedido, así una SPA que quedó abierta días no arrastra un "hoy" viejo.
		 */
		aplicarPeriodo(modo, clave, desde, hasta) {
			this.$store.commit('current_acount/set_periodo', { modo, clave, desde, hasta })
			this.$store.dispatch('current_acount/getModels')
		},
		elegirAtajo(clave) {
			if (clave == 'defecto') {
				return this.aplicarPeriodo('defecto', 'defecto', null, null)
			}
			let rango = rangoDeAtajo(clave)
			this.aplicarPeriodo('atajo', clave, rango.desde, rango.hasta)
		},
		/**
		 * Precarga los campos del rango personalizado con el período que se está viendo, para que
		 * ajustar una fecha no obligue a tipear las dos. "Todo el historial" arranca en 2000 y no
		 * sirve de punto de partida: ahí se precarga el rango por defecto.
		 */
		prepararPersonalizado() {
			let rango = null
			if (this.periodo.clave != 'todo') {
				rango = this.periodo_efectivo
			}
			if (!rango || !rango.desde) {
				rango = rangoDeAtajo('defecto')
			}
			this.desde_input = rango.desde
			this.hasta_input = rango.hasta ? rango.hasta : ''
		},
		aplicarPersonalizado() {
			if (!this.personalizado_valido) {
				return
			}
			this.aplicarPeriodo('personalizado', 'personalizado', this.desde_input, this.hasta_input)
			this.$refs.periodo_dropdown.hide(true)
		},
		/**
		 * El PDF sale con el período que se ve. La cantidad del medio es la de movimientos en
		 * pantalla (o 10): es lo que imprime una API vieja que ignora las fechas, así el papel
		 * coincide con la pantalla igual. "Todo el historial" va con 2000-01-01 y sin `hasta`.
		 */
		print(detail) {
			let desde = FECHA_INICIO_HISTORIAL
			let hasta = null
			if (this.periodo.clave != 'todo') {
				let rango = this.periodo_efectivo ? this.periodo_efectivo : paramsDePeriodo(this.periodo)
				desde = rango.desde
				hasta = rango.hasta
			}
			let cantidad = this.current_acounts.length || 10
			let link = env('VUE_APP_API_URL')+'/current-acount/pdf/'+this.from_credit_account.id+'/'+cantidad+'/'+detail+'?desde='+desde
			if (hasta) {
				link += '&hasta='+hasta
			}
			window.open(link)
		},
	}
}
</script>
<style lang="sass">
// ══════════════════════════════════════════════════════════════════════════════════════════════
// BARRA DE ENCABEZADO DEL MODAL DE CUENTA CORRIENTE (21/8/2026)
//
// Es lo que Lucas llama "los botones del header del modal". No es el `.modal-header` de bootstrap
// --ese solo tiene el titulo y la cruz--: es la primera franja del cuerpo, y hasta hoy era un
// `display: flex` en fila SIN `flex-wrap`, con cinco controles de tres alturas distintas y sus
// margenes escritos uno por uno (`m-l-15` en cada boton). En 360px de ancho eso no se acomodaba:
// se iba de la caja.
//
// El vocabulario --altura, radio, separacion, sombra, el neutro por defecto y el unico acento--
// es el de la barra de encabezado de los listados (_toolbar_botones.sass, mision 13). No se
// eligen valores nuevos: se toman los tokens que Index.vue ya deja declarados en
// `.cuenta-corriente-modal`.
//
// El <style> NO lleva `scoped` porque tiene que alcanzar el b-dropdown y el BtnLoader, que son
// componentes hijos. Todo va anidado bajo `.cc-toolbar`, que es lo que evita que se filtre.
// ══════════════════════════════════════════════════════════════════════════════════════════════
.cc-toolbar
	display: flex
	flex-direction: row
	flex-wrap: wrap
	align-items: center
	justify-content: space-between
	// La separacion entre grupos y entre controles la da el gap del contenedor, nunca el margen
	// de cada hijo: con margenes propios, la distancia entre un par de botones y el siguiente
	// queda despareja en cuanto uno de los dos se oculta por un v-if (y aca hay uno: "Saldo
	// inicial" solo aparece si la cuenta no tiene movimientos).
	gap: var(--cc-grupo-gap, 16px)
	padding: 14px 20px
	background: var(--bg-section)
	border-bottom: 1px solid var(--color-border)

	.cc-toolbar__grupo
		display: flex
		flex-direction: row
		flex-wrap: wrap
		align-items: center
		gap: var(--cc-gap, 8px)

	// 🔴 Sin `margin-left: auto`, y el motivo importa porque es contraintuitivo: en flexbox los
	// margenes `auto` absorben el espacio libre ANTES de que se aplique `justify-content`, asi que
	// un `margin-left: auto` empuja el grupo al borde derecho TAMBIEN cuando quedo solo en su
	// linea. En tablet la barra envuelve justo (los cinco controles miden mas que el cuerpo del
	// modal-xl a 768px), y el resultado era la primera fila pegada a la izquierda y la segunda
	// pegada a la derecha, escalonadas. El `space-between` del contenedor ya manda las acciones al
	// borde derecho mientras entran en una linea, que es lo unico que se buscaba.
	.cc-toolbar__label
		margin: 0
		font-size: 0.8125rem
		font-weight: 500
		color: var(--color-text-secondary)
		white-space: nowrap

	// ─── El menú de período (1/10/2026) ────────────────────────────────────────────────────
	// El disparador muestra el período activo, así que puede ser largo ("Período: 01/09/2026 –
	// 01/10/2026"). En teléfono (360px) esa línea más el ícono y el caret rozan el ancho útil de
	// la barra: se esconde la etiqueta "Período:" (el aria-label la sigue diciendo) y, si aun así no
	// entra, el texto corta con puntos suspensivos en vez de desbordar la caja.
	.cc-periodo
		flex-direction: column
		align-items: flex-start
		gap: 4px
		min-width: 0
		max-width: 100%

	.cc-periodo__dropdown
		max-width: 100%

		> .btn
			max-width: 100%

	.cc-periodo__texto
		overflow: hidden
		text-overflow: ellipsis

	@media screen and (max-width: 480px)
		.cc-periodo__etiqueta
			display: none

	// Línea chica de aviso del período ampliado.
	.cc-periodo__aviso
		font-size: 0.75rem
		color: var(--color-text-secondary)

	// El menú no puede quedar cortado en 360px: el min-width de Bootstrap (10rem) y el ancho del
	// form no superan el viewport. El overflow es del menú, no de la página.
	.cc-periodo__dropdown .dropdown-menu
		min-width: min(280px, calc(100vw - 24px))
		max-width: calc(100vw - 24px)
		max-height: 70vh
		overflow-y: auto
		overflow-x: hidden

	.cc-periodo__form
		.b-dropdown-form
			padding: 8px 16px

	.cc-periodo__titulo
		margin: 0 0 8px
		font-size: 0.75rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary)

	.cc-periodo__campo
		display: flex
		flex-direction: column
		gap: 4px
		margin: 0 0 10px
		font-size: 0.8125rem
		font-weight: 500
		color: var(--color-text-secondary)

	// El campo va con el radio de boton y no en capsula. La convención del rediseño es explícita:
	// la cápsula es del CAMPO DE BÚSQUEDA, y esto es una fecha, no una búsqueda.
	//
	// 🔴 El selector suma `.form-control` --que el input ya trae de bootstrap-- y no es de más:
	// `html.dark-mode .form-control, ...` de _dark_theme.sass es (0,2,1) y le ganaba a un selector
	// de dos clases en `background-color`: en modo oscuro el campo se fundía con el menú. Con la
	// clase de más queda (0,3,0) y gana.
	.cc-periodo__fecha.form-control
		width: 100%
		height: var(--cc-control-h, 36px)
		padding: 0 10px
		font-size: 0.875rem
		border-radius: var(--cc-btn-radio, 10px)
		border: 1px solid var(--color-border)
		background: var(--bg-card)
		color: var(--color-text-primary)
		box-shadow: none

		&:focus
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15)

	// El selector de fecha nativo (el ícono del calendario) se dibuja según color-scheme: sin esto
	// en modo oscuro queda negro sobre el fondo oscuro.
	.dark-mode &
		.cc-periodo__fecha.form-control
			color-scheme: dark

	.cc-periodo__error
		margin: 0 0 8px
		font-size: 0.75rem
		color: var(--color-text-danger-strong, #dc3545)

	.cc-periodo__aplicar
		width: 100%

	// Altura unica para TODO lo que vive en la barra: botones, el BtnLoader y el disparador del
	// dropdown. El `> .btn` del segundo selector es porque b-dropdown recibe la clase en su
	// contenedor, no en el boton.
	.cc-toolbar__btn,
	.cc-toolbar__dropdown > .btn
		height: var(--cc-control-h, 36px)
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 6px
		padding: 0 12px
		font-size: 0.875rem
		font-weight: 500
		line-height: 1
		border-radius: var(--cc-btn-radio, 10px)
		box-shadow: var(--cc-btn-sombra, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)
		white-space: nowrap
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

	// Neutro por defecto, igual que en la barra de los listados: el color de la paleta no cambia,
	// cambia donde se aplica. Antes convivian tres rellenos macizos (dos azules y un rojo) que no
	// comunicaban jerarquia sino el momento en que se habia agregado cada boton.
	//
	// 🔴 El selector del dropdown suma `.btn-light` --la variante que le pasa el template-- y no
	// es ruido: con el menu DESPLEGADO, bootstrap declara
	// `.show > .btn-light.dropdown-toggle { background-color: #dae0e5 }`, que es (0,3,0), igual
	// que `.cc-toolbar .cc-toolbar__dropdown > .btn`. Un empate lo decide el orden de la hoja
	// final, y en este proyecto bootstrap se reemite entero desde ~30 <style> de componente, varios
	// de ellos chunks hermanos de este: el orden no es predecible. Con (0,4,0) gana siempre. Es la
	// misma razon por la que _toolbar_botones.sass encadena :not() en sus selectores.
	.cc-toolbar__btn:not(.cc-toolbar__btn--acento),
	.cc-toolbar__dropdown > .btn.btn-light
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		color: var(--color-text-primary)

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--bg-hover)
			border-color: var(--color-border)
			color: var(--color-text-primary)

		i
			color: inherit

	// Y con el menu abierto tampoco: la clase `.show` la pone bootstrap en el contenedor.
	.cc-toolbar__dropdown.show > .btn.btn-light
		background: var(--bg-hover)
		border-color: var(--color-border)
		color: var(--color-text-primary)

	// La unica accion con peso visual de la barra: es la que vuelve a pedir los movimientos, o sea
	// la unica que cambia lo que se ve en pantalla.
	.cc-toolbar__btn--acento
		background: var(--color-primary)
		border: 1px solid var(--color-primary)
		// Literal a proposito: texto sobre el azul de accion, que es el mismo en los dos modos.
		color: #fff

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--color-primary)
			border-color: var(--color-primary)
			color: #fff
			filter: brightness(0.94)

	// El caret del dropdown pegado al texto se lee como parte de la palabra.
	.cc-toolbar__dropdown > .btn::after
		margin-left: 4px

	// Los iconos `icon-*` del sistema se dibujan con un ::before al que _generals.sass le
	// pone `top: .15em` y margenes laterales, pensado para un icono adentro de un parrafo.
	// En un boton flex el centrado lo da el contenedor, asi que se apaga. El reset va sobre
	// el ::before y no sobre el <i>: la regla global apunta al pseudoelemento, y sobre el <i>
	// no vencia nada. Los `bi bi-*` ni siquiera entran por ahi --el selector es
	// [class^='icon-'] y ellos empiezan con `bi`--, pero el resto de esta regla si los toca.
	i,
	i::before
		top: 0
		margin: 0
		line-height: 1

	// El spinner del BtnLoader trae `margin-right: .1em` propio, que ademas del gap del boton deja
	// la separacion desigual respecto de los otros dos.
	.spinner-border
		margin: 0
</style>
