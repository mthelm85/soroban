import type { TechniqueId, TechniqueInfo } from './types';

/**
 * The named techniques. `ja` is the term as Japanese soroban teaching uses it
 * and is shown on both language versions of the site — it is the one place the
 * English site deliberately shows Japanese, because the term is the thing being
 * taught. `rule` is kept purely symbolic so it needs no translation.
 */
export const TECHNIQUES: Record<TechniqueId, TechniqueInfo> = {
	set: {
		id: 'set',
		ja: '置く',
		romaji: 'oku',
		en: 'Set the number',
		rule: ''
	},
	clear: {
		id: 'clear',
		ja: '払う',
		romaji: 'harau',
		en: 'Clear the rod',
		rule: ''
	},
	locate: {
		id: 'locate',
		ja: '定位',
		romaji: 'teii',
		en: 'Fix the unit rod',
		rule: ''
	},
	kakusho: {
		id: 'kakusho',
		ja: '確商',
		romaji: 'kakushō',
		en: 'Settle the quotient digit',
		rule: 'q × d ≤ s < (q + 1) × d'
	},
	'direct-add': {
		id: 'direct-add',
		ja: 'そのまま入れる',
		romaji: 'sono mama ireru',
		en: 'Direct addition',
		rule: '+n'
	},
	'direct-sub': {
		id: 'direct-sub',
		ja: 'そのまま払う',
		romaji: 'sono mama harau',
		en: 'Direct subtraction',
		rule: '−n'
	},
	'five-composition': {
		id: 'five-composition',
		ja: '五の合成',
		romaji: 'go no gōsei',
		en: 'Five-complement addition',
		rule: '+n ⇒ +5 −(5−n)'
	},
	'five-decomposition': {
		id: 'five-decomposition',
		ja: '五の分解',
		romaji: 'go no bunkai',
		en: 'Five-complement subtraction',
		rule: '−n ⇒ −5 +(5−n)'
	},
	'ten-carry': {
		id: 'ten-carry',
		ja: '十の繰り上がり',
		romaji: 'jū no kuriagari',
		en: 'Ten-complement addition',
		rule: '+n ⇒ +10 −(10−n)'
	},
	'ten-carry-five': {
		id: 'ten-carry-five',
		ja: '十の繰り上がり（五の分解を含む）',
		romaji: 'jū no kuriagari, go no bunkai',
		en: 'Ten-complement addition, using the five',
		rule: '+n ⇒ +10 −5 +(n−5)'
	},
	'ten-borrow': {
		id: 'ten-borrow',
		ja: '十の繰り下がり',
		romaji: 'jū no kurisagari',
		en: 'Ten-complement subtraction',
		rule: '−n ⇒ −10 +(10−n)'
	},
	'ten-borrow-five': {
		id: 'ten-borrow-five',
		ja: '十の繰り下がり（五の合成を含む）',
		romaji: 'jū no kurisagari, go no gōsei',
		en: 'Ten-complement subtraction, using the five',
		rule: '−n ⇒ −10 +5 −(n−5)'
	}
};
