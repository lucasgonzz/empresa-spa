<template>
<b-modal
id="medidas-catalogo"
size="md"
centered
scrollable
title="Buscar peso y medidas de todo el catálogo"
@show="al_abrir"
@hidden="al_cerrar">

	<div
	class="med-cat"
	data-testid="medidas-modal-catalogo">

		<!--
			«Solo artículos con stock» va primero y SIEMPRE visible: cambiarlo recalcula la previa, y es
			lo que más cambia cuántos artículos se buscan (y cuánto cuesta). Viene tildado: es lo que se
			pidió para el primer lanzamiento.
		-->
		<div class="med-cat__opcion">
			<b-form-checkbox
			v-model="solo_con_stock"
			switch
			data-testid="medidas-catalogo-solo-stock"
			:disabled="lanzando"
			@change="al_cambiar_stock">
				Solo artículos con stock
			</b-form-checkbox>
			<p class="med-cat__opcion-ayuda">
				{{ solo_con_stock ? 'Se buscan únicamente los artículos que hoy tienen stock.' : 'Se buscan también los artículos sin stock.' }}
			</p>
		</div>

		<!--
			Misión medidas-sin-datos (28/10/2026): volver a buscar los que quedaron «sin datos» en búsquedas
			anteriores. Apagada por defecto: sin ella la búsqueda sigue salteando lo que ya se buscó sin
			éxito en los últimos 90 días. Cambiarla recalcula la previa, igual que «Solo con stock».
		-->
		<div class="med-cat__opcion">
			<b-form-checkbox
			v-model="reintentar_sin_datos"
			switch
			data-testid="medidas-catalogo-reintentar-sin-datos"
			:disabled="lanzando"
			@change="al_cambiar_reintento">
				{{ textos.reintentar_sin_datos }}
			</b-form-checkbox>
			<p class="med-cat__opcion-ayuda">
				{{ textos.reintentar_sin_datos_ayuda }}
			</p>
		</div>

		<div
		v-if="cargando"
		class="med-cat__cargando">
			<b-spinner
			small
			variant="primary"></b-spinner>
			<span>Calculando qué artículos se buscarían…</span>
		</div>

		<div
		v-else-if="error"
		class="med-cat__aviso med-cat__aviso--mal"
		data-testid="medidas-catalogo-error">
			<span>No pudimos calcular qué artículos se buscarían.</span>
			<button
			type="button"
			class="med-cat__link"
			data-testid="medidas-catalogo-reintentar"
			@click="cargar">
				Reintentar
			</button>
		</div>

		<template v-else-if="previa">

			<!--
				Ya hay una de catálogo corriendo: la API no deja lanzar otra (422), así que el botón se
				apaga y se ofrece ir a la que está en curso.
			-->
			<div
			v-if="previa.corrida_activa"
			class="med-cat__aviso med-cat__aviso--info"
			data-testid="medidas-catalogo-activa">
				<span>
					Ya hay una búsqueda de medidas de todo el catálogo en curso ({{ avance_de_la_activa }}). Esperá a que termine, o detenela desde su detalle.
				</span>
				<button
				type="button"
				class="med-cat__link"
				data-testid="medidas-catalogo-ver-activa"
				@click="ver_corrida_activa">
					Ver la búsqueda en curso
				</button>
			</div>

			<!--
				Sin clave del buscador no se lanza (la API contesta 422). Este modal lo ve solo el acceso
				maestro, por eso nombra la variable del .env.
			-->
			<div
			v-else-if="falta_el_buscador"
			class="med-cat__aviso med-cat__aviso--mal"
			data-testid="medidas-catalogo-sin-proveedor">
				Falta cargar la clave de Serper (SERPER_API_KEY) en el servidor de este cliente. Sin esa clave no se pueden buscar medidas en internet.
			</div>

			<!-- Sin la IA tampoco se lanza: sin ella no hay forma de leer las medidas de las páginas. Puede faltar a la vez que el buscador. -->
			<div
			v-if="!previa.corrida_activa && falta_la_ia"
			class="med-cat__aviso med-cat__aviso--mal"
			data-testid="medidas-catalogo-sin-ia">
				{{ motivo_sin_ia }}
			</div>

			<!--
				Demo con tope de consultas (misión tope-serper-demos): antes de lanzar se dice cuántas
				quedan; con 0 el botón se apaga (la API contesta 422) y se dice por qué. Con una API que no
				manda `tope_demo` no se muestra nada.
			-->
			<div
			v-if="!previa.corrida_activa && tope_demo.aplica"
			class="med-cat__aviso"
			:class="tope_demo.restantes > 0 ? 'med-cat__aviso--info' : 'med-cat__aviso--mal'"
			data-testid="medidas-catalogo-tope-demo">
				{{ texto_tope_demo }}
			</div>

			<!-- Nada para buscar: se dice por qué no se puede lanzar en vez de dejar el botón apagado sin explicación. -->
			<div
			v-if="!previa.corrida_activa && sin_nada_para_buscar"
			class="med-cat__aviso med-cat__aviso--info"
			data-testid="medidas-catalogo-nada-para-buscar">
				{{ motivo_de_nada_para_buscar }}
			</div>

			<div
			class="med-cat__principal"
			:class="{ 'med-cat__principal--recalculando': recalculando }">
				<span
				class="med-cat__cifra"
				data-testid="medidas-catalogo-a-buscar"
				:data-valor="previa.a_buscar">
					{{ entero(previa.a_buscar) }}
				</span>
				<span class="med-cat__cifra-etiqueta">
					{{ previa.a_buscar === 1 ? 'artículo se busca ahora' : 'artículos se buscan ahora' }}
				</span>
				<span
				v-if="previa.sin_medidas !== null"
				class="med-cat__contexto">
					De {{ entero(previa.sin_medidas) }} {{ previa.sin_medidas === 1 ? 'artículo activo' : 'artículos activos' }} a los que les falta alguna medida.
				</span>
			</div>

			<ul
			class="med-cat__lista"
			:class="{ 'med-cat__lista--recalculando': recalculando }">
				<!-- Lo que suma la casilla de reintento (solo si está tildada y la API lo informa). -->
				<li
				v-if="reintentar_sin_datos && texto_del_reintento"
				data-testid="medidas-catalogo-reintento">
					{{ texto_del_reintento }}
				</li>
				<!--
					🔴 El `&nbsp;` al principio de cada <template> es a propósito. Entre </strong> y <template>
					no hay texto, solo un salto de línea, y Vue 2 (whitespace: 'condense') borra todo nodo de
					puro espacio que tenga un salto de línea: el número quedaba pegado a la frase.
				-->
				<li v-if="previa.excluidos_sin_stock > 0">
					<strong>{{ entero(previa.excluidos_sin_stock) }}</strong>
					<template v-if="previa.excluidos_sin_stock === 1">&nbsp;no se busca: no tiene stock.</template>
					<template v-else>&nbsp;no se buscan: no tienen stock.</template>
				</li>
				<li v-if="previa.excluidos_pendientes_de_revision > 0">
					<strong>{{ entero(previa.excluidos_pendientes_de_revision) }}</strong>
					<template v-if="previa.excluidos_pendientes_de_revision === 1">&nbsp;no se busca: ya tiene medidas esperando que alguien las apruebe o las rechace.</template>
					<template v-else>&nbsp;no se buscan: ya tienen medidas esperando que alguien las apruebe o las rechace.</template>
				</li>
				<li v-if="previa.excluidos_ya_buscados > 0">
					<strong>{{ entero(previa.excluidos_ya_buscados) }}</strong>
					<template v-if="previa.excluidos_ya_buscados === 1">&nbsp;no se busca: ya se buscó sin éxito en los últimos 90 días.</template>
					<template v-else>&nbsp;no se buscan: ya se buscaron sin éxito en los últimos 90 días.</template>
				</li>
				<li
				v-if="previa.excluidos_en_otra_corrida > 0"
				data-testid="medidas-catalogo-excluidos-en-otra">
					<strong>{{ entero(previa.excluidos_en_otra_corrida) }}</strong>
					<template v-if="previa.excluidos_en_otra_corrida === 1">&nbsp;no se busca ahora: ya está en otra búsqueda en curso.</template>
					<template v-else>&nbsp;no se buscan ahora: ya están en otra búsqueda en curso.</template>
				</li>
				<!-- Las exclusiones que la API quiera sumar con su propio texto. -->
				<li
				v-for="(excluido, indice) in previa.excluidos"
				:key="'excluido-' + indice">
					<strong>{{ entero(excluido.cantidad) }}</strong>
					&nbsp;{{ excluido.texto || excluido.motivo }}
				</li>
				<li v-if="previa.quedan_para_otra_corrida > 0">
					<strong>{{ entero(previa.quedan_para_otra_corrida) }}</strong>
					quedan para otra búsqueda: el tope es de {{ entero(previa.tope) }} artículos por vez. Cuando termine, lanzala de nuevo y sigue con los que faltan.
				</li>
				<li v-else-if="previa.tope > 0 && !sin_nada_para_buscar">
					El tope es de <strong>{{ entero(previa.tope) }}</strong> artículos por búsqueda: esta vez entran todos.
				</li>
				<li v-if="!sin_nada_para_buscar">
					Van primero los publicados en la tienda, después los que tienen stock y después el resto.
				</li>
			</ul>

			<div
			v-if="hay_estimacion && !sin_nada_para_buscar"
			class="med-cat__estimacion"
			:class="{ 'med-cat__estimacion--recalculando': recalculando }"
			data-testid="medidas-catalogo-estimacion">
				<p class="med-cat__estimacion-titulo">
					Estimación
				</p>
				<dl class="med-cat__datos">
					<div
					v-if="estimacion.busquedas !== null"
					class="med-cat__dato">
						<dt>Consultas al buscador</dt>
						<dd>~{{ entero(estimacion.busquedas) }}</dd>
					</div>
					<div
					v-if="estimacion.minutos !== null"
					class="med-cat__dato">
						<dt>Tiempo</dt>
						<dd>~{{ duracion(estimacion.minutos) }}</dd>
					</div>
					<div
					v-if="estimacion.usd_busquedas !== null"
					class="med-cat__dato">
						<dt>Buscador (costo)</dt>
						<dd>USD {{ dolares(estimacion.usd_busquedas) }}</dd>
					</div>
					<div
					v-if="estimacion.usd_ia !== null"
					class="med-cat__dato">
						<dt>Lectura con IA (costo)</dt>
						<dd>USD {{ dolares(estimacion.usd_ia) }}</dd>
					</div>
					<div
					v-if="estimacion.usd_respaldo !== null && estimacion.usd_respaldo > 0"
					class="med-cat__dato"
					data-testid="medidas-catalogo-usd-respaldo">
						<dt>Páginas bloqueadas y PDF (costo)</dt>
						<dd>USD {{ dolares(estimacion.usd_respaldo) }}</dd>
					</div>
					<!--
						El total suma las partes: buscador + respaldo + IA (el buscador NO incluye el respaldo).
						Si la API solo manda un total, se muestra ese.
					-->
					<div
					v-if="costo_total !== null"
					class="med-cat__dato"
					data-testid="medidas-catalogo-costo-total">
						<dt>Costo total</dt>
						<dd>USD {{ dolares(costo_total) }}</dd>
					</div>
				</dl>
				<p class="med-cat__nota">
					Corre en segundo plano, de a tramos: se puede seguir usando el sistema y el avance se ve en esta pestaña. Solo se cargan solas las medidas de los artículos que el sistema reconoce con seguridad; el resto queda para que lo revises. Nunca se pisa una medida que ya esté cargada.
				</p>
			</div>

			<!--
				Leer páginas bloqueadas y PDF se hace con un servicio de respaldo del buscador y cuesta
				créditos de búsqueda aparte de las consultas de la estimación. Se dice siempre que hay algo
				para buscar: puede pasar con cualquier artículo, no solo con los reintentos.
			-->
			<div
			v-if="!previa.corrida_activa && !sin_nada_para_buscar"
			class="med-cat__aviso med-cat__aviso--creditos"
			data-testid="medidas-catalogo-creditos">
				{{ aviso_de_creditos }}
			</div>

		</template>

	</div>

	<template #modal-footer>
		<b-button
		class="btn-modulo"
		variant="outline-secondary"
		data-testid="medidas-catalogo-cancelar"
		@click="cerrar">
			Cancelar
		</b-button>
		<b-button
		class="btn-modulo"
		variant="primary"
		data-testid="medidas-catalogo-lanzar"
		:disabled="!puede_lanzar || lanzando"
		@click="lanzar">
			<b-spinner
			v-if="lanzando"
			small
			class="m-r-5"></b-spinner>
			Lanzar búsqueda
		</b-button>
	</template>

