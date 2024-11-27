import error from '@/assets/sonidos/error.mp3'
export default {
	methods: {
		sonido_error() {
            var audio = new Audio(error);
            audio.play()

            // setTimeout(() => {
            // 	audio.play()
            // }, 1000)
		}
	}
}