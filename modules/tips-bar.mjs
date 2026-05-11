import { geti18n_nowarn, i18nElement } from '../lib/i18n.mjs'

const ROTATE_MS = 6500

/** @type {WeakMap<HTMLElement, () => void>} */
const tipsDisposers = new WeakMap()

function disposeTips(host) {
	const disposer = tipsDisposers.get(host)
	if (disposer) {
		disposer()
		tipsDisposers.delete(host)
	}
}

/**
 * @param {HTMLElement | null} host
 */
export function renderTipsMarquee(host) {
	if (!host) return
	disposeTips(host)

	const tipsVal = geti18n_nowarn('tips')
	const len = tipsVal?.length ?? 0
	if (!len) {
		host.replaceChildren()
		host.closest('.tips-bar')?.classList.add('tips-bar--empty')
		return
	}
	host.closest('.tips-bar')?.classList.remove('tips-bar--empty')
	host.replaceChildren()

	const viewport = document.createElement('div')
	viewport.className = 'tips-scroll-viewport'

	const strip = document.createElement('div')
	strip.className = 'tips-scroll-strip'

	for (let i = 0; i < len; i++) {
		const slide = document.createElement('div')
		slide.className = 'tips-scroll-slide'
		const span = document.createElement('span')
		span.dataset.i18n = `tips.${i}`
		slide.appendChild(span)
		strip.appendChild(slide)
	}

	viewport.appendChild(strip)
	host.appendChild(viewport)
	viewport.style.height = '0'

	i18nElement(strip, { skip_report: true })

	const slides = /** @type {HTMLElement[]} */ ([...strip.children])

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
	if (reduceMotion) {
		strip.classList.add('tips-scroll-strip--static')
		return
	}

	let index = Math.floor(Math.random() * len)
	/** @type {number[]} */
	let heights = []
	/** @type {number[]} */
	let offsets = []

	function measure() {
		heights = slides.map((el) => Math.ceil(el.getBoundingClientRect().height))
		offsets = []
		let acc = 0
		for (const h of heights) {
			offsets.push(acc)
			acc += h
		}
	}

	function apply() {
		const h = heights[index] ?? 0
		const off = offsets[index] ?? 0
		viewport.style.height = h > 0 ? `${h}px` : ''
		strip.style.transform = `translateY(-${off}px)`
	}

	function layoutAndApply() {
		measure()
		if (!heights.length || heights.every((x) => x === 0)) return false
		apply()
		return true
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			let ok = layoutAndApply()
			if (!ok) {
				viewport.style.height = ''
				measure()
				if (heights.some((x) => x > 0)) {
					ok = true
					apply()
				}
			}
			if (!ok) return

			if (len <= 1) return

			const id = setInterval(() => {
				index = (index + 1) % len
				measure()
				apply()
			}, ROTATE_MS)

			const ro = new ResizeObserver(() => {
				layoutAndApply()
			})
			ro.observe(host)

			tipsDisposers.set(host, () => {
				clearInterval(id)
				ro.disconnect()
			})
		})
	})
}
