<template>
<div>
	<b-modal
	id="confirm-make-afip-tickets"
	size="md"
	centered
	scrollable
	dialog-class="confirm-afip-dialog"
	title="Emitir facturas"
	@show="al_abrir"
	@hidden="quitar_seleccionable">

		<div class="confirm-afip">

			<!-- Cabecera: cuantas facturas se van a emitir. -->
			<p class="confirm-afip__encabezado">
				{{ text_confirm }}
			</p>

			<b-form-group
			label="Punto de venta">
				<b-form-select
				:disabled="disabled"
				id="select_punto_de_venta"
				v-model="ventas_afip_information_id"
				@change="set_tipo_comprobante"
				:options="options"></b-form-select>
			</b-form-group>

			<b-form-group
			label="Tipo de comprobante">
				<b-form-select
				id="select_tipo_comprobante"
				v-model="afip_tipo_comprobante_id"
				:options="getOptions({key: 'afip_tipo_comprobante_id', text: 'Tipo Comprobante'})"></b-form-select>
			</b-form-group>

			<!-- Exportacion (tipo 8). Sin cambios funcionales. -->
			<div v-if="afip_tipo_comprobante_id == 8">

				<b-form-group
				label="Condicion de venta">
					<select-incoterms
					@set_selected="set_incoterms"></select-incoterms>
				</b-form-group>

				<b-form-group
				label="Forma de pago">
					<b-form-input
					v-model="forma_de_pago"></b-form-input>
				</b-form-group>

				<b-form-group
				label="Permiso existente">
					<b-form-checkbox
					value="S"
					unchecked-value="N"
					v-model="permiso_existente">
						Permiso existente
					</b-form-checkbox>
				</b-form-group>
			</div>

			<b-form-group
			v-if="afip_tipo_comprobante_id != 8"
			label="Fecha del comprobante"
			description="Dejar en blanco para la fecha de hoy">
				<b-form-datepicker
				id="datepicker_fecha_comprobante"
				:min="minDate()"
				:max="maxDate()"
				v-model="afip_fecha_emision"/>
			</b-form-group>

			<!-- Bloque de importe: solo con UNA venta seleccionada y fuera de exportacion. -->
			<div v-if="bloque_importe_visible">

				<div class="confirm-afip__separador"></div>

				<!--
					El numero protagonista del modal: lo que se va a facturar si no se toca
					nada. Siempre en pesos, que es la moneda en la que se le informa a ARCA.
				-->
				<div class="confirm-afip__total">
					<span class="confirm-afip__total-label">Total a facturar</span>
					<span class="confirm-afip__total-valor">{{ plata(tope_en_pesos) }}</span>
				</div>

				<p
				v-if="venta_seleccionada && venta_seleccionada.moneda_id == 2"
				class="confirm-afip__cotizacion">
					Venta en dolares, cotizada a {{ plata(venta_seleccionada.valor_dolar) }}
				</p>

				<b-form-group
				class="confirm-afip__campo-monto"
				label="Facturar otro importe (opcional)"
				:description="description_importe_a_facturar">
					<b-input-group prepend="$">
						<b-form-input
						type="number"
						step="0.01"
						min="0"
						placeholder="Dejar en blanco para facturar el total"
						v-model="monto_a_facturar"></b-form-input>
					</b-input-group>
				</b-form-group>

				<!--
					El tope tambien lo valida el backend y el backend es la autoridad: aca se
					corta antes solo para no hacerle esperar un 422 al usuario.
				-->
				<b-alert
				:show="supera_el_tope"
				variant="danger"
				class="confirm-afip__alerta">
					El importe a facturar no puede superar el total de la venta
					({{ plata(tope_en_pesos) }}).
				</b-alert>

				<!-- Reparto por alicuota: aparece recien cuando hay un importe personalizado. -->
				<div
				v-if="mostrar_alicuotas"
				class="confirm-afip__alicuotas">

					<p class="confirm-afip__alicuotas-titulo">
						Reparto por alicuota
					</p>
					<p class="confirm-afip__alicuotas-ayuda">
						Arranca todo en el 21%: repartir es sacarle importe a esa fila y ponérselo a
						otra. En cada fila va el importe <strong>total con IVA incluido</strong> de esa
						alicuota, no la base imponible, y la suma tiene que dar exactamente
						{{ plata(monto_personalizado) }}.
					</p>

					<div class="confirm-afip__grilla">

						<div class="confirm-afip__fila confirm-afip__fila--cabecera">
							<span>Alicuota</span>
							<span>Importe con IVA</span>
							<span class="confirm-afip__col-calculada">Base</span>
							<span class="confirm-afip__col-calculada">IVA</span>
						</div>

						<div
						v-for="fila in filas_ivas"
						:key="fila.key"
						class="confirm-afip__fila">
							<span class="confirm-afip__alicuota-label">{{ fila.label }}</span>
							<b-form-input
							type="number"
							step="0.01"
							min="0"
							placeholder="0,00"
							v-model="fila.importe"></b-form-input>
							<span class="confirm-afip__col-calculada">{{ plata(base_de(fila)) }}</span>
							<span class="confirm-afip__col-calculada">{{ plata(iva_de(fila)) }}</span>
						</div>

						<div class="confirm-afip__fila confirm-afip__fila--pie">
							<span>Suma</span>
							<span class="confirm-afip__suma">{{ plata(suma_alicuotas) }}</span>
							<span class="confirm-afip__col-calculada">{{ plata(base_total) }}</span>
							<span class="confirm-afip__col-calculada">{{ plata(iva_total) }}</span>
						</div>
					</div>

					<!--
						Mientras no haya ninguna fila cargada no hay nada mal: se manda el reparto
						vacio y el backend liquida todo al 21%, que es lo que hace hoy. El aviso
						se pone en rojo recien cuando el usuario empezo a repartir y no cierra.
					-->
					<p
					v-if="hay_reparto_cargado"
					class="confirm-afip__diferencia"
					:class="{'is-error': reparto_incompleto}">
						<template v-if="reparto_incompleto">
							Faltan repartir {{ plata(diferencia_alicuotas) }} para llegar al importe a facturar.
						</template>
						<template v-else>
							El reparto cierra con el importe a facturar.
						</template>
					</p>
					<p
					v-else
					class="confirm-afip__diferencia">
						Sin repartir: se factura todo al 21%.
					</p>
				</div>
			</div>
		</div>

		<template #modal-footer>
			<div class="confirm-afip-footer">
				<b-button
				class="confirm-afip-footer__cancelar"
				variant="outline-secondary"
				@click="cerrar">
					Cancelar
				</b-button>
				<b-button
				class="confirm-afip-footer__emitir"
				variant="primary"
				id="btn_enviar_a_facturar"
				:disabled="!puede_emitir"
				@click="emitir_facturas">
					Emitir Facturas
				</b-button>
			</div>
		</template>

	</b-modal>

