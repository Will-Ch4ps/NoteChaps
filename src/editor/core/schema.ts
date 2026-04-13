import { Schema } from 'prosemirror-model'
import { schemaNodes } from './schema/schemaNodes'
import { schemaMarks } from './schema/schemaMarks'

export const schema = new Schema({ nodes: schemaNodes, marks: schemaMarks })
