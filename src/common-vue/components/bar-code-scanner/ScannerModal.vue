<template>
<b-modal
title="Escanear Codigo"
hide-footer
id="scanner-modal">
    <barcode-scanner
    class="barcode-scanner"
    :formats="formats"
    :source="source"
    :scanning.sync="scanning"
    :rate="rateValue + rateSuffix"
    :debug="debug"
    @bcs-started="isScanning = true"
    @bcs-stopped="isScanning = false"
    @bcs-scanned="scanned"
    @bcs-error="showError">
    </barcode-scanner>
</b-modal>
</template>
<script>
import BarcodeScanner from '@undecaf/vue-barcode-scanner'
const DEFAULT_FORMATS = [ 'code_128', 'code_39', 'ean_13', 'itf', 'qr_code', 'upc_a' ]
function getNativeBarcodeDetector() {
    try {
        window['BarcodeDetector'].getSupportedFormats()
        return window['BarcodeDetector']
    } catch { 
        window['BarcodeDetector'] = barcodeDetectorPolyfill.BarcodeDetectorPolyfill
        return false
    }
}
export default {
    props: {
        start: Boolean,
    },
    components: {
        BarcodeScanner,
    },
    data() {
        return {
            nativeBarcodeDetector: getNativeBarcodeDetector(),
            isBarcodeDetectorPolyfilled: !getNativeBarcodeDetector(),
            sourceOption: null,
            source: null,
            scanning: false,
            singleScans: false,
            supportedFormats: [],
            formats: [],
            rateValue: 20,
            rateSuffix: '/s',
            debug: false,
            isScanning: false,
            scanInstants: [],
            error: null,
        }
    },
    watch: {
        start() {
            this.create()
        },
    },
    computed: {
        scansPerSec() {
            // Derive the scanning frequency from the moving average of scanning intervals
            const
                instants = this.scanInstants,
                intervalCount = instants.length-1;
            return (intervalCount) ? intervalCount * 1000 / Math.abs(instants[0] - instants[intervalCount]) : 0
        },
        scansPerSecFormat() {
            return new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        },
    },
    // created() {
    //     this.create()
    // },
    methods: {
        create() {
            console.log('se creo ScannerModal')
            navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } })
            .then(stream => {
                this.source = stream
                this.setVideoProps()
            })
            .catch(error => this.errorHandler(error))
            this.selectBarcodeDetector()
            // this.scanning = true
        },
        setVideoProps() {
            let bar_code = document.getElementsByClassName('barcode-scanner')[0]
            console.log('bar_code element')
            console.log(document.getElementsByClassName('barcode-scanner'))
            console.log(bar_code)
            let child = bar_code.childNodes[0]
            console.log('child element')
            console.log(child)
            let video = child.childNodes[4]
            console.log('video element')
            console.log(video)
            vide.setAttribute('playsInline', '')
            vide.setAttribute('muted', '')
            vide.setAttribute('autoPlay', '')
        },
        scanned(barcodes) {
            if (barcodes.length) {
                this.$emit('setBarCode', barcodes[0].rawValue)
                this.$bvModal.hide('scanner-modal')
            }
            const maxScanInstants = (this.scansPerSec >= 2) ? Math.round(this.scansPerSec) : 2
            this.scanInstants.unshift(performance.now())
            this.scanInstants.length = Math.min(this.scanInstants.length, maxScanInstants)
            if (this.singleScans) {
                this.scanning = false
            }
            this.error = null
        },
        showError(error) {
            this.error = error
        },
        async selectBarcodeDetector() {
            console.log('selectBarcodeDetector')
            // console.log(barcodeDetectorPolyfill.BarcodeDetectorPolyfill)
            if (getNativeBarcodeDetector()) {
                window.BarcodeDetector = getNativeBarcodeDetector()
            } else {
                window.BarcodeDetector = barcodeDetectorPolyfill.BarcodeDetectorPolyfill
            }
            this.supportedFormats = [...await window.BarcodeDetector.getSupportedFormats()].sort()
            this.formats = DEFAULT_FORMATS.filter(f => this.supportedFormats.includes(f))
        },
        errorHandler(error) {
            this.error = `${error}. The resource may have been blocked by the server's CORS policy.`
            this.sourceOption = null
        },
    },
}
</script>
<style scoped>
.error {
    color: crimson;
}
.barcode-scanner {
    display: flex;
    justify-content: center;
}
</style>