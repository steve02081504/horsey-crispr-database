/** @typedef {import('./db.mjs').HorseyDb} HorseyDb */
/** @typedef {import('./db.mjs').DbTag} DbTag */

import { getTagDisplay } from './tags.mjs'

/**
 * Escape untrusted text before injecting into HTML strings.
 * @param {string} s
 */
export function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

/**
 * @param {string} message
 */
export function showToast(message) {
	let el = document.getElementById('app-toast')
	if (!el) {
		el = document.createElement('div')
		el.id = 'app-toast'
		el.className = 'app-toast'
		document.body.appendChild(el)
	}
	el.textContent = message
	el.classList.add('show')
	window.clearTimeout(showToast._t)
	showToast._t = window.setTimeout(() => el.classList.remove('show'), 1600)
}

/**
 * @param {string} title
 * @param {HTMLElement} bodyEl
 * @param {{ closeAriaLabel?: string }} [labels]
 * @returns {Promise<void>}
 */
export function openModal(title, bodyEl, labels = {}) {
	return new Promise((resolve) => {
		const closeAriaLabel = labels.closeAriaLabel ?? ''
		const backdrop = document.createElement('div')
		backdrop.className = 'modal-backdrop'
		const dialog = document.createElement('div')
		dialog.className = 'modal-dialog'
		dialog.innerHTML = `<div class="modal-head"><h2 class="modal-title"></h2><button type="button" class="modal-close">&times;</button></div><div class="modal-body"></div>`
		dialog.querySelector('.modal-title').textContent = title
		dialog.querySelector('.modal-close').setAttribute('aria-label', closeAriaLabel)
		dialog.querySelector('.modal-body').appendChild(bodyEl)
		backdrop.appendChild(dialog)
		document.body.appendChild(backdrop)
		function close() {
			backdrop.remove()
			resolve()
		}
		backdrop.tabIndex = -1
		backdrop.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') close()
		})
		dialog.querySelector('.modal-close').addEventListener('click', close)
		backdrop.addEventListener('click', (e) => {
			if (e.target === backdrop) close()
		})
		backdrop.focus()
	})
}

/**
 * @param {string} message
 * @param {{ ok?: string; cancel?: string }} [labels]
 */
export function confirmDialog(message, labels = {}) {
	const cancelText = labels.cancel ?? ''
	const okText = labels.ok ?? ''
	return /** @type {Promise<boolean>} */ (
		new Promise((resolve) => {
			const backdrop = document.createElement('div')
			backdrop.className = 'modal-backdrop'
			const dialog = document.createElement('div')
			dialog.className = 'modal-dialog modal-sm'
			dialog.innerHTML = `<p class="confirm-msg"></p><div class="confirm-actions"><button type="button" class="btn btn-ghost cancel-btn"></button><button type="button" class="btn ok-btn"></button></div>`
			dialog.querySelector('.confirm-msg').textContent = message
			const cancelBtn = dialog.querySelector('.cancel-btn')
			const okBtn = dialog.querySelector('.ok-btn')
			cancelBtn.textContent = cancelText
			okBtn.textContent = okText
			backdrop.appendChild(dialog)
			document.body.appendChild(backdrop)
			cancelBtn.addEventListener('click', () => {
				backdrop.remove()
				resolve(false)
			})
			okBtn.addEventListener('click', () => {
				backdrop.remove()
				resolve(true)
			})
			backdrop.tabIndex = -1
			backdrop.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					backdrop.remove()
					resolve(false)
				}
			})
			backdrop.addEventListener('click', (e) => {
				if (e.target === backdrop) {
					backdrop.remove()
					resolve(false)
				}
			})
			backdrop.focus()
		})
	)
}

/**
 * @param {string} title
 * @param {{ value: string; label: string }[]} options
 * @param {{ ok?: string; cancel?: string; placeholder?: string }} [labels]
 * @returns {Promise<string | null>} selected value or null if cancelled
 */