</b-modal>
</template>
<script>
import { entero_es, duracion_en_texto, dolares_en_texto, esta_activa, porcentaje_de, texto_de_reintento, TEXTOS } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'
import { es_cancelacion } from '@/store/dimension_search'
import { normalizar_tope_demo, aviso_de_tope_demo, mensaje_de_tope_demo_agotado } from '@/store/image_assignment'

/**
 * Confirmación de «Buscar peso y medidas de todo el catálogo» (solo acceso maestro; la sección ni
 * siquiera monta este modal para nadie más).
 *
 * Al abrirse pide la previa (plan §2.5): cuántos artículos entran, cuántos no y por qué, el tope, y la
 * estimación de consultas, tiempo y dólares. Con eso Lucas decide antes de gastar. El interruptor
 * «Solo artículos con stock» viene tildado y, al cambiarlo, la previa se vuelve a pedir.
 *
 * No deja lanzar sin el buscador (Serper) configurado, sin la IA configurada, sin artículos para
 * buscar, con otra de catálogo en curso o, en una demo, sin consultas de la demo: la API contesta 422
 * en todos esos casos, pero es mejor que el botón ya lo diga. Un `null` en lo que la previa tendría
 * que decir ("no sé si está configurado") NO bloquea: la API igual rechaza si falta algo.
 *
 * Eventos: `lanzada(corrida)` y `ver_corrida(corrida)` (la que estaba en curso).
 */
