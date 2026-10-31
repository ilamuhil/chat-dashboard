import {copyFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
const source=process.argv[2]
if(!source)throw new Error('Pass the built widget bundle: pnpm widget:sync ../chat_widget_ui/dist/chat-widget-ui.iife.js')
const target=new URL('../public/',import.meta.url)
await mkdir(target,{recursive:true})
await copyFile(resolve(source),new URL('chat-widget-ui.iife.js',target))
console.log('Hosted chat widget bundle updated. Use the correct dashboard/chat URLs when building it.')
