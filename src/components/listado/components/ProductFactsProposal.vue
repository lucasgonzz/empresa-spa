<template>
	<section v-if="model && !model.id && can('article.store') && visible" class="product-facts" aria-live="polite" data-testid="product-facts-proposal">
		<div class="product-facts__heading">
			<strong>Información por código de barras</strong>
			<b-spinner v-if="busy" small label="Buscando"></b-spinner>
		</div>
		<p class="mb-2">{{ message }}</p>
		<p v-if="busy" class="small text-muted">Podés seguir completando el artículo. La búsqueda puede demorar unos instantes.</p>
		<template v-if="status === 'found' && product && !applied">
			<div class="product-facts__fields">
				<b-form-checkbox v-for="field in fields" :key="field.key" v-model="selected[field.key]" class="product-facts__field">
					<span><small>{{ field.label }}</small><span class="product-facts__value">{{ field.value }}</span></span>
				</b-form-checkbox>
			</div>
			<p class="small text-muted mt-2">Peso y medidas: sólo datos verificados del embalaje de envío. Los datos faltantes quedan vacíos.</p>
			<div v-if="product.sources && product.sources.length" class="product-facts__sources">
				<a v-for="source in product.sources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title || source.url }}</a>
			</div>
			<div class="product-facts__actions">
				<b-button size="sm" variant="primary" @click="apply">Aplicar datos seleccionados</b-button>
				<b-button size="sm" variant="outline-secondary" @click="manual">Descartar</b-button>
			</div>
		</template>
		<template v-else-if="applied">
			<p class="small mb-1">Los datos se aplicaron al borrador. Se guardan al guardar el artículo.</p>
			<label v-if="pending && pending.brand_name" class="small">Marca: {{ pending.brand_name }} (se crea al guardar)</label>
			<template v-if="pending && pending.description !== null && pending.description !== undefined">
				<label class="small d-block" :for="'product-facts-description'">Descripción para la tienda (editable)</label>
				<b-form-textarea id="product-facts-description" v-model="pending.description" rows="3"></b-form-textarea>
			</template>
		</template>
		<div v-else class="product-facts__actions">
			<b-button v-if="busy" size="sm" variant="outline-secondary" @click="manual">Continuar manualmente</b-button>
			<b-button v-if="status === 'failed' || status === 'not_found'" size="sm" variant="outline-primary" @click="start">Volver a buscar</b-button>
		</div>
	</section>
