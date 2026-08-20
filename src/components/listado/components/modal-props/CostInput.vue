<template>
	<div>

		<!--
			Prompt 612: reemplaza el input generico de ModelForm (slot #cost en Listado.vue) para
			poder agregarle debajo una descripcion PERMANENTE (no popover). Reusa "field-text-input"
			(el mismo componente que renderiza ModelForm.vue para prop.type == 'text') para no
			duplicar el formateo de precio ni el resto del comportamiento del campo "costo".

			Mision costo-bruto-por-condicion-fiscal, plan v2 (20/8/2026): donde habia UN input y un
			toggle "el costo que estoy cargando incluye IVA", ahora hay DOS inputs -- neto y bruto --
			y la persona declara que numero esta cargando con solo elegir en cual escribe. Se fueron,
			en el mismo cambio, el toggle, el default de cuenta (users.costos_cargados_con_iva) y la
			columna articles.cost_bruto: los tres se eliminan, asi que no queda nada que adivinar ni
			nada que se pueda quedar rancio. Lo unico que se guarda es el costo NETO.

			La condicion fiscal de la cuenta ya no participa: hasta el plan v1 el Monotributista
			cargaba bruto por definicion y el toggle ni se le mostraba. Con dos inputs eso deja de
			ser una regla del sistema y pasa a ser una eleccion visible -- el MT escribe en "Costo
			con IVA" y ve al lado cuanto queda sin IVA. Por eso este componente ya no lee
			owner.condicion_iva_precios: no le queda ninguna decision que tomar con ese dato, y la
			decision que tomaba (que discrepaba con el backend si un EMPLEADO editaba el articulo,
			porque this.user es el empleado y el backend resuelve por el owner) desaparecio con ella.
		-->

		<!--
			🔴 LOS DOS INPUTS ESTAN SIEMPRE HABILITADOS. Ninguno se bloquea nunca, por ningun motivo:
			ni por articulo sin IVA, ni por condicion fiscal, ni por "ya escribiste en el otro".

			No es cosmetico. El patron de dos campos excluyentes, escrito con tres criterios
			distintos en tres lugares, es exactamente el que dejo articulos con price y
			percentage_gain LOS DOS bloqueados y sin salida (Mision 44, ver CriterioDePrecioHelper en
			la API), y es la razon por la que el plan v1 de esta misma mision habia evitado los dos
			inputs. Si alguna vez aparece un :disabled aca, vuelve ese bug.
		-->
		<div>
			<label
			class="text-muted d-block m-b-5"
			:for="'article-' + prop.key">
				Costo sin IVA (neto)
			</label>
			<field-text-input
			model_name="article"
			:prop="prop"
			:value="valor_neto_visible"
			:disabled="false"
			:prop_text="propText(prop)"
			:price_value="price(valor_neto_visible)"
			:has_bar_code_scanner="false"
			@input="set_costo_neto($event)"></field-text-input>
		</div>

		<div class="m-t-10">
			<label
			class="text-muted d-block m-b-5"
			:for="'article-' + prop_bruto.key">
				Costo con IVA (bruto)
			</label>
			<field-text-input
			model_name="article"
			:prop="prop_bruto"
			:value="valor_bruto_visible"
			:disabled="false"
			prop_text="Costo con IVA"
			:price_value="price(valor_bruto_visible)"
			:has_bar_code_scanner="false"
			@input="set_costo_bruto($event)"></field-text-input>
		</div>

		<!--
			Descripcion permanente (Prompt 612): antes esta aclaracion solo estaba en el popover de
			"description" del prop (visible solo al hacer click en el label), lo que generaba
			confusion, sobre todo al Monotributista, que ve un costo distinto al de la factura de su
			proveedor. Sigue siempre visible, adaptada a los dos inputs.

			El caso "no hay IVA que descontar" va PRIMERO y es excluyente. Cuando era una rama de
			adentro del modo bruto, sobre un articulo Exento la pantalla mostraba las dos frases
			seguidas ("El sistema calcula solo el costo sin IVA" y "Este articulo no tiene IVA que
			descontar") y se contradecian. Lo encontro el checker de la Fase 5.
		-->
		<small class="text-muted d-block m-t-10">
			<span v-if="!hay_iva_aplicable">
				Este articulo no tiene IVA que descontar (Exento, No Gravado o alicuota 0%): los dos
				campos muestran el mismo numero y el costo se guarda tal cual lo cargues.
			</span>
			<span v-else>
				Escribi en el campo que tengas a mano: el otro se actualiza solo con la alicuota del
				articulo ({{ alicuota }}%). Si sos Monotributista, el numero de la factura de tu
				proveedor va en "Costo con IVA"; el sistema le saca el IVA y guarda siempre el costo
				sin IVA, que es el que despues usa para calcular los precios.
			</span>
		</small>

	</div>
</template>
<script>
export default {
	components: {
		FieldTextInput: () => import('@/common-vue/components/model/form/FieldTextInput'),
	},
	computed: {
		/**
		 * Articulo en edicion (modal de ModelForm), leido directo del store, mismo patron
		 * que el resto de los componentes de "modal-props" de este mismo modulo (PriceInput.vue,
		 * PercentageGainInput.vue).
		 *
		 * 🔴 ES LA MISMA REFERENCIA que la fila del listado: __base_store.js hace
		 * `state.model = value.model` sin copiar. Cualquier $set sobre este objeto le cambia el
		 * numero a la tabla de atras. Ver el bloque de set_costo_neto() sobre por que este
		 * componente NO toca el costo hasta que la persona tipea.
		 */
		article() {
			return this.$store.state.article.model
		},
		/**
		 * Definicion declarativa del campo "cost" (src/models/article.js), necesaria para
		 * reusar "field-text-input" con el mismo comportamiento (formateo de precio, etc.)
		 * que usa ModelForm.vue para este mismo prop.
		 */
		prop() {
			return this.modelPropertiesFromName('article').find(model_prop => model_prop.key == 'cost')
		},
		/**
		 * La misma definicion, con OTRA key, solo para el input de bruto.
		 *
		 * field-text-input arma el id y el data-testid del input con model_name + '-' + prop.key.
		 * Con los dos inputs sobre el mismo prop quedarian dos elementos con id "article-cost" en
		 * el mismo formulario: el <label for> apuntaria a cualquiera de los dos y un test que
		 * busque [data-testid="article-cost"] agarraria el primero que encuentre.
		 *
		 * `cost_con_iva` NO es una columna ni viaja en el request: es solo el identificador del
		 * control en pantalla. Lo que se manda son `cost` y `cost_incluye_iva` (ver set_costo_*).
		 */
		prop_bruto() {
			return Object.assign({}, this.prop, {key: 'cost_con_iva'})
		},
		/**
		 * Alicuota del articulo, priorizando SIEMPRE el iva_id que hay ahora en el formulario.
		 *
		 * 🔴 No se usa get_item_iva_percentage() del mixin: ese helper mira primero la relacion
		 * `article.iva`, que el listado carga con withAll() y por lo tanto SIEMPRE viene. El select
		 * de IVA del modal escribe `iva_id` y nadie refresca la relacion, asi que el helper devuelve
		 * la alicuota VIEJA aunque la persona acabe de cambiarla. El backend, en cambio, descompone
		 * con la nueva (back_out_iva() fuerza load('iva') justamente por esto). Las dos puntas
		 * mostraban numeros distintos: con un articulo pasado de 21% a 10,5%, la pantalla convertia
		 * por 1,21 y la base guardaba dividiendo por 1,105. Fue el bug 2 de la Fase 5.
		 */
		alicuota() {
			let self = this

			if (self.article && self.article.iva_id) {

				let iva_models = self.$store.state.iva ? self.$store.state.iva.models : []

				let iva_model = iva_models.find(model => {
					return model.id == self.article.iva_id
				})

				if (typeof iva_model != 'undefined') {
					return self.normalize_iva_percentage(iva_model.percentage)
				}
			}

			// Sin iva_id resuelto (o sin el store de ivas cargado) se cae al helper de siempre.
			return self.get_item_iva_percentage(self.article)
		},
		/**
		 * Si hay un IVA real que sacar. Replica el criterio de ArticlePricesHelper::hasIva():
		 * alicuota 0, Exento y No Gravado no cuentan. Sin esto la pantalla prometia una
		 * descomposicion que el backend no iba a hacer.
		 *
		 * 🔴 No mira `article.aplicar_iva`, y es a proposito: desde el plan v2, `aplicar_iva` sale
		 * del costeo por especificacion (es una decision sobre la VENTA, no sobre como leer lo que
		 * la persona acaba de tipear). Si esta computed lo mirara, la pantalla diria "no hay IVA que
		 * descontar" sobre un articulo al que el backend SI le va a sacar el 21%: las dos puntas
		 * discrepando otra vez, que es el error que esta mision viene arrastrando desde el principio.
		 *
		 * hasIva() es lo unico que la declaracion de la persona no puede pisar: un articulo Exento
		 * no tiene IVA adentro por mas que alguien lo afirme.
		 */
		hay_iva_aplicable() {
			return !!this.alicuota
		},
		/**
		 * Lo que se muestra en el input de NETO.
		 *
		 * 🔴 Es una computed DERIVADA, no un valor que se escriba en el store al abrir el modal.
		 * La primera version de esta mision convertia articles.cost dentro de un watcher, y como
		 * `article` es la misma referencia que la fila del listado, abrir un articulo le cambiaba el
		 * costo a la tabla; alternar entre dos articulos volvia a convertir sobre lo ya convertido y
		 * el numero se multiplicaba por 1,21 en cada vuelta (1000 -> 1210 -> 1464,10), hasta que
		 * alguien tocaba Guardar y eso llegaba a la base. Fue el bug 1 de la Fase 5.
		 *
		 * La regla, entonces: el store SOLO se toca cuando la persona tipea (set_costo_*).
		 */
		valor_neto_visible() {
			if (!this.article) {
				return null
			}

			// `cost_incluye_iva` en false significa "lo que hay en article.cost es el neto": es
			// literalmente este campo, se muestra tal cual y no se convierte nada. Tambien es el
			// caso mientras la persona TIPEA aca, asi que lo que escribe nunca se le reformatea
			// abajo del cursor.
			if (!this.article.cost_incluye_iva) {
				return this.article.cost
			}

			return this.convertir(this.article.cost, false)
		},
		/**
		 * Lo que se muestra en el input de BRUTO. Siempre derivado de `cost` -- ya no existe
		 * articles.cost_bruto, que es la columna de la que salieron los tres bugs del 20/8: se
		 * elimina de la base, asi que no hay ningun valor "ya registrado" que preferir y el bruto es
		 * siempre cost * (1 + alicuota/100).
		 */
		valor_bruto_visible() {
			if (!this.article) {
				return null
			}

			// Idem valor_neto_visible al reves: si lo que hay en el store ya es el bruto tipeado, se
			// muestra tal cual.
			if (this.article.cost_incluye_iva) {
				return this.article.cost
			}

			return this.convertir(this.article.cost, true)
		},
	},
	methods: {
		/**
		 * Pasa un costo de neto a bruto o al reves, con la alicuota que hay AHORA en el formulario.
		 *
		 * Se redondea a 2 decimales solo el valor DERIVADO (el del input que la persona no esta
		 * tipeando): el ida y vuelta puede correr un centavo, y si despues alguien edita ese campo
		 * derivado, lo que se guarda es lo que quedo en pantalla. Es la contra de mostrar los dos
		 * numeros a la vez y se prefiere sobre mostrar 1210,4938776 arriba de un campo de precio.
		 *
		 * @param {String|Number} valor
		 * @param {Boolean} a_bruto true = neto -> bruto, false = bruto -> neto.
		 */
		convertir(valor, a_bruto) {
			// Vacio, cero o no numerico: no hay nada que convertir y se devuelve tal cual, para no
			// escribir "NaN" ni "0.00" arriba de un campo que la persona acaba de vaciar.
			if (!valor || isNaN(parseFloat(valor))) {
				return valor
			}

			// Sin alicuota real los dos campos muestran el mismo numero (regla 5 del plan): no hay
			// IVA que sacar ni que sumar. Los inputs NO se bloquean por esto.
			if (!this.hay_iva_aplicable) {
				return valor
			}

			let factor = 1 + (this.alicuota / 100)

			let convertido = a_bruto
				? parseFloat(valor) * factor
				: parseFloat(valor) / factor

			return convertido.toFixed(2)
		},
		/**
		 * Unicos dos puntos que escriben en el store, y corren solo cuando la persona tipea.
		 *
		 * Se guarda el numero TAL CUAL se tipeo y `cost_incluye_iva` dice que es. El back-out vive
		 * en el backend, en un solo lugar (ArticleController::set_costo_desde_request): el front
		 * solo declara. Si nadie toca ninguno de los dos campos, article.cost queda con el neto que
		 * vino del servidor y el flag queda en false, asi que guardar sin tocar el costo lo deja
		 * igual.
		 */
		set_costo_neto(valor) {
			this.$set(this.article, 'cost', valor)
			this.$set(this.article, 'cost_incluye_iva', false)
		},
		set_costo_bruto(valor) {
			this.$set(this.article, 'cost', valor)

			/*
			 * 🔴 Va `true` DURO, no `hay_iva_aplicable`. La declaracion es "la persona tipeo en el
			 * campo de bruto", y eso es un hecho sobre el numero: tiene que viajar fiel, sin que el
			 * front le agregue condiciones.
			 *
			 * Una version de este archivo mandaba `hay_iva_aplicable` para "garantizar lo que la
			 * pantalla promete" si las dos puntas discrepaban. El razonamiento se cae en el unico caso
			 * donde importa: si el store de ivas todavia no cargo, `alicuota` cae en 0 y la base tiene
			 * 21%, la persona igual tipeo 1210 en el campo de BRUTO. Mandando `false` ese 1210 se
			 * guarda como neto y el costo queda 21% arriba. Mandando `true`, el backend descompone con
			 * la alicuota de verdad -- back_out_iva() hace load("iva"), asi que la suya es la buena -- y
			 * queda 1000, que es lo correcto.
			 *
			 * Que la pantalla muestre una alicuota vieja es un problema de display; guardar el numero
			 * con el significado equivocado es un error de plata. Y en el caso normal no cambia nada:
			 * sobre un articulo Exento el backend corta en hasIva() y guarda el numero tal cual.
			 */
			this.$set(this.article, 'cost_incluye_iva', true)
		},
	},
	watch: {
		/**
		 * Al abrir el modal o pasar a otro articulo. No se convierte ni se escribe ningun costo:
		 * eso lo resuelven valor_neto_visible / valor_bruto_visible.
		 */
		'article.id': {
			immediate: true,
			handler() {
				if (!this.article) {
					return
				}

				/*
				 * 🔴 El flag SIEMPRE viaja, y arranca en false. No es opcional.
				 *
				 * `article.cost` en el store es el NETO que devolvio el servidor. Si la clave no
				 * llega al backend, un guardado que ni toca el costo -- corregir el nombre, cambiar
				 * la categoria -- termina descomponiendo un numero que YA era neto: medido,
				 * 1000 -> 826,45 -> 683,01, un 21% por guardado y sin ninguna secuencia rara. Fue el
				 * bug 9 de la Fase 5.
				 *
				 * Escribir este flag NO es "mutar la fila del listado" como hacia la version que
				 * introdujo el bug 1: no existe ninguna columna `cost_incluye_iva`, no se muestra en
				 * ningun lado y no cambia el costo. Es una declaracion sobre el request que se esta
				 * por armar. El costo en si lo siguen tocando unicamente set_costo_neto() y
				 * set_costo_bruto().
				 */
				this.$set(this.article, 'cost_incluye_iva', false)
			},
		},
	},
}
</script>
