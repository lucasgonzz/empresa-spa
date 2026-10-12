<template>
	<div
	class="form-moneda"
	v-if="show">
		<b-input-group prepend="Moneda">
			<!--
				:value + @change y no v-model: al cambiar la moneda de un comprobante en edicion
				(presupuesto o venta guardada) hace falta saber de cual venia (para convertir los
				renglones) y poder RECHAZAR el cambio si no hay cotizacion o si hay importes que no se
				convierten. :key se incrementa cuando se rechaza, para que el select vuelva a mostrar la
				moneda del store (b-form-select guarda lo elegido en un estado local).
			-->
			<b-form-select
			class="select-moneda"
			:key="select_moneda_key"
			:disabled="disabled"
			:value="moneda_id"
			@change="elegir_moneda_del_comprobante"
			:options="getOptions({key: 'moneda_id', text: 'Moneda'}, null, null, false)"></b-form-select>
		</b-input-group>

		<b-input-group
		v-if="mostrar_input_dolar"
		class="m-t-10"
		prepend="USD">
			<b-form-input
			type="number"
			:disabled="disabled"
			class="input-dolar"
			@input="set_valor_dolar"
			@blur="restaurar_dolar_si_falta"
			v-model="input_dolar_valor"></b-form-input>
		</b-input-group>

	</div>
