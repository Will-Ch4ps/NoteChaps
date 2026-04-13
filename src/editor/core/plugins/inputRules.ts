import { inputRules, textblockTypeInputRule, wrappingInputRule, InputRule } from 'prosemirror-inputrules'
import { schema } from '../schema'

export function buildInputRules() {
  return inputRules({
    rules: [
      textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, match => ({
        level: match[1].length
      })),
      wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
      textblockTypeInputRule(/^```$/, schema.nodes.code_block),
      wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),
      wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, match => ({
        order: Number(match[1])
      })),
      new InputRule(/^---$/, (state, _match, start, end) => {
        const { tr } = state
        const $from = state.doc.resolve(start)
        const blockStart = $from.before()
        tr.replaceRangeWith(blockStart, end, schema.nodes.horizontal_rule.create())
        return tr
      }),
      // Converter link magicamente caso o usuário digite "[[Alvo]]" até o final
      new InputRule(/\[\[([^\]\n]+)\]\]$/, (state, match, start, end) => {
        const target = match[1].trim()
        if (!target) return null
        const textContent = schema.text(`[[${target}]]`)
        const wikiNode = schema.nodes.wiki_link.create({ target, label: target }, textContent)
        return state.tr.replaceWith(start, end, wikiNode)
      })
    ]
  })
}