import am from 'asciimath-js'
import tex2svg from './tex2svg.js'
const { am2tex } = am

const { stdin, stdout } = process
const buf = []

stdin.setEncoding('utf8')

stdin.on('readable', () => {
  let data
  while ((data = stdin.read()) !== null) {
    buf.push(data.trim())
  }
})

const convert = process.argv.includes('--am')
  ? (input, options) => tex2svg(am2tex(input), options)
  : tex2svg

function onEnd () {
  const input = buf.join('\n')
  const options = Object.fromEntries(process.argv.slice(2).map(arg => {
    return arg.includes('=') ? arg.split('=') : undefined
  }).filter(Boolean))
  convert(input, options).then(svg => {
    console.log(svg)
    process.exit()
  })
}

stdin.on('end', onEnd)
process.on('SIGINT', onEnd)
