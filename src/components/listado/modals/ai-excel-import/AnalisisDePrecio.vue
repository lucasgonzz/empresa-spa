<template>
	<!--
		Análisis algorítmico del Excel para el paso 3 de la importación (misión
		importacion-formula-precio, 20/11/2026). Lo calcula empresa-api sin IA
		(AnalisisDePrecioDelExcel) y llega en `analisis_de_precio` del resultado de get-recomendacion:

		1.  Cómo se llega al precio de venta: una oración para que el usuario confirme la cuenta,
		las columnas intermedias que no se importan y, si el mapeo no coincide con la cuenta,
		un botón para corregirlo (vuelve al paso 2 con el mapeo sugerido).
		2.  Descuentos escritos con signo negativo: tilde «los descuentos negativos descuentan».
		3.  Códigos de barras repetidos: tilde «identificar por código de proveedor».

		Los dos tildes van con .sync: el estado vive en Index.vue, que los manda en importar() y los
		guarda en el borrador.
	-->
	<div
	v-if="analisis"
	class="ai-import-analisis-precio m-b-20"
	data-testid="ai-import-analisis-precio">

		<!-- 1. Fórmula del precio de venta -->
		<div
		v-if="formula"
		class="ai-import-analisis-precio__caja m-b-15">
			<p class="font-weight-bold m-b-8 m-t-0">
				<i class="icon-dollar-sign m-r-5"></i>¿Cómo se calcula tu precio de venta?
			</p>

			<p
			class="m-b-10 m-t-0"
			data-testid="ai-import-formula-oracion">
				{{ formula.oracion }}
			</p>

			<template v-if="formula.encontrada">

				<!-- Columnas intermedias: pasos de la cuenta que no hay que importar -->
				<p
				v-if="formula.intermedias && formula.intermedias.length"
				class="small text-muted m-b-10 m-t-0">
					Estas columnas son pasos intermedios de la misma cuenta y no se importan:
					<span
					v-for="(intermedia, indice) in formula.intermedias"
					:key="'intermedia-' + intermedia.indice">
						<b>{{ intermedia.nombre }}</b> ({{ intermedia.letra }}, {{ intermedia.descripcion }}){{ separador(indice, formula.intermedias, '.') }}
					</span>
				</p>

				<!-- Filas que no cierran con la cuenta -->
				<p
				v-if="formula.filas_que_cierran < formula.filas_revisadas"
				class="small text-muted m-b-10 m-t-0">
					En {{ formula.filas_revisadas - formula.filas_que_cierran }} de las filas revisadas el precio del Excel
					no coincide con esta cuenta (por ejemplo, fila {{ ejemplo_de_excepcion }}): esos artículos van a quedar
					con el precio que da el sistema.
				</p>

				<!-- El mapeo confirmado no coincide con la cuenta -->
				<b-alert
				v-if="formula.diferencias_con_el_mapeo && formula.diferencias_con_el_mapeo.length"
				show
				variant="warning"
				class="m-b-0">
					<p class="small font-weight-bold m-b-5 m-t-0">
						Para que el sistema llegue al mismo precio, el mapeo de columnas tendría que ser así:
					</p>
					<ul class="small m-b-10 p-l-20">
						<li
						v-for="diferencia in formula.diferencias_con_el_mapeo"
						:key="'diferencia-' + diferencia.propiedad">
							<b>{{ nombre_de_propiedad(diferencia.propiedad) }}</b>:
							<template v-if="diferencia.columna_sugerida === null">
								no importarla (el precio sale de la cuenta, con el margen)
							</template>
							<template v-else>
								«{{ diferencia.nombre_sugerido }}» (columna {{ diferencia.letra_sugerida }})
							</template>
							<span
							v-if="diferencia.columna_actual !== null"
							class="text-muted">
								— hoy está en «{{ diferencia.nombre_actual }}» ({{ diferencia.letra_actual }})
							</span>
						</li>
					</ul>
					<b-button
					size="sm"
					variant="primary"
					data-testid="ai-import-corregir-mapeo"
					@click="$emit('corregir-mapeo', formula.mapeo_sugerido, formula.intermedias || [])">
						Corregir el mapeo y revisarlo
					</b-button>
				</b-alert>

			</template>
		</div>

		<!-- 2. Descuentos con signo negativo y descuentos encadenados -->
		<b-alert
		v-if="descuentos && (descuentos.con_negativos > 0 || descuentos.encadenados_con_mas > 0)"
		show
		variant="warning"
		class="m-b-15"
		data-testid="ai-import-descuentos-negativos">

			<template v-if="descuentos.encadenados_con_mas > 0">
				<p class="small m-b-5 m-t-0">
					<i class="icon-info m-r-5"></i>
					{{ descuentos.encadenados_con_mas }} {{ descuentos.encadenados_con_mas === 1 ? 'celda encadena' : 'celdas encadenan' }}
					descuentos con «+» (por ejemplo, fila {{ descuentos.ejemplos_encadenados[0].fila }}:
					<code>{{ descuentos.ejemplos_encadenados[0].valor }}</code>). Se toman como descuentos sucesivos, igual
					que el «_» del sistema.
				</p>
			</template>

			<template v-if="descuentos.con_negativos > 0">
				<p class="small font-weight-bold m-b-5 m-t-0">
					<i class="icon-alert-triangle m-r-5"></i>
					{{ descuentos.con_negativos }} {{ descuentos.con_negativos === 1 ? 'descuento está escrito' : 'descuentos están escritos' }}
					con signo negativo (por ejemplo <code>{{ descuentos.ejemplos_negativos[0].valor }}</code>).
				</p>
				<p class="small m-b-8 m-t-0">
					En el sistema un descuento se escribe en positivo: un <b>25</b> le resta el 25 % al costo.
					Un descuento negativo hace lo contrario: un <b>-25</b> le <b>suma</b> el 25 % al costo.
					<template v-if="descuentos.la_formula_lo_confirma">
						Por la cuenta del precio de venta, en este Excel el signo negativo quiere decir «descontar».
					</template>
				</p>
				<b-form-checkbox
				:checked="descuentos_negativos_descuentan"
				data-testid="ai-import-descuentos-negativos-check"
				@change="$emit('update:descuentos_negativos_descuentan', $event)">
					<span class="small">
						Los descuentos negativos descuentan: <b>-25</b> le resta el 25 % al costo
						<template v-if="descuentos.con_positivos > 0">
							(y un <b>5</b> sin signo le suma el 5 %, como recargo)
						</template>
					</span>
				</b-form-checkbox>
			</template>
		</b-alert>

		<!-- 3. Códigos de barras repetidos -->
		<b-alert
		v-if="barras && barras.grupos > 0"
		show
		variant="warning"
		class="m-b-15"
		data-testid="ai-import-barras-repetidas">
			<p class="small font-weight-bold m-b-5 m-t-0">
				<i class="icon-alert-triangle m-r-5"></i>
				Hay códigos de barras repetidos en el Excel
			</p>
			<p class="small m-b-5 m-t-0">
				{{ barras.grupos }} {{ barras.grupos === 1 ? 'código de barras aparece' : 'códigos de barras aparecen' }}
				en más de una fila ({{ barras.filas }} filas en total). Por ejemplo, <code>{{ primer_ejemplo.codigo_de_barras }}</code>
				está en
				<span
				v-for="(fila, indice) in primer_ejemplo.filas"
				:key="'fila-ejemplo-' + indice">
					la fila {{ fila.fila }}<template v-if="fila.nombre"> («{{ fila.nombre }}»)</template>{{ separador(indice, primer_ejemplo.filas, '') }}
				</span>.
				Si se identifican por código de barras, esos artículos se pisan entre sí y queda uno solo.
			</p>

			<template v-if="barras.hay_codigo_de_proveedor && barras.filas_por_codigo_de_proveedor > 0">
				<b-form-checkbox
				:checked="barras_repetidas_por_codigo_de_proveedor"
				class="m-t-8"
				data-testid="ai-import-barras-repetidas-check"
				@change="$emit('update:barras_repetidas_por_codigo_de_proveedor', $event)">
					<span class="small">
						Identificar por código de proveedor cuando el código de barras se repite
					</span>
				</b-form-checkbox>
				<ul class="small m-b-0 m-t-5 p-l-20 text-muted">
					<li>Los artículos con un código de barras único se siguen identificando por código de barras.</li>
					<li>
						{{ barras.filas_por_codigo_de_proveedor }} {{ barras.filas_por_codigo_de_proveedor === 1 ? 'fila tiene' : 'filas tienen' }}
						el código de barras repetido pero un código de proveedor distinto: se identifican por código de
						proveedor y no se les carga el código de barras.
					</li>
					<li v-if="barras.filas_que_se_pisan > 0">
						{{ barras.filas_que_se_pisan }} {{ barras.filas_que_se_pisan === 1 ? 'fila repite' : 'filas repiten' }}
						el código de barras sin un código de proveedor que las distinga: se identifican por código de barras
						y la última fila pisa a las anteriores.
					</li>
				</ul>
			</template>
			<p
			v-else-if="!barras.hay_codigo_de_proveedor"
			class="small m-b-0 m-t-5 text-muted">
				Si indicás qué columna es el código de proveedor, podés identificar esos artículos por ese código.
			</p>
		</b-alert>

	</div>
