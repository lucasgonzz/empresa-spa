<template>
<!--
	Misión eliminar-sucursal-con-stock (5/10/2026): la ventana que pregunta QUÉ HACER ANTES de
	eliminar una sucursal. La abre src/common-vue/views/Abm.vue (solo para el modelo `address`) cuando
	el usuario aprieta "Eliminar" en el formulario de la sucursal.

	Antes el botón abría un "¿Seguro que quiere eliminar la sucursal?" y mandaba un DELETE pelado:
	la API daba de baja el stock sin preguntar, dejaba a los empleados y a Vender apuntando a la
	sucursal muerta y dejaba filas de stock "fantasma" que no se ven en ninguna sucursal pero siguen
	sumando al stock total (caso 3DTisk). Ahora la API (GET address/{id}/eliminar-resumen) cuenta qué
	tiene la sucursal y esta ventana deja decidir cada cosa:

	1. STOCK: pasarlo a otra sucursal (el stock total no cambia) o descartarlo (el stock total baja).
		Si es la única sucursal no hay a dónde pasarlo: los artículos conservan su stock total.
	2. EMPLEADOS que la tienen elegida: pasarlos a otra sucursal o dejarlos sin sucursal.
	3. CONFIGURACIÓN: si es el depósito por defecto / madre / de origen, o tiene cajas, puntos de
		venta o clientes asignados, hereda todo una sucursal de reemplazo.

	Lo que NO se pregunta y se avisa: las ventas, presupuestos y compras que ya la nombran se
	conservan tal cual (la historia no se reescribe); solo van a figurar sin sucursal.

	Tres caminos de salida, y los tres están pensados porque la SPA y la API no llegan a producción
	al mismo tiempo:

	- API NUEVA, todo en línea: 200, la sucursal se saca de la lista y se limpia lo que la SPA
		recordaba de ella (Vender, cookie, usuario: ver `limpiar_referencias_locales` en
		src/store/address.js).
	- API NUEVA, muchos artículos: 202. La API lo encoló y la sucursal SIGUE EXISTIENDO hasta que el
		proceso termina: no se saca de la lista. El avance se ve en el panel de procesos de arriba a la
		derecha.
	- API VIEJA (el resumen da 404) o sin conexión al abrir: MODO CLÁSICO. Se muestra el aviso de
		siempre ("se eliminará la sucursal y su stock se dará de baja") y se manda el DELETE sin
		parámetros, que la API vieja resuelve como siempre y la nueva rechaza con un 422 si hay algo
		que decidir (se muestra acá adentro).

	Un 422 (o cualquier error) del borrado NO lo muestra el interceptor global: se muestra en el pie
	de esta ventana, que queda abierta con lo elegido para corregir. El pie y no el cuerpo, porque el
	cuerpo hace scroll y el botón está abajo: el error tiene que estar donde mira el usuario.

	Métodos públicos (por ref): `abrir_eliminar_sucursal(sucursal)`.
