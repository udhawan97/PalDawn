const ALLOW = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD',
  'Zlib', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0', 'Python-2.0',
  'CC-BY-4.0', 'MIT-0', 'WTFPL',
])

function classifyId(id) {
  const u = id.toUpperCase()
  if (u.includes('AGPL')) return 'deny'
  if (u.includes('LGPL')) return 'review'
  if (u.includes('GPL')) return 'deny'
  if (/BY[- ]?NC/.test(u)) return 'deny'
  if (u === 'UNLICENSED' || u === 'NONE' || u === 'UNKNOWN') return 'deny'
  if (ALLOW.has(id)) return 'allow'
  return 'review'
}

// Evaluate complete alternatives: every AND term is required, while an OR may
// choose one complete branch. Unsupported or malformed syntax fails closed.
export function classifyLicenseExpression(expression) {
  if (typeof expression !== 'string' || !expression.trim() || expression.length > 4096) return 'deny'
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? []
  let cursor = 0
  const operator = (name) => tokens[cursor]?.toUpperCase() === name

  const primary = (depth) => {
    if (depth > 64) throw new Error('License expression nesting exceeds the limit')
    const token = tokens[cursor++]
    if (token === '(') {
      const result = alternatives(depth + 1)
      if (tokens[cursor++] !== ')') throw new Error('Unclosed license group')
      return result
    }
    if (!token || /^(?:AND|OR)$/i.test(token) || !/^[A-Za-z0-9][A-Za-z0-9.+:-]*$/.test(token)) {
      throw new Error('Invalid license term')
    }
    return classifyId(token)
  }

  const conjunction = (depth) => {
    let result = primary(depth)
    while (operator('AND')) {
      cursor++
      const next = primary(depth)
      result = result === 'deny' || next === 'deny' ? 'deny'
        : result === 'review' || next === 'review' ? 'review' : 'allow'
    }
    return result
  }

  const alternatives = (depth) => {
    let result = conjunction(depth)
    while (operator('OR')) {
      cursor++
      const next = conjunction(depth)
      result = result === 'allow' || next === 'allow' ? 'allow'
        : result === 'review' || next === 'review' ? 'review' : 'deny'
    }
    return result
  }

  try {
    const result = alternatives(0)
    return cursor === tokens.length ? result : 'deny'
  } catch {
    return 'deny'
  }
}