export function pickFromSelectDialog(title, options, labels = {}) {
	const cancelText = labels.cancel ?? ''
	const okText = labels.ok ?? ''
	const placeholder = labels.placeholder ?? '…'
	return /** @type {Promise<string | null>} */ (
		new Promise((resolve) => {
			const backdrop = document.createElement('div')
			backdrop.className = 'modal-backdrop'
			const dialog = document.createElement('div')
			dialog.className = 'modal-dialog modal-sm'
			const sel = document.createElement('select')
			sel.className = 'merge-target-select'
			const opt0 = document.createElement('option')
			opt0.value = ''
			opt0.textContent = placeholder
			sel.appendChild(opt0)
			for (const o of options) {
				const opt = document.createElement('option')
				opt.value = o.value
				opt.textContent = o.label
				sel.appendChild(opt)
			}
			dialog.innerHTML = `<h3 class="modal-title modal-title-inline"></h3><div class="pick-select-wrap"></div><div class="confirm-actions"><button type="button" class="btn btn-ghost cancel-btn"></button><button type="button" class="btn ok-btn"></button></div>`
			dialog.querySelector('.modal-title').textContent = title
			dialog.querySelector('.pick-select-wrap').appendChild(sel)
			const cancelBtn = dialog.querySelector('.cancel-btn')
			const okBtn = dialog.querySelector('.ok-btn')
			cancelBtn.textContent = cancelText
			okBtn.textContent = okText
			backdrop.appendChild(dialog)
			document.body.appendChild(backdrop)
			function close(v) {
				backdrop.remove()
				resolve(v)
			}
			cancelBtn.addEventListener('click', () => close(null))
			okBtn.addEventListener('click', () => {
				const v = sel.value
				close(v || null)
			})
			backdrop.tabIndex = -1
			backdrop.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') close(null)
			})
			backdrop.addEventListener('click', (e) => {
				if (e.target === backdrop) close(null)
			})
			backdrop.focus()
		})
	)
}

/**
 * @param {string} title
 * @param {{ ok?: string; cancel?: string; placeholder?: string; value?: string }} [labels]
 * @returns {Promise<string | null>}
 */
export function promptTextDialog(title, labels = {}) {
	const cancelText = labels.cancel ?? ''
	const okText = labels.ok ?? ''
	const placeholder = labels.placeholder ?? ''
	const value = labels.value ?? ''
	return /** @type {Promise<string | null>} */ (
		new Promise((resolve) => {
			const backdrop = document.createElement('div')
			backdrop.className = 'modal-backdrop'
			const dialog = document.createElement('div')
			dialog.className = 'modal-dialog modal-sm'
			const input = document.createElement('input')
			input.type = 'text'
			input.className = 'merge-target-select'
			input.placeholder = placeholder
			input.value = value
			dialog.innerHTML = `<h3 class="modal-title modal-title-inline"></h3><div class="pick-select-wrap"></div><div class="confirm-actions"><button type="button" class="btn btn-ghost cancel-btn"></button><button type="button" class="btn ok-btn"></button></div>`
			dialog.querySelector('.modal-title').textContent = title
			dialog.querySelector('.pick-select-wrap').appendChild(input)
			const cancelBtn = dialog.querySelector('.cancel-btn')
			const okBtn = dialog.querySelector('.ok-btn')
			cancelBtn.textContent = cancelText
			okBtn.textContent = okText
			backdrop.appendChild(dialog)
			document.body.appendChild(backdrop)
			function close(v) {
				backdrop.remove()
				resolve(v)
			}
			cancelBtn.addEventListener('click', () => close(null))
			okBtn.addEventListener('click', () => close(input.value.trim() || null))
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') close(input.value.trim() || null)
			})
			backdrop.tabIndex = -1
			backdrop.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') close(null)
			})
			backdrop.addEventListener('click', (e) => {
				if (e.target === backdrop) close(null)
			})
			input.focus()
			input.select()
		})
	)
}

/**
 * @param {DbTag} tag
 * @param {HorseyDb} db
 */
export function renderTagChip(tag, db) {
	const span = document.createElement('span')
	span.className = 'tag-chip'
	span.dataset.tagId = tag.id
	span.textContent = getTagDisplay(tag)
	if (tag.builtin) span.classList.add('tag-builtin')
	return span
}