</template>

<script>
/*
 * Nombres visibles de las propiedades del sistema que aparecen en la fórmula del precio.
 */
const NOMBRES_DE_PROPIEDADES = {
	costo: 'Costo',
	descuentos: 'Descuentos',
	u_individuales: 'Unidades individuales',
	margen_de_ganancia: 'Margen de ganancia',
	iva: 'IVA',
	precio: 'Precio',
}

export default {
	name: 'AnalisisDePrecio',

	props: {
		/*
		 * `analisis_de_precio` del resultado de get-recomendacion:
		 * { formula, descuentos, codigos_de_barra }. Null: el componente no dibuja nada.
		 */
		analisis: {
			type: Object,
			default: null,
		},
		/* Tilde «los descuentos negativos descuentan» (.sync). */
		descuentos_negativos_descuentan: {
			type: Boolean,
			default: false,
		},
		/* Tilde «identificar por código de proveedor cuando el código de barras se repite» (.sync). */
		barras_repetidas_por_codigo_de_proveedor: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/* Resultado del detector de la fórmula del precio, o null. */
		formula() {
			return this.analisis ? this.analisis.formula : null
		},

		/* Estadística de cómo están escritos los descuentos, o null si no hay columna de descuentos. */
		descuentos() {
			return this.analisis ? this.analisis.descuentos : null
		},

		/* Resumen de códigos de barras repetidos, o null si no hay columna de código de barras. */
		barras() {
			return this.analisis ? this.analisis.codigos_de_barra : null
		},

		/* Primer grupo de códigos repetidos, para el ejemplo del aviso. */
		primer_ejemplo() {
			if (!this.barras || !this.barras.ejemplos || !this.barras.ejemplos.length) {
				return { codigo_de_barras: '', filas: [] }
			}
			return this.barras.ejemplos[0]
		},


		/* Primera fila que no cierra con la cuenta, para el ejemplo. */
		ejemplo_de_excepcion() {
			if (!this.formula || !this.formula.excepciones || !this.formula.excepciones.length) {
				return ''
			}
			let excepcion = this.formula.excepciones[0]
			return excepcion.fila + ': el Excel dice ' + this.precio(excepcion.excel) + ' y la cuenta da ' + this.precio(excepcion.calculado)
		},
	},

	methods: {
		/**
		 * Nombre visible de una propiedad del sistema.
		 * @param {String} propiedad
		 * @return {String}
		 */
		nombre_de_propiedad(propiedad) {
			return NOMBRES_DE_PROPIEDADES[propiedad] || propiedad
		},

		/**
		 * Separador entre elementos de una lista en el texto: coma, o `final` después del último.
		 * @param {Number} indice
		 * @param {Array}  lista
		 * @param {String} final
		 * @return {String}
		 */
		separador(indice, lista, final) {
			return indice < lista.length - 1 ? ', ' : final
		},

		/**
		 * Formato de un importe para los ejemplos.
		 * @param {Number} valor
		 * @return {String}
		 */
		precio(valor) {
			return '$' + Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })
		},
	},
}
</script>

<style lang="sass">
/* Análisis del precio del Excel (misión importacion-formula-precio). */
.ai-import-analisis-precio__caja
	border: 1px solid rgba(0, 0, 0, .1)
	border-radius: 8px
	padding: 12px 15px

	code
		white-space: nowrap
</style>
