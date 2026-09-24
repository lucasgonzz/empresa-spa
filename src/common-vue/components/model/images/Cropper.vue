<template>
	<b-modal
	title="Recortar Imagen"
	hide-footer
	size="lg"
	@shown="onModalShown"
	@hidden="onModalHidden"
	:id="'cropper-'+model.id+'-'+model.nombre+'-'+prop.key">
		<!--
			Las props que van después de :stencil-props solo se activan con marco fijo
			(use_fixed_stencil): con proporción libre valen undefined y el cropper usa sus
			valores por defecto, o sea que el modal queda igual que antes.
		-->
		<cropper
		ref="cropper"
		class="cropper"
		:class="{ 'cropper--fijo': use_fixed_stencil }"
		:canvas="false"
		:src="image_url"
		:stencil-props="stencil_props"
		:image-restriction="use_fixed_stencil ? 'none' : undefined"
		:stencil-size="use_fixed_stencil ? fixed_stencil_size : undefined"
		:min-width="crop_limits.min_width"
		:min-height="crop_limits.min_height"
		:max-width="crop_limits.max_width"
		:max-height="crop_limits.max_height"
		:resize-image="resize_image_config"
		:area-restrictions-algorithm="use_fixed_stencil ? restrict_visible_area : undefined"
		@ready="onCropperReady"
		@error="on_cropper_image_error"
		@change="change"/>

		<p
		class="text-center text-muted small m-t-5 m-b-0"
		v-if="use_fixed_stencil">
			Rueda del mouse o pellizco para acercar y alejar. Arrastrá la imagen para encuadrarla; el espacio vacío se guarda en blanco.
		</p>

		<b-progress
	    class="m-t-15 m-b-10"
	    height="15px"
	    variant="primary"
	    :max="1"
	    :value="auto_crop_progress"
	    animated/>

	    <p
		    class="text-center text-muted m-t-5"
		    v-if="auto_save_enabled"
		>
		    Guardado automático en {{ auto_crop_seconds_left }} segundos…
		</p>

		<p
		    class="text-center m-t-5"
		    v-else
		>
		    Autoguardado cancelado — ajustá el recorte y guardá manualmente
		</p>

		<b-btn-group
		class="w-100">
			<btn-loader
			:block="false"
			class="m-t-15"
			variant="outline-primary"
			@clicked="uploadImage(false)"
			:loader="loading_not_cropp"
			text="Guardar SIN Recortar"></btn-loader>
			
			<btn-loader
			:block="false"
			class="m-t-15"
			@clicked="uploadImage(true)"
			:loader="loading_cropp"
			text="Guardar"></btn-loader>
		</b-btn-group>
	</b-modal>
</template>
<script>
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

/*
* ---------------------------------------------------------------------------
* Constantes del modo "marco fijo" (proporción del recorte mayor a 0).
* Las medidas en "px de la imagen" son sobre la imagen ORIGINAL, no sobre la pantalla.
* ---------------------------------------------------------------------------
*/

/* Fracción del ancho/alto disponible del cropper que ocupa el marco fijo (el resto es aire alrededor). */
const FIXED_STENCIL_SCREEN_RATIO = 0.9
/* Piso del lado menor del recorte, en px de la imagen: evita acercar hasta recortes de unos pocos píxeles. */
const MIN_CROP_SIDE_PX = 32
/* El recorte mínimo (máximo acercamiento) es 1/N del "cover", con el piso de MIN_CROP_SIDE_PX. */
const MIN_CROP_COVER_DIVISOR = 16
/* El recorte máximo (máximo alejamiento) es N veces el "contain": la imagen entera más aire alrededor. */
const MAX_CROP_CONTAIN_MULTIPLIER = 2
/* Opciones de zoom de la librería en modo fijo: rueda de la librería APAGADA (la maneja on_cropper_wheel) y pellizco táctil prendido. */
const FIXED_RESIZE_IMAGE_OPTIONS = { touch: true, wheel: false, adjustStencil: false }
/* Selector del contenedor interno del cropper que define el área donde se dibujan la imagen y el marco. */
const CROPPER_BOUNDARIES_SELECTOR = '.vue-advanced-cropper__boundaries'