-->
<b-modal
:id="id_modal"
dialog-class="eliminar-sucursal__dialog"
title="Eliminar sucursal"
scrollable
data-testid="modal-eliminar-sucursal"
:no-close-on-backdrop="eliminando"
:no-close-on-esc="eliminando"
:hide-header-close="eliminando"
@hidden="al_cerrar_modal">

	<!--
		MODO CLÁSICO: no se pudo consultar el detalle (API vieja o sin conexión). Es el aviso de
		siempre y el DELETE de siempre.
	-->
	<div
	v-if="modo_clasico"
	data-testid="eliminar-sucursal-modo-clasico">
		<p class="eliminar-sucursal__texto">
			Se eliminará la sucursal <strong>{{ nombre_sucursal }}</strong> y su stock se dará de baja.
		</p>
		<p class="eliminar-sucursal__nota">
			No pudimos consultar el detalle de lo que tiene cargado, así que se elimina de la forma de siempre.
		</p>
	</div>

	<div v-else-if="resumen">

		<p class="eliminar-sucursal__texto">
			Vas a eliminar <strong>{{ nombre_sucursal }}</strong>.
			<template v-if="hay_algo_que_decidir || tiene_ventas">
				Esto es lo que tiene y lo que va a pasar con cada cosa.
			</template>
		</p>

		<!--
			Lo que impide eliminarla ahora (hoy: traslados de stock pendientes que la usan). El mensaje lo
			arma la API y dice qué hacer; el botón queda deshabilitado mientras estén.
		-->
		<b-alert
		v-for="(bloqueo, indice) in bloqueos"
		:key="'bloqueo-' + indice"
		show
		variant="danger"
		data-testid="eliminar-sucursal-bloqueo">
			{{ bloqueo.mensaje }}
		</b-alert>

		<b-alert
		v-if="resumen.ya_en_proceso"
		show
		variant="warning"
		data-testid="eliminar-sucursal-ya-en-proceso">
			Esta sucursal ya se está eliminando en segundo plano. Esperá a que termine.
		</b-alert>

		<b-alert
		v-else-if="resumen.en_segundo_plano"
		show
		variant="info"
		data-testid="eliminar-sucursal-en-segundo-plano">
			Son muchos artículos: la eliminación se procesa en segundo plano y la sucursal desaparece de la lista cuando termina.
		</b-alert>

		<!-- Nada que decidir: se elimina sin más. -->
		<p
		v-if="!hay_algo_que_decidir"
		class="eliminar-sucursal__texto"
		data-testid="eliminar-sucursal-sin-nada">
			<template v-if="resumen.es_domicilio_de_comprador">
				Es un domicilio de un comprador de la tienda: se elimina sin tocar stock.
			</template>
			<template v-else>
				No tiene stock, empleados ni configuración asociada: se elimina sin más.
			</template>
		</p>

		<!-- STOCK -->
		<section
		v-if="hay_stock"
		class="eliminar-sucursal__bloque"
		data-testid="eliminar-sucursal-bloque-stock">
			<h6 class="eliminar-sucursal__titulo">Stock</h6>

			<p class="eliminar-sucursal__texto eliminar-sucursal__texto--bloque">
				{{ texto_stock }}
			</p>
			<p
			v-if="Number(stock.filas_negativas) > 0"
			class="eliminar-sucursal__nota">
				{{ texto_stock_negativo }}
			</p>
			<p
			v-if="Number(stock.articulos_en_papelera) > 0"
			class="eliminar-sucursal__nota">
				{{ texto_stock_en_papelera }}
			</p>

			<!--
				Es la única sucursal: no hay a dónde pasar el stock ni qué sumar. La API deja el stock
				total de los artículos como está y borra solo el detalle por sucursal.
			-->
			<p
			v-if="es_la_ultima"
			class="eliminar-sucursal__aviso"
			data-testid="eliminar-sucursal-es-la-ultima">
				Es tu única sucursal: no hay a dónde pasar el stock. Los artículos conservan su stock total y vuelven a manejarse sin depósitos.
			</p>

			<div v-else class="eliminar-sucursal__opciones">
				<b-form-radio
				v-model="stock_accion"
				name="eliminar-sucursal-stock-accion"
				value="transferir"
				data-testid="eliminar-sucursal-stock-transferir">
					Pasar el stock a otra sucursal
					<span class="eliminar-sucursal__subtexto">
						Se suma al stock de la sucursal que elijas y queda un movimiento entre depósitos en cada artículo. El stock total de cada artículo no cambia.
					</span>
				</b-form-radio>

				<!--
					El destino se ve siempre, colgado de la opción de pasar el stock. Elegir una sucursal acá ya
					es elegir "pasar el stock" (no hace falta tocar antes el radio), y con "descartar" queda
					deshabilitado: no se puede pasar a una sucursal y descartar a la vez.
				-->
				<b-form-group
				label="Sucursal de destino"
				label-for="eliminar-sucursal-stock-destino"
				class="eliminar-sucursal__campo">
					<b-form-select
					id="eliminar-sucursal-stock-destino"
					v-model="stock_destino_id"
					:options="opciones_de_destino"
					:disabled="stock_accion === 'descartar'"
					data-testid="eliminar-sucursal-stock-destino"
					@change="stock_accion = 'transferir'"></b-form-select>
				</b-form-group>

				<b-form-radio
				v-model="stock_accion"
				name="eliminar-sucursal-stock-accion"
				value="descartar"
				data-testid="eliminar-sucursal-stock-descartar">
					No hacer nada: descartar el stock de esta sucursal
				</b-form-radio>

				<b-alert
				v-if="stock_accion === 'descartar'"
				show
				variant="warning"
				class="eliminar-sucursal__alerta"
				data-testid="eliminar-sucursal-aviso-descartar">
					El stock total de cada artículo baja en lo que tenía esta sucursal. Queda un movimiento "Eliminación de sucursal" en cada artículo.
					<template v-if="Number(stock.filas_negativas) > 0">
						Los que tenían stock negativo acá suben en esa cantidad.
					</template>
				</b-alert>
			</div>
		</section>

		<!-- EMPLEADOS -->
		<section
		v-if="usuarios.length"
		class="eliminar-sucursal__bloque"
		data-testid="eliminar-sucursal-bloque-usuarios">
			<h6 class="eliminar-sucursal__titulo">Empleados</h6>

			<p class="eliminar-sucursal__texto eliminar-sucursal__texto--bloque">
				Esta sucursal es la elegida de: <strong>{{ nombres_de_usuarios }}</strong>.
			</p>

			<b-form-group
			label="Pasarlos a"
			label-for="eliminar-sucursal-usuarios-destino"
			class="eliminar-sucursal__campo">
				<b-form-select
				id="eliminar-sucursal-usuarios-destino"
				v-model="usuarios_destino_id"
				:options="opciones_de_usuarios"
				data-testid="eliminar-sucursal-usuarios-destino"
				@change="usuarios_destino_tocado = true"></b-form-select>
			</b-form-group>
		</section>

		<!-- CONFIGURACIÓN: marcas, cajas, puntos de venta y clientes -->
		<section
		v-if="hay_para_heredar"
		class="eliminar-sucursal__bloque"
		data-testid="eliminar-sucursal-bloque-configuracion">
			<h6 class="eliminar-sucursal__titulo">Configuración</h6>

			<ul
			v-if="lineas_de_marcas.length"
			class="eliminar-sucursal__lista">
				<li
				v-for="(linea, indice) in lineas_de_marcas"
				:key="'marca-' + indice">
					{{ linea }}
				</li>
			</ul>

			<p
			v-if="texto_de_asignados"
			class="eliminar-sucursal__texto eliminar-sucursal__texto--bloque">
				{{ texto_de_asignados }}
			</p>

			<!-- Hereda lo mismo que el stock o los empleados: no hay nada que elegir, solo se informa. -->
			<p
			v-if="reemplazo_sigue_a_otro_destino"
			class="eliminar-sucursal__nota"
			data-testid="eliminar-sucursal-reemplazo-implicito">
				<template v-if="nombre_del_destino_implicito">
					Todo eso pasa a <strong>{{ nombre_del_destino_implicito }}</strong>.
				</template>
				<template v-else>
					Todo eso pasa a la sucursal que elijas arriba.
				</template>
			</p>

			<b-form-group
			v-else-if="otras_sucursales.length"
			label="Sucursal que hereda esto"
			label-for="eliminar-sucursal-reemplazo"
			:description="requiere_reemplazo ? '' : 'Si no elegís ninguna, las cajas, los puntos de venta y los clientes quedan para todas las sucursales.'"
			class="eliminar-sucursal__campo">
				<b-form-select
				id="eliminar-sucursal-reemplazo"
				v-model="reemplazo_id"
				:options="opciones_de_reemplazo"
				data-testid="eliminar-sucursal-reemplazo"></b-form-select>
			</b-form-group>

			<p
			v-else
			class="eliminar-sucursal__nota">
				Como es tu única sucursal, las cajas, los puntos de venta y los clientes quedan para todas las sucursales.
			</p>
		</section>

		<!-- VENTAS: no se tocan, y se dice -->
		<p
		v-if="tiene_ventas"
		class="eliminar-sucursal__nota eliminar-sucursal__nota--ventas"
		data-testid="eliminar-sucursal-ventas">
			Tiene ventas registradas: se conservan tal cual, pero van a figurar sin sucursal.
		</p>

	</div>

	<template #modal-footer>
		<div class="eliminar-sucursal__pie">

			<b-alert
			v-if="error_api"
			show
			variant="danger"
			class="eliminar-sucursal__error"
			data-testid="eliminar-sucursal-error">
				{{ error_api }}
			</b-alert>

			<div class="eliminar-sucursal__acciones">
				<b-button
				variant="outline-secondary"
				:disabled="eliminando"
				data-testid="btn-cancelar-eliminar-sucursal"
				@click="cerrar_modal">
					Cancelar
				</b-button>
				<b-button
				variant="danger"
				:disabled="!puede_confirmar"
				data-testid="btn-confirmar-eliminar-sucursal"
				@click="confirmar_eliminar">
					<b-spinner
					v-if="eliminando"
					small
					class="m-r-5"></b-spinner>
					Eliminar sucursal
				</b-button>
			</div>

		</div>
	</template>

