import {
	BASES,
	CAT_COLOR,
	GENES,
	HELIX_MAP,
	formatGenomeForExport,
	getGeneValue,
	makeUniformGenome,
	normalizeGenome,
	parseGenome,
	valueColor,
	alleleSummary,
} from '../lib/horsey-genetics/genetics-core.mjs'
import { HELIX_PARAM_SLOTS } from '../lib/horsey-genetics/helix-param-slots.mjs'
import {
	hasMergeableAlleles,
	mergeAllelesAt,
	mergeAllMixedAlleles,
	randomGenomeStrands,
	setBaseAt,
} from '../lib/horsey-genetics/genome-edits.mjs'
import { sortedDiploidChoices } from '../lib/horsey-genetics/diploid-options.mjs'
import { geti18n_nowarn } from '../lib/i18n.mjs'
import { escapeHtml } from './ui.mjs'

/**
 * @param {string[][]} a
 * @param {string[][]} b
 */
export function hybridizeGenomes(a, b) {
	return normalizeGenome(
		a.map((pair, hi) => {
			const q = b[hi] || ['', '']
			const n = Math.max(pair[0].length, pair[1].length, q[0].length, q[1].length)
			let o1 = ''
			let o2 = ''
			for (let i = 0; i < n; i++) {
				o1 += (Math.random() < 0.5 ? pair[0] : q[0])[i] || ''
				o2 += (Math.random() < 0.5 ? pair[1] : q[1])[i] || ''
			}
			return [o1, o2]
		}),
	)
}

/**
 * @param {string} text
 */
export function highlightDnaText(text) {
	const lines = String(text ?? '').split('\n')
	return lines
		.map((line) => {
			const m = /^(\s*)(\d{1,2}:)([ATCGatcg]*)$/.exec(line)
			if (!m) return escapeHtml(line)
			const bases = m[3].split('').map((c) => {
				const u = c.toUpperCase()
				if ('ATCG'.includes(u)) return `<span class="dna-hl-${u}">${u}</span>`
				return escapeHtml(c)
			})
			return `${m[1]}<span class="dna-line-no">${escapeHtml(m[2])}</span>${bases.join('')}`
		})
		.join('\n')
}

/**
 * @param {string[][]} g
 * @param {number} helixIndex
 * @param {number} paramIndex
 * @param {string} pair - two chars e.g. 'GG'
 */
export function setTraitPair(g, helixIndex, paramIndex, pair) {
	const [x, y] = pair.toUpperCase().split('')
	if (!x || !y) return g
	let next = g.map((p) => [...p])
	const s1 = next[helixIndex][0] || ''
	const s2 = next[helixIndex][1] || ''
	const a = s1.split('')
	const b = s2.split('')
	if (paramIndex < a.length) a[paramIndex] = x
	if (paramIndex < b.length) b[paramIndex] = y
	next[helixIndex][0] = a.join('')
	next[helixIndex][1] = b.join('')
	return normalizeGenome(next)
}

/**
 * Wheels preset behaviour (simplified): tweak leg/foot-related helices.
 * @param {string} wheelsDnaText — full DNA text (e.g. from DB preset `dna_wheels`); empty → no-op.
 */
export function applyWheelsMutations(g, wheelsDnaText) {
	if (!wheelsDnaText?.trim()) return normalizeGenome(g)
	let next = g.map((p) => p.map((s) => s))
	const presetSeq = parseGenome(wheelsDnaText)
	for (let hi = 0; hi < next.length; hi++) {
		const genes = HELIX_MAP[hi] || []
		for (let gi = 0; gi < genes.length; gi++) {
			const name = String(genes[gi]).toUpperCase()
			// Wheels preset：不覆盖 LEG_IN / LEG_IN2，保留当前基因组中的值
			if (name === 'LEG_IN' || name === 'LEG_IN2') continue
			if (hi === 18 || hi === 19 || name.includes('LEG') || name.includes('FOOT')) {
				const ps = presetSeq[hi]
				const o = next[hi]
				if (ps[0][gi]) o[0] = replaceAt(o[0] || '', gi, ps[0][gi])
				if (ps[1][gi]) o[1] = replaceAt(o[1] || '', gi, ps[1][gi])
			}
			if (name === 'ARM_JOINT_TYPE') {
				next[hi] = [replaceAt(next[hi][0] || '', gi, 'C'), replaceAt(next[hi][1] || '', gi, 'C')]
			}
		}
	}
	return normalizeGenome(next)
}