/* Sensibilidad de la rueda del mouse: exponente de zoom por cada píxel de deltaY (una muesca de 100 px = x1,14). */
const WHEEL_ZOOM_SENSITIVITY = 0.0013
/* Sensibilidad del pellizco de un trackpad, que el navegador entrega como rueda con ctrlKey y deltas chicos. */
const WHEEL_ZOOM_SENSITIVITY_PINCH = 0.01
/* deltaMode 1 (líneas, Firefox): píxeles que equivale una línea. */
const WHEEL_LINE_MODE_PIXELS = 33
/* deltaMode 2 (páginas): píxeles que equivale una página. */
const WHEEL_PAGE_MODE_PIXELS = 800
/* Factor de zoom mínimo y máximo permitido por UN solo evento de rueda (evita saltos enormes). */
const WHEEL_ZOOM_FACTOR_MIN = 0.7
const WHEEL_ZOOM_FACTOR_MAX = 1.4

export default {
	props: {
		prop: Object,
		model: Object,
		image_url: String,
		model_name: String,
		has_many_parent_model: Object,
		has_many_prop: Object,
	    auto_crop: {
	        type: Boolean,
	        default: false,
	    },
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		Cropper,
	},
	computed: {
		/**
		* Proporción (ancho / alto) del marco de recorte. 0 significa proporción libre.
		*
		* Misma lógica que tenía `stencil_props`: proporción deshabilitada por entorno = 0; la
		* que declara la propiedad del modelo (`crop_aspect_ratio`, incluido el 0); y 1 si no dice nada.
		*
		* @return {Number}
		*/
		stencil_aspect_ratio() {
			if (this.aspect_ratio_disabled) {
				return 0
			}
			if (
				this.prop.crop_aspect_ratio
				|| this.prop.crop_aspect_ratio == 0
			) {
				/* Number() por si la propiedad declara la proporción como texto; lo no numérico cae a libre. */
				return Number(this.prop.crop_aspect_ratio) || 0
			}
			return 1
		},
		/**
		* Indica si el recorte usa marco FIJO: solo cuando la proporción es mayor a 0.
		*
		* Con marco fijo el marco no se mueve ni se redimensiona: se mueve y se acerca/aleja la
		* imagen. Con proporción libre el modal queda exactamente como antes (marco con manijas).
		*
		* @return {Boolean}
		*/
		use_fixed_stencil() {
			return this.stencil_aspect_ratio > 0
		},
		/**
		* Props del marco (stencil) del cropper.
		*
		* Proporción libre: solo la proporción (marco con manijas, movible y redimensionable, como
		* siempre). Marco fijo: además se lo deja quieto y sin manijas ni líneas guía.
		*
		* @return {Object}
		*/
		stencil_props() {
			/* Proporción libre: solo se le pasa la proporción, igual que antes de existir el marco fijo. */
			if (!this.use_fixed_stencil) {
				return {
					aspectRatio: this.stencil_aspect_ratio,
				}
			}
			/* Marco fijo: sin mover, sin redimensionar, y sin manijas ni líneas guía que sugieran que se puede. */
			return {
				aspectRatio: this.stencil_aspect_ratio,
				movable: false,
				resizable: false,
				handlers: {},
				lines: {},
			}
		},
		/**
		* Límites de tamaño del recorte (props min/max-width/height del cropper), en px de la imagen.
		*
		* Con W x H = tamaño de la imagen y A = proporción del marco:
		* - `cover` = el rectángulo más grande de proporción A que entra en la imagen sin dejar vacío.
		* - `contain` = el rectángulo más chico de proporción A que contiene la imagen entera.
		* - Máximo (alejar) = 2 x contain; mínimo (acercar) = 1/16 del cover, con piso de 32 px.
		*
		* Sin marco fijo, o antes de conocer el tamaño de la imagen, no se limita nada (todo undefined).
		*
		* @return {Object} { min_width, min_height, max_width, max_height }
		*/
		crop_limits() {
			if (!this.use_fixed_stencil || !this.image_size) {
				return {
					min_width: undefined,
					min_height: undefined,
					max_width: undefined,
					max_height: undefined,
				}
			}
			const aspect_ratio = this.stencil_aspect_ratio
			const image_width = this.image_size.width
			const image_height = this.image_size.height
			/* Ancho del recorte más grande que entra dentro de la imagen sin vacío. */
			const cover_width = Math.min(image_width, image_height * aspect_ratio)
			/* Ancho del recorte que contiene la imagen entera. */
			const contain_width = Math.max(image_width, image_height * aspect_ratio)
			const max_width = contain_width * MAX_CROP_CONTAIN_MULTIPLIER
			/* El mínimo nunca supera al cover, así los límites no se cruzan en imágenes diminutas. */
			const min_width = Math.min(
				cover_width,
				Math.max(MIN_CROP_SIDE_PX, cover_width / MIN_CROP_COVER_DIVISOR)
			)
			return {
				min_width: Math.round(min_width),
				min_height: Math.round(min_width / aspect_ratio),
				max_width: Math.round(max_width),
				max_height: Math.round(max_width / aspect_ratio),
			}
		},
		/**
		* Opciones de zoom del cropper (prop `resize-image`): en marco fijo se apaga la rueda de la
		* librería (la maneja `on_cropper_wheel`); con proporción libre queda el valor por defecto.
		*
		* @return {Object|undefined}
		*/
		resize_image_config() {
			return this.use_fixed_stencil ? FIXED_RESIZE_IMAGE_OPTIONS : undefined
		},
		auto_crop_seconds_left() {
	        const remaining = Math.ceil(
	            (1 - this.auto_crop_progress) * (this.auto_crop_delay / 1000)
	        )
	        return remaining > 0 ? remaining : 0
	    },
	    /**
	    * Tiempo de autoguardado en milisegundos, sincronizado con la configuración del usuario.
	    * Usa el mismo valor `img_auto_timeout` que se edita desde el botón de configuración del carrusel.
	    *
	    * @return {Number}
	    */
	    auto_crop_delay() {
	    	/* Se toma el timeout guardado en owner; fallback a 5 segundos para compatibilidad. */
	    	const seconds = Number(this.owner && this.owner.img_auto_timeout ? this.owner.img_auto_timeout : 5)
	    	if (isNaN(seconds) || seconds <= 0) {
	    		return 5000
	    	}
	    	return seconds * 1000
	    },
	},
	data() {
		return {
			/* Estado de carga del botón guardar con recorte. */
			loading_cropp: false,
			/* Estado de carga del botón guardar sin recorte. */
			loading_not_cropp: false,
			/* Coordenadas actuales del stencil emitidas por el cropper. */
			coordinates: null,

	        // ⏱ auto recorte
	        /* Marca de tiempo de inicio para la barra de progreso de autoguardado. */
	        auto_crop_start: null,
	        /* Progreso visual del autoguardado entre 0 y 1. */
	        auto_crop_progress: 0,
	        /* Timer reservado para futuras extensiones de autoguardado. */
	        auto_crop_timer: null,
	        /* Id del requestAnimationFrame del progreso. */
	        raf_id: null,

	        /* Flag para distinguir setCoordinates programático de interacción manual. */
	        is_setting_coordinates: false,

	        /* Permite cancelar autoguardado cuando el usuario mueve el recorte. */
	        auto_save_enabled: true,
	        /* Indica que el modal está visible y habilitado para inicializar cropper. */
	        modal_is_visible: false,
	        /* Indica que vue-advanced-cropper ya notificó estado listo. */
	        cropper_is_ready: false,
	        /* Señala si hubo interacción manual (mouse/touch) sobre el área de recorte. */
	        has_manual_crop_interaction: false,
	        /* Referencia al elemento raíz del cropper para registrar/remover listeners. */
	        cropper_root_element: null,
	        /* Tamaño real { width, height } en px de la imagen cargada en el cropper. Se llena en
	        onCropperReady y se limpia al cerrar el modal; de acá salen los límites de zoom (crop_limits). */
	        image_size: null,
		}
	},
	beforeDestroy() {
		this.detachCropperInteractionListeners()
		this.clearAutoCropRuntime()
	},
	methods: {
		/**
		* Marca que el usuario comenzó a interactuar manualmente con el área de recorte (agarró
		* la imagen o el marco con el mouse o con el dedo) y cancela el autoguardado en el acto.
		*
		* Se cancela acá y no esperando al @change de la librería: llega con 500 ms de debounce y
		* recién después de que el gesto termina, o sea que un arrastre largo podía seguir corriendo
		* cuando vencía el timer y guardar a medio ajustar.
		*
		* @return {void}
		*/
		onCropperPointerDown() {
			this.has_manual_crop_interaction = true
			this.cancel_auto_save()
		},
		/**
		* Cancela el autoguardado en el acto: apaga el flag, vuelve la barra a 0 y frena el timer.
		*
		* Es lo mismo que hace `change` cuando detecta una interacción manual, pero sin esperar al
		* @change de la librería, que llega con 500 ms de debounce (o no llega si el gesto no
		* cambió nada). Lo usa la rueda: un usuario que scrollea no quiere que se le guarde a medio ajustar.
		*
		* @return {void}
		*/
		cancel_auto_save() {
			this.auto_save_enabled = false
			this.auto_crop_progress = 0
			this.clearAutoCropRuntime()
		},
		/**
		* Tamaño del marco fijo en píxeles de PANTALLA, para la prop `stencil-size` del cropper.
		*
		* Es el 90 % del lado disponible, respetando la proporción del marco: el marco queda centrado,
		* con aire alrededor, y no cambia mientras se hace zoom (lo que se mueve es la imagen).
		*
		* @param {Object} params Lo que manda la librería; se usa `boundaries` ({ width, height } del cropper en pantalla).
		* @return {Object} { width, height } en px de pantalla.
		*/
		fixed_stencil_size({ boundaries }) {
			const aspect_ratio = this.stencil_aspect_ratio
			const max_width = boundaries.width * FIXED_STENCIL_SCREEN_RATIO
			const max_height = boundaries.height * FIXED_STENCIL_SCREEN_RATIO
			/* El ancho es el menor entre el disponible y el que permite el alto disponible con esta proporción. */
			const width = Math.min(max_width, max_height * aspect_ratio)
			return {
				width: width,
				height: width / aspect_ratio,
			}
		},
		/**
		* Límite del arrastre de la imagen en modo marco fijo ("contener o cubrir, eje por eje").
		*
		* Para la prop `area-restrictions-algorithm` del cropper. Devuelve, en px de la imagen, el
		* rectángulo dentro del cual puede moverse el área visible:
		* - Si el marco es más chico que la imagen en un eje, no puede salirse de la imagen (cubre).
		* - Si es más grande, la imagen no puede salirse del marco (contiene).
		* Solo restringe el movimiento (`type === 'move'`); en cualquier otro caso, o si falta algún
		* dato, no restringe nada (devuelve {}).
		*
		* @param {Object} params Lo que manda la librería: { type, visibleArea, boundaries, imageSize }.
		* @return {Object} { left, right, top, bottom } en px de la imagen, o {}.
		*/
		restrict_visible_area(params) {
			if (
				params.type !== 'move'
				|| !params.visibleArea
				|| !params.boundaries
				|| !params.boundaries.width
				|| !params.boundaries.height
				|| !params.imageSize
			) {
				return {}
			}
			const stencil_screen_size = this.fixed_stencil_size({ boundaries: params.boundaries })
			/* Qué fracción de la pantalla ocupa el marco en cada eje. */
			const stencil_fraction_x = stencil_screen_size.width / params.boundaries.width
			const stencil_fraction_y = stencil_screen_size.height / params.boundaries.height
			const visible_width = params.visibleArea.width
			const visible_height = params.visibleArea.height
			/* Tamaño del marco en px de la imagen para el zoom actual. */
			const stencil_width = stencil_fraction_x * visible_width
			const stencil_height = stencil_fraction_y * visible_height
			/* Aire (en px de la imagen) entre el borde del área visible y el marco. */
			const margin_x = (visible_width - stencil_width) / 2
			const margin_y = (visible_height - stencil_height) / 2
			const image_width = params.imageSize.width
			const image_height = params.imageSize.height
			return {
				left: Math.min(0, image_width - stencil_width) - margin_x,
				right: Math.max(image_width, stencil_width) + margin_x,
				top: Math.min(0, image_height - stencil_height) - margin_y,
				bottom: Math.max(image_height, stencil_height) + margin_y,
			}
		},
		/**
		* Recorte "cover": el rectángulo más grande, centrado, con la proporción del marco, que entra
		* en la imagen sin dejar vacío. Es el recorte inicial en modo marco fijo.
		*
		* Con proporción 1 es exactamente el cuadrado máximo centrado de siempre, así que el
		* autoguardado del flujo automático guarda lo mismo que antes.
		*
		* @param {Number} image_width Ancho real de la imagen en px.
		* @param {Number} image_height Alto real de la imagen en px.
		* @return {Object} { width, height, left, top } en px de la imagen.
		*/
		get_cover_coordinates(image_width, image_height) {
			const width = Math.min(image_width, image_height * this.stencil_aspect_ratio)
			const height = width / this.stencil_aspect_ratio
			return {
				width: width,
				height: height,
				left: (image_width - width) / 2,
				top: (image_height - height) / 2,
			}
		},
		/**
		* Zoom con la rueda del mouse (y pellizco de trackpad) en modo marco fijo.
		*
		* Acerca o aleja la IMAGEN, proporcional a cuánto se scrolleó (no un porcentaje fijo por
		* evento, que con un trackpad —decenas de eventos chicos por gesto— dispara el zoom a los
		* topes). Scroll hacia arriba acerca, hacia abajo aleja. El zoom pivotea sobre el puntero,
		* recogido dentro del marco, para que el contenido no se corra si el puntero cae afuera.
		*
		* Cuenta como interacción manual y cancela el autoguardado. Con proporción libre no hace nada
		* más que eso: la rueda la resuelve la propia librería (que además corta la propagación del
		* evento, así que en la práctica este handler solo corre con marco fijo; el guard de abajo
		* evita un doble zoom si alguna versión de la librería dejara de cortarla).
		*
		* @param {WheelEvent} event Evento de rueda sobre el root del cropper.
		* @return {void}
		*/
		on_cropper_wheel(event) {
			this.has_manual_crop_interaction = true
			this.cancel_auto_save()

			if (!this.use_fixed_stencil) {
				return
			}

			/* Que el modal no scrollee (ni el navegador haga zoom de página con el pellizco). */
			event.preventDefault()
			event.stopPropagation()

			const cropper = this.$refs.cropper
			if (!cropper) {
				return
			}
			const result = cropper.getResult()
			const boundaries_element = cropper.$el.querySelector(CROPPER_BOUNDARIES_SELECTOR)
			if (!result || !result.visibleArea || !boundaries_element) {
				return
			}

			/* Se normaliza el delta a píxeles según la unidad que informe el navegador. */
			let delta_y = event.deltaY
			if (event.deltaMode === 1) {
				delta_y *= WHEEL_LINE_MODE_PIXELS
			} else if (event.deltaMode === 2) {
				delta_y *= WHEEL_PAGE_MODE_PIXELS
			}
			/* Factor de zoom (> 1 acerca, < 1 aleja), exponencial en lo scrolleado y acotado por evento. */
			const sensitivity = event.ctrlKey ? WHEEL_ZOOM_SENSITIVITY_PINCH : WHEEL_ZOOM_SENSITIVITY
			const zoom_factor = Math.max(
				WHEEL_ZOOM_FACTOR_MIN,
				Math.min(WHEEL_ZOOM_FACTOR_MAX, Math.exp(-delta_y * sensitivity))
			)

			/* Posición del marco dentro del área del cropper, en px de pantalla. */
			const boundaries_rect = boundaries_element.getBoundingClientRect()
			if (!boundaries_rect.width || !boundaries_rect.height) {
				return
			}
			const stencil_screen_size = this.fixed_stencil_size({
				boundaries: {
					width: boundaries_rect.width,
					height: boundaries_rect.height,
				},
			})
			const stencil_left = (boundaries_rect.width - stencil_screen_size.width) / 2
			const stencil_top = (boundaries_rect.height - stencil_screen_size.height) / 2
			/* Pivote: el puntero, recogido dentro del rectángulo del marco. */
			const pivot_x = Math.max(stencil_left, Math.min(stencil_left + stencil_screen_size.width, event.clientX - boundaries_rect.left))
			const pivot_y = Math.max(stencil_top, Math.min(stencil_top + stencil_screen_size.height, event.clientY - boundaries_rect.top))
			/* Se pasa el pivote de px de pantalla a px de la imagen (lo que espera cropper.zoom). */
			const coefficient = result.visibleArea.width / boundaries_rect.width
			const zoom_center = {
				left: result.visibleArea.left + pivot_x * coefficient,
				top: result.visibleArea.top + pivot_y * coefficient,
			}

			cropper.zoom(zoom_factor, zoom_center, { transitions: false })
		},
		/**
		* Coordenadas de recorte vigentes, leídas del cropper en este mismo instante.
		*
		* El @change de la librería llega con 500 ms de debounce: un click en "Guardar" justo
		* después de mover o hacer zoom mandaba las coordenadas de antes. `this.coordinates` queda
		* solo de respaldo por si el cropper no está disponible.
		*
		* @return {Object|null} { left, top, width, height } en px de la imagen original.
		*/
		get_current_coordinates() {
			const cropper = this.$refs.cropper
			if (cropper) {
				const result = cropper.getResult()
				if (result && result.coordinates) {
					return result.coordinates
				}
			}
			return this.coordinates
		},
		/**
		* Registra listeners de interacción manual sobre el root del cropper.
		*
		* @return {void}
		*/
		attachCropperInteractionListeners() {
			/* Se limpia cualquier listener previo antes de registrar de nuevo. */
			this.detachCropperInteractionListeners()
			const cropper_component = this.$refs.cropper
			if (!cropper_component || !cropper_component.$el) {
				return
			}
			this.cropper_root_element = cropper_component.$el
			/*
			* mousedown y touchstart van en fase de CAPTURA (true): la librería frena la propagación de
			* esos eventos en el elemento que arrastra (la imagen o el marco), así que en fase de burbuja
			* nunca llegaban al root y arrastrar no cancelaba el autoguardado. La captura corre antes.
			*/
			this.cropper_root_element.addEventListener('mousedown', this.onCropperPointerDown, true)
			this.cropper_root_element.addEventListener('touchstart', this.onCropperPointerDown, { passive: true, capture: true })
			/* La rueda va NO pasiva: en marco fijo hace falta preventDefault() para que no scrollee el modal. */
			this.cropper_root_element.addEventListener('wheel', this.on_cropper_wheel, { passive: false })
		},
		/**
		* Remueve listeners de interacción manual para evitar duplicaciones/memory leaks.
		*
		* @return {void}
		*/
		detachCropperInteractionListeners() {
			if (!this.cropper_root_element) {
				return
			}
			/* Mismo flag de captura (true) con el que se registraron: si no coincide, el listener no se saca. */
			this.cropper_root_element.removeEventListener('mousedown', this.onCropperPointerDown, true)
			this.cropper_root_element.removeEventListener('touchstart', this.onCropperPointerDown, true)
			this.cropper_root_element.removeEventListener('wheel', this.on_cropper_wheel)
			this.cropper_root_element = null
		},
		/**
		* Limpia timers/animaciones del autoguardado para evitar ejecuciones duplicadas.
		*
		* @return {void}
		*/
		clearAutoCropRuntime() {
			if (this.raf_id) {
				cancelAnimationFrame(this.raf_id)
				this.raf_id = null
			}
			if (this.auto_crop_timer) {
				clearTimeout(this.auto_crop_timer)
				this.auto_crop_timer = null
			}
		},
		/**
		* Ejecuta inicialización de recorte solo cuando modal y cropper están listos.
		*
		* @return {void}
		*/
		tryInitializeCropper() {
			if (!this.modal_is_visible || !this.cropper_is_ready) {
				return
			}
			this.setInitialCrop()
		},
		onModalShown() {
			/* El modal quedó visible; se intenta inicializar cuando el cropper esté listo. */
			this.modal_is_visible = true
			this.clearAutoCropRuntime()
			this.auto_save_enabled = true
			this.auto_crop_progress = 0
			this.has_manual_crop_interaction = false
			this.$nextTick(() => {
				this.attachCropperInteractionListeners()
			})
			this.tryInitializeCropper()
	    },
	    /**
	    * Resetea estados al cerrar modal para evitar basura de una ejecución previa.
	    *
	    * @return {void}
	    */
	    onModalHidden() {
	    	this.modal_is_visible = false
	    	this.cropper_is_ready = false
	    	this.is_setting_coordinates = false
	    	this.auto_save_enabled = true
	    	this.auto_crop_progress = 0
	    	this.has_manual_crop_interaction = false
	    	/* El tamaño de la imagen es de la carga anterior: se limpia para no reusarlo con otra imagen. */
	    	this.image_size = null
	    	this.detachCropperInteractionListeners()
	    	this.clearAutoCropRuntime()
	    },
	    /**
	    * Se dispara cuando el cropper terminó de montar y cargar la imagen.
	    *
	    * Además de marcar el cropper como listo, guarda el tamaño real de la imagen: de ahí salen
	    * los límites de zoom del modo marco fijo (`crop_limits`).
	    *
	    * @return {void}
	    */
	    onCropperReady() {
	    	this.cropper_is_ready = true
	    	const cropper = this.$refs.cropper
	    	const result = cropper ? cropper.getResult() : null
	    	if (result && result.image && result.image.width && result.image.height) {
	    		this.image_size = {
	    			width: result.image.width,
	    			height: result.image.height,
	    		}
	    	}
	    	this.tryInitializeCropper()
	    },
	    /**
	    * Se dispara cuando vue-advanced-cropper no puede cargar la URL de la imagen.
	    *
	    * @return {void}
	    */
	    on_cropper_image_error() {
	    	this.notify_image_save_failed('No se pudo abrir la imagen para recortar. Probá con otra imagen de los resultados.')
	    },
	    /**
	    * Devuelve el mensaje de error que mando la API, o el texto de reserva si no vino ninguno.
	    *
	    * El endpoint set-image responde 422 con un `message` ya redactado para mostrarse tal cual
	    * (ver grupo 262, prompt 01). Cualquier otro error de red o de servidor cae en el fallback.
	    *
	    * @param {Object} err Error de axios.
	    * @param {String} fallback Texto a mostrar si la API no dijo nada util.
	    * @return {String}
	    */
	    get_backend_error_message(err, fallback) {
	    	if (
	    		err
	    		&& err.response
	    		&& err.response.data
	    		&& typeof err.response.data.message === 'string'
	    		&& err.response.data.message.length
	    	) {
	    		return err.response.data.message
	    	}
	    	return fallback
	    },
	    /**
	    * Cierra el modal de recorte, avisa al usuario y notifica al padre.
	    *
	    * A diferencia de la version anterior, el toast sale SIEMPRE: en el flujo automatico el
	    * usuario tambien tiene que enterarse de que la imagen no se guardo. El evento sigue
	    * emitiendose para que el padre pueda encadenar el reintento (grupo 262, prompt 03).
	    *
	    * @param {String} message Texto exacto a mostrar al usuario.
	    * @return {void}
	    */
	    notify_image_save_failed(message) {
	    	this.clearAutoCropRuntime()
	    	this.loading_cropp = false
	    	this.loading_not_cropp = false
	    	this.$bvModal.hide('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)
	    	this.$toast.error(message)
	    	this.$emit('image-save-failed', {
	    		image_url: this.image_url,
	    		message: message,
	    	})
	    },

	    startAutoCropProgress() {
	    	this.clearAutoCropRuntime()
		    this.auto_crop_start = performance.now()
		    this.auto_crop_progress = 0

		    const animate = (now) => {
		    	if (!this.auto_save_enabled) return

		        const elapsed = now - this.auto_crop_start
		        this.auto_crop_progress = Math.min(
		            elapsed / this.auto_crop_delay,
		            1
		        )

		        if (this.auto_crop_progress < 1) {
		            this.raf_id = requestAnimationFrame(animate)
		        } else {
		            this.uploadImage(true)
		        }
		    }

		    this.raf_id = requestAnimationFrame(animate)
		},

	    setInitialCrop(attempt = 0) {
	        this.is_setting_coordinates = true
	        const cropper = this.$refs.cropper

	        if (!cropper || !this.modal_is_visible) return

	        /* Reintentos ampliados para cargas de imagen lentas o conexiones inestables. */
	        if (attempt > 120) {
	        	this.is_setting_coordinates = false
	        	/* La imagen nunca termino de cargar: antes esto se abandonaba en silencio en manual. */
	        	this.notify_image_save_failed('La imagen tardó demasiado en cargar y no se pudo recortar. Probá con otra imagen de los resultados.')
	        	return
	        }

	        const result = cropper.getResult()

	        // ⛔ todavía no está lista la imagen
	        if (!result || !result.image) {
	            this.auto_crop_timer = setTimeout(() => this.setInitialCrop(attempt + 1), 50)
	            return
	        }

	        const { width, height } = result.image

	        if (!width || !height) {
	            this.auto_crop_timer = setTimeout(() => this.setInitialCrop(attempt + 1), 50)
	            return
	        }

	        if (this.use_fixed_stencil) {
	            /*
	            * Marco fijo: se arranca en el "cover" de la proporción del marco (con proporción 1 es
	            * el mismo cuadrado máximo de abajo). Sin transiciones: con una transición activa la
	            * librería ignora los gestos del usuario durante ~350 ms.
	            */
	            cropper.setCoordinates(this.get_cover_coordinates(width, height), { transitions: false })
	        } else {
	            // 🔥 CUADRADO MÁXIMO POSIBLE
	            const size = Math.min(width, height)

	            cropper.setCoordinates({
	                width: size,
	                height: size,
	                left: (width - size) / 2,
	                top: (height - size) / 2,
	            })
	        }


		    /*
		    * Solo iniciar autoguardado cuando el flujo lo pide explícitamente.
		    * En modo manual el usuario define el recorte y guarda a demanda.
		    */
		    if (this.auto_crop) {
		    	this.startAutoCropProgress()
		    }

	    },
		change({ coordinates }) {
			this.coordinates = coordinates 

			/*
			* Solo se cancela el autoguardado cuando hay interacción manual real.
			* Cambios programáticos (setCoordinates / ajustes internos del cropper) no deben cancelarlo.
			*/
		    if (!this.is_setting_coordinates && this.has_manual_crop_interaction) {
		        this.auto_save_enabled = false
		        this.auto_crop_progress = 0

		        this.clearAutoCropRuntime()
		    }

		    this.is_setting_coordinates = false
		},
		uploadImage(cropped) {
			/*
			* Este componente muestra su propio toast en todas las ramas de error, asi que se apaga
			* el evento global: si no, el usuario ve el cartel generico ademas del mensaje bueno.
			*/
			const request_config = {
				skip_global_error_event: true,
			}

			let params = {}
			if (cropped) {
				this.loading_cropp = true
				/* Coordenadas leídas del cropper ahora mismo, no las del último @change (llega con debounce). */
				params = {
					...this.get_current_coordinates(),
				}
			} else {
				this.loading_not_cropp = true
			}
			params.image_url = this.image_url
			params.model_name = this.model_name
			params.model_id = this.model.id
			this.$api.post(this.getImageUploadUrl(this.prop), params, request_config)
			.then(res => {
				this.loading_cropp = false
				this.loading_not_cropp = false
				/* Notifica al componente padre para encadenar procesos batch. */
				this.$emit('image-saved')
				if (this.model_name == 'user') {
					this.$store.commit('auth/setUser', res.data.model)
					this.$toast.success('Imagen actualizada')
					this.$bvModal.hide('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)
				} else {
					this.$bvModal.hide('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)

					if (res.data.model) {
						this.$bvModal.hide(this.model_name)
						this.$store.commit(this.model_name+'/add', res.data.model)
						if (this.prop.type == 'images') {
							this.model[this.prop.key].push(res.data.image_model)
						}
						if (this.has_many_parent_model) {
							let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
								return model.id == this.model.id 
							})
							if (index != -1) {
								this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, res.data.model)
							}
						}
						this.$toast.success('Imagen actualizada')
					} else {
						if (this.prop.type == 'images') {
							if (this.model.childrens) {
								this.model.childrens.push({
									model_name: this.prop.key,
									temporal_id: res.data.image_model.temporal_id,
									is_imageable: true,
								})
							} else {
								// this.model.childrens = []
								this.$set(this.model, 'childrens', [])
								this.model.childrens.push({
									model_name: this.prop.key,
									temporal_id: res.data.image_model.temporal_id,
									is_imageable: true,
								})
							}
							console.log('childrens')
							console.log(this.model.childrens)
							this.model[this.prop.key].push(res.data.image_model)
						} else {
							console.log('aca')
							this.model[this.prop.key] = res.data.image_url
							this.setModel(this.model, this.model_name)
						}
					}
				}
			})
			.catch(err => {
				console.log(err)
				/* El backend manda el motivo real en `message`; el texto fijo queda solo de reserva. */
				const message = this.get_backend_error_message(
					err,
					'No se pudo guardar la imagen. Probá con otra imagen de los resultados.'
				)
				this.notify_image_save_failed(message)
			})
		},
	},
}
</script>
<style lang="sass">
.cropper 
	width: 100%
	height: 600px
	background: #DDD

// Modo marco fijo (proporción mayor a 0): lo que la imagen no cubre se ve BLANCO, igual que el
// relleno que le pone el servidor al guardar. Sin esto quedaría negro (fondo por defecto de la librería).
.cropper.cropper--fijo
	// Alto tope: en pantallas bajas (teléfono, notebook) los 600 px fijos empujaban los botones de
	// guardar fuera de la vista, y con la línea de ayuda de abajo más todavía. En pantallas altas
	// (tablet en vertical, monitor) el tope no llega a aplicar y queda el alto de siempre.
	max-height: 60vh

	// Fondo del área de recorte: afuera del marco queda blanco oscurecido por la capa de sombra.
	.vue-advanced-cropper__background
		background: #fff

	// Adentro del marco: la vista previa lleva su propio fondo blanco debajo de la imagen.
	.vue-rectangle-stencil__preview
		background: #fff

	// Contorno fino de dos tonos para que el marco se distinga tanto sobre la imagen como sobre lo blanco.
	.vue-bounding-box
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 0 2px rgba(0, 0, 0, 0.35)

</style>