</template>
<script>
import vender_set_total from '@/mixins/vender_set_total'
import cotizacion_dolar_por_defecto from '@/mixins/vender/cotizacion_dolar_por_defecto'
import reexpresar_comprobante from '@/mixins/vender/reexpresar_comprobante'
export default {
	mixins: [vender_set_total, cotizacion_dolar_por_defecto, reexpresar_comprobante],
	computed: {
		show() {
			return this.user && this.hasExtencion('ventas_en_dolares')
		},
		/*
			El campo de la cotizacion se ve siempre, salvo en las cuentas con listas de precio por
			moneda (los precios ya vienen en su moneda y el campo no pinta nada)... y salvo que el
			comercio NO tenga dolar cargado en el sistema: sin dolar por defecto el vendedor no tiene
			otro lugar donde ponerlo, y una venta en dolares sin cotizacion la API la rechaza.
		*/
		mostrar_input_dolar() {
			return !this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')
				|| this.valor_dolar_por_defecto === null
		},
		valor_dolar: {
			get() {
				return this.$store.state.vender.valor_dolar
			},
			set(value) {
				this.$store.commit('vender/set_valor_dolar', value)
			}
		},
		moneda_id: {
			get() {
				return this.$store.state.vender.moneda_id
			},
			set(value) {
				this.$store.commit('vender/set_moneda_id', value)
			}
		},
		/*
			La moneda y la cotizacion ya no se bloquean para ningun comprobante.

			Un PRESUPUESTO sin confirmar se puede pasar de $ a USD y viceversa desde la mision
			2r-presupuestos-editables (1/10/2026), y una VENTA guardada desde la mision
			edicion-completa-ventas-presupuestos (8/10/2026, el punto 10 del presupuesto de 2R; hasta
			ahi la venta tenia la moneda y la cotizacion bloqueadas). En los dos los renglones se
			convierten con la cotizacion del campo USD en elegir_moneda_del_comprobante(), y cambiar
			solo la cotizacion no toca ningun precio guardado (decision 2 de Lucas).

			Una venta a cuenta corriente que cambia de moneda cambia de CUENTA (la cuenta corriente esta
			partida por moneda): la API mueve el debito y BtnGuardar avisa lo cobrado
			(previus_sale/aviso_cambio_de_cuenta.js). Un presupuesto confirmado no llega aca: el boton
			"Actualizar en VENDER" esta deshabilitado y la API lo rechaza con 422. Una venta que no se
			puede editar (facturada con CAE, cerrada, etc.) tampoco: la API la rechaza entera.

			Queda el computed (y no un `false` suelto en el template) para que el proximo que necesite
			bloquearla tenga donde hacerlo.
		*/
		disabled() {
			return false
		},
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		budget() {
			return this.$store.state.vender.budget
		},
		/*
			Se esta editando un comprobante GUARDADO: un presupuesto ("Actualizar en VENDER") o una venta.
			Sus renglones toman el precio del pivot, que check_moneda no vuelve a cotizar, asi que un
			cambio de moneda tiene que convertirlos (ver mixins/vender/reexpresar_comprobante.js).
		*/
		comprobante_en_edicion() {
			return !!this.budget || this.editando_venta_previa
		},
		/*
			"del presupuesto" o "de la venta", para los avisos. Hasta el 8/10/2026 decian siempre "del
			presupuesto", que era el unico comprobante en edicion que podia cambiar de moneda.
		*/
		nombre_del_comprobante_en_edicion() {
			return this.budget ? 'del presupuesto' : 'de la venta'
		},
	},
	data() {
		return {
			input_dolar_valor: null,  // Este será el input editable
			// Se incrementa para forzar que el select vuelva a pintar la moneda del store
			select_moneda_key: 0,
		}
	},
	created() {
		this.iniciar_dolar()
	},
	watch: {
		/*
			El input es una copia local del valor del store y solo se sincronizaba al montarse
			(iniciar_dolar). Desde que limpiar_vender restaura la cotizacion del dueño al terminar
			cada comprobante, el store cambia sin que este componente se vuelva a montar, y el
			input seguia mostrando la cotizacion de la venta anterior (o la de la venta editada)
			mientras el store --que es lo que viaja en el POST-- ya tenia la del dueño.

			Se compara por valor numerico y no por igualdad a secas para no pisar lo que el
			vendedor esta tipeando: cada keyup manda Number(input) al store, y si el store
			devolviera "1250" sobre un "1250." a medio escribir, le comeria el punto.
		*/
		valor_dolar(valor) {
			if (valor === null || typeof valor === 'undefined') {
				this.iniciar_dolar()
				return
			}

			if (Number(this.input_dolar_valor) !== Number(valor)) {
				this.input_dolar_valor = valor
			}

			/*
				🔴 La cotizacion cambio con un comprobante en edicion (presupuesto o venta guardada): los
				renglones tienen que re-expresarse con la nueva. Va ACA, en el watcher del store, y no en set_valor_dolar(),
				porque la cotizacion puede cambiar por cuatro caminos --el vendedor tipeando, el
				restaurar_dolar_si_falta() al salir del campo vacio, iniciar_dolar() y el chequeo de
				guardado que carga la del sistema-- y los cuatro terminan en un commit al store. Sin
				esto, la cotizacion nueva quedaba guardada con renglones convertidos con la vieja.
				No hay recursion: reexpresar no toca valor_dolar.
			*/
			this.reexpresar_por_cambio_de_cotizacion()
		},
	},
	methods: {
		/**
		 * Deja la cotizacion de la venta cargada: la que ya tiene (la de la venta que se edita, o la que
		 * el vendedor tipeo) y, si no hay ninguna, el dolar del sistema.
		 *
		 * 🔴 Decision de Lucas (30/9/2026): una venta en dolares sin cotizacion la API la rechaza (422),
		 * asi que Vender tiene que arrancar SIEMPRE con el dolar que el comercio tiene cargado. Antes
		 * solo se sembraba cuando el store estaba en `null`: una cotizacion en CERO (el vendedor borro
		 * el campo) se quedaba en cero y la venta en dolares salia sin con que convertir. Ahora
		 * null, 0 o vacio se tratan igual: sin cotizacion -> la del sistema.
		 *
		 * Sin dolar configurado en el comercio no se inventa nada: queda vacio y el campo USD se ve
		 * (`mostrar_input_dolar`) para que el vendedor lo cargue.
		 */
		iniciar_dolar() {

			if (!this.user) {
				setTimeout(() => {
					this.iniciar_dolar()
				}, 500)
				return
			}

			if (Number(this.valor_dolar) > 0) {
				this.input_dolar_valor = this.valor_dolar
				return
			}

			if (!this.cargar_dolar_por_defecto()) {
				console.log('El dueño no tiene dolar configurado')
				return
			}

			this.input_dolar_valor = this.valor_dolar_por_defecto
			this.setTotal()
		},
		set_total() {
			this.setTotal()
		},
		/**
		 * Con un comprobante en edicion (presupuesto o venta guardada), vuelve a expresar los
		 * renglones con la cotizacion vigente (la moneda no cambia). Si el comprobante esta en su
		 * moneda original no cambia ningun precio: los importes son los originales, y cambiar la
		 * cotizacion solo cambia la que se guarda (decision 2 de Lucas, 8/10/2026). Sin cotizacion
		 * mayor que cero no hace nada (el campo puede estar vacio mientras el vendedor escribe; al
		 * salir se restaura el dolar del sistema y este metodo vuelve a correr).
		 *
		 * Hasta el 8/10/2026 la venta guardada salia por aca sin hacer nada (`editando_venta_previa`):
		 * tenia la cotizacion bloqueada. Al abrirla tambien corre (el store recibe la cotizacion de la
		 * venta) y no cambia nada, porque la venta esta en su moneda original: solo deja anotado el
		 * origen de cada renglon.
		 */
		reexpresar_por_cambio_de_cotizacion() {

			if (!this.comprobante_en_edicion) {
				return
			}

			let cotizacion = Number(this.valor_dolar)

			if (!(cotizacion > 0)) {
				return
			}

			this.reexpresar_comprobante_en_otra_moneda(this.moneda_id, this.moneda_id, cotizacion)

			this.setTotal()
		},
		/**
		 * El vendedor eligio otra moneda en el select.
		 *
		 * Con una venta nueva o un presupuesto nuevo es lo de siempre: se guarda la moneda y se
		 * recalcula el total (los precios salen del catalogo y check_moneda los cotiza).
		 *
		 * Con un comprobante en edicion (`budget` en el store, o una venta guardada desde el
		 * 8/10/2026) los renglones NO salen del catalogo sino de lo guardado, y check_moneda no
		 * cotiza lo que sale del pivot: por eso aca se CONVIERTEN antes de recalcular (ver
		 * mixins/vender/reexpresar_comprobante.js, que explica la regla). La cotizacion es la que
		 * muestra el campo USD en este momento; si el store no tiene una (comprobante en pesos, o en
		 * USD guardado sin cotizacion) se usa el dolar del sistema, igual que al abrir Vender. Sin
		 * ninguna de las dos el cambio se RECHAZA: convertir con una cotizacion inventada deja precios
		 * que parecen buenos y no lo son.
		 *
		 * 🔴 Tambien se RECHAZA si el comprobante tiene importes fijos que el mixin no convierte (el
		 * canje de puntos, el reparto en varios metodos de pago de una venta, una devolucion cargada
		 * en esta edicion): el vendedor los saca primero. Convertir los renglones y dejarlos a ellos
		 * en la moneda vieja guardaria la venta con importes en dos monedas. El porque de cada uno
		 * esta en reexpresar_comprobante.js ("LO QUE NO SE CONVIERTE Y POR ESO FRENA").
		 *
		 * Los renglones se recalculan siempre desde sus importes originales (ver el mixin): volver a
		 * la moneda original los devuelve exactos, y cambiar la cotizacion despues de convertir los
		 * re-expresa con la nueva (watcher de valor_dolar).
		 *
		 * @param {Number|String} moneda_nueva Valor elegido en el select.
		 */
		elegir_moneda_del_comprobante(moneda_nueva) {

			let moneda_anterior = this.moneda_id

			if (!this.comprobante_en_edicion) {
				this.moneda_id = moneda_nueva
				this.setTotal()
				return
			}

			let cambia_de_expresion = this.reexpresar_moneda_es_dolar(moneda_anterior) !== this.reexpresar_moneda_es_dolar(moneda_nueva)

			let cotizacion = null

			if (cambia_de_expresion) {

				let importes_sin_convertir = this.reexpresar_importes_fijos_sin_convertir()

				if (importes_sin_convertir.length) {

					this.$toast.warning('Para cambiar la moneda ' + this.nombre_del_comprobante_en_edicion + ' primero sacá ' + importes_sin_convertir.join(', ') + ': esos importes no se convierten solos y quedarían en la moneda anterior.', {
						duration: 10000,
					})

					this.select_moneda_key++

					return
				}

				if (!(Number(this.valor_dolar) > 0)) {
					this.cargar_dolar_por_defecto()
				}

				cotizacion = Number(this.valor_dolar)

				if (!(cotizacion > 0)) {

					this.$toast.warning('Para cambiar la moneda ' + this.nombre_del_comprobante_en_edicion + ' hace falta la cotización del dólar. Cargala en el campo USD y volvé a elegir la moneda.', {
						duration: 8000,
					})

					this.select_moneda_key++

					return
				}
			}

			let resultado = this.reexpresar_comprobante_en_otra_moneda(moneda_anterior, moneda_nueva, cotizacion)

			this.moneda_id = moneda_nueva

			this.setTotal()

			if (cambia_de_expresion) {

				this.$toast.info('Se convirtieron los renglones ' + this.nombre_del_comprobante_en_edicion + ' con la cotización del dólar de ' + cotizacion + '.', {
					duration: 6000,
				})

				if (resultado.con_precios_propios_por_moneda) {

					this.$toast.warning('Hay ' + resultado.con_precios_propios_por_moneda + ' renglón(es) con precios propios por moneda que no se convirtieron: revisá su precio.', {
						duration: 10000,
					})
				}
			}
		},
		/**
		 * Cada cambio del campo (`input`, y no `keyup`: el campo es numerico y un valor pegado o movido con
		 * las flechitas del propio campo no dispara ninguna tecla, asi que el store se quedaba con la
		 * cotizacion anterior mientras el campo mostraba otra): el valor va al store (es lo que viaja en el POST) y se recalcula el total.
		 * Si el campo queda vacio o en cero NO se restaura el dolar del sistema acá, porque el vendedor
		 * puede estar borrando para escribir otro valor: eso lo hace `restaurar_dolar_si_falta` cuando
		 * sale del campo.
		 *
		 * Es el UNICO camino del vendedor (el @input de bootstrap-vue sale solo de lo que tipea una
		 * persona, no de los cambios por codigo), asi que aca y solo aca se anota que la cotizacion la
		 * edito a mano: con una venta guardada que no tenia cotizacion, es lo que decide si el PUT
		 * manda la del campo o deja la guardada (ver store/vender/previus_sales.js,
		 * `cotizacion_editada_a_mano`). iniciar_dolar(), restaurar_dolar_si_falta() y
		 * cargar_dolar_por_defecto() no la prenden: ponen el dolar del sistema por su cuenta.
		 */
		set_valor_dolar() {
			this.$store.commit('vender/previus_sales/set_cotizacion_editada_a_mano', true)

			this.valor_dolar = Number(this.input_dolar_valor)

			this.setTotal()
		},
		/**
		 * Al salir del campo: si quedo vacio o en cero, vuelve el dolar del sistema.
		 */
		restaurar_dolar_si_falta() {
			if (Number(this.input_dolar_valor) > 0) {
				return
			}

			if (this.cargar_dolar_por_defecto()) {
				this.input_dolar_valor = this.valor_dolar_por_defecto
				this.setTotal()
			}
		}
	}
}
</script>
<style lang="sass">
.select-moneda, .input-dolar
	font-size: 15px !important

.form-moneda
	
	.input-group
		
		.input-group-prepend
			height: 36.6px !important
</style>