function replaceAt(strand, i, ch) {
	const a = (strand || '').split('')
	a[i] = ch
	return a.join('')
}

/**
 * @param {HTMLElement} container
 * @param {{
 *   geti18n: (k: string, p?: object) => string;
 *   onChange?: () => void;
 *   getDnaById?: (id: string) => import('./db.mjs').DbDna | undefined;
 *   resolveDnaLabel?: (d: import('./db.mjs').DbDna) => string;
 *   getWheelsPresetSequence?: () => string;
 * }} opts
 */
export function mountEditor(container, opts) {
	const { geti18n, onChange, getDnaById, resolveDnaLabel, getWheelsPresetSequence } = opts
	/** @type {string[][]} */
	let genome = normalizeGenome(makeUniformGenome('A'))
	let viewMode = 'crispr'
	let geneFilter = ''
	let suppressNotify = false

	const root = document.createElement('div')
	root.className = 'editor-root'
	root.innerHTML = `
		<div class="editor-toolbar">
			<button type="button" class="btn btn-ghost tab-btn" data-tab="crispr"></button>
			<button type="button" class="btn btn-ghost tab-btn" data-tab="params"></button>
			<input type="search" class="gene-filter-input" />
		</div>
		<div class="editor-quick-sections"></div>
		<div class="editor-main editor-main-crispr"></div>
		<div class="editor-main editor-main-params" hidden></div>
		<div class="editor-hybrid-row"></div>
		<div class="editor-text-panel">
			<label class="field-label editor-input-label"></label>
			<div class="dna-input-wrap">
				<pre class="dna-highlight-pre" aria-hidden="true"></pre>
				<textarea class="dna-textarea" spellcheck="false"></textarea>
			</div>
			<label class="field-label editor-output-label"></label>
			<pre class="dna-output-pre"></pre>
			<div class="editor-text-actions"></div>
		</div>
	`
	container.appendChild(root)

	const tabCr = root.querySelector('[data-tab="crispr"]')
	const tabPr = root.querySelector('[data-tab="params"]')
	const geneFilterInput = root.querySelector('.gene-filter-input')
	const crisprMain = root.querySelector('.editor-main-crispr')
	const paramsMain = root.querySelector('.editor-main-params')
	const hybridRow = root.querySelector('.editor-hybrid-row')
	const textarea = root.querySelector('.dna-textarea')
	const highlightPre = root.querySelector('.dna-highlight-pre')
	const outputPre = root.querySelector('.dna-output-pre')
	const quickSections = root.querySelector('.editor-quick-sections')
	const textActions = root.querySelector('.editor-text-actions')

	function t(key) {
		return geti18n(key) || key
	}

	function helixTitleLocalized(hi) {
		const loc = geti18n_nowarn(`helices.${hi}`)
		if (loc) return loc
		return `${t('editor.helix')} ${hi}`
	}

	function geneHumanLocalized(geneName) {
		return geti18n_nowarn(`geneNames.${geneName}`) || geneName
	}

	function updateGeneFilterVisibility() {
		// 顶部搜索在「参数」视图中同样过滤 P0/P1… 标签（与 CRISPR 基因搜索共用输入框）
		geneFilterInput.hidden = false
	}

	/** 按标签文案筛选参数块，有匹配时展开该螺旋的 params-grid */
	function applyParamsGeneFilter() {
		if (viewMode !== 'params') return
		const q = geneFilter.trim().toLowerCase()
		paramsMain.querySelectorAll('.helix-section-params').forEach((section) => {
			let hasVisible = false
			section.querySelectorAll('.param-box').forEach((box) => {
				const lab = box.querySelector('label')
				const text = (lab?.textContent ?? '').toLowerCase()
				const match = !q || text.includes(q)
				box.style.display = match ? '' : 'none'
				if (match) hasVisible = true
			})
			section.style.display = hasVisible ? '' : 'none'
			const grid = section.querySelector('.params-grid')
			if (grid && q.length > 0 && hasVisible) grid.style.display = 'grid'
		})
	}

	function syncI18nStatic() {
		tabCr.textContent = t('editor.crispr')
		tabPr.textContent = t('editor.params')
		geneFilterInput.placeholder = t('editor.searchGenes')
		root.querySelector('.editor-input-label').textContent = t('editor.inputPlaceholder')
		root.querySelector('.editor-output-label').textContent = t('editor.outputLabel')
	}

	let hybridSelect = /** @type {HTMLSelectElement | null} */ (null)
	/** @type {HTMLButtonElement | null} */
	let mergeMixedBtnEl = null
	const AUTO_COPY_KEY = 'horsey-editor-auto-copy'
	let autoCopyEnabled =
		typeof localStorage !== 'undefined' && localStorage.getItem(AUTO_COPY_KEY) === '1'

	function buildHybridRow(dnaList) {
		hybridRow.innerHTML = ''
		const lab = document.createElement('label')
		lab.className = 'hybrid-label'
		lab.textContent = `${t('editor.hybridTarget')}：`
		const sel = document.createElement('select')
		sel.className = 'hybrid-select'
		const opt0 = document.createElement('option')
		opt0.value = ''
		opt0.textContent = t('editor.selectSecond')
		sel.appendChild(opt0)
		const labelFn = resolveDnaLabel ?? ((d) => d.name || d.nameI18nKey || d.id)
		for (const d of dnaList)
			if (d.sequence) {
				const o = document.createElement('option')
				o.value = d.id
				o.textContent = labelFn(d)
				sel.appendChild(o)
			}
		const btn = document.createElement('button')
		btn.type = 'button'
		btn.className = 'btn btn-mini'
		btn.textContent = t('editor.doHybridize')
		btn.addEventListener('click', () => {
			const id = sel.value
			if (!id || !getDnaById) return
			const other = getDnaById(id)
			if (!other?.sequence) return
			const g2 = parseGenome(other.sequence)
			genome = hybridizeGenomes(genome, g2)
			syncAll()
		})
		hybridRow.append(lab, sel, btn)
		hybridSelect = sel
	}

	function buildQuickRow() {
		quickSections.innerHTML = ''

		const head = document.createElement('div')
		head.className = 'editor-quick-head'
		const title = document.createElement('span')
		title.className = 'editor-quick-title'
		title.textContent = t('editor.qe_title')
		const lead = document.createElement('span')
		lead.className = 'editor-quick-lead'
		lead.textContent = t('editor.qe_lead')
		head.append(title, lead)
		quickSections.appendChild(head)

		/**
		 * @param {string} labelKey
		 * @param {string} hintKey
		 * @param {{ key: string; fn: () => void }[]} buttons
		 */
		function addQuickGroup(labelKey, hintKey, buttons) {
			const wrap = document.createElement('div')
			wrap.className = 'editor-quick-group'
			const meta = document.createElement('div')
			meta.className = 'editor-quick-group-meta'
			const lab = document.createElement('span')
			lab.className = 'editor-quick-group-label'
			lab.textContent = t(labelKey)
			const hint = document.createElement('span')
			hint.className = 'editor-quick-group-hint'
			hint.textContent = t(hintKey)
			meta.append(lab, hint)
			const row = document.createElement('div')
			row.className = 'editor-quick-group-btns'
			for (const { key, fn } of buttons) {
				const b = document.createElement('button')
				b.type = 'button'
				b.className = 'btn btn-mini'
				b.textContent = t(key)
				b.addEventListener('click', fn)
				row.appendChild(b)
			}
			wrap.append(meta, row)
			quickSections.appendChild(wrap)
		}

		addQuickGroup('editor.qe_group_vitals_label', 'editor.qe_group_vitals_hint', [
			{
				key: 'editor.qe_lives10',
				fn: () => {
					genome = setTraitPair(genome, 1, 10, 'GG')
					syncAll()
				},
			},
			{
				key: 'editor.qe_largeLitter',
				fn: () => {
					genome = setTraitPair(genome, 1, 9, 'GG')
					syncAll()
				},
			},
		])

		addQuickGroup('editor.qe_group_limbs_label', 'editor.qe_group_limbs_hint', [
			{
				key: 'editor.qe_sevenLegs',
				fn: () => {
					genome = setTraitPair(genome, 4, 2, 'AA')
					syncAll()
				},
			},
			{
				key: 'editor.qe_wheels',
				fn: () => {
					genome = applyWheelsMutations(genome, getWheelsPresetSequence?.() ?? '')
					syncAll()
				},
			},
		])

		addQuickGroup('editor.qe_group_metabolism_label', 'editor.qe_group_metabolism_hint', [
			{
				key: 'editor.qe_noFood',
				fn: () => {
					genome = setTraitPair(genome, 12, 1, 'GG')
					syncAll()
				},
			},
			{
				key: 'editor.qe_herb',
				fn: () => {
					genome = setTraitPair(genome, 12, 0, 'TT')
					genome = setTraitPair(genome, 1, 11, 'CC')
					genome = setTraitPair(genome, 12, 1, 'TT')
					syncAll()
				},
			},
			{
				key: 'editor.qe_carn',
				fn: () => {
					genome = setTraitPair(genome, 12, 0, 'AA')
					genome = setTraitPair(genome, 1, 11, 'CC')
					genome = setTraitPair(genome, 12, 1, 'TT')
					syncAll()
				},
			},
			{
				key: 'editor.qe_omni',
				fn: () => {
					genome = setTraitPair(genome, 12, 0, 'TT')
					genome = setTraitPair(genome, 12, 1, 'TT')
					genome = setTraitPair(genome, 1, 11, 'AA')
					syncAll()
				},
			},
		])

		addQuickGroup('editor.qe_group_other_label', 'editor.qe_group_other_hint', [
			{
				key: 'editor.qe_sweetie',
				fn: () => {
					genome = setTraitPair(genome, 12, 12, 'GG')
					syncAll()
				},
			},
		])
	}

	function syncHighlight() {
		highlightPre.innerHTML = highlightDnaText(textarea.value) + '\n'
	}

	function syncOutput() {
		const txt = formatGenomeForExport(genome)
		outputPre.innerHTML = highlightDnaText(txt)
		textarea.value = txt
		syncHighlight()
	}

	async function maybeAutoCopyToClipboard() {
		if (!autoCopyEnabled || suppressNotify) return
		try {
			await navigator.clipboard.writeText(formatGenomeForExport(genome))
		} catch {
			/* ignore */
		}
	}

	/** @type {HTMLElement | null} */
	let basePickerEl = null
	/** @type {((ev: MouseEvent) => void) | null} */
	let basePickerOutside = null
	/** @type {((ev: KeyboardEvent) => void) | null} */
	let basePickerEscape = null

	function closeBasePicker() {
		if (basePickerEl) {
			basePickerEl.remove()
			basePickerEl = null
		}
		if (basePickerOutside) {
			document.removeEventListener('mousedown', basePickerOutside, true)
			basePickerOutside = null
		}
		if (basePickerEscape) {
			document.removeEventListener('keydown', basePickerEscape)
			basePickerEscape = null
		}
	}

	/**
	 * @param {HTMLElement} anchorEl
	 * @param {(letter: string) => void} onPick
	 */
	function openBasePicker(anchorEl, onPick) {
		closeBasePicker()
		const pop = document.createElement('div')
		pop.className = 'base-picker-popover'
		pop.setAttribute('role', 'listbox')
		for (const letter of BASES) {
			const b = document.createElement('button')
			b.type = 'button'
			b.className = `base base-${letter} base-sm`
			b.textContent = letter
			b.setAttribute('role', 'option')
			b.addEventListener('click', (e) => {
				e.preventDefault()
				e.stopPropagation()
				onPick(letter)
				closeBasePicker()
			})
			pop.appendChild(b)
		}
		document.body.appendChild(pop)
		basePickerEl = pop
		const layout = () => {
			pop.style.position = 'fixed'
			pop.style.zIndex = '2000'
			const ar = anchorEl.getBoundingClientRect()
			const pad = 8
			const w = pop.offsetWidth
			const h = pop.offsetHeight
			let left = ar.left
			let top = ar.bottom + 4
			if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad
			if (left < pad) left = pad
			if (top + h > window.innerHeight - pad) top = Math.max(pad, ar.top - h - 4)
			pop.style.left = `${left}px`
			pop.style.top = `${top}px`
		}
		requestAnimationFrame(() => {
			layout()
		})
		basePickerEscape = (ev) => {
			if (ev.key === 'Escape') closeBasePicker()
		}
		document.addEventListener('keydown', basePickerEscape)
		setTimeout(() => {
			basePickerOutside = (ev) => {
				const t = /** @type {Node | null} */ (ev.target)
				if (!t || pop.contains(t) || anchorEl.contains(t)) return
				closeBasePicker()
			}
			document.addEventListener('mousedown', basePickerOutside, true)
		}, 0)
	}

	function syncAll() {
		closeBasePicker()
		syncOutput()
		if (viewMode === 'crispr') renderCrispr()
		else renderParams()
		if (mergeMixedBtnEl)
			mergeMixedBtnEl.style.display = hasMergeableAlleles(genome) ? '' : 'none'
		void maybeAutoCopyToClipboard()
		if (!suppressNotify) onChange?.()
	}

	function renderCrispr() {
		closeBasePicker()
		crisprMain.innerHTML = ''
		const filter = geneFilter.trim().toLowerCase()
		HELIX_MAP.forEach((genes, hi) => {
			const [s1, s2] = genome[hi] || ['', '']
			const hasData = Boolean(s1 || s2)
			const block = document.createElement('div')
			block.className = 'crispr-helix'
			const header = document.createElement('div')
			header.className = 'crispr-helix-header'
			const heading = document.createElement('div')
			heading.className = 'crispr-helix-heading'
			heading.innerHTML = `<div class="helix-title">${escapeHtml(helixTitleLocalized(hi))}</div>
				<div class="helix-subtitle">${escapeHtml(geti18n_nowarn(`helixDescriptions.${hi}`) || '')}</div>`
			header.appendChild(heading)
			if (hasData) header.appendChild(buildStrandStack(hi, s1, s2))
			block.appendChild(header)
			if (!hasData) {
				crisprMain.appendChild(block)
				return
			}
			const body = document.createElement('div')
			body.className = 'crispr-helix-body'
			const geneList = document.createElement('div')
			geneList.className = 'crispr-genes'
			genes.forEach((geneName, gi) => {
				const humanName = geneHumanLocalized(geneName)
				if (filter && !humanName.toLowerCase().includes(filter) && !geneName.toLowerCase().includes(filter))
					return
				const gene = GENES[geneName]
				const categoryColor = gene ? CAT_COLOR[gene.cat] || '#64748b' : '#475569'
				const b1 = s1?.[gi]?.toUpperCase()
				const b2 = s2?.[gi]?.toUpperCase()
				const v1 = getGeneValue(gene, b1)
				const v2 = getGeneValue(gene, b2)
				const isMixed = Boolean(b1 && b2) && b1 !== b2
				const homozygous = Boolean(b1 && b2 && b1 === b2)
				const card = document.createElement('div')
				card.className = 'crispr-gene'
				card.style.borderColor = `${categoryColor}33`
				card.innerHTML = `<div class="rname" style="color:${categoryColor}">${escapeHtml(humanName)}</div>
					<div class="rpos">${escapeHtml(helixTitleLocalized(hi))} · P${gi}</div>`
				const valRow = document.createElement('div')
				valRow.className = 'rval'

				/**
				 * @param {string} labelKey
				 * @param {string} [baseChar]
				 * @param {0|1} strandIdx
				 * @param {number} displayVal
				 * @param {boolean} updateBothStrands
				 */
				function addAlleleLine(labelKey, baseChar, strandIdx, displayVal, updateBothStrands) {
					const u = baseChar?.toUpperCase()
					if (!u) return
					const line = document.createElement('div')
					line.className = 'allele-line'
					const lab = document.createElement('span')
					lab.className = 'dim'
					lab.textContent = t(labelKey)
					const baseBtn = document.createElement('button')
					baseBtn.type = 'button'
					baseBtn.className = BASES.includes(u)
						? `base base-${u} base-sm editable-base`
						: 'base base-sm editable-base editable-base-invalid'
					baseBtn.textContent = BASES.includes(u) ? u : '?'
					baseBtn.addEventListener('click', (e) => {
						e.stopPropagation()
						openBasePicker(baseBtn, (letter) => {
							if (updateBothStrands) {
								genome = setBaseAt(genome, hi, 0, gi, letter)
								genome = setBaseAt(genome, hi, 1, gi, letter)
							} else {
								genome = setBaseAt(genome, hi, strandIdx, gi, letter)
							}
							syncAll()
						})
					})
					const eq = document.createElement('span')
					eq.className = 'muted'
					eq.textContent = '='
					const valSpan = document.createElement('span')
					valSpan.style.color = valueColor(displayVal)
					valSpan.style.fontWeight = 'bold'
					valSpan.textContent = String(displayVal)
					line.append(lab, baseBtn, eq, valSpan)
					valRow.appendChild(line)
				}

				if (b1)
					addAlleleLine(
						isMixed ? 'editor.alleleS1' : 'editor.alleleSingle',
						b1,
						0,
						v1,
						homozygous && !isMixed,
					)
				if (isMixed && b2) addAlleleLine('editor.alleleS2', b2, 1, v2, false)
				if (!b1 && !b2) {
					const dash = document.createElement('span')
					dash.className = 'dim'
					dash.textContent = '—'
					valRow.appendChild(dash)
				}
				card.appendChild(valRow)
				if (isMixed) {
					const mixedRow = document.createElement('div')
					mixedRow.className = 'gene-mixed-row'
					mixedRow.innerHTML = `<span class="gene-warning">${escapeHtml(t('editor.mixed'))}</span>`
					const mb = document.createElement('button')
					mb.type = 'button'
					mb.className = 'btn-mini'
					mb.textContent = t('editor.mergeAllele')
					mb.addEventListener('click', (e) => {
						e.stopPropagation()
						genome = mergeAllelesAt(genome, hi, gi)
						syncAll()
					})
					mixedRow.appendChild(mb)
					card.appendChild(mixedRow)
				}
				const tip = document.createElement('div')
				tip.className = 'gene-tooltip'
				tip.innerHTML = `<span class="tooltip-code">${escapeHtml(humanName)}</span>
					<span>${escapeHtml(geti18n_nowarn(`geneDescriptions.${geneName}`) || '')}</span>
					<span class="tooltip-values">${gene ? `${escapeHtml(t('editor.tooltipWiki'))}: ${alleleSummary(gene)} · ${escapeHtml(t('editor.tooltipMultiplier'))}=${gene.m}, ${escapeHtml(t('editor.tooltipScale'))}=${gene.s}` : ''}</span>`
				card.appendChild(tip)
				geneList.appendChild(card)
			})
			body.appendChild(geneList)
			block.appendChild(body)
			crisprMain.appendChild(block)
		})
	}

	function buildStrandStack(hi, s1, s2) {
		const stack = document.createElement('div')
		stack.className = 'strand-stack'
		if (s1) stack.appendChild(buildStrandRow(t('editor.strand1'), s1, hi, 0))
		if (s2) stack.appendChild(buildStrandRow(t('editor.strand2'), s2, hi, 1))
		return stack
	}

	function buildStrandRow(label, strand, hi, si) {
		const row = document.createElement('div')
		row.className = 'strand-row'
		row.appendChild(Object.assign(document.createElement('span'), { className: 'strand-label', textContent: label }))
		strand.split('').forEach((base, bi) => {
			const btn = document.createElement('button')
			btn.type = 'button'
			btn.className = `base base-${base.toUpperCase()} base-sm editable-base`
			btn.textContent = base.toUpperCase()
			btn.addEventListener('click', (e) => {
				e.stopPropagation()
				openBasePicker(btn, (letter) => {
					genome = setBaseAt(genome, hi, si, bi, letter)
					syncAll()
				})
			})
			row.appendChild(btn)
		})
		return row
	}

	function renderParams() {
		paramsMain.innerHTML = ''
		const expand = document.createElement('div')
		expand.className = 'params-expand-row'
		const b1 = document.createElement('button')
		b1.type = 'button'
		b1.className = 'btn btn-mini'
		b1.textContent = t('editor.expandAll')
		b1.addEventListener('click', () => {
			paramsMain.querySelectorAll('.params-grid').forEach((g) => {
				g.style.display = 'grid'
			})
		})
		const b2 = document.createElement('button')
		b2.type = 'button'
		b2.className = 'btn btn-mini'
		b2.textContent = t('editor.collapseAll')
		b2.addEventListener('click', () => {
			paramsMain.querySelectorAll('.params-grid').forEach((g) => {
				g.style.display = 'none'
			})
		})
		expand.append(b1, b2)
		paramsMain.appendChild(expand)

		HELIX_PARAM_SLOTS.forEach((helix, hIdx) => {
			const section = document.createElement('div')
			section.className = 'helix-section-params'
			const title = document.createElement('div')
			title.className = 'helix-title-params'
			title.innerHTML = `<span>${String(hIdx).padStart(2, '0')} — ${escapeHtml(helixTitleLocalized(hIdx))}</span><span class="helix-toggle">▶</span>`
			const grid = document.createElement('div')
			grid.className = 'params-grid'
			grid.style.display = 'none'
			const arrow = title.querySelector('.helix-toggle')
			title.addEventListener('click', () => {
				const open = grid.style.display === 'none'
				grid.style.display = open ? 'grid' : 'none'
				if (arrow) arrow.textContent = open ? '▼' : '▶'
			})

			helix.params.forEach((param, pIdx) => {
				const box = document.createElement('div')
				box.className = 'param-box'
				const lab = document.createElement('label')
				lab.textContent = `${param.id}: ${geneHumanLocalized(param.name)}`
				const sel = document.createElement('select')
				const cur1 = genome[hIdx]?.[0]?.[pIdx]
				const cur2 = genome[hIdx]?.[1]?.[pIdx]
				const curPair = cur1 && cur2 ? cur1 + cur2 : 'AA'
				for (const { pair, sum } of sortedDiploidChoices(param.vals)) {
					const opt = document.createElement('option')
					opt.value = pair
					opt.textContent = `${String(sum).padStart(3, ' ')} (${pair})`
					if (pair === curPair) opt.selected = true
					sel.appendChild(opt)
				}
				sel.addEventListener('change', () => {
					genome = setTraitPair(genome, hIdx, pIdx, sel.value)
					sel.classList.add('modified')
					syncAll()
				})
				box.append(lab, sel)
				grid.appendChild(box)
			})

			section.append(title, grid)
			paramsMain.appendChild(section)
		})
		applyParamsGeneFilter()
	}

	tabCr.addEventListener('click', () => {
		viewMode = 'crispr'
		crisprMain.hidden = false
		paramsMain.hidden = true
		updateGeneFilterVisibility()
		renderCrispr()
	})
	tabPr.addEventListener('click', () => {
		viewMode = 'params'
		crisprMain.hidden = true
		paramsMain.hidden = false
		updateGeneFilterVisibility()
		renderParams()
	})

	geneFilterInput.addEventListener('input', () => {
		geneFilter = geneFilterInput.value
		if (viewMode === 'crispr') renderCrispr()
		else applyParamsGeneFilter()
	})

	textarea.addEventListener('input', () => {
		syncHighlight()
	})

	textarea.addEventListener('scroll', () => {
		highlightPre.scrollTop = textarea.scrollTop
		highlightPre.scrollLeft = textarea.scrollLeft
	})

	function setupTextActions() {
		textActions.innerHTML = ''
		const parseBtn = document.createElement('button')
		parseBtn.type = 'button'
		parseBtn.className = 'btn'
		parseBtn.textContent = t('editor.loadFromText')
		parseBtn.addEventListener('click', () => {
			genome = parseGenome(textarea.value)
			syncAll()
		})
		const randBtn = document.createElement('button')
		randBtn.type = 'button'
		randBtn.className = 'btn btn-ghost'
		randBtn.textContent = t('editor.randomize')
		randBtn.addEventListener('click', () => {
			genome = normalizeGenome(randomGenomeStrands())
			syncAll()
		})
		const mergeBtn = document.createElement('button')
		mergeBtn.type = 'button'
		mergeBtn.className = 'btn btn-ghost'
		mergeBtn.textContent = t('editor.mergeMixed')
		mergeBtn.addEventListener('click', () => {
			genome = mergeAllMixedAlleles(genome)
			syncAll()
		})
		mergeMixedBtnEl = mergeBtn
		const blankBtn = document.createElement('button')
		blankBtn.type = 'button'
		blankBtn.className = 'btn btn-ghost'
		blankBtn.textContent = t('editor.loadBlankA')
		blankBtn.addEventListener('click', () => {
			genome = normalizeGenome(makeUniformGenome('A'))
			syncAll()
		})
		const clrBtn = document.createElement('button')
		clrBtn.type = 'button'
		clrBtn.className = 'btn btn-ghost'
		clrBtn.textContent = t('editor.clearGenome')
		clrBtn.addEventListener('click', () => {
			genome = normalizeGenome(makeUniformGenome(''))
			syncAll()
		})
		const copyBtn = document.createElement('button')
		copyBtn.type = 'button'
		copyBtn.className = 'btn btn-ghost'
		copyBtn.textContent = t('editor.copyOutput')
		copyBtn.addEventListener('click', async () => {
			await navigator.clipboard.writeText(formatGenomeForExport(genome))
		})
		const autoLbl = document.createElement('label')
		autoLbl.className = 'editor-auto-copy-toggle'
		const autoInp = document.createElement('input')
		autoInp.type = 'checkbox'
		autoInp.checked = autoCopyEnabled
		autoInp.addEventListener('change', () => {
			autoCopyEnabled = autoInp.checked
			try {
				localStorage.setItem(AUTO_COPY_KEY, autoCopyEnabled ? '1' : '0')
			} catch {
				/* ignore */
			}
		})
		autoLbl.append(autoInp, document.createTextNode(` ${t('editor.autoCopy')}`))
		textActions.append(parseBtn, randBtn, mergeBtn, blankBtn, clrBtn, copyBtn, autoLbl)
	}

	syncI18nStatic()
	buildQuickRow()
	setupTextActions()
	if (mergeMixedBtnEl) mergeMixedBtnEl.style.display = hasMergeableAlleles(genome) ? '' : 'none'
	syncOutput()
	updateGeneFilterVisibility()
	renderCrispr()

	const api = {
		getSequence: () => formatGenomeForExport(genome),
		setSequence: (text) => {
			suppressNotify = true
			try {
				genome = parseGenome(text)
				syncAll()
			} finally {
				suppressNotify = false
			}
		},
		getGenome: () => genome,
		setGenomeParsed: (g) => {
			suppressNotify = true
			try {
				genome = normalizeGenome(g)
				syncAll()
			} finally {
				suppressNotify = false
			}
		},
		refreshI18n: () => {
			syncI18nStatic()
			buildQuickRow()
			setupTextActions()
			updateGeneFilterVisibility()
			suppressNotify = true
			try {
				syncAll()
			} finally {
				suppressNotify = false
			}
		},
		setHybridOptions: (dnas) => buildHybridRow(dnas),
		syncFromState: () => syncAll(),
	}

	return api
}