</b-modal>
</template>
<script>
import { collect_laravel_validation_messages } from '@/utils/laravel_validation_toast'

/*
	El id del b-modal. 🔴 Tiene que ser único en toda la app: esta ventana se abre ENCIMA del
	formulario de la sucursal (cuyo id es `address`), y un id repetido haría que `$bvModal.hide`
	cerrara la ventana equivocada. También es el selector del bloque de estilos de abajo.
*/
const ID_MODAL = 'eliminar-sucursal'

/* Id del formulario de la sucursal (el `model_name` del ABM), que se cierra junto con esta ventana. */
const ID_MODAL_FORMULARIO = 'address'

/* Cómo se nombra cada marca que devuelve la API en `marcas` (los nombres de los campos de la sucursal). */
const TEXTO_DE_MARCAS = {
	default_address: 'Es el depósito por defecto.',
	es_deposito_madre: 'Es el depósito madre.',
	es_deposito_origen: 'Es el depósito de origen para sugerencias.',
}

export default {
	data() {
		return {
			id_modal: ID_MODAL,

			// La sucursal sobre la que se abrió la ventana
			address_id: null,
			nombre_sucursal: '',

			/*
				Lo que devolvió GET address/{id}/eliminar-resumen, o null si todavía no llegó o si la
				ventana está en modo clásico. El contrato está en el plan de la misión (§4, en
					_cruzado/misiones/20261005-eliminar-sucursal-con-stock/plan.md).
			*/
			resumen: null,

			// true si no se pudo consultar el resumen (API vieja, sin conexión): aviso y DELETE de siempre
			modo_clasico: false,

			// true mientras el DELETE está en vuelo
			eliminando: false,

			// El mensaje del último error del borrado (422, 404, 5xx, sin conexión). '' = ninguno.
			error_api: '',

			// 'transferir' | 'descartar' | null. Arranca en null: el usuario elige a propósito.
			stock_accion: null,
			// Sucursal que recibe el stock. Se preselecciona si hay una sola posible.
			stock_destino_id: null,

			/*
				A dónde van los empleados: null = sin elegir, 0 = "Sin sucursal", un id = esa sucursal.
				Arranca en null salvo que no haya a dónde pasarlos (ver `cargar_resumen`).
			*/
			usuarios_destino_id: null,
			// true si el usuario tocó el select de empleados: desde ahí deja de copiar el destino del stock
			usuarios_destino_tocado: false,

			// Sucursal que hereda las marcas, cajas, puntos de venta y clientes. null = sin elegir / ninguna.
			reemplazo_id: null,

			/*
				Contador de aperturas. Una respuesta del resumen que llega cuando el usuario ya abrió
				la ventana para OTRA sucursal (o ya la cerró) no tiene que pisar nada.
			*/
			consulta_actual: 0,
		}
	},
	computed: {
		/* Las otras sucursales vivas a las que se puede pasar algo: [{id, street}] */
		otras_sucursales() {
			return this.resumen && Array.isArray(this.resumen.otras_sucursales) ? this.resumen.otras_sucursales : []
		},
		/* No hay otra sucursal: nada se puede transferir ni heredar. La API lo manda, y se confirma contra la lista. */
		es_la_ultima() {
			return !!(this.resumen && this.resumen.es_la_ultima) || !this.otras_sucursales.length
		},
		/* El stock de la sucursal, con ceros por defecto para que el template no pregunte por cada clave. */
		stock() {
			return Object.assign({
				articulos: 0,
				variantes: 0,
				filas: 0,
				unidades: 0,
				filas_negativas: 0,
				unidades_negativas: 0,
				articulos_en_papelera: 0,
			}, this.resumen && this.resumen.stock ? this.resumen.stock : {})
		},
		/* `filas` cuenta renglones de stock de artículos Y de variantes con cantidad distinta de cero. */
		hay_stock() {
			return Number(this.stock.filas) > 0
		},
		usuarios() {
			return this.resumen && Array.isArray(this.resumen.usuarios) ? this.resumen.usuarios : []
		},
		marcas() {
			return this.resumen && Array.isArray(this.resumen.marcas) ? this.resumen.marcas : []
		},
		bloqueos() {
			return this.resumen && Array.isArray(this.resumen.bloqueos) ? this.resumen.bloqueos : []
		},
		tiene_ventas() {
			return !!(this.resumen && this.resumen.tiene_ventas)
		},
		/* Cuántas cajas, puntos de venta y clientes la tienen asignada */
		cantidad_de_cajas() {
			return Number(this.resumen && this.resumen.cajas) || 0
		},
		cantidad_de_puntos_de_venta() {
			return Number(this.resumen && this.resumen.puntos_de_venta) || 0
		},
		cantidad_de_clientes() {
			return Number(this.resumen && this.resumen.clientes) || 0
		},
		/* Hay algo que hereda otra sucursal: una marca de depósito, cajas, puntos de venta o clientes */
		hay_para_heredar() {
			return this.marcas.length > 0
				|| this.cantidad_de_cajas > 0
				|| this.cantidad_de_puntos_de_venta > 0
				|| this.cantidad_de_clientes > 0
		},
		/* La API exige reemplazo (hoy: es depósito por defecto, madre o de origen y quedan otras sucursales) */
		requiere_reemplazo() {
			return !!(this.resumen && this.resumen.requiere_reemplazo) && this.otras_sucursales.length > 0
		},
		/* Hay alguna de las cosas que esta ventana pregunta */
		hay_algo_que_decidir() {
			return this.hay_stock || this.usuarios.length > 0 || this.hay_para_heredar
		},

		/*
			El stock que se elige pasar hacia una sucursal. Es el destino "implícito" de todo lo demás:
			si el usuario ya decidió a dónde va el stock, ahí van por defecto los empleados y lo que
			hereda la sucursal (misma regla que aplica la API cuando no le llega `reemplazo_id`).
		*/
		destino_del_stock_elegido() {
			if (this.stock_accion === 'transferir' && this.stock_destino_id) {
				return this.stock_destino_id
			}
			return null
		},
		/*
			El reemplazo no se pregunta cuando ya hay un destino elegido en otro bloque: va a la
			sucursal que recibe el stock o, si no hay stock que pasar, a la que reciben los empleados.
			Se evalúa por la ELECCIÓN ("transferir", o empleados a una sucursal) y no por el id, para
			que el bloque no aparezca y desaparezca mientras el usuario todavía está eligiendo.
		*/
		reemplazo_sigue_a_otro_destino() {
			return this.stock_accion === 'transferir'
				|| (this.usuarios.length > 0 && !!this.usuarios_destino_id)
		},
		/* Id de la sucursal a la que pasan las marcas cuando no se pregunta, o null si todavía no se sabe. */
		destino_implicito_id() {
			if (!this.reemplazo_sigue_a_otro_destino) {
				return null
			}
			if (this.destino_del_stock_elegido) {
				return this.destino_del_stock_elegido
			}
			if (this.usuarios.length && this.usuarios_destino_id) {
				return this.usuarios_destino_id
			}
			return null
		},
		nombre_del_destino_implicito() {
			return this.nombre_de_sucursal(this.destino_implicito_id)
		},
		/*
			El `reemplazo_id` que viaja: el que se eligió en el select, o el destino implícito, o nada
			(las cajas, puntos de venta y clientes quedan para todas las sucursales).
		*/
		reemplazo_a_enviar() {
			if (this.destino_implicito_id) {
				return this.destino_implicito_id
			}
			if (this.reemplazo_sigue_a_otro_destino) {
				return null
			}
			return this.reemplazo_id ? this.reemplazo_id : null
		},

		/* El stock está resuelto: no hay (o no se puede elegir), descarta, o transfiere a una sucursal elegida. */
		stock_resuelto() {
			if (!this.hay_stock || this.es_la_ultima) {
				return true
			}
			if (this.stock_accion === 'descartar') {
				return true
			}
			return this.stock_accion === 'transferir' && !!this.stock_destino_id
		},
		/* Cada empleado afectado tiene a dónde ir: 0 ("sin sucursal") es una elección válida, null no. */
		usuarios_resueltos() {
			return !this.usuarios.length || this.usuarios_destino_id !== null
		},
		reemplazo_resuelto() {
			return !this.requiere_reemplazo || !!this.reemplazo_a_enviar
		},
		/* Hay algo que impide eliminarla ahora (traslados pendientes, o ya se está eliminando) */
		esta_bloqueada() {
			return this.bloqueos.length > 0 || !!(this.resumen && this.resumen.ya_en_proceso)
		},
		/*
			El botón "Eliminar sucursal". En modo clásico no hay nada que elegir; con el resumen, hace
			falta que cada decisión esté tomada y que nada la bloquee.
		*/
		puede_confirmar() {
			if (this.eliminando) {
				return false
			}
			if (this.modo_clasico) {
				return true
			}
			return !!this.resumen
				&& !this.esta_bloqueada
				&& this.stock_resuelto
				&& this.usuarios_resueltos
				&& this.reemplazo_resuelto
		},

		/* Las opciones de los tres selects. El `null` es el renglón de "sin elegir". */
		opciones_de_destino() {
			let opciones = [{ value: null, text: 'Elegí una sucursal', disabled: true }]
			this.otras_sucursales.forEach(sucursal => {
				opciones.push({ value: sucursal.id, text: sucursal.street })
			})
			return opciones
		},
		opciones_de_usuarios() {
			let opciones = [{ value: null, text: 'Elegí una opción', disabled: true }]
			opciones.push({ value: 0, text: 'Sin sucursal' })
			this.otras_sucursales.forEach(sucursal => {
				opciones.push({ value: sucursal.id, text: sucursal.street })
			})
			return opciones
		},
		opciones_de_reemplazo() {
			let opciones = []
			if (this.requiere_reemplazo) {
				opciones.push({ value: null, text: 'Elegí una sucursal', disabled: true })
			} else {
				opciones.push({ value: null, text: 'Ninguna: que queden para todas las sucursales' })
			}
			this.otras_sucursales.forEach(sucursal => {
				opciones.push({ value: sucursal.id, text: sucursal.street })
			})
			return opciones
		},

		/* Textos del resumen en criollo */
		texto_stock() {
			let partes = []
			if (Number(this.stock.articulos) > 0) {
				partes.push(this.cantidad_y_texto(this.stock.articulos, 'artículo', 'artículos'))
			}
			if (Number(this.stock.variantes) > 0) {
				partes.push(this.cantidad_y_texto(this.stock.variantes, 'variante', 'variantes'))
			}
			return 'Tiene stock en ' + partes.join(' y ') + ' (' + this.texto_de_unidades(this.stock.unidades) + ' en total).'
		},
		texto_stock_negativo() {
			return 'Hay ' + this.cantidad_y_texto(this.stock.filas_negativas, 'artículo o variante con stock negativo', 'artículos o variantes con stock negativo')
				+ ' (' + this.texto_de_unidades(this.stock.unidades_negativas) + '). Si pasás el stock a otra sucursal, la de destino baja lo mismo.'
		},
		texto_stock_en_papelera() {
			return 'De esos, ' + this.cantidad_y_texto(this.stock.articulos_en_papelera, 'artículo está', 'artículos están')
				+ ' en la papelera: su stock también se mueve, pero no queda un movimiento en su historial.'
		},
		nombres_de_usuarios() {
			let nombres = []
			this.usuarios.forEach(usuario => {
				nombres.push(usuario.name + (usuario.es_dueno ? ' (dueño)' : ''))
			})
			return nombres.join(', ')
		},
		lineas_de_marcas() {
			let lineas = []
			this.marcas.forEach(marca => {
				if (TEXTO_DE_MARCAS[marca]) {
					lineas.push(TEXTO_DE_MARCAS[marca])
				}
			})
			return lineas
		},
		/* "Tiene 1 caja, 2 puntos de venta y 3 clientes asignados." */
		texto_de_asignados() {
			let partes = []
			if (this.cantidad_de_cajas > 0) {
				partes.push(this.cantidad_y_texto(this.cantidad_de_cajas, 'caja', 'cajas'))
			}
			if (this.cantidad_de_puntos_de_venta > 0) {
				partes.push(this.cantidad_y_texto(this.cantidad_de_puntos_de_venta, 'punto de venta', 'puntos de venta'))
			}
			if (this.cantidad_de_clientes > 0) {
				partes.push(this.cantidad_y_texto(this.cantidad_de_clientes, 'cliente', 'clientes'))
			}
			if (!partes.length) {
				return ''
			}
			let ultimo = partes.pop()
			let lista = partes.length ? partes.join(', ') + ' y ' + ultimo : ultimo
			return 'Tiene ' + lista + ' asignados a esta sucursal.'
		},
	},
	watch: {
		/*
			Los empleados arrancan en la misma sucursal que recibe el stock (decisión del plan): si el
			dueño ya decidió pasar todo ahí, es lo más probable que quiera. Solo mientras el usuario no
			haya tocado ese select, y nunca si no hay a dónde pasarlos.
		*/
		destino_del_stock_elegido(nuevo) {
			if (nuevo && this.usuarios.length && !this.usuarios_destino_tocado && !this.es_la_ultima) {
				this.usuarios_destino_id = nuevo
			}
		},
	},
	methods: {
		/**
		 * Abre la ventana para una sucursal. Pide el resumen a la API ANTES de abrirla, con el
		 * indicador global de carga; si no se puede consultarlo, la abre en modo clásico.
		 *
		 * Lo llama src/common-vue/views/Abm.vue por ref cuando el botón "Eliminar" del formulario de
		 * la sucursal emite `press_delete_btn`.
		 *
		 * @param {Object} sucursal La sucursal del formulario ({id, street}).
		 * @return {void}
		 */
		abrir_eliminar_sucursal(sucursal) {
			if (!sucursal || !sucursal.id || this.eliminando) {
				return
			}

			this.reiniciar()
			this.address_id = sucursal.id
			this.nombre_sucursal = sucursal.street ? sucursal.street : 'esta sucursal'

			this.consulta_actual++
			let consulta = this.consulta_actual
			let self = this

			this.$store.commit('auth/setMessage', 'Revisando qué tiene la sucursal')
			this.$store.commit('auth/setLoading', true)

			/*
				skip_global_error_event: contra una API vieja la ruta no existe y da 404; el interceptor
				global lo mostraría como un aviso de 10 segundos que no le dice nada al usuario. Acá un
				error de cualquier tipo no es un error: es el modo clásico.
			*/
			this.$api.get('address/' + sucursal.id + '/eliminar-resumen', {
				skip_global_error_event: true,
			})
			.then(res => {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				if (consulta !== self.consulta_actual) {
					return
				}

				/*
					Una respuesta sin `address` no es el contrato (un proxy, una página de error que
					devolvió 200): se trata como si no existiera el endpoint.
				*/
				if (!res.data || !res.data.address) {
					self.entrar_en_modo_clasico()
					return
				}

				self.cargar_resumen(res.data)
				self.$bvModal.show(ID_MODAL)
			})
			.catch(err => {
				console.log(err)
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				if (consulta !== self.consulta_actual) {
					return
				}

				self.entrar_en_modo_clasico()
			})
		},
		/**
		 * Guarda el resumen que devolvió la API y deja el formulario en su estado inicial.
		 *
		 * @param {Object} datos Cuerpo de GET address/{id}/eliminar-resumen.
		 * @return {void}
		 */
		cargar_resumen(datos) {
			this.modo_clasico = false
			this.resumen = datos

			if (datos.address && datos.address.street) {
				this.nombre_sucursal = datos.address.street
			}

			let otras = Array.isArray(datos.otras_sucursales) ? datos.otras_sucursales : []

			// Con una sola sucursal posible, el destino del stock no se pregunta: se preselecciona.
			this.stock_destino_id = otras.length === 1 ? otras[0].id : null

			/*
				Si no hay otra sucursal, los empleados solo pueden quedar sin sucursal: la única opción
				válida ya viene elegida. Con otras sucursales arrancan sin elegir.
			*/
			this.usuarios_destino_id = otras.length ? null : 0
		},
		/**
		 * Abre la ventana en modo clásico: el aviso de siempre y el DELETE sin parámetros.
		 *
		 * @return {void}
		 */
		entrar_en_modo_clasico() {
			this.resumen = null
			this.modo_clasico = true
			this.$bvModal.show(ID_MODAL)
		},
		/**
		 * Manda el borrado con lo elegido. En un 200 cierra las dos ventanas; en un 202 (la API lo
		 * encoló) también, pero sin sacar la sucursal de la lista porque todavía existe; en un error
		 * deja la ventana abierta con el mensaje en el pie.
		 *
		 * @return {void}
		 */
		confirmar_eliminar() {
			if (!this.puede_confirmar) {
				return
			}

			let self = this

			this.error_api = ''
			this.eliminando = true
			this.$store.commit('auth/setMessage', 'Eliminando la sucursal')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('address/eliminar_con_decision', {
				address_id: this.address_id,
				params: this.parametros_para_enviar(),
			})
			.then(res => {
				self.eliminando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				if (res.status === 202 || (res.data && res.data.queued)) {
					self.$toast.info('La eliminación se está procesando en segundo plano. Podés seguir el avance arriba a la derecha: la sucursal desaparece de la lista cuando termina.')

					/*
						Se trae la lista de procesos YA: la píldora se entera de un proceso nuevo por el
						socket o por un polling que solo corre si ya había procesos activos, y sin eso
						el aviso de arriba dice "arriba a la derecha" sin nada arriba a la derecha. Es
						inocuo contra una API sin el módulo (el store atrapa el 404).
					*/
					self.$store.dispatch('background_processes/getModels')
				} else {
					self.$toast.success('Sucursal eliminada')
				}

				self.$bvModal.hide(ID_MODAL)
				self.$bvModal.hide(ID_MODAL_FORMULARIO)
			})
			.catch(err => {
				console.log(err)
				self.eliminando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.error_api = self.mensaje_de_error(err)
			})
		},
		/**
		 * Arma los parámetros del DELETE a partir de lo elegido. Todos son opcionales para la API
		 * (contrato compatible hacia atrás): solo viaja lo que esta ventana tiene decidido, y en
		 * modo clásico no viaja nada, que es el DELETE de siempre.
		 *
		 * @return {Object}
		 */
		parametros_para_enviar() {
			let params = {}

			if (this.modo_clasico) {
				return params
			}

			if (this.hay_stock) {
				if (this.es_la_ultima) {
					/*
						No hay a dónde pasarlo y no hay nada que elegir. Se manda `descartar` porque es lo
						único que tiene sentido nombrar, y la API lo resuelve como "la única sucursal":
						los artículos conservan su stock total y se borra solo el detalle por sucursal.
					*/
					params.stock_accion = 'descartar'
				} else {
					params.stock_accion = this.stock_accion
					if (this.stock_accion === 'transferir') {
						params.stock_destino_id = this.stock_destino_id
					}
				}
			}

			if (this.usuarios.length) {
				if (this.usuarios_destino_id) {
					params.usuarios_accion = 'reasignar'
					params.usuarios_destino_id = this.usuarios_destino_id
				} else {
					params.usuarios_accion = 'dejar_sin_sucursal'
				}
			}

			if (this.reemplazo_a_enviar) {
				params.reemplazo_id = this.reemplazo_a_enviar
			}

			return params
		},
		/**
		 * El texto que corresponde mostrar para un borrado que falló: el `message` de la API
		 * (el 422 dice exactamente qué falta decidir), los errores de validación de Laravel si
		 * vinieron, y si no hay respuesta o es una página de error, un texto que explica qué hacer.
		 *
		 * 🔴 Lo que se le dice al usuario cuando NO se sabe si terminó: el borrado es reanudable
		 * (la API mueve el stock artículo por artículo y apretar Eliminar de nuevo continúa donde
		 * quedó), así que la instrucción segura es "mirá si sigue en la lista y volvé a intentar".
		 *
		 * @param {Object} err Error de axios.
		 * @return {String}
		 */
		mensaje_de_error(err) {
			let datos = err && err.response && err.response.data ? err.response.data : null

			if (datos && typeof datos === 'object') {
				let mensajes = collect_laravel_validation_messages(datos)
				if (mensajes.length) {
					return mensajes.join(' ')
				}
				if (datos.message) {
					return datos.message
				}
			}

			if (!err || !err.response) {
				return 'No pudimos conectarnos con el servidor. Revisá tu conexión: si la sucursal sigue en la lista, volvé a apretar Eliminar y continúa donde quedó.'
			}

			if ([502, 503, 504].indexOf(err.response.status) !== -1) {
				return 'El servidor tardó demasiado en responder. Puede haber terminado: esperá un minuto, mirá si la sucursal sigue en la lista y, si sigue, volvé a apretar Eliminar (continúa donde quedó).'
			}

			return 'No se pudo eliminar la sucursal. Volvé a intentar; si sigue pasando, avisanos.'
		},
		cerrar_modal() {
			if (this.eliminando) {
				return
			}
			this.$bvModal.hide(ID_MODAL)
		},
		/* Handler del `@hidden` (se cierre como se cierre): deja la ventana como recién creada. */
		al_cerrar_modal() {
			this.reiniciar()
		},
		/* Deja todo en blanco para que una apertura nueva no arrastre nada de la anterior. */
		reiniciar() {
			this.address_id = null
			this.nombre_sucursal = ''
			this.resumen = null
			this.modo_clasico = false
			this.eliminando = false
			this.error_api = ''
			this.stock_accion = null
			this.stock_destino_id = null
			this.usuarios_destino_id = null
			this.usuarios_destino_tocado = false
			this.reemplazo_id = null
		},
		/**
		 * Nombre de una de las otras sucursales por su id, o '' si no se encuentra.
		 *
		 * @param {Number|null} id
		 * @return {String}
		 */
		nombre_de_sucursal(id) {
			if (!id) {
				return ''
			}
			let encontrada = this.otras_sucursales.find(sucursal => sucursal.id == id)
			return encontrada ? encontrada.street : ''
		},
		/**
		 * "N <texto>" con la concordancia correcta.
		 *
		 * @param {Number} cantidad
		 * @param {String} en_singular Texto para cantidad == 1.
		 * @param {String} en_plural Texto para el resto.
		 * @return {String}
		 */
		cantidad_y_texto(cantidad, en_singular, en_plural) {
			return cantidad + ' ' + (Number(cantidad) === 1 ? en_singular : en_plural)
		},
		/**
		 * "-69 unidades", "1 unidad", "1.250,5 unidades": con el signo y el formato del país.
		 *
		 * @param {Number|String} valor
		 * @return {String}
		 */
		texto_de_unidades(valor) {
			let numero = Number(valor)
			if (isNaN(numero)) {
				numero = 0
			}
			let formateado = numero.toLocaleString('es-AR', { maximumFractionDigits: 2 })
			return formateado + (Math.abs(numero) === 1 ? ' unidad' : ' unidades')
		},
	},
}
</script>
<style lang="sass">
// El ancho: el tamaño `md` de bootstrap (500px) queda justo para los radios con su explicación y el
// `lg` de este sistema se estira al 90% de la pantalla (_modals.sass). Dos clases para ganarle al
// `.modal-dialog` pelado de bootstrap sin !important. En teléfono no aplica: ahí el dialog ocupa todo.
.eliminar-sucursal__dialog.modal-dialog
	max-width: 640px