</div>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
import set_afip_tipo_comprobante from '@/mixins/vender/set_afip_tipo_comprobante'
export default {
	mixins: [afip_ticket, set_afip_tipo_comprobante],
	components: {
		SelectIncoterms: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectIncoterms'),
	},
	data() {
		return {
			afip_fecha_emision: null,
			/*
				Las seis alicuotas de AFIP, hardcodeadas y en el orden en que el backend las
				recorre ('27','21','10','5','2','0').

				🔴 `key` NO es el porcentaje: '10' es 10,5 % y '2' es 2,5 %. Por eso las
				etiquetas se escriben aparte y con coma decimal, y el porcentaje real va en su
				propia propiedad. Y por eso NO se leen de src/store/iva.js, donde los
				percentages son '10.5'/'2.5' y no hay mapeo a la clave interna de AFIP.

				`importe` es el total de esa alicuota CON IVA incluido, no la base imponible.
			*/
			filas_ivas: this.filas_ivas_vacias(),
		}
	},
	computed: {
		disabled() {
			let addresses = this.$store.state.address.models
			if (
				addresses.length > 0
				&& this.ventas_afip_information_id
			) {
				return true
			}
			return false
		},
		description_importe_a_facturar() {
			return 'Completar SOLO si querés facturar un importe distinto al de la venta. En blanco se facturan '+this.total_a_facturar
		},
		/**
		 * Tope en pesos del importe personalizado: el total de la venta, cotizado si la venta
		 * es en dolares.
		 *
		 * 🔴 NO se usa sale.total_a_facturar (la columna): la escribe
		 * SaleHelper::set_total_a_facturar() unicamente al crear la venta, asi que queda vieja
		 * apenas la venta se edita, y queda en null si al crearla no habia punto de venta.
		 *
		 * Igual esto es solo una guarda de UX: la autoridad es el 422 del backend, que
		 * recalcula el tope con AfipHelper::getImportes().
		 */
		tope_en_pesos() {
			if (!this.venta_seleccionada) {
				return 0
			}
			if (this.venta_seleccionada.moneda_id == 2) {
				return Number(this.venta_seleccionada.total) * Number(this.venta_seleccionada.valor_dolar)
			}
			return Number(this.venta_seleccionada.total)
		},
		total_a_facturar() {
			return this.plata(this.tope_en_pesos)+' pesos'
		},
		venta_seleccionada() {
			if (this.selected_sales.length == 1) {
				return this.selected_sales[0]
			}
			return null
		},
		bloque_importe_visible() {
			return this.selected_sales.length == 1 && this.afip_tipo_comprobante_id != 8
		},
		monto_personalizado() {
			return Number(this.monto_a_facturar) || 0
		},
		hay_importe_personalizado() {
			return this.monto_personalizado > 0
		},
		/**
		 * La misma tolerancia de un centavo que usa el backend: el total del front
		 * (sale.total x valor_dolar) y el del AfipHelper (suma de items con back-out) pueden
		 * diferir en centavos, y sin tolerancia se rechazaria "facturar exactamente el total".
		 */
		supera_el_tope() {
			return this.hay_importe_personalizado && this.monto_personalizado > this.tope_en_pesos + 0.01
		},
		/**
		 * El reparto por alicuota solo tiene sentido en Responsable Inscripto: en los demas
		 * regimenes el backend ni lo mira.
		 *
		 * 🔴 Se pregunta AFIRMATIVAMENTE por 'Responsable inscripto', NO por el complemento
		 * ("no es Monotributista ni Exento"). No es lo mismo: IvaConditionSeeder siembra CUATRO
		 * nombres -'Responsable inscripto', 'Monotributista', 'Consumidor final' y 'Exento'-,
		 * asi que el complemento dejaba afuera 'Consumidor final', que tambien es no-RI.
		 *
		 * El string sale de ese seeder y es EXACTAMENTE el mismo con el que compara
		 * AfipImportesCalculator::calculate() en el backend. Espejar esa condicion es el punto:
		 * si el front decide con una regla distinta de la del calculador, termina mostrando un
		 * reparto que despues nadie aplica. No lo "simplifiques" al complemento.
		 *
		 * Fallback seguro: la tabla se esconde SOLO cuando la condicion se pudo resolver y no
		 * es RI. Si no se encontro el punto de venta, o no vino la relacion iva_condition, se
		 * muestra igual: en no-RI el backend ni la mira, asi que mostrarla de mas no tiene
		 * riesgo fiscal, y esconderla de mas le saca al usuario una funcion que le corresponde.
		 */
		es_responsable_inscripto() {
			let punto_de_venta = this.afip_information.find(model => model.id == this.ventas_afip_information_id)
			if (!punto_de_venta || !punto_de_venta.iva_condition) {
				return true
			}
			return punto_de_venta.iva_condition.name == 'Responsable inscripto'
		},
		mostrar_alicuotas() {
			return this.bloque_importe_visible
				&& this.hay_importe_personalizado
				&& this.es_responsable_inscripto
		},
		suma_alicuotas() {
			let suma = 0
			this.filas_ivas.forEach(fila => {
				suma += Number(fila.importe) || 0
			})
			return this.redondear_plata(suma)
		},
		base_total() {
			let total = 0
			this.filas_ivas.forEach(fila => {
				total += this.base_de(fila)
			})
			return this.redondear_plata(total)
		},
		iva_total() {
			let total = 0
			this.filas_ivas.forEach(fila => {
				total += this.iva_de(fila)
			})
			return this.redondear_plata(total)
		},
		diferencia_alicuotas() {
			return this.redondear_plata(this.monto_personalizado - this.suma_alicuotas)
		},
		hay_reparto_cargado() {
			return this.filas_con_importe.length >= 1
		},
		/** Solo las filas que el usuario cargo. Una fila en 0 no genera bucket en el backend. */
		filas_con_importe() {
			let filas = []
			this.filas_ivas.forEach(fila => {
				if (Number(fila.importe) > 0) {
					filas.push({
						key: fila.key,
						importe: this.redondear_plata(Number(fila.importe)),
					})
				}
			})
			return filas
		},
		/**
		 * 🔴 Si la tabla no esta a la vista, el reparto NO cuenta. Sin esta guarda quedaba
		 * trabado el boton sin nada en pantalla que lo explicara: el usuario cargaba filas, despues
		 * borraba el importe -o cambiaba a un punto de venta que no es RI-, la tabla desaparecia
		 * pero filas_ivas conservaba los valores, asi que reparto_incompleto seguia en true y
		 * btn_enviar_a_facturar quedaba deshabilitado. El toast de check() encima hablaba de una
		 * tabla que no estaba. Solo se destrababa cerrando y reabriendo el modal.
		 *
		 * El watcher de mostrar_alicuotas ademas limpia las filas al esconderse, asi que tampoco
		 * reaparece un reparto viejo de otro contexto.
		 */
		reparto_incompleto() {
			if (!this.mostrar_alicuotas) {
				return false
			}
			return this.hay_reparto_cargado && Math.abs(this.diferencia_alicuotas) > 0.01
		},
		/**
		 * Lo que se le manda al backend. Vacio significa "no repartir": el backend liquida todo
		 * al 21 %, que es el comportamiento de siempre.
		 */
		reparto_a_enviar() {
			if (!this.mostrar_alicuotas) {
				return []
			}
			return this.filas_con_importe
		},
		puede_emitir() {
			return !this.supera_el_tope && !this.reparto_incompleto
		},
		afip_information() {
			return this.$store.state.afip_information.models
		},
		options() {
			let options = [
				{
					value: 0,
					text: 'Seleccione Punto de Venta'
				}
			]
			let text
			this.afip_information.forEach(afip_information => {
				if (afip_information.description) {
					text = afip_information.description
				} else {
					text = afip_information.razon_social
				}
				options.push({
					value: afip_information.id,
					text
				})
			})
			return options
		},
		selected_sales() {
			return this.$store.state.sale.selected
		},
		text_confirm() {
			if (this.selected_sales.length == 1) {
				return 'Se va a emitir 1 factura.'
			}
			return 'Se van a emitir '+this.selected_sales.length+' facturas.'
		},
	},
	watch: {
		ventas_afip_information_id() {
			this.set_tipo_comprobante()
		},
		/*
			El reparto vive en el store porque el que arma el body del POST es el mixin, no este
			componente. Se sincroniza por watcher y no en el click de emitir para que el estado
			del store nunca quede atrasado respecto de lo que se ve en pantalla.
		*/
		reparto_a_enviar: {
			immediate: true,
			handler(value) {
				this.importe_personalizado_ivas = value
			},
		},
		/*
			El importe se sienta solo en la fila del 21 %, que es el default que pidio Lucas: el
			usuario ve la plata donde va a ir a parar y repartir es sacarle de ahi para ponerle a
			otra alicuota, en vez de arrancar con seis casilleros en blanco.

			Solo se precarga si el reparto esta INTACTO respecto del importe anterior. Si el
			usuario ya movio plata a mano, corregir el importe de arriba no le pisa lo que venia
			armando: la diferencia queda a la vista en el pie y la arregla el.
		*/
		monto_personalizado(nuevo, viejo) {
			if (nuevo <= 0) {
				this.filas_ivas = this.filas_ivas_vacias()
				return
			}
			if (this.reparto_intacto(viejo)) {
				this.precargar_en_21(nuevo)
			}
		},
		/*
			La tabla se esconde cuando se borra el importe o cuando el punto de venta deja de ser
			Responsable Inscripto. Las filas se limpian ahi mismo para que no quede un reparto
			fantasma bloqueando el boton, ni reaparezca despues en un contexto distinto.
		*/
		mostrar_alicuotas(visible) {
			if (!visible) {
				this.filas_ivas = this.filas_ivas_vacias()
				return
			}
			// Se hizo visible con las filas en cero: el importe se sienta en el 21 %.
			if (this.reparto_intacto(0)) {
				this.precargar_en_21(this.monto_personalizado)
			}
		},
	},
	methods: {
		/** Las seis filas en blanco. Se usa en data() y cada vez que se abre el modal. */
		filas_ivas_vacias() {
			return [
				{key: '27', label: '27%',   porcentaje: 27,   importe: ''},
				{key: '21', label: '21%',   porcentaje: 21,   importe: ''},
				{key: '10', label: '10,5%', porcentaje: 10.5, importe: ''},
				{key: '5',  label: '5%',    porcentaje: 5,    importe: ''},
				{key: '2',  label: '2,5%',  porcentaje: 2.5,  importe: ''},
				{key: '0',  label: '0%',    porcentaje: 0,    importe: ''},
			]
		},
		/**
		 * 🔴 Se limpian LAS DOS cosas, y esa simetria es el punto: monto_a_facturar vive en el
		 * store y hasta ahora solo se borraba al terminar la emision. O sea que abrir el modal para
		 * la venta A, escribir un importe, cancelar y abrir el modal para la venta B dejaba el
		 * importe de A cargado -ahora sin reparto- listo para facturarse sobre otra venta.
		 */
		al_abrir() {
			this.monto_a_facturar = ''
			this.filas_ivas = this.filas_ivas_vacias()
		},
		/**
		 * true si nadie toco el reparto a mano: todo el importe de referencia sentado en la fila
		 * del 21 % y las otras cinco en cero. Es la condicion para poder precargar sin pisarle
		 * trabajo al usuario.
		 *
		 * @param {Number} monto_referencia
		 * @returns {Boolean}
		 */
		reparto_intacto(monto_referencia) {
			let referencia = this.redondear_plata(monto_referencia)
			let intacto = true
			this.filas_ivas.forEach(fila => {
				let importe = this.redondear_plata(Number(fila.importe) || 0)
				if (fila.key == '21') {
					if (importe !== referencia) {
						intacto = false
					}
				} else if (importe !== 0) {
					intacto = false
				}
			})
			return intacto
		},
		/**
		 * Sienta todo el importe en la fila del 21 % y deja las otras cinco vacias, que para
		 * todos los calculos es cero y en pantalla muestra el placeholder 0,00.
		 *
		 * @param {Number} monto
		 */
		precargar_en_21(monto) {
			let importe = this.redondear_plata(monto)
			this.filas_ivas.forEach(fila => {
				fila.importe = fila.key == '21' ? importe : ''
			})
		},
		/**
		 * 🔴 price() del sistema devuelve '-' cuando el valor es null o undefined. Aca el 0 es un
		 * valor legitimo y frecuentisimo -las seis filas del reparto arrancan vacias-, asi que
		 * primero se normaliza a numero y recien despues se formatea.
		 *
		 * Hasta el 21/8/2026 esto llamaba a numeral directo y salia en formato ingles
		 * ($1,234.56), distinto de todo el resto del sistema. Ahora delega en price(), que es el
		 * unico lugar donde se decide como se ve la plata: punto para los miles, coma para los
		 * decimales.
		 *
		 * El segundo argumento (with_decimals = true) NO es opcional para este caso: sin el,
		 * price() le come los ',00' a los importes redondos y la columna de alicuotas queda
		 * despareja. Acá los dos decimales se muestran siempre, como venia siendo.
		 *
		 * @param {Number} valor
		 * @returns {String}
		 */
		plata(valor) {
			return this.price(Number(valor) || 0, true)
		},
		redondear_plata(numero) {
			return Math.round((Number(numero) || 0) * 100) / 100
		},
		/**
		 * Base imponible de la fila: se saca el IVA del importe total dividiendo por
		 * (porcentaje / 100 + 1), igual que AfipItemCalculator::get_price_without_iva() en el
		 * backend. Es solo ayuda visual: lo que se manda es el importe total de la fila.
		 */
		base_de(fila) {
			let importe = Number(fila.importe) || 0
			if (importe <= 0) {
				return 0
			}
			return this.redondear_plata(importe / ((fila.porcentaje / 100) + 1))
		},
		/**
		 * IVA de la fila SIEMPRE por resta, nunca base x porcentaje: asi base + iva da el
		 * importe de la fila exacto, que es la misma invariante que sostiene el backend.
		 */
		iva_de(fila) {
			let importe = Number(fila.importe) || 0
			if (importe <= 0) {
				return 0
			}
			return this.redondear_plata(importe - this.base_de(fila))
		},
		set_incoterms(incoterms) {
			this.$store.commit('afip_ticket/set_incoterms', incoterms)
		},
		minDate() {
			const today = new Date();
			const minDate = new Date(today);
			minDate.setDate(minDate.getDate() - 5);
			return minDate.toISOString().split('T')[0]
		},
		maxDate() {
			const today = new Date();
			const maxDate = new Date(today);
			maxDate.setDate(maxDate.getDate() + 5);
			return maxDate.toISOString().split('T')[0]
		},
		set_tipo_comprobante() {

			if (this.selected_sales.length == 1) {

				let tipo_compobante_id = this.get_afip_tipo_comprobante(this.ventas_afip_information_id, this.selected_sales[0].client)

				this.afip_tipo_comprobante_id = tipo_compobante_id
			}

		},
		cerrar() {
			this.$bvModal.hide('confirm-make-afip-tickets')
		},
		quitar_seleccionable() {
			this.$store.commit('sale/setIsSelecteable', false)
			this.$store.commit('sale/setSelected', [])
		},
		emitir_facturas() {
			if (this.check()) {

				this.enviar_afip_tickets()

			}
		},
		check() {
			if (this.ventas_afip_information_id == 0) {
				this.$toast.error('Seleccione un punto de venta')
				return false
			}
			if (this.afip_tipo_comprobante_id == 0) {
				this.$toast.error('Seleccione un tipo de comprobante')
				return false
			}
			if (this.supera_el_tope) {
				this.$toast.error('El importe a facturar no puede superar el total de la venta')
				return false
			}
			if (this.reparto_incompleto) {
				this.$toast.error('El reparto por alicuota no suma el importe a facturar')
				return false
			}
			return true
		},
	}
}
</script>
<style lang="sass">
#make-afip-tickets
	.cont-sale-info
		display: flex
		flex-direction: row
		align-items: center
		justify-content: center
		.spinner-border
			width: 20px !important
			height: 20px !important