</template>
<script>
export default {
	name: 'ProductFactsProposal',
	props: { model: { type: Object, required: true } },
	data() {
		return { visible: false, status: '', message: '', uuid: null, product: null, classification: null,
			selected: {}, snapshot: {}, request: 0, timer: null, debounce: null, applied: false, open: false }
	},
	computed: {
		code() { return this.model && this.model.bar_code ? String(this.model.bar_code).trim() : '' },
		busy() { return ['queued', 'searching', 'waiting'].indexOf(this.status) !== -1 },
		pending() { return this.model.product_facts_apply || null },
		fields() {
			if (!this.product) { return [] }
			let product = this.product
			let fields = []
			let mapping = [
				['name', 'Nombre', product.name], ['brand', 'Marca', product.brand],
				['description', 'Descripción', this.descriptionText()], ['net_content', 'Contenido neto', product.net_content],
				['weight_kg', 'Peso de envío (kg)', product.weight_kg], ['height_cm', 'Alto del embalaje (cm)', product.height_cm],
				['width_cm', 'Ancho del embalaje (cm)', product.width_cm], ['length_cm', 'Largo del embalaje (cm)', product.length_cm],
			]
			mapping.forEach(function (item) {
				if (item[2] !== null && item[2] !== undefined && item[2] !== '') { fields.push({ key: item[0], label: item[1], value: item[2] }) }
			})
			if (this.classification) {
				fields.push({ key: 'classification', label: 'Categoría / subcategoría', value: this.classification.category_name + (this.classification.sub_category_name ? ' / ' + this.classification.sub_category_name : '') })
			}
			return fields
		},
	},
	watch: {
		model(value, oldValue) { if (value !== oldValue) { this.changedCode() } },
		code() { this.changedCode() },
		'model.id'(id) { if (id) { this.stop(true) } },
		'model.brand_id'(value, oldValue) {
			if (value && value !== oldValue && this.pending && this.pending.brand_name) { this.$set(this.pending, 'brand_name', null) }
		},
		'model.descriptions': {
			deep: true,
			handler() { if (this.applied && this.pending) { this.$set(this.pending, 'description', null) } },
		},
		'model.descripcion'(value) {
			if (this.applied && this.pending && this.pending.description !== value) { this.$set(this.pending, 'description', value || '') }
		},
	},
	created() {
		this.$root.$on('bv::modal::shown', this.modalShown)
		this.$root.$on('bv::modal::hide', this.modalHidden)
	},
	mounted() {
		// El import diferido puede terminar después de shown si éste es el primer artículo de la sesión.
		let modal = document.getElementById('article')
		if (modal && modal.classList.contains('show')) { this.open = true; this.changedCode() }
	},
	beforeDestroy() {
		this.stop(true)
		this.$root.$off('bv::modal::shown', this.modalShown)
		this.$root.$off('bv::modal::hide', this.modalHidden)
	},
	methods: {
		modalShown(event, id) {
			if (id === 'article') { this.open = true; this.changedCode() }
		},
		modalHidden(event, id) {
			if (id === 'article') { this.open = false; this.stop(true) }
		},
		validCode(code) {
			if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || !/[1-9]/.test(code)) { return false }
			let sum = 0
			for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) { sum += Number(code[i]) * weight }
			if ((10 - sum % 10) % 10 !== Number(code[code.length - 1])) { return false }
			let canonical = ('00000000000000' + code).slice(-14)
			let prefix = Number(canonical.slice(1, 4))
			return !((prefix >= 20 && prefix <= 29) || (prefix >= 40 && prefix <= 49) || (prefix >= 200 && prefix <= 299))
		},
		changedCode() {
			this.stop(true)
			this.visible = false
			this.applied = false
			// Una propuesta de otro código nunca se persiste en el artículo nuevo.
			if (this.model.product_facts_apply) { this.$delete(this.model, 'product_facts_apply') }
			// Sin la extension "Agentes de IA" no se busca nada (el backend responderia 403).
			if (!this.hasExtencion('agentes_ia') || !this.open || this.model.id || !this.can('article.store') || !this.validCode(this.code)) { return }
			let self = this
			this.debounce = setTimeout(function () { self.start() }, 650)
		},
		capture() {
			let self = this
			let snapshot = {}
			;['name', 'brand_id', 'category_id', 'sub_category_id', 'peso', 'alto', 'ancho', 'profundidad', 'descripcion', 'descriptions'].forEach(function (key) {
				snapshot[key] = JSON.stringify(self.model[key] === undefined ? null : self.model[key])
			})
			this.snapshot = snapshot
		},
		unchanged(key) { return JSON.stringify(this.model[key] === undefined ? null : this.model[key]) === this.snapshot[key] },
		current(request, code) { return this.open && !this.model.id && this.request === request && this.code === code },
		start() {
			if (!this.open || this.model.id || !this.validCode(this.code)) { return }
			this.stop(true)
			this.capture()
			this.visible = true
			this.applied = false
			this.product = null
			this.status = 'queued'
			this.message = 'Buscando información del producto…'
			let self = this
			let request = this.request
			let code = this.code
			this.$api.post('article-enrichments', { bar_code: code }, { skip_global_error_event: true })
			.then(function (response) {
				if (!self.current(request, code)) {
					if (response.data.uuid) { self.cancelRemote(response.data.uuid) }
					return
				}
				self.uuid = response.data.uuid
				self.receive(response.data, request, code)
			})
			.catch(function (error) {
				if (!self.current(request, code)) { return }
				let data = error.response && error.response.data ? error.response.data : {}
				self.status = data.status || 'failed'
				self.message = data.message || 'No se pudo buscar la información. Podés continuar manualmente.'
			})
		},
		receive(data, request, code) {
			if (!this.current(request, code)) { return }
			this.status = data.status
			this.message = data.message || 'Buscando información del producto…'
			if (data.status === 'found') {
				this.product = data.product
				this.classification = data.classification
				let selected = {}
				this.fields.forEach(function (field) { selected[field.key] = true })
				this.selected = selected
				return
			}
			if (this.busy) {
				let self = this
				this.timer = setTimeout(function () { self.poll(request, code) }, 2000)
			}
		},
		poll(request, code) {
			if (!this.current(request, code) || !this.uuid) { return }
			let self = this
			this.$api.get('article-enrichments/' + this.uuid, { skip_global_error_event: true })
			.then(function (response) { self.receive(response.data, request, code) })
			.catch(function () {
				if (self.current(request, code)) { self.status = 'failed'; self.message = 'La búsqueda no respondió. Podés continuar manualmente o reintentar.' }
			})
		},
		descriptionText() {
			return this.product ? this.product.description || '' : ''
		},
		apply() {
			if (!this.open || this.model.id || this.status !== 'found') { return }
			let self = this
			let skipped = false
			let mapping = { name: 'name', weight_kg: 'peso', height_cm: 'alto', width_cm: 'ancho', length_cm: 'profundidad' }
			Object.keys(mapping).forEach(function (key) {
				if (!self.selected[key]) { return }
				let target = mapping[key]
				if (!self.unchanged(target)) { skipped = true; return }
				self.$set(self.model, target, self.product[key])
			})
			let pending = { sources: this.product.sources || [] }
			if (this.selected.brand) {
				if (this.unchanged('brand_id')) {
					this.$set(this.model, 'brand_id', null)
					pending.brand_name = this.product.brand
				} else { skipped = true }
			}
			if (this.selected.description || this.selected.net_content) {
				if (this.unchanged('descriptions') && this.unchanged('descripcion')) {
					let text = this.selected.description ? this.descriptionText() : ''
					if (this.selected.net_content && this.product.net_content) { text += (text ? '\n\n' : '') + 'Contenido neto: ' + this.product.net_content }
					pending.description = text
					this.$set(this.model, 'descripcion', text)
				} else { skipped = true }
			}
			if (this.selected.classification && this.classification) {
				if (this.unchanged('category_id') && this.unchanged('sub_category_id')) {
					this.$set(this.model, 'category_id', this.classification.category_id)
					this.$set(this.model, 'sub_category_id', this.classification.sub_category_id)
					this.$set(this.model, 'category', { id: this.classification.category_id, name: this.classification.category_name })
					this.$set(this.model, 'sub_category', this.classification.sub_category_id ? { id: this.classification.sub_category_id, name: this.classification.sub_category_name } : null)
				} else { skipped = true }
			}
			this.$set(this.model, 'product_facts_apply', pending)
			this.applied = true
			this.message = skipped ? 'Aplicamos los datos seleccionados y conservamos los campos que editaste durante la búsqueda.' : 'Datos aplicados. Revisalos antes de guardar.'
		},
		cancelRemote(uuid) { this.$api.delete('article-enrichments/' + uuid, { skip_global_error_event: true }).catch(function () {}) },
		stop(cancel) {
			this.request++
			clearTimeout(this.timer)
			clearTimeout(this.debounce)
			if (cancel && this.uuid && this.busy) { this.cancelRemote(this.uuid) }
			this.uuid = null
		},
		manual() {
			this.stop(true)
			this.status = 'cancelled'
			this.visible = false
		},
	},
}
</script>
<style scoped lang="sass">
.product-facts
	border: 1px solid var(--color-border)
	border-radius: 10px
	background: var(--bg-section)
	color: var(--color-text-primary)
	padding: 16px
	margin-bottom: 18px
	min-width: 0

.product-facts__heading
	display: flex
	justify-content: space-between
	gap: 12px
	margin-bottom: 8px

.product-facts__fields
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))
	gap: 10px

.product-facts__field
	margin: 0
	small
		display: block
		color: var(--color-text-secondary)

.product-facts__value
	display: block
	white-space: pre-wrap
	overflow-wrap: anywhere

.product-facts__sources
	display: flex
	flex-direction: column
	gap: 4px
	font-size: 12px
	a
		overflow-wrap: anywhere

.product-facts__actions
	display: flex
	flex-wrap: wrap
	gap: 8px
	margin-top: 12px

@media (max-width: 420px)
	.product-facts
		padding: 12px
	.product-facts__fields
		grid-template-columns: minmax(0, 1fr)
</style>