.eliminar-sucursal
	&__texto
		margin-bottom: 14px
		color: var(--color-text-primary)
		overflow-wrap: anywhere

		// Adentro de un bloque el texto va pegado a lo que sigue
		&--bloque
			margin-bottom: 8px

	&__nota
		margin-bottom: 8px
		font-size: 0.85rem
		line-height: 1.35
		color: var(--color-text-secondary)
		overflow-wrap: anywhere

		// La línea de las ventas cierra el cuerpo: sin margen de más abajo
		&--ventas
			margin-bottom: 0

	// Una sección del resumen (stock, empleados, configuración): misma superficie que los bloques
	// de las ventanas de confirmación del sistema
	&__bloque
		margin-bottom: 14px
		padding: 12px 14px
		border-radius: 10px
		background: var(--bg-section)
		border: 1px solid var(--color-border-secondary)

	&__titulo
		margin-bottom: 8px
		font-size: 0.78rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary)

	// El aviso de "es tu única sucursal": informa, no pide nada
	&__aviso
		margin: 0
		padding: 8px 10px
		border-radius: 8px
		border: 1px solid var(--color-border)
		background: var(--bg-card)
		color: var(--color-text-primary)
		font-size: 0.9rem
		line-height: 1.35

	// Los dos radios del stock, uno arriba del otro
	&__opciones
		display: flex
		flex-direction: column
		gap: 10px

		// El select de destino cuelga del radio "Pasar el stock": se alinea con el texto del radio
		// (el padding de un `custom-control` de bootstrap es 1.5rem), no con el circulito
		.eliminar-sucursal__campo
			padding-left: 1.5rem

	// La explicación de cada opción: alineada con el texto del radio, no con el circulito
	&__subtexto
		display: block
		margin-top: 2px
		font-size: 0.82rem
		line-height: 1.35
		color: var(--color-text-secondary)

	// Cada campo (label + select) va a todo el ancho del bloque, sin el margen de abajo del form-group
	&__campo
		margin: 0

	&__alerta
		margin: 0
		font-size: 0.88rem

	&__lista
		margin: 0 0 8px
		padding-left: 18px
		font-size: 0.9rem
		color: var(--color-text-primary)

		li
			margin-bottom: 2px

	// El pie lleva el error ARRIBA de los botones y ocupa todo el ancho del footer del modal
	&__pie
		display: flex
		flex-direction: column
		gap: 10px
		width: 100%

	&__error
		margin: 0
		font-size: 0.9rem
		overflow-wrap: anywhere

	&__acciones
		display: flex
		justify-content: flex-end
		gap: 8px
		flex-wrap: wrap

// En teléfono los dos botones ocupan el ancho completo, el principal arriba
@media (max-width: 575px)
	.eliminar-sucursal__acciones
		flex-direction: column-reverse

		.btn
			width: 100%

// Mismo lenguaje que el resto de los modales "nuevos" (ver la nota igual en agenda/ModalCompletar.vue):
// radio de 8px y foco suave en vez del default global de _inputs.sass. Scopeado por el id del modal.
#eliminar-sucursal
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