// 520px y no los 500 que trae size="md": la grilla de alicuotas tiene cuatro columnas y con el
// ancho de bootstrap la columna del input se espicha hasta no poder tipear comodo.
//
// Van DOS clases y no una, por lo mismo que documenta el encabezado de _modals.sass: cada
// archivo .sass del proyecto arrastra bootstrap entero por el @import de _custom.scss, asi que
// la ultima copia de bootstrap queda despues en la hoja final y con una sola clase le gana.
.modal-dialog.confirm-afip-dialog
	max-width: 520px

// 🔴 Ni un hexadecimal en todo el bloque, y ningun var(--x, #hex) tampoco: este modal se monta
// colgando de <body>, fuera de #app, y un color escrito a mano lo deja roto en modo oscuro. El
// fallback no ayuda: tapa el token faltante en vez de mostrarlo.
.confirm-afip
	color: var(--color-text-primary)

	&__encabezado
		font-size: 0.95rem
		color: var(--color-text-secondary)
		margin-bottom: 18px

	&__separador
		border-top: 1px solid var(--color-border)
		margin: 20px 0 16px

	// El numero protagonista del modal, con el mismo tratamiento que el total de sellers/Pago:
	// rotulo chico en mayusculas y el numero grande abajo. Un solo acento de color en toda la
	// pantalla, y es este.
	&__total
		display: flex
		flex-direction: column
		margin-bottom: 4px

	&__total-label
		font-size: 0.68rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary)

	&__total-valor
		font-size: 1.9rem
		font-weight: 700
		line-height: 1.15
		color: var(--totales-acento-principal)

	&__cotizacion
		font-size: 0.8rem
		color: var(--totales-acento-usd)
		margin-bottom: 0

	&__campo-monto
		margin-top: 16px

	&__alerta
		font-size: 0.85rem
		margin-bottom: 12px

	&__alicuotas
		margin-top: 4px
		padding: 14px
		border: 1px solid var(--color-border)
		border-radius: 12px
		background: var(--bg-section)

	&__alicuotas-titulo
		font-size: 0.68rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary)
		margin-bottom: 6px

	&__alicuotas-ayuda
		font-size: 0.8rem
		color: var(--color-text-secondary)
		margin-bottom: 12px

	// Grilla y no <table>: _tables.sass fuerza el fondo blanco de cada <tr> con !important y
	// TableComponent.vue le mete 5px de padding a todo <td> del sistema. Con cuatro columnas
	// fijas, un grid da la misma alineacion sin pelearse con nada de eso.
	&__grilla
		display: flex
		flex-direction: column

	&__fila
		display: grid
		grid-template-columns: 60px minmax(110px, 1fr) 1fr 1fr
		align-items: center
		gap: 8px
		padding: 4px 0

	&__fila--cabecera
		font-size: 0.7rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.03em
		color: var(--color-text-secondary)
		border-bottom: 1px solid var(--color-border-secondary)
		padding-bottom: 6px
		margin-bottom: 4px

	&__fila--pie
		border-top: 1px solid var(--color-border-secondary)
		padding-top: 8px
		margin-top: 4px
		font-size: 0.85rem
		font-weight: 600

	&__alicuota-label
		font-size: 0.9rem
		font-weight: 600

	// Base e IVA son ayuda visual: no se mandan al backend y no se editan. Van en gris y a la
	// derecha para que la columna que SI se carga sea la unica que pide atencion.
	&__col-calculada
		text-align: right
		font-size: 0.82rem
		color: var(--color-text-secondary)
		font-variant-numeric: tabular-nums

	&__suma
		font-variant-numeric: tabular-nums

	&__diferencia
		font-size: 0.82rem
		color: var(--color-text-secondary)
		margin-top: 10px
		margin-bottom: 0

		&.is-error
			color: var(--btn-peligro-texto)
			font-weight: 600

	// src/sass/_inputs.sass le pone a TODO input del sistema 1.4rem de tipografia, un borde de
	// 2px que pasa a 3px al enfocar (la fila se mueve 1px) y un halo azul de 8px. Nada de eso se
	// toca a nivel global -lo usan pantallas viejas de todo el sistema-: se lo pisa aca adentro,
	// con la misma calibracion que ya usa ModelForm.vue.
	.form-group
		margin-bottom: 16px

	.form-control,
	.custom-select,
	.b-form-datepicker .form-control
		min-height: var(--toolbar-control-h)
		height: auto
		padding: 0.25rem 0.7rem
		font-size: 0.95rem
		line-height: 1.45
		border: 1px solid var(--color-border)
		border-radius: 10px
		box-shadow: none
		transition: border-color 0.15s ease

		&:focus
			border: 1px solid var(--color-primary)
			box-shadow: none

	.input-group-text
		min-height: var(--toolbar-control-h)
		border: 1px solid var(--color-border)
		border-radius: 10px 0 0 10px
		background: var(--bg-hover)
		color: var(--color-text-secondary)
		font-size: 0.95rem

	.input-group > .form-control
		border-radius: 0 10px 10px 0

	// Los inputs de la grilla ya viven adentro de una fila etiquetada: el rotulo lo pone la
	// cabecera de la columna y el numero va a la derecha, alineado con las dos calculadas.
	&__fila .form-control
		text-align: right
		font-variant-numeric: tabular-nums

	legend, label
		font-size: 0.8rem
		font-weight: 600
		color: var(--color-text-secondary)
		margin-bottom: 4px

// Pie del modal, con el mismo chasis que el footer canonico de common-vue/components/model.
// El color del primario lo sigue poniendo variant="primary" de bootstrap: aca solo va la
// geometria, asi que no hace falta escribir ningun color a mano.
.confirm-afip-footer
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

		&:disabled
			opacity: 0.6
			cursor: default

	&__emitir
		margin-left: auto

@media (max-width: 576px)
	.modal-dialog.confirm-afip-dialog
		max-width: none
		margin: 16px

	// En telefono las columnas calculadas se van: son ayuda, no dato, y con cuatro columnas el
	// input queda tan angosto que no se puede tipear. La suma del pie sigue a la vista, que es
	// lo unico que hace falta para saber si el reparto cierra.
	.confirm-afip__fila
		grid-template-columns: 60px 1fr

	.confirm-afip__col-calculada
		display: none

	.confirm-afip__total-valor
		font-size: 1.6rem
</style>
