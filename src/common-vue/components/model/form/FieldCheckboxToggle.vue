<template>
	<!--
		Fila de un campo `type: 'checkbox'` del formulario generico (ModelForm): la pastilla Sí/No
		y el interruptor tipo iPhone. El DOM es exactamente el que ModelForm dibujaba adentro suyo
		(mismos id, data-testid, clases y orden); lo unico que cambia es quien la redibuja.

		Por que es un componente aparte: si el modelo no declara `full_reactivity`, el ABM le pasa
		al formulario una COPIA plana (`model/Index.vue::model()` devuelve `{...model}`) que Vue no
		observa. El `$set` del interruptor deja el valor escrito (y se guarda bien), pero no
		redibuja nada: el interruptor se veia prendido (su color es CSS sobre el input) y la
		pastilla seguia diciendo "No" hasta guardar. Aca el valor tocado queda en un dato propio
		de esta fila, asi que se redibuja solo ella. Redibujar el formulario entero se probo y se
		descarto: cambia otros campos (en Pendientes, prender "Es recurrente" en uno guardado
		deshabilitaba todo el formulario al instante).

		Lo que esta fila NO redibuja son los campos que dependen de este interruptor por
		`v_if_function` (se evaluan en ModelForm). Para eso emite `cambio` cuando se toca, y
		ModelForm redibuja el formulario solo si la propiedad declara `redibujar_al_cambiar`:
		un modelo que no lo declara queda exactamente como antes (nadie mas escucha el evento).
	-->
	<div class="model-form__checkbox-row">
		<span
		class="model-form__boolean-badge"
		:class="esta_prendido() ? 'model-form__boolean-badge--yes' : 'model-form__boolean-badge--no'">
			{{ esta_prendido() ? 'Sí' : 'No' }}
		</span>
		<!-- El data-testid del label NO es un duplicado del que lleva el input: el input
		     de un toggle esta oculto por CSS (el control visible es este label con su
		     track y su thumb), asi que un test no lo puede clickear ni marcar con
		     check() —Playwright exige que el elemento sea visible— y la unica salida
		     seria forzar el click salteando esa verificacion. Con este testid el test
		     clickea lo mismo que clickea una persona, y sigue leyendo el estado del
		     input por su propio testid. -->
		<label
		:for="model_name+'-'+prop.key"
		:data-testid="model_name+'-'+prop.key+'-toggle'"
		class="model-form__toggle"
		:class="{ 'model-form__toggle--disabled': disabled }">
			<input
			type="checkbox"
			:id="model_name+'-'+prop.key"
			:data-testid="model_name+'-'+prop.key"
			:disabled="disabled"
			:checked="esta_prendido()"
			@change="cambiar">
			<!-- Track: fondo del toggle; thumb: círculo deslizante -->
			<span class="model-form__toggle-track">
				<span class="model-form__toggle-thumb"></span>
			</span>
		</label>
	</div>
</template>
<script>
/*
	Los estilos (.model-form__checkbox-row, .model-form__boolean-badge*, .model-form__toggle*)
	viven en ModelForm.vue, sin scope: valen tal cual para esta fila.
*/
export default {
	name: 'FieldCheckboxToggle',
	props: {
		model: Object,
		prop: Object,
		model_name: String,
		disabled: Boolean,
		/**
		 * `Number(model[prop.key]) === 1` calculado por ModelForm cada vez que se dibuja. Es lo
		 * que se muestra mientras nadie toque el interruptor, y es lo que mantiene a esta fila al
		 * dia cuando el valor cambia por otro lado (un modelo reactivo, otro registro, codigo que
		 * escribe el modelo y despues algo redibuja el formulario): igual que antes, cuando la
		 * fila se dibujaba adentro de ModelForm.
		 */
		prendido: Boolean,
	},
	data() {
		return {
			/**
			 * Valor que dejo el ultimo toque del interruptor (true/false), o null si no se toco
			 * desde que ModelForm paso el `prendido` actual. Se vuelve a null cuando ModelForm
			 * pasa un `prendido` distinto, un modelo nuevo u otra prop (la columna del form va
			 * keyeada por indice, asi que esta instancia podria quedar con otro campo): desde ahi
			 * manda lo que ve el form.
			 */
			valor_tocado: null,
		}
	},
	watch: {
		prendido() {
			this.valor_tocado = null
		},
		model() {
			this.valor_tocado = null
		},
		prop() {
			this.valor_tocado = null
		},
	},
	methods: {
		/**
		 * Si el interruptor esta prendido: lo ultimo que se toco, o lo que ve ModelForm.
		 */
		esta_prendido() {
			if (this.valor_tocado !== null) {
				return this.valor_tocado
			}
			return this.prendido
		},
		/**
		 * Mismo `$set` que hacia ModelForm (0/1 en el modelo, que es lo que se guarda), mas el
		 * dato propio que redibuja esta fila aunque el modelo sea una copia que Vue no observa.
		 *
		 * Despues avisa con el evento `cambio` (0/1, ya escrito en el modelo) para que el
		 * formulario decida si se redibuja entero: lo hace solo si la propiedad lo pide con
		 * `redibujar_al_cambiar` (ver ModelForm::al_cambiar_interruptor). Esta fila no decide
		 * nada por su cuenta; el aviso existe porque los campos que dependen de este interruptor
		 * por `v_if_function` se evaluan en ModelForm, no aca.
		 *
		 * @param {Event} event change del input checkbox
		 * @emits cambio valor nuevo del interruptor (1 prendido, 0 apagado)
		 */
		cambiar(event) {
			let valor = event.target.checked ? 1 : 0
			this.$set(this.model, this.prop.key, valor)
			this.valor_tocado = valor === 1
			this.$emit('cambio', valor)
		},
	},
}
</script>