export default {
	data() {
		return {
			/** Previa normalizada (ver `normalizar_previa`), o null mientras no llegó. */
			previa: null,
			/** true mientras se calcula la primera previa (no hay nada que mostrar todavía). */
			cargando: false,
			/** true mientras se recalcula una previa que ya estaba a la vista (se atenúa, no desaparece). */
			recalculando: false,
			/** true si la previa falló. */
			error: false,
			/** true mientras está en vuelo el POST de lanzamiento (evita el doble clic). */
			lanzando: false,
			/** El interruptor «Solo artículos con stock»: tildado por defecto. */
			solo_con_stock: true,
			/** La casilla «Volver a buscar también los que quedaron sin datos»: apagada por defecto. */
			reintentar_sin_datos: false,
			/** Textos de la pantalla (para el template). */
			textos: TEXTOS,
		}
	},
	computed: {
		/**
		 * "Esta opción suma 140 artículos..." con lo que dice la previa; '' si la API no lo manda o es cero.
		 *
		 * @returns {String}
		 */
		texto_del_reintento() {
			return this.previa ? texto_de_reintento(this.previa.reintento_sin_datos) : ''
		},
		estimacion() {
			return this.previa ? this.previa.estimacion : null
		},
		/**
		 * Costo total estimado: buscador + respaldo + IA (lo que no venga cuenta como 0). Si la API no
		 * manda ninguna de las tres partes, el total que traiga; si no trae nada, null.
		 *
		 * @returns {Number|null}
		 */
		costo_total() {
			let e = this.estimacion
			if (!e) {
				return null
			}
			let partes = [e.usd_busquedas, e.usd_respaldo, e.usd_ia]
			let hay_partes = partes.some(parte => parte !== null)
			if (!hay_partes) {
				return e.usd_total
			}
			let total = 0
			partes.forEach(function (parte) {
				total += parte === null ? 0 : parte
			})
			return total
		},
		/**
		 * El aviso de créditos de la lectura con respaldo: la frase de la API (`texto_respaldo`) si vino, o
		 * la fija como respaldo.
		 *
		 * @returns {String}
		 */
		aviso_de_creditos() {
			let texto = this.estimacion ? this.estimacion.texto_respaldo : ''
			return texto || this.textos.creditos_de_lectura
		},
		/** true si la estimación trae al menos un dato para mostrar. */
		hay_estimacion() {
			let e = this.estimacion
			return !!e && (e.busquedas !== null || e.minutos !== null || e.usd_busquedas !== null || e.usd_ia !== null || e.usd_total !== null || e.usd_respaldo !== null)
		},
		/**
		 * true solo si la previa dice EXPLÍCITAMENTE que no hay clave del buscador. Sin el dato
		 * (`null`), no se bloquea nada.
		 *
		 * @returns {Boolean}
		 */
		falta_el_buscador() {
			return !!this.previa && this.previa.proveedor_configurado === false
		},
		/**
		 * true solo si la previa dice EXPLÍCITAMENTE que la IA no está configurada.
		 *
		 * @returns {Boolean}
		 */
		falta_la_ia() {
			return !!this.previa && this.previa.ia_configurada === false
		},
		/**
		 * El motivo que manda la API (`ia_motivo`), o uno por defecto si vino vacío.
		 *
		 * @returns {String}
		 */
		motivo_sin_ia() {
			let motivo = this.previa ? this.previa.ia_motivo : ''
			return motivo || 'La IA que lee las medidas no está configurada: sin ella no se puede buscar.'
		},
		/**
		 * El tope de consultas de la demo que vino en la previa (`tope_demo`). Sin el campo (fuera de
		 * una demo o API vieja), "sin tope".
		 *
		 * @returns {Object} {aplica, tope, usadas, restantes}
		 */
		tope_demo() {
			return normalizar_tope_demo(this.previa ? this.previa.tope_demo : null)
		},
		texto_tope_demo() {
			return this.tope_demo.restantes > 0 ? aviso_de_tope_demo(this.tope_demo) : mensaje_de_tope_demo_agotado(this.tope_demo)
		},
		/**
		 * Se puede lanzar si el buscador y la IA no están marcados como faltantes, hay algo para
		 * buscar, no hay otra de catálogo corriendo y (en una demo) quedan consultas. Es la misma
		 * regla con la que la API contesta 422. Mientras se recalcula, no.
		 *
		 * @returns {Boolean}
		 */
		puede_lanzar() {
			if (!this.previa || this.cargando || this.recalculando || this.error) {
				return false
			}
			if (this.previa.corrida_activa || this.falta_el_buscador || this.falta_la_ia) {
				return false
			}
			if (this.tope_demo.aplica && this.tope_demo.restantes <= 0) {
				return false
			}
			return this.previa.a_buscar > 0
		},
		/**
		 * "1.250 de 5.000, 25 %" de la búsqueda de catálogo que ya está corriendo.
		 *
		 * @returns {String}
		 */
		avance_de_la_activa() {
			let activa = this.previa ? this.previa.corrida_activa : null
			if (!activa) {
				return ''
			}
			if (!esta_activa(activa) || !activa.procesados) {
				return 'todavía arrancando'
			}
			let porcentaje = porcentaje_de(activa)
			return entero_es(activa.procesados) + ' de ' + entero_es(activa.total) + (porcentaje !== null ? ', ' + porcentaje + ' %' : '')
		},
		/** true si la previa dice que no hay ningún artículo para buscar ahora. */
		sin_nada_para_buscar() {
			return !!this.previa && this.previa.a_buscar <= 0
		},
		/**
		 * Por qué no hay nada para buscar, armado con los números de la previa: no hay artículos con
		 * medidas incompletas, o los que hay quedaron afuera (sin stock, esperando revisión, ya
		 * buscados sin éxito, o en otra búsqueda en curso).
		 *
		 * @returns {String}
		 */
		motivo_de_nada_para_buscar() {
			let previa = this.previa
			if (!previa) {
				return ''
			}
			if (previa.sin_medidas === 0) {
				return 'No hay artículos para buscar: todos los artículos activos ya tienen peso y medidas.'
			}
			let razones = []
			if (previa.excluidos_sin_stock > 0) {
				razones.push(entero_es(previa.excluidos_sin_stock) + (previa.excluidos_sin_stock === 1 ? ' no tiene stock' : ' no tienen stock'))
			}
			if (previa.excluidos_pendientes_de_revision > 0) {
				razones.push(entero_es(previa.excluidos_pendientes_de_revision) + (previa.excluidos_pendientes_de_revision === 1 ? ' ya tiene medidas esperando revisión' : ' ya tienen medidas esperando revisión'))
			}
			if (previa.excluidos_ya_buscados > 0) {
				razones.push(entero_es(previa.excluidos_ya_buscados) + (previa.excluidos_ya_buscados === 1 ? ' ya se buscó sin éxito en los últimos 90 días' : ' ya se buscaron sin éxito en los últimos 90 días'))
			}
			if (previa.excluidos_en_otra_corrida > 0) {
				razones.push(entero_es(previa.excluidos_en_otra_corrida) + (previa.excluidos_en_otra_corrida === 1 ? ' ya está en otra búsqueda en curso' : ' ya están en otra búsqueda en curso'))
			}
			if (!razones.length) {
				return 'No hay artículos para buscar con estas opciones.' + (this.solo_con_stock ? ' Probá destildando «Solo artículos con stock».' : '')
			}
			let lista = razones.length > 1
				? razones.slice(0, -1).join(', ') + ' y ' + razones[razones.length - 1]
				: razones[0]
			return 'No hay artículos para buscar: ' + lista + '.'
		},
	},
	methods: {
		/** Al abrir: previa fresca, siempre (lo que había la vez anterior puede estar viejo). */
		al_abrir() {
			this.previa = null
			this.solo_con_stock = true
			this.reintentar_sin_datos = false
			this.cargar()
		},
		al_cerrar() {
			this.previa = null
			this.error = false
			this.lanzando = false
			this.recalculando = false
		},
		cerrar() {
			this.$bvModal.hide('medidas-catalogo')
		},
		/**
		 * El interruptor cambió. `@change` de b-form-checkbox sale con el valor nuevo, pero `v-model`
		 * todavía puede no haberlo aplicado: se espera al próximo tick para pedir con el valor real.
		 */
		al_cambiar_stock() {
			this.$nextTick(() => {
				this.cargar()
			})
		},
		/** La casilla de reintento cambió: igual que el stock, se espera al tick y se recalcula la previa. */
		al_cambiar_reintento() {
			this.$nextTick(() => {
				this.cargar()
			})
		},
		/**
		 * Lo que se manda a la API (previa y lanzamiento): las dos opciones de la pantalla. Un solo lugar
		 * para que lo que se calcula en la previa sea exactamente lo que se lanza.
		 *
		 * @returns {{solo_con_stock: Boolean, reintentar_sin_datos: Boolean}}
		 */
		opciones_del_pedido() {
			return { solo_con_stock: this.solo_con_stock, reintentar_sin_datos: this.reintentar_sin_datos }
		},
		/**
		 * Pide la previa del catálogo con el estado del interruptor. Un 403 (sesión que no es de acceso
		 * maestro) lo anuncia el interceptor global con el mensaje de la API. Una cancelación no es un
		 * error: se vuelve a pedir una vez. Si ya había una previa a la vista, queda atenuada mientras
		 * se recalcula, en vez de reemplazarla por un spinner (el modal no salta).
		 *
		 * @param {Boolean} es_reintento
		 */
		cargar(es_reintento) {
			let self = this
			if (self.previa) {
				self.recalculando = true
			} else {
				self.cargando = true
			}
			self.error = false
			self.$store.dispatch('dimension_search/get_previa_catalogo', self.opciones_del_pedido())
			.then(previa => {
				// Respuesta vieja (se cambió el interruptor mientras viajaba): la del último pedido es la que vale.
				if (typeof previa === 'undefined') {
					return
				}
				self.previa = previa
				self.cargando = false
				self.recalculando = false
			})
			.catch(err => {
				console.log(err)
				if (es_cancelacion(err) && es_reintento !== true) {
					self.cargar(true)
					return
				}
				self.error = true
				self.cargando = false
				self.recalculando = false
			})
		},
		/**
		 * Lanza la búsqueda de todo el catálogo. Con el indicador global de carga: es el único clic de
		 * esta pantalla que pone a trabajar al servidor por horas y gasta plata, y no tiene que poder
		 * repetirse mientras viaja.
		 *
		 * Si la API contesta 422 (se lanzó otra desde otra pestaña, se borró la clave...) el interceptor
		 * muestra el motivo y la previa se vuelve a pedir, así lo que se ve es lo real.
		 */
		lanzar() {
			if (!this.puede_lanzar || this.lanzando) {
				return
			}
			let self = this
			self.lanzando = true
			self.$store.commit('auth/setMessage', 'Lanzando la búsqueda de medidas')
			self.$store.commit('auth/setLoading', true)

			self.$store.dispatch('dimension_search/lanzar_catalogo', self.opciones_del_pedido())
			.then(corrida => {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.lanzando = false
				self.$toast.success('Listo: la búsqueda arrancó. Va a tardar un rato largo y el avance se ve en esta pestaña.', {
					duration: 6000,
				})
				self.$emit('lanzada', corrida)
				self.cerrar()
			})
			.catch(err => {
				console.log(err)
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.lanzando = false
				self.cargar()
			})
		},
		/** Cierra y pide abrir el detalle de la búsqueda de catálogo que ya estaba corriendo. */
		ver_corrida_activa() {
			if (!this.previa || !this.previa.corrida_activa) {
				return
			}
			this.$emit('ver_corrida', this.previa.corrida_activa)
			this.cerrar()
		},
		entero(valor) {
			return entero_es(valor)
		},
		duracion(minutos) {
			return duracion_en_texto(minutos)
		},
		dolares(valor) {
			return dolares_en_texto(valor)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el cuerpo de un b-modal cuelga de <body> (fuera de #app) y las reglas van todas
// prefijadas con med-cat. Colores por token, con el literal de :root como fallback.
.med-cat
	display: flex
	flex-direction: column
	gap: 16px
	text-align: left

.med-cat__opcion
	display: flex
	flex-direction: column
	gap: 2px
	padding: 12px 14px
	border-radius: 12px
	border: 1px solid var(--color-border-secondary, #e9ecef)

.med-cat__opcion-ayuda
	margin: 0 0 0 2.5rem
	font-size: 0.78rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.med-cat__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 32px 0
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

.med-cat__aviso
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 6px
	padding: 12px 14px
	border-radius: 12px
	font-size: 0.875rem
	line-height: 1.4

.med-cat__aviso--info
	background: var(--bg-info-soft, rgba(23, 162, 184, .1))
	color: var(--color-text-info-strong, #0c5460)

.med-cat__aviso--creditos
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	color: var(--color-text-warning-strong, #856404)
	font-size: 0.8125rem

.med-cat__aviso--mal
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

.med-cat__link
	border: 0
	padding: 0
	background: transparent
	box-shadow: none
	font-size: 0.875rem
	font-weight: 600
	color: inherit
	text-decoration: underline

.med-cat__principal
	display: flex
	flex-direction: column
	align-items: center
	gap: 2px
	padding: 8px 0 4px
	text-align: center
	transition: opacity .15s ease

.med-cat__cifra
	font-size: 2.6rem
	font-weight: 700
	line-height: 1.05
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.med-cat__cifra-etiqueta
	font-size: 0.95rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.med-cat__contexto
	font-size: 0.82rem
	color: var(--color-text-secondary, #6c757d)

.med-cat__lista
	margin: 0
	padding: 0
	list-style: none
	display: flex
	flex-direction: column
	gap: 8px
	font-size: 0.875rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)
	transition: opacity .15s ease

	li
		position: relative
		padding-left: 14px

		// Un punto chico en vez de la viñeta del navegador: más liviano.
		&::before
			content: ''
			position: absolute
			left: 0
			top: 0.55em
			width: 5px
			height: 5px
			border-radius: 50%
			background: var(--color-border, #dee2e6)

	strong
		color: var(--color-text-primary, #212529)
		font-variant-numeric: tabular-nums

// Mientras se recalcula la previa (cambió el interruptor), lo que se ve queda atenuado.
.med-cat__principal--recalculando,
.med-cat__lista--recalculando,
.med-cat__estimacion--recalculando
	opacity: .45

.med-cat__estimacion
	padding: 14px 16px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)
	transition: opacity .15s ease

.med-cat__estimacion-titulo
	margin: 0 0 10px
	font-size: 0.75rem
	font-weight: 600
	letter-spacing: .04em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.med-cat__datos
	display: grid
	grid-template-columns: repeat(2, minmax(0, 1fr))
	gap: 10px 16px
	margin: 0

.med-cat__dato
	display: flex
	flex-direction: column
	gap: 1px

	dt
		font-size: 0.75rem
		font-weight: 500
		color: var(--color-text-secondary, #6c757d)

	dd
		margin: 0
		font-size: 1.05rem
		font-weight: 600
		color: var(--color-text-primary, #212529)
		font-variant-numeric: tabular-nums

.med-cat__nota
	margin: 12px 0 0
	font-size: 0.8rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

@media (max-width: 400px)
	.med-cat__datos
		grid-template-columns: minmax(0, 1fr)

// Teléfono: los botones del pie ocupan el ancho, con tamaño de dedo.
@media (max-width: 575px)
	#medidas-catalogo .modal-footer .btn
		flex: 1 1 0
		min-height: 40px
</style